// ─────────────────────────────────────────────────
// Tauri Bridge — React ↔ Rust IPC
// ─────────────────────────────────────────────────
// Provides typed wrappers around Tauri invoke() calls.
// Falls back gracefully when running in a normal browser (non-Tauri).

import { invoke } from '@tauri-apps/api/core';

/** Whether we're running inside a Tauri native window. */
export const isTauri = (): boolean => {
    return '__TAURI_INTERNALS__' in window;
};

// ── Types ──────────────────────────────────────────

export interface EngineStatus {
    initialized: boolean;
    renderer_backend: string;
    scene_node_count: number;
}

// ── IPC Commands ───────────────────────────────────

/** Health check — returns a version string from Rust. */
export async function ping(): Promise<string> {
    if (!isTauri()) return 'Browser mode — Tauri not available';
    return invoke<string>('ping');
}

/** Get the current engine status. */
export async function getEngineStatus(): Promise<EngineStatus> {
    if (!isTauri()) {
        return {
            initialized: false,
            renderer_backend: 'Browser (no native engine)',
            scene_node_count: 0,
        };
    }
    return invoke<EngineStatus>('get_engine_status');
}

/** Add a colored rectangle to the scene. Returns node ID. */
export async function addRect(
    x: number, y: number, w: number, h: number,
    r: number, g: number, b: number, a: number,
): Promise<number> {
    if (!isTauri()) return -1;
    return invoke<number>('add_rect', { x, y, w, h, r, g, b, a });
}
