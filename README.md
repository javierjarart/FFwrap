# ffwrap

GUI wrapper de FFmpeg para secuencias de imágenes y transcoding.
Construido con Tauri + React + JetBrains Mono.

## Features

- **Sequence → video**: PNG / EXR / TIFF / TGA → MP4, MOV, MXF
- **Transcode**: cambiar codec/CRF/pix_fmt de cualquier video
- Detección automática del patrón de frames (`frame_%04d.png`, etc.)
- Preview del comando FFmpeg generado en tiempo real
- Log de output con colores por nivel
- Progress bar con frame count, fps, y velocidad de encode
- FFmpeg bundleado — no requiere instalación en el sistema

---

## Setup (Windows)

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
git clone https://github.com/tu-usuario/ffwrap.git
cd ffwrap
npm install
```

### 3. Bundlear FFmpeg

Descarga la build estática de FFmpeg para Windows desde:
https://www.gyan.dev/ffmpeg/builds/ → `ffmpeg-release-essentials.zip`

Extrae y copia `ffmpeg.exe` a:
```
ffwrap/src-tauri/resources/ffmpeg.exe
```

> El archivo `ffmpeg.exe` (~100MB) no se incluye en el repo por tamaño.
> Tauri lo bundlea automáticamente al hacer build gracias a la config `"resources": ["resources/*"]`.

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

## Estructura

```
ffwrap/
├── src-tauri/
│   ├── src/
│   │   ├── main.rs       # Entry point Tauri, registro de comandos
│   │   ├── ffmpeg.rs     # Spawn proceso FFmpeg, stream de eventos
│   │   └── probe.rs      # Detección automática de patrón de frames
│   ├── resources/
│   │   └── ffmpeg.exe    # ← copiar aquí (no incluido en repo)
│   └── tauri.conf.json
├── src/
│   ├── App.jsx           # UI principal
│   ├── components/
│   │   ├── DropZone.jsx      # Selector de carpeta/archivo
│   │   ├── CommandPreview.jsx # Comando FFmpeg con syntax highlighting
│   │   └── LogPanel.jsx      # Log de output en tiempo real
│   └── lib/
│       └── buildCommand.js   # Construcción del comando (pura, sin efectos)
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
3. Si necesita acceso al filesystem fuera de los permisos actuales, actualizar `allowlist` en `tauri.conf.json`
