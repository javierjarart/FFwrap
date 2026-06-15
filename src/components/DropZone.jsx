import { useState } from "react";
import { open } from "@tauri-apps/api/dialog";

const s = {
  zone: {
    border: "1px dashed #2A2A2A",
    borderRadius: "4px",
    padding: "18px 12px",
    textAlign: "center",
    cursor: "pointer",
    transition: "border-color 0.15s",
  },
  zoneHover: { borderColor: "#C8FF00" },
  icon: { fontSize: "20px", color: "#2A2A2A", marginBottom: "5px" },
  hint: { fontSize: "10px", color: "#444" },
  path: { fontSize: "10px", color: "#C8FF00", marginTop: "4px", wordBreak: "break-all" },
  meta: {
    display: "flex",
    justifyContent: "space-between",
    marginTop: "6px",
  },
  metaLabel: { fontSize: "10px", color: "#444" },
  metaVal: { fontSize: "10px", color: "#C8FF00" },
};

export default function DropZone({ mode, onSelect }) {
  const [hover, setHover] = useState(false);
  const [selected, setSelected] = useState(null);

  async function handleClick() {
    try {
      const result = await open({
        directory: mode === "sequence",
        multiple: false,
        filters:
          mode === "transcode"
            ? [{ name: "Video", extensions: ["mp4", "mov", "mkv", "mxf", "avi"] }]
            : undefined,
      });
      if (!result) return;
      const path = typeof result === "string" ? result : result[0];
      setSelected(path);
      onSelect(path);
    } catch (e) {
      console.error(e);
    }
  }

  return (
    <div>
      <div
        style={{ ...s.zone, ...(hover ? s.zoneHover : {}) }}
        onClick={handleClick}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
      >
        <div style={s.icon}>
          <i
            className={mode === "sequence" ? "ti ti-folder-open" : "ti ti-file-upload"}
            aria-hidden="true"
          />
        </div>
        <div style={s.hint}>
          {mode === "sequence"
            ? "click to select frames folder"
            : "click to select video file"}
        </div>
        {selected && <div style={s.path}>{selected}</div>}
      </div>
    </div>
  );
}
