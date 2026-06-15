use std::collections::HashSet;
use std::path::Path;
use tauri::command;

#[derive(serde::Serialize)]
pub struct ProbeResult {
  pub pattern: Option<String>,   // e.g. "frame_%04d.png"
  pub total_frames: u64,
  pub first_frame: Option<String>,
  pub extension: Option<String>,
  pub width_hint: Option<u8>,    // zero-pad width (4, 5, etc.)
  pub error: Option<String>,
}

/// Given a directory path, detect a printf-style sequence pattern.
/// Supports: frame_0001.png, render.0001.exr, 00001.png, etc.
#[command]
pub fn probe_sequence(dir: String) -> ProbeResult {
  let path = Path::new(&dir);

  if !path.is_dir() {
    return ProbeResult {
      pattern: None,
      total_frames: 0,
      first_frame: None,
      extension: None,
      width_hint: None,
      error: Some(format!("not a directory: {dir}")),
    };
  }

  let entries: Vec<_> = match std::fs::read_dir(path) {
    Ok(rd) => rd.filter_map(|e| e.ok()).collect(),
    Err(e) => {
      return ProbeResult {
        pattern: None,
        total_frames: 0,
        first_frame: None,
        extension: None,
        width_hint: None,
        error: Some(e.to_string()),
      }
    }
  };

  // Collect files, ignore subdirectories
  let mut files: Vec<String> = entries
    .iter()
    .filter_map(|e| {
      let p = e.path();
      if p.is_file() {
        p.file_name()?.to_str().map(|s| s.to_string())
      } else {
        None
      }
    })
    .collect();

  files.sort();

  if files.is_empty() {
    return ProbeResult {
      pattern: None,
      total_frames: 0,
      first_frame: None,
      extension: None,
      width_hint: None,
      error: Some("directory is empty".into()),
    };
  }

  // Detect extensions
  let extensions: HashSet<String> = files
    .iter()
    .filter_map(|f| {
      let ext = Path::new(f).extension()?.to_str()?.to_lowercase();
      if matches!(ext.as_str(), "png" | "jpg" | "jpeg" | "exr" | "tiff" | "tif" | "tga") {
        Some(ext)
      } else {
        None
      }
    })
    .collect();

  let ext = match extensions.len() {
    0 => {
      return ProbeResult {
        pattern: None,
        total_frames: 0,
        first_frame: None,
        extension: None,
        width_hint: None,
        error: Some("no supported image files found (png, exr, jpg, tiff, tga)".into()),
      }
    }
    1 => extensions.into_iter().next().unwrap(),
    _ => "png".to_string(), // default if mixed
  };

  // Filter to just the target extension
  let image_files: Vec<&String> = files
    .iter()
    .filter(|f| f.to_lowercase().ends_with(&ext))
    .collect();

  let total = image_files.len() as u64;
  let first = image_files.first().map(|s| s.to_string());

  // Try to detect padding and prefix
  // Strategy: find the numeric part(s) in the first filename
  let pattern = first.as_deref().and_then(|filename| detect_pattern(filename, &ext));

  ProbeResult {
    pattern,
    total_frames: total,
    first_frame: first,
    extension: Some(ext),
    width_hint: None,
    error: None,
  }
}

/// Given a filename like "frame_0001.png", returns "frame_%04d.png"
fn detect_pattern(filename: &str, ext: &str) -> Option<String> {
  let stem = Path::new(filename).file_stem()?.to_str()?;

  // Find trailing numeric segment
  let num_start = stem.rfind(|c: char| !c.is_ascii_digit())?;
  let prefix = &stem[..=num_start];
  let num_part = &stem[num_start + 1..];

  if num_part.is_empty() {
    // filename is purely numeric like "00001.png"
    let purely_numeric: Option<usize> = stem.parse().ok().map(|_| stem.len());
    if let Some(width) = purely_numeric {
      return Some(format!("%0{width}d.{ext}"));
    }
    return None;
  }

  let pad_width = num_part.len();

  // Check if it's zero-padded
  if num_part.starts_with('0') && pad_width > 1 {
    Some(format!("{prefix}%0{pad_width}d.{ext}"))
  } else {
    // Unpadded — still valid for ffmpeg with %d
    Some(format!("{prefix}%d.{ext}"))
  }
}
