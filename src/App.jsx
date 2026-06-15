import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/tauri";
import { listen } from "@tauri-apps/api/event";
import { appWindow } from "@tauri-apps/api/window";
import DropZone from "./components/DropZone";
import CommandPreview from "./components/CommandPreview";
import LogPanel from "./components/LogPanel";
import { buildCommand, CODEC_EXTENSIONS, PIX_FMTS } from "./lib/buildCommand";

// ── UI atoms ──────────────────────────────────────────────────────────────────

function SectionLabel({ children }) {
  return (
    <div style={{ fontSize: "9px", letterSpacing: "0.15em", color: "#444", textTransform: "uppercase", marginBottom: "8px" }}>
      {children}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: "12px" }}>
      {label && <div style={{ fontSize: "11px", color: "#666", marginBottom: "5px" }}>{label}</div>}
      {children}
    </div>
  );
}

function ToggleGroup({ options, value, onChange }) {
  return (
    <div style={{ display: "flex", gap: "5px" }}>
      {options.map((opt) => (
        <button
          key={opt}
          onClick={() => onChange(opt)}
          style={{
            flex: 1,
            background: value === opt ? "transparent" : "transparent",
            border: `1px solid ${value === opt ? "#C8FF00" : "#2A2A2A"}`,
            borderRadius: "3px",
            color: value === opt ? "#C8FF00" : "#555",
            fontSize: "11px",
            padding: "5px 6px",
            cursor: "pointer",
            transition: "border-color 0.1s, color 0.1s",
          }}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

function Slider({ label, min, max, value, onChange, step = 1 }) {
  return (
    <div style={{ marginBottom: "12px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
        <span style={{ fontSize: "11px", color: "#666" }}>{label}</span>
        <span style={{ fontSize: "11px", color: "#C8FF00" }}>{value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ width: "100%", accentColor: "#C8FF00" }}
      />
    </div>
  );
}

function TextInput({ value, onChange, placeholder }) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        width: "100%",
        background: "#141414",
        border: "1px solid #1E1E1E",
        borderRadius: "3px",
        color: "#E0E0E0",
        fontSize: "11px",
        padding: "6px 8px",
      }}
    />
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────

const CODECS = ["H.264", "H.265", "ProRes", "DNxHD"];

function nowTs() {
  const d = new Date();
  return `${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`;
}

export default function App() {
  // State
  const [mode, setMode] = useState("sequence");
  const [inputDir, setInputDir] = useState("");
  const [inputFile, setInputFile] = useState("");
  const [pattern, setPattern] = useState("frame_%04d.png");
  const [totalFrames, setTotalFrames] = useState(0);
  const [fps, setFps] = useState(30);
  const [codec, setCodec] = useState("H.264");
  const [crf, setCrf] = useState(18);
  const [pixFmt, setPixFmt] = useState("yuv420p");
  const [outputName, setOutputName] = useState("output.mp4");
  const [trimStart, setTrimStart] = useState("");
  const [trimEnd, setTrimEnd] = useState("");
  const [audioNormalize, setAudioNormalize] = useState(false);
  const [audioVolume, setAudioVolume] = useState(1.0);
  const [status, setStatus] = useState("idle"); // idle | running | done | error
  const [progress, setProgress] = useState({ pct: 0, frame: 0, fps: 0, speed: "" });
  const [logs, setLogs] = useState([]);

  // Tauri window drag support
  useEffect(() => {
    const el = document.getElementById("titlebar");
    if (!el) return;
    const handler = () => appWindow.startDragging();
    el.addEventListener("mousedown", handler);
    return () => el.removeEventListener("mousedown", handler);
  }, []);

  // Listen to ffmpeg events
  useEffect(() => {
    const unsubs = [];

    listen("ffmpeg://progress", (e) => {
      const { progress: p, pct } = e.payload;
      setProgress({
        pct,
        frame: p.frame || 0,
        fps: p.fps ? Math.round(p.fps) : 0,
        speed: p.speed || "",
      });
    }).then((u) => unsubs.push(u));

    listen("ffmpeg://log", (e) => {
      const { line, level } = e.payload;
      setLogs((prev) => [...prev.slice(-300), { line, level, ts: nowTs() }]);
    }).then((u) => unsubs.push(u));

    listen("ffmpeg://done", () => {
      setStatus("done");
      setProgress((p) => ({ ...p, pct: 100 }));
    }).then((u) => unsubs.push(u));

    return () => unsubs.forEach((u) => u());
  }, []);

  // Auto-detect pix_fmt options when codec changes
  useEffect(() => {
    const fmts = PIX_FMTS[codec];
    if (fmts && fmts.length > 0) setPixFmt(fmts[0]);
    // Update output extension
    const ext = CODEC_EXTENSIONS[codec] || ".mp4";
    setOutputName((prev) => prev.replace(/\.[^.]+$/, ext));
  }, [codec]);

  // Probe sequence when dir is selected
  const handleDirSelect = useCallback(async (path) => {
    setInputDir(path);
    setLogs([]);
    try {
      const result = await invoke("probe_sequence", { dir: path });
      if (result.error) {
        setLogs([{ line: result.error, level: "error", ts: nowTs() }]);
        return;
      }
      if (result.pattern) setPattern(result.pattern);
      if (result.total_frames) setTotalFrames(result.total_frames);
      setLogs([
        { line: `scanned → ${result.total_frames} frames`, level: "done", ts: nowTs() },
        { line: `pattern → ${result.pattern}`, level: "done", ts: nowTs() },
      ]);
    } catch (e) {
      setLogs([{ line: String(e), level: "error", ts: nowTs() }]);
    }
  }, []);

  const handleFileSelect = useCallback((path) => {
    setInputFile(path);
    setLogs([]);
  }, []);

  const { args, cmdString } = buildCommand({
    mode,
    inputDir,
    inputFile,
    pattern,
    fps,
    codec,
    crf,
    pixFmt,
    outputName,
    trimStart,
    trimEnd,
    audioNormalize,
    audioVolume,
  });

  async function handleRun() {
    if (status === "running") {
      await invoke("cancel_ffmpeg");
      setStatus("idle");
      return;
    }
    setStatus("running");
    setProgress({ pct: 0, frame: 0, fps: 0, speed: "" });
    setLogs([]);
    try {
      await invoke("run_ffmpeg", { args, totalFrames });
    } catch (e) {
      setLogs((prev) => [...prev, { line: String(e), level: "error", ts: nowTs() }]);
      setStatus("error");
    }
  }

  const pixFmtOptions = PIX_FMTS[codec] || [];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "#0A0A0A" }}>
      {/* Custom titlebar */}
      <div
        id="titlebar"
        style={{
          background: "#0A0A0A",
          borderBottom: "1px solid #1E1E1E",
          padding: "10px 16px",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          flexShrink: 0,
          cursor: "grab",
        }}
      >
        <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#FF5F57" }} />
        <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#FEBC2E" }} />
        <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#28C840" }} />
        <span style={{ marginLeft: "auto", fontSize: "11px", color: "#333", letterSpacing: "0.08em" }}>
          FFWRAP v0.1.0
        </span>
      </div>

      {/* Main layout */}
      <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", flex: 1, overflow: "hidden" }}>

        {/* Left panel — controls */}
        <div
          style={{
            background: "#0F0F0F",
            borderRight: "1px solid #1E1E1E",
            padding: "18px 14px",
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: "18px",
          }}
        >
          {/* Mode */}
          <div>
            <SectionLabel>mode</SectionLabel>
            <ToggleGroup
              options={["sequence → video", "transcode"]}
              value={mode === "sequence" ? "sequence → video" : "transcode"}
              onChange={(v) => setMode(v === "sequence → video" ? "sequence" : "transcode")}
            />
          </div>

          {/* Input */}
          <div>
            <SectionLabel>input</SectionLabel>
            {mode === "sequence" ? (
              <>
                <DropZone mode="sequence" onSelect={handleDirSelect} />
                {totalFrames > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: "6px" }}>
                    <span style={{ fontSize: "10px", color: "#444" }}>pattern</span>
                    <span style={{ fontSize: "10px", color: "#C8FF00" }}>{pattern}</span>
                  </div>
                )}
                {totalFrames > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: "2px" }}>
                    <span style={{ fontSize: "10px", color: "#444" }}>frames</span>
                    <span style={{ fontSize: "10px", color: "#C8FF00" }}>{totalFrames.toLocaleString()}</span>
                  </div>
                )}
                <div style={{ marginTop: "10px" }}>
                  <Field label="override pattern">
                    <TextInput value={pattern} onChange={setPattern} placeholder="frame_%04d.png" />
                  </Field>
                </div>
              </>
            ) : (
              <>
                <DropZone mode="transcode" onSelect={handleFileSelect} />
                <div style={{ marginTop: "12px", display: "flex", gap: "8px" }}>
                  <div style={{ flex: 1 }}>
                    <Field label="trim start">
                      <TextInput value={trimStart} onChange={setTrimStart} placeholder="00:00:00" />
                    </Field>
                  </div>
                  <div style={{ flex: 1 }}>
                    <Field label="trim end">
                      <TextInput value={trimEnd} onChange={setTrimEnd} placeholder="00:00:10" />
                    </Field>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Output */}
          <div>
            <SectionLabel>output</SectionLabel>

            <Field label="codec">
              <ToggleGroup options={CODECS} value={codec} onChange={setCodec} />
            </Field>

            {mode === "sequence" && (
              <Slider label="framerate" min={1} max={120} value={fps} onChange={setFps} />
            )}

            {["H.264", "H.265"].includes(codec) && (
              <Slider label={`quality (CRF) — lower = better`} min={0} max={51} value={crf} onChange={setCrf} />
            )}

            {pixFmtOptions.length > 0 && (
              <Field label="pixel format">
                <ToggleGroup options={pixFmtOptions} value={pixFmt} onChange={setPixFmt} />
              </Field>
            )}

            <div style={{ marginBottom: "12px" }}>
              <SectionLabel>audio</SectionLabel>
              <ToggleGroup
                options={["off", "normalize"]}
                value={audioNormalize ? "normalize" : "off"}
                onChange={(v) => setAudioNormalize(v === "normalize")}
              />
              {!audioNormalize && (
                <div style={{ marginTop: "8px" }}>
                  <Slider label="volume" min={0} max={2} step={0.1} value={audioVolume} onChange={setAudioVolume} />
                </div>
              )}
            </div>

            <Field label="output filename">
              <TextInput value={outputName} onChange={setOutputName} placeholder="output.mp4" />
            </Field>
          </div>
        </div>

        {/* Right panel — command + log */}
        <div style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <CommandPreview cmdString={cmdString} />
          <LogPanel entries={logs} />

          {/* Progress bar */}
          <div style={{ height: "2px", background: "#141414", flexShrink: 0 }}>
            <div
              style={{
                height: "2px",
                background: "#C8FF00",
                width: `${progress.pct}%`,
                transition: "width 0.3s ease",
              }}
            />
          </div>

          {/* Footer */}
          <div
            style={{
              borderTop: "1px solid #1A1A1A",
              padding: "11px 16px",
              display: "flex",
              alignItems: "center",
              gap: "10px",
              flexShrink: 0,
            }}
          >
            <button
              onClick={handleRun}
              disabled={status === "running" ? false : (!inputDir && !inputFile)}
              style={{
                background: status === "running" ? "#1A0000" : "#C8FF00",
                color: status === "running" ? "#FF5F57" : "#0A0A0A",
                border: status === "running" ? "1px solid #FF5F57" : "none",
                borderRadius: "3px",
                fontSize: "12px",
                fontWeight: "600",
                fontFamily: "'JetBrains Mono', monospace",
                padding: "7px 18px",
                cursor: "pointer",
                letterSpacing: "0.04em",
                opacity: (!inputDir && !inputFile && status !== "running") ? 0.3 : 1,
              }}
            >
              {status === "running" ? "■ cancel" : "▶ render"}
            </button>

            {status === "running" && (
              <div
                style={{
                  fontSize: "10px",
                  color: "#C8FF00",
                  background: "#0D1A00",
                  border: "1px solid #1E3300",
                  borderRadius: "2px",
                  padding: "3px 8px",
                }}
              >
                {progress.pct}% · frame {progress.frame.toLocaleString()} · {progress.fps} fps
              </div>
            )}

            {status === "done" && (
              <div style={{ fontSize: "10px", color: "#4A7A00" }}>
                <i className="ti ti-check" aria-hidden="true" /> done
              </div>
            )}

            {status === "error" && (
              <div style={{ fontSize: "10px", color: "#8A2020" }}>
                <i className="ti ti-alert-triangle" aria-hidden="true" /> error — check log
              </div>
            )}

            {totalFrames > 0 && mode === "sequence" && (
              <span style={{ fontSize: "10px", color: "#333", marginLeft: "auto" }}>
                {totalFrames.toLocaleString()} frames · ~{Math.ceil(totalFrames / fps)}s
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
