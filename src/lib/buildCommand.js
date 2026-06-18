/**
 * Builds the ffmpeg argument array from the current UI state.
 * Returns { args: string[], cmdString: string }
 */
export function buildCommand(state) {
  const {
    mode,         // "sequence" | "transcode"
    inputDir,
    inputFile,
    pattern,      // e.g. "frame_%04d.png"
    fps,
    codec,
    crf,
    pixFmt,
    outputName,
    outputPath,   // full output path (optional)
    startFrame,   // for sequence mode
    threads,      // 0 = auto
    // transcode specific
    trimStart,
    trimEnd,
    // audio
    audioNormalize,
    audioVolume,
  } = state;

  const args = [];

  if (mode === "sequence") {
    if (startFrame && startFrame > 1) {
      args.push("-start_number", String(startFrame));
    }
    args.push("-framerate", String(fps));
    const inputPath = inputDir
      ? `${inputDir}\\${pattern}`
      : pattern;
    args.push("-i", inputPath);
  } else {
    // transcode
    if (trimStart) args.push("-ss", trimStart);
    if (trimEnd) args.push("-to", trimEnd);
    args.push("-i", inputFile || "input.mp4");
  }

  // Threads — limit CPU usage
  if (threads && threads > 0) {
    args.push("-threads", String(threads));
  }

  // Codec
  const codecMap = {
    "H.264":  "libx264",
    "H.265":  "libx265",
    "ProRes": "prores_ks",
    "DNxHD":  "dnxhd",
    "Copy":   "copy",
  };
  const libCodec = codecMap[codec] || "libx264";

  args.push("-c:v", libCodec);

  // Quality — CRF only applies to x264/x265
  if (["libx264", "libx265"].includes(libCodec)) {
    args.push("-crf", String(crf));
  }

  // ProRes profile
  if (libCodec === "prores_ks") {
    args.push("-profile:v", "3"); // ProRes 422 HQ
  }

  // Pixel format
  if (pixFmt && libCodec !== "copy") {
    args.push("-pix_fmt", pixFmt);
  }

  // Audio filters
  const audioFilters = [];
  if (audioNormalize) {
    audioFilters.push("loudnorm=I=-16:LRA=11:TP=-1.5");
  }
  if (audioVolume !== undefined && audioVolume !== 1.0) {
    audioFilters.push(`volume=${audioVolume}`);
  }
  if (audioFilters.length > 0) {
    args.push("-af", audioFilters.join(","));
  }

  // faststart for web-friendly mp4
  if (outputName?.endsWith(".mp4")) {
    args.push("-movflags", "+faststart");
  }

  args.push(outputPath || outputName || "output.mp4");

  // Human-readable command string (for display)
  const cmdString = ["ffmpeg", ...args]
    .map((a) => (a.includes(" ") ? `"${a}"` : a))
    .join(" ");

  return { args, cmdString };
}

/**
 * Tokenise a command string into segments with type hints for syntax highlighting.
 * Returns: Array<{ text: string, type: "bin" | "flag" | "value" }>
 */
export function tokenizeCommand(cmdString) {
  const tokens = [];
  const parts = cmdString.match(/"[^"]*"|\S+/g) || [];

  parts.forEach((part, i) => {
    if (i === 0) {
      tokens.push({ text: part, type: "bin" });
    } else if (part.startsWith("-")) {
      tokens.push({ text: " " + part, type: "flag" });
    } else {
      tokens.push({ text: " " + part, type: "value" });
    }
  });

  return tokens;
}

export const CODEC_EXTENSIONS = {
  "H.264":  ".mp4",
  "H.265":  ".mp4",
  "ProRes": ".mov",
  "DNxHD":  ".mxf",
  "Copy":   ".mp4",
};

export const PIX_FMTS = {
  "H.264":  ["yuv420p", "yuv444p"],
  "H.265":  ["yuv420p", "yuv420p10le", "yuv444p"],
  "ProRes": ["yuv422p10le", "yuv4444p"],
  "DNxHD":  ["yuv422p"],
  "Copy":   [],
};
