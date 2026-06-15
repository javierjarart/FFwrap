import { useState } from "react";
import { writeText } from "@tauri-apps/api/clipboard";
import { tokenizeCommand } from "../lib/buildCommand";

const colors = { bin: "#C8FF00", flag: "#5A9EFF", value: "#E0E0E0" };

export default function CommandPreview({ cmdString }) {
  const [copied, setCopied] = useState(false);
  const tokens = tokenizeCommand(cmdString);

  async function copy() {
    try {
      await writeText(cmdString);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  }

  return (
    <div style={{ background: "#0D0D0D", borderBottom: "1px solid #1A1A1A", padding: "12px 16px" }}>
      <div style={{ display: "flex", alignItems: "center", marginBottom: "8px" }}>
        <span style={{ fontSize: "9px", letterSpacing: "0.12em", color: "#333", textTransform: "uppercase" }}>
          generated command
        </span>
        <button
          onClick={copy}
          style={{
            marginLeft: "auto",
            fontSize: "10px",
            color: copied ? "#C8FF00" : "#444",
            background: "none",
            border: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "4px",
          }}
        >
          <i className={copied ? "ti ti-check" : "ti ti-copy"} aria-hidden="true" />
          {copied ? "copied" : "copy"}
        </button>
      </div>
      <div style={{ fontSize: "11px", lineHeight: 1.8, wordBreak: "break-all" }}>
        {tokens.map((t, i) => (
          <span key={i} style={{ color: colors[t.type] }}>
            {t.text}
          </span>
        ))}
      </div>
    </div>
  );
}
