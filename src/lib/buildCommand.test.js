import { describe, it, expect } from "vitest";
import { buildCommand, tokenizeCommand, CODEC_EXTENSIONS, PIX_FMTS } from "./buildCommand";

describe("buildCommand", () => {
  const defaults = {
    mode: "sequence",
    inputDir: "",
    inputFile: "",
    pattern: "frame_%04d.png",
    fps: 30,
    codec: "H.264",
    crf: 18,
    pixFmt: "yuv420p",
    outputName: "output.mp4",
    outputPath: "",
    threads: 0,
    startFrame: 0,
    trimStart: "",
    trimEnd: "",
    audioNormalize: false,
    audioVolume: 1.0,
  };

  it("builds default sequence command", () => {
    const { args, cmdString } = buildCommand(defaults);
    expect(args).toContain("-framerate");
    expect(args).toContain("30");
    expect(args).toContain("-i");
    expect(args).toContain("-c:v");
    expect(args).toContain("libx264");
    expect(args).toContain("-crf");
    expect(args).toContain("18");
    expect(args).toContain("-pix_fmt");
    expect(args).toContain("yuv420p");
    expect(args).toContain("-movflags");
    expect(args).toContain("+faststart");
    expect(args[args.length - 1]).toBe("output.mp4");
    expect(cmdString).toContain("ffmpeg");
  });

  it("handles sequence mode with inputDir", () => {
    const { args } = buildCommand({ ...defaults, inputDir: "C:\\frames" });
    const iIndex = args.indexOf("-i");
    expect(args[iIndex + 1]).toBe("C:\\frames\\frame_%04d.png");
  });

  it("handles sequence mode without inputDir", () => {
    const { args } = buildCommand(defaults);
    const iIndex = args.indexOf("-i");
    expect(args[iIndex + 1]).toBe("frame_%04d.png");
  });

  it("adds start_number when startFrame > 1", () => {
    const { args } = buildCommand({ ...defaults, startFrame: 100 });
    expect(args).toContain("-start_number");
    expect(args).toContain("100");
  });

  it("does not add start_number when startFrame <= 1", () => {
    const { args } = buildCommand({ ...defaults, startFrame: 1 });
    expect(args).not.toContain("-start_number");
  });

  it("builds transcode command", () => {
    const { args } = buildCommand({
      ...defaults,
      mode: "transcode",
      inputFile: "input.mp4",
    });
    const iIndex = args.indexOf("-i");
    expect(args[iIndex + 1]).toBe("input.mp4");
    expect(args).not.toContain("-framerate");
  });

  it("adds trim flags in transcode mode", () => {
    const { args } = buildCommand({
      ...defaults,
      mode: "transcode",
      inputFile: "input.mp4",
      trimStart: "00:01:00",
      trimEnd: "00:02:00",
    });
    expect(args).toContain("-ss");
    expect(args).toContain("00:01:00");
    expect(args).toContain("-to");
    expect(args).toContain("00:02:00");
  });

  it.each(["H.264", "H.265", "ProRes", "DNxHD"])("handles codec %s", (codec) => {
    const { args } = buildCommand({ ...defaults, codec });
    expect(args).toContain("-c:v");
  });

  it("adds threads when specified", () => {
    const { args } = buildCommand({ ...defaults, threads: 2 });
    expect(args).toContain("-threads");
    expect(args).toContain("2");
  });

  it("does not add threads when 0", () => {
    const { args } = buildCommand({ ...defaults, threads: 0 });
    expect(args).not.toContain("-threads");
  });

  it("uses outputPath over outputName", () => {
    const { args } = buildCommand({
      ...defaults,
      outputPath: "/home/videos/output.mov",
      outputName: "output.mp4",
    });
    expect(args[args.length - 1]).toBe("/home/videos/output.mov");
  });

  it("falls back to output.mp4 when neither outputPath nor outputName", () => {
    const { args } = buildCommand({
      ...defaults,
      outputPath: "",
      outputName: "",
    });
    expect(args[args.length - 1]).toBe("output.mp4");
  });

  it("adds audio normalize filter", () => {
    const { args } = buildCommand({ ...defaults, audioNormalize: true });
    expect(args).toContain("-af");
    expect(args[args.indexOf("-af") + 1]).toContain("loudnorm");
  });

  it("adds volume filter when not 1.0", () => {
    const { args } = buildCommand({ ...defaults, audioVolume: 0.5 });
    expect(args).toContain("-af");
    expect(args[args.indexOf("-af") + 1]).toContain("volume=0.5");
  });

  it("combines audio filters", () => {
    const { args } = buildCommand({
      ...defaults,
      audioNormalize: true,
      audioVolume: 0.5,
    });
    const af = args[args.indexOf("-af") + 1];
    expect(af).toContain("loudnorm");
    expect(af).toContain("volume=0.5");
  });

  it("does not add audio filters when normalize off and volume 1.0", () => {
    const { args } = buildCommand(defaults);
    expect(args).not.toContain("-af");
  });

  it("adds movflags faststart for mp4 output", () => {
    const { args } = buildCommand({ ...defaults, outputName: "video.mp4" });
    expect(args).toContain("-movflags");
    expect(args).toContain("+faststart");
  });

  it("does not add movflags for non-mp4 output", () => {
    const { args } = buildCommand({ ...defaults, outputName: "video.mov" });
    expect(args).not.toContain("-movflags");
  });

  it("adds pix_fmt when provided and codec is not copy", () => {
    const { args } = buildCommand({ ...defaults, pixFmt: "yuv444p" });
    expect(args).toContain("-pix_fmt");
    expect(args).toContain("yuv444p");
  });

  it("does not add pix_fmt for copy codec", () => {
    const { args } = buildCommand({ ...defaults, codec: "Copy", pixFmt: "" });
    expect(args).not.toContain("-pix_fmt");
  });
});

