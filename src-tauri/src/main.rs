// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod ffmpeg;
mod probe;

use ffmpeg::{run_ffmpeg, cancel_ffmpeg};
use probe::probe_sequence;

fn main() {
  tauri::Builder::default()
    .invoke_handler(tauri::generate_handler![
      run_ffmpeg,
      cancel_ffmpeg,
      probe_sequence,
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
