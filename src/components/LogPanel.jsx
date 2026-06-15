import { useEffect, useRef } from "react";

const levelColors = {
  info:  "#3A3A3A",
  warn:  "#8A6A00",
  error: "#8A2020",
  done:  "#4A7A00",
  active:"#666",
};

export default function LogPanel({ entries }) {
  const ref = useRef(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.scrollTop = ref.current.scrollHeight;
    }
  }, [entries]);

  return (
    <div
      ref={ref}
      style={{
        flex: 1,
        padding: "12px 16px",
        overflowY: "auto",
        fontFamily: "'JetBrains Mono', monospace",
      }}
    >
      {entries.length === 0 ? (
        <div style={{ fontSize: "10px", color: "#2A2A2A" }}>waiting for output...</div>
      ) : (
        entries.map((entry, i) => (
          <div
            key={i}
            style={{
              fontSize: "10px",
              lineHeight: "1.9",
              color: levelColors[entry.level] || "#3A3A3A",
            }}
          >
            <span style={{ color: "#2A2A2A", marginRight: "8px" }}>{entry.ts}</span>
            {entry.line}
          </div>
        ))
      )}
    </div>
  );
}
