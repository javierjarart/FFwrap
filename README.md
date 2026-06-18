# FFwrap

GUI wrapper de FFmpeg para secuencias de imágenes y transcoding.
Construido con Tauri + React + JetBrains Mono.

[![Build Windows](https://github.com/javierjarart/FFwrap/actions/workflows/build.yml/badge.svg)](https://github.com/javierjarart/FFwrap/actions/workflows/build.yml)

## Features

- **Sequence → video**: PNG / EXR / TIFF / TGA → MP4, MOV, MXF
- **Transcode**: cambiar codec/CRF/pix_fmt de cualquier video
- Detección automática del patrón de frames (`frame_%04d.png`, etc.)
- **Selección de carpeta de salida** mediante diálogo Guardar como
- **Control de hilos** — limita el uso de CPU durante el render
- **Prioridad baja** automática — el proceso FFmpeg se ejecuta en idle/low priority para no saturar el PC
- Preview del comando FFmpeg generado en tiempo real
- Barra de progreso con % · frames · fps · velocidad de encode
- Log de output con colores por nivel
- FFmpeg bundleado — no requiere instalación en el sistema

---

## Descargar

Los instaladores `.msi` y `.exe` se generan automáticamente via GitHub Actions.
Ve a [Releases](https://github.com/javierjarart/FFwrap/releases) y descarga la última versión.

---

## Build desde código

### Requisitos

- [Node.js](https://nodejs.org/) v18+
- [Rust](https://rustup.rs/) (stable)
- [Visual Studio C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/)
  - Workload: "Desktop development with C++"
- [WebView2](https://developer.microsoft.com/microsoft-edge/webview2/) (ya incluido en Windows 11)

### 1. Instalar Rust

```powershell
winget install Rustlang.Rustup
rustup default stable
```

### 2. Clonar y configurar

```powershell
git clone https://github.com/javierjarart/FFwrap.git
cd FFwrap
npm install
```

### 3. FFmpeg

El workflow de CI descarga `ffmpeg.exe` automáticamente desde gyan.dev.
Para build local, descárgalo manualmente:

```powershell
# Descarga ffmpeg-release-essentials.zip desde
# https://www.gyan.dev/ffmpeg/builds/
# Extrae y copia:
copy ffmpeg.exe src-tauri/resources/
```

> El archivo `ffmpeg.exe` (~100MB) no se incluye en el repo por tamaño.
> Tauri lo bundlea automáticamente gracias a `"resources": ["resources/*"]`.

### 4. Dev mode

```powershell
npm run tauri dev
```

### 5. Build para distribución

```powershell
npm run tauri build
```

El instalador `.msi` queda en `src-tauri/target/release/bundle/msi/`.

---

## CI / CD

El workflow en [`.github/workflows/build.yml`](.github/workflows/build.yml) hace build en Windows automáticamente:

- **Al pushear un tag `v*`** (ej. `v0.1.0`): genera `.msi` y `.exe` y crea un Release draft
- **Manual**: desde Actions → Build Windows → Run workflow

Flujo típico:

```bash
git tag v0.1.0
git push origin main --tags
# → Actions genera el instalador y lo deja en Releases
```

## Estructura

```
ffwrap/
├── .github/workflows/
│   └── build.yml          # CI: build Windows + release
├── src-tauri/
│   ├── src/
│   │   ├── main.rs        # Entry point Tauri
│   │   ├── ffmpeg.rs      # Spawn FFmpeg, stream de eventos
│   │   └── probe.rs       # Detección automática de patrón de frames
│   ├── icons/             # Iconos de la aplicación
│   ├── resources/
│   │   └── ffmpeg.exe     # ← se añade en CI (no incluido en repo)
│   └── tauri.conf.json
├── src/
│   ├── App.jsx            # UI principal
│   ├── components/
│   │   ├── DropZone.jsx
│   │   ├── CommandPreview.jsx
│   │   └── LogPanel.jsx
│   └── lib/
│       └── buildCommand.js
└── package.json
```

## Codecs soportados

| Codec  | Contenedor | Notas                        |
|--------|-----------|------------------------------|
| H.264  | .mp4      | CRF 0–51, yuv420p por defecto |
| H.265  | .mp4      | CRF 0–51, soporte 10-bit     |
| ProRes | .mov      | Profile 422 HQ, macOS-friendly|
| DNxHD  | .mxf      | Avid-compatible               |

## Agregar operaciones nuevas

1. Añadir la lógica en `src/lib/buildCommand.js` (función pura)
2. Agregar UI en `src/App.jsx`
3. Si necesita acceso al filesystem, actualizar `allowlist` en `tauri.conf.json`
