use std::process::Stdio;
use std::sync::{Arc, Mutex};
use tauri::{command, AppHandle, Manager};
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::Command;

// Global handle to allow cancellation
static CHILD_PID: Mutex<Option<u32>> = Mutex::new(None);

fn get_ffmpeg_path(app: &AppHandle) -> std::path::PathBuf {
  // In production: look inside the bundled resources folder
  // In dev: fall back to system ffmpeg
  let resource_path = app
    .path_resolver()
    .resolve_resource("resources/ffmpeg.exe");

  if let Some(path) = resource_path {
    if path.exists() {
      return path;
    }
  }

  // Dev fallback — requires ffmpeg on PATH
  std::path::PathBuf::from("ffmpeg")
}

#[derive(serde::Serialize, Clone)]
pub struct ProgressEvent {
  pub frame: Option<u64>,
  pub fps: Option<f32>,
  pub size_kb: Option<u64>,
  pub time: Option<String>,
  pub bitrate: Option<String>,
  pub speed: Option<String>,
}

#[derive(serde::Serialize, Clone)]
pub struct LogEvent {
  pub line: String,
  pub level: String, // "info" | "warn" | "error" | "done"
}

/// Parse a ffmpeg progress line like:
/// frame=  892 fps=210 q=18.0 size=   14208kB time=00:00:29.70 bitrate=3915.2kbits/s speed=7.01x
fn parse_progress(line: &str) -> Option<ProgressEvent> {
  if !line.contains("frame=") {
    return None;
  }

  let get = |key: &str| -> Option<String> {
    let start = line.find(&format!("{}=", key))?;
    let rest = &line[start + key.len() + 1..];
    Some(rest.split_whitespace().next()?.trim().to_string())
  };

  Some(ProgressEvent {
    frame: get("frame").and_then(|v| v.parse().ok()),
    fps: get("fps").and_then(|v| v.parse().ok()),
    size_kb: get("size")
      .and_then(|v| v.replace("kB", "").trim().parse().ok()),
    time: get("time"),
    bitrate: get("bitrate"),
    speed: get("speed"),
  })
}

#[command]
pub async fn run_ffmpeg(
  app: AppHandle,
  args: Vec<String>,
  total_frames: Option<u64>,
) -> Result<String, String> {
  let ffmpeg_path = get_ffmpeg_path(&app);

  app
    .emit_all(
      "ffmpeg://log",
      LogEvent {
        line: format!("binary: {}", ffmpeg_path.display()),
        level: "info".into(),
      },
    )
    .ok();

  let mut child = Command::new(&ffmpeg_path)
    .args(&args)
    .stdout(Stdio::piped())
    .stderr(Stdio::piped())
    .spawn()
    .map_err(|e| format!("Failed to spawn ffmpeg: {e}"))?;

  // Store PID for cancellation
  if let Some(pid) = child.id() {
    *CHILD_PID.lock().unwrap() = Some(pid);
  }

  let stderr = child.stderr.take().unwrap();
  let app_clone = app.clone();
  let total = total_frames.unwrap_or(0);

  // Stream stderr (where ffmpeg writes progress) line by line
  let reader = BufReader::new(stderr);
  let mut lines = reader.lines();

  tokio::spawn(async move {
    while let Ok(Some(line)) = lines.next_line().await {
      if let Some(progress) = parse_progress(&line) {
        // Emit structured progress
        let pct = if total > 0 {
          progress.frame.unwrap_or(0) * 100 / total
        } else {
          0
        };

        app_clone
          .emit_all(
            "ffmpeg://progress",
            serde_json::json!({
              "progress": progress,
              "pct": pct,
              "total_frames": total,
            }),
          )
          .ok();
      } else {
        // Emit raw log line
        let level = if line.to_lowercase().contains("error") {
          "error"
        } else if line.to_lowercase().contains("warn") {
          "warn"
        } else {
          "info"
        };
        app_clone
          .emit_all(
            "ffmpeg://log",
            LogEvent {
              line: line.clone(),
              level: level.into(),
            },
          )
          .ok();
      }
    }
  });

  let status = child
    .wait()
    .await
    .map_err(|e| format!("Process error: {e}"))?;

  *CHILD_PID.lock().unwrap() = None;

  if status.success() {
    app
      .emit_all(
        "ffmpeg://log",
        LogEvent {
          line: "encoding complete".into(),
          level: "done".into(),
        },
      )
      .ok();
    app.emit_all("ffmpeg://done", true).ok();
    Ok("done".into())
  } else {
    let msg = format!(
      "ffmpeg exited with code {}",
      status.code().unwrap_or(-1)
    );
    app
      .emit_all(
        "ffmpeg://log",
        LogEvent {
          line: msg.clone(),
          level: "error".into(),
        },
      )
      .ok();
    Err(msg)
  }
}

#[command]
pub async fn cancel_ffmpeg() -> Result<(), String> {
  let pid = CHILD_PID.lock().unwrap().take();
  if let Some(pid) = pid {
    #[cfg(target_os = "windows")]
    {
      std::process::Command::new("taskkill")
        .args(["/PID", &pid.to_string(), "/F"])
        .spawn()
        .ok();
    }
    #[cfg(not(target_os = "windows"))]
    {
      std::process::Command::new("kill")
        .args(["-9", &pid.to_string()])
        .spawn()
        .ok();
    }
  }
  Ok(())
}
