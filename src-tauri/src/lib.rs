// ─────────────────────────────────────────────────
// ACE Tauri App — library entry point
// ─────────────────────────────────────────────────

use serde::{Deserialize, Serialize};
use tauri::Manager;

/// Engine status exposed to the React frontend.
#[derive(Clone, Serialize, Deserialize)]
pub struct EngineStatus {
    pub initialized: bool,
    pub renderer_backend: String,
    pub scene_node_count: usize,
}

/// IPC: Get engine status.
#[tauri::command]
fn get_engine_status() -> EngineStatus {
    EngineStatus {
        initialized: true,
        renderer_backend: "wgpu (Metal/Vulkan)".into(),
        scene_node_count: 0,
    }
}

/// IPC: Add a rectangle to the scene (demo).
#[tauri::command]
fn add_rect(x: f32, y: f32, w: f32, h: f32, r: f32, g: f32, b: f32, a: f32) -> u64 {
    log::info!("add_rect({x},{y},{w},{h}) color=({r},{g},{b},{a})");
    // Will be wired to actual engine in next steps
    0
}

/// IPC: Ping — health check.
#[tauri::command]
fn ping() -> String {
    "ACE Engine v0.1.0 — alive".into()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_log::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            ping,
            get_engine_status,
            add_rect,
        ])
        .setup(|app| {
            log::info!("🚀 ACE Engine starting...");

            // Get the main window and set a good default size
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.set_title("ACE – Autonomous Creative Engine");
            }

            log::info!("✅ ACE Engine ready");
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running ACE");
}