describe("tokenizeCommand", () => {
  it("tokenizes a simple command", () => {
    const tokens = tokenizeCommand("ffmpeg -i input.mp4 output.mp4");
    expect(tokens[0]).toEqual({ text: "ffmpeg", type: "bin" });
    expect(tokens[1]).toEqual({ text: " -i", type: "flag" });
    expect(tokens[2]).toEqual({ text: " input.mp4", type: "value" });
    expect(tokens[3]).toEqual({ text: " output.mp4", type: "value" });
  });

  it("handles empty string", () => {
    expect(tokenizeCommand("")).toEqual([]);
  });

  it("handles quoted values", () => {
    const tokens = tokenizeCommand('ffmpeg -i "input file.mp4"');
    expect(tokens[2].text).toBe(' "input file.mp4"');
    expect(tokens[2].type).toBe("value");
  });
});

describe("CODEC_EXTENSIONS", () => {
  it("maps each codec to an extension", () => {
    expect(CODEC_EXTENSIONS["H.264"]).toBe(".mp4");
    expect(CODEC_EXTENSIONS["H.265"]).toBe(".mp4");
    expect(CODEC_EXTENSIONS["ProRes"]).toBe(".mov");
    expect(CODEC_EXTENSIONS["DNxHD"]).toBe(".mxf");
    expect(CODEC_EXTENSIONS["Copy"]).toBe(".mp4");
  });
});

describe("PIX_FMTS", () => {
  it("provides pixel formats for each codec", () => {
    expect(PIX_FMTS["H.264"]).toContain("yuv420p");
    expect(PIX_FMTS["H.265"]).toContain("yuv420p10le");
    expect(PIX_FMTS["ProRes"]).toContain("yuv422p10le");
    expect(PIX_FMTS["DNxHD"]).toContain("yuv422p");
    expect(PIX_FMTS["Copy"]).toEqual([]);
  });
});
