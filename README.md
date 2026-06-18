# FFwrap

<p align="center">
  <b>GUI wrapper de FFmpeg</b> — convierte secuencias de imágenes a video y transcodifica archivos.
</p>

<p align="center">
  <a href="https://github.com/javierjarart/FFwrap/releases/latest"><img src="https://img.shields.io/github/v/release/javierjarart/FFwrap?style=flat-square&label=versión&color=C8FF00&labelColor=1A1A1A" alt="Release"></a>
  <a href="https://github.com/javierjarart/FFwrap/actions/workflows/build.yml"><img src="https://img.shields.io/github/actions/workflow/status/javierjarart/FFwrap/build.yml?style=flat-square&label=build&color=C8FF00&labelColor=1A1A1A" alt="Build"></a>
  <a href="https://github.com/javierjarart/FFwrap/actions/workflows/build.yml"><img src="https://img.shields.io/github/actions/workflow/status/javierjarart/FFwrap/build.yml?style=flat-square&label=tests&color=C8FF00&labelColor=1A1A1A" alt="Tests"></a>
  <a href="https://tauri.app"><img src="https://img.shields.io/badge/Tauri-1.6-C8FF00?style=flat-square&labelColor=1A1A1A" alt="Tauri"></a>
  <a href="https://react.dev"><img src="https://img.shields.io/badge/React-18-C8FF00?style=flat-square&labelColor=1A1A1A" alt="React"></a>
  <a href="https://ffmpeg.org"><img src="https://img.shields.io/badge/FFmpeg-bundleado-C8FF00?style=flat-square&labelColor=1A1A1A" alt="FFmpeg"></a>
  <a href="https://github.com/javierjarart/FFwrap"><img src="https://img.shields.io/badge/platform-Windows-C8FF00?style=flat-square&labelColor=1A1A1A" alt="Windows"></a>
</p>

![screenshot](screenshot.png)

## Descargar

Descarga el instalador desde [Releases](https://github.com/javierjarart/FFwrap/releases):
- **`.msi`** — Instalador de Windows
- **`.exe`** — Instalador NSIS (portable)

FFmpeg ya viene incluido — no necesitas instalarlo por separado.

---

## Cómo usar

### Secuencia de imágenes → video

1. Selecciona **sequence → video**
2. Elige la carpeta con tus frames (PNG, EXR, TIFF, TGA)
3. Ajusta framerate, codec, calidad y formato de píxel
4. Opcional: elige carpeta de salida con **Browse** y limita el uso de CPU con el slider **threads**
5. Presiona **Render**

### Transcodificar video

1. Selecciona **transcode**
2. Elige el archivo de video
3. Cambia codec, calidad, recorta con trim in/out
4. Presiona **Render**

---

## Features

- **Sequence → video**: PNG / EXR / TIFF / TGA → MP4, MOV, MXF
- **Transcode**: cambiar codec, calidad (CRF), píxel format, recortar
- **Detección automática** del patrón de frames (`frame_%04d.png`)
- **Selector de carpeta de salida** — elige dónde guardar el resultado
- **Control de hilos** — limita el uso de CPU durante el render
- **Prioridad baja** automática — FFmpeg se ejecuta en idle/low priority para no saturar el PC
- **Preview del comando** FFmpeg en tiempo real
- **Barra de progreso** con porcentaje, frames, fps y velocidad
- **Log** con colores por nivel (info, warn, error)
- **FFmpeg bundleado** — no requiere instalación en el sistema

## Codecs soportados

| Codec  | Contenedor | Notas                        |
|--------|-----------|------------------------------|
| H.264  | .mp4      | CRF 0–51, yuv420p por defecto |
| H.265  | .mp4      | CRF 0–51, soporte 10-bit     |
| ProRes | .mov      | Profile 422 HQ, macOS-friendly|
| DNxHD  | .mxf      | Avid-compatible               |

## Atajos

- **Render**: Inicia o cancela el proceso
- **Browse** (en output): abre el diálogo Guardar como para elegir carpeta y nombre
- **Threads**: 0 = automático (usa todos los núcleos), 1–16 = limitar uso de CPU
