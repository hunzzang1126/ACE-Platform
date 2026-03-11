/* tslint:disable */
/* eslint-disable */

/**
 * The WASM-facing engine handle, stored as a JS object.
 */
export class WasmEngine {
    free(): void;
    [Symbol.dispose](): void;
    /**
     * Add an ellipse (circle if w == h). Returns node ID.
     */
    add_ellipse(cx: number, cy: number, rx: number, ry: number, r: number, g: number, b: number, a: number): number;
    /**
     * Add a gradient-filled rectangle. Returns node ID.
     */
    add_gradient_rect(x: number, y: number, w: number, h: number, r1: number, g1: number, b1: number, a1: number, r2: number, g2: number, b2: number, a2: number, angle_deg: number): number;
    /**
     * Add a keyframe to the default animation clip.
     * Creates the clip if it doesn't exist.
     * easing: "linear", "ease", "ease_in", "ease_out", "ease_in_out", "bounce", "spring"
     */
    add_keyframe(node_id: number, property: string, time: number, value: number, easing: string): void;
    /**
     * Add a colored rectangle to the scene. Returns node ID.
     */
    add_rect(x: number, y: number, w: number, h: number, r: number, g: number, b: number, a: number): number;
    /**
     * Add a rounded rectangle. Returns node ID.
     */
    add_rounded_rect(x: number, y: number, w: number, h: number, r: number, g: number, b: number, a: number, radius: number): number;
    /**
     * Get timeline duration.
     */
    anim_duration(): number;
    /**
     * Pause the timeline.
     */
    anim_pause(): void;
    /**
     * Play the timeline.
     */
    anim_play(): void;
    /**
     * Check if playing.
     */
    anim_playing(): boolean;
    /**
     * Get playback progress (0.0 to 1.0).
     */
    anim_progress(): number;
    /**
     * Seek to a specific time.
     */
    anim_seek(time: number): void;
    /**
     * Set playback speed multiplier.
     */
    anim_set_speed(speed: number): void;
    /**
     * Stop and reset to beginning.
     */
    anim_stop(): void;
    /**
     * Get current playback time.
     */
    anim_time(): number;
    /**
     * Toggle play/pause.
     */
    anim_toggle(): void;
    can_redo(): boolean;
    can_undo(): boolean;
    /**
     * Clear the scene.
     */
    clear(): void;
    /**
     * Clear all keyframes from the default clip.
     */
    clear_all_keyframes(): void;
    /**
     * Clear ALL keyframes for a specific node (all properties).
     * Used when replacing an animation preset on a node.
     */
    clear_node_keyframes(node_id: number): void;
    /**
     * Delete selected nodes (with undo support).
     */
    delete_selected(): void;
    /**
     * Deselect all.
     */
    deselect_all(): void;
    /**
     * End the current drag operation (with undo support).
     */
    end_drag(): void;
    /**
     * Get all nodes as JSON array for the layer panel.
     * Returns: [{ id, type, x, y, w, h, opacity, z_index, fill_r, fill_g, fill_b, fill_a, border_radius }, ...]
     */
    get_all_nodes(): string;
    /**
     * Get selected node IDs as JSON array.
     */
    get_selection(): string;
    /**
     * Hit test at pixel coordinates. Returns a JSON string:
     * { "type": "none" | "node" | "handle", "id": u64?, "handle": string? }
     */
    hit_test(px: number, py: number): string;
    /**
     * Initialize the WebGPU engine on a canvas element.
     */
    constructor(canvas: HTMLCanvasElement);
    /**
     * Get the number of scene nodes.
     */
    node_count(): number;
    /**
     * Redo the last undone command.
     */
    redo(): boolean;
    /**
     * Remove drop shadow from a node.
     */
    remove_shadow(node_id: number): void;
    /**
     * Render one frame (no animation tick — backward compatible).
     */
    render_frame(): void;
    /**
     * Render one frame to the canvas. Pass current timestamp in ms (from requestAnimationFrame).
     */
    render_frame_at(timestamp_ms: number): void;
    /**
     * Resize the rendering surface.
     */
    resize(width: number, height: number): void;
    /**
     * Get rubber band rect as JSON: { x, y, w, h } or null.
     */
    rubber_band_rect(): string;
    /**
     * Select a single node (clears previous).
     */
    select(id: number): void;
    /**
     * Get selection bounding box as JSON: { x, y, w, h } or null.
     */
    selection_bounds(): string;
    /**
     * Get selection handle positions as JSON array of [x, y].
     */
    selection_handles(): string;
    /**
     * Set blend mode for a node.
     * Modes: "normal", "multiply", "screen", "overlay", "darken", "lighten",
     *  "color_dodge", "color_burn", "hard_light", "soft_light", "difference", "exclusion"
     */
    set_blend_mode(node_id: number, mode: string): void;
    /**
     * Set brightness (1.0 = normal).
     */
    set_brightness(node_id: number, brightness: number): void;
    /**
     * Set contrast (1.0 = normal).
     */
    set_contrast(node_id: number, contrast: number): void;
    /**
     * Set timeline duration in seconds.
     */
    set_duration(duration: number): void;
    /**
     * Set the fill color of a node.
     */
    set_fill_color(node_id: number, r: number, g: number, b: number, a: number): void;
    /**
     * Set hue rotation in degrees.
     */
    set_hue_rotate(node_id: number, degrees: number): void;
    /**
     * Set whether the animation loops.
     */
    set_looping(looping: boolean): void;
    /**
     * Set opacity of a node (0.0 to 1.0).
     */
    set_opacity(node_id: number, opacity: number): void;
    /**
     * Set position of a node.
     */
    set_position(node_id: number, x: number, y: number): void;
    /**
     * Set saturation (1.0 = normal, 0.0 = grayscale).
     */
    set_saturation(node_id: number, saturation: number): void;
    /**
     * Set a drop shadow on a node.
     */
    set_shadow(node_id: number, offset_x: number, offset_y: number, blur: number, r: number, g: number, b: number, a: number): void;
    /**
     * Set size of a node.
     */
    set_size(node_id: number, w: number, h: number): void;
    /**
     * Set z-index (layer order) of a node.
     */
    set_z_index(node_id: number, z: number): void;
    /**
     * Begin dragging selected elements.
     */
    start_move(px: number, py: number): void;
    /**
     * Begin resizing a node via a handle.
     */
    start_resize(node_id: number, handle_name: string, px: number, py: number): void;
    /**
     * Toggle selection (for multi-select with Shift).
     */
    toggle_select(id: number): void;
    /**
     * Undo the last command.
     */
    undo(): boolean;
    /**
     * Update drag with new mouse position.
     */
    update_drag(px: number, py: number): void;
}

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly __wbg_wasmengine_free: (a: number, b: number) => void;
    readonly wasmengine_add_ellipse: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number) => number;
    readonly wasmengine_add_gradient_rect: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number, j: number, k: number, l: number, m: number, n: number) => number;
    readonly wasmengine_add_keyframe: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number) => void;
    readonly wasmengine_add_rect: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number) => number;
    readonly wasmengine_add_rounded_rect: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number, j: number) => number;
    readonly wasmengine_anim_duration: (a: number) => number;
    readonly wasmengine_anim_pause: (a: number) => void;
    readonly wasmengine_anim_play: (a: number) => void;
    readonly wasmengine_anim_playing: (a: number) => number;
    readonly wasmengine_anim_progress: (a: number) => number;
    readonly wasmengine_anim_seek: (a: number, b: number) => void;
    readonly wasmengine_anim_set_speed: (a: number, b: number) => void;
    readonly wasmengine_anim_stop: (a: number) => void;
    readonly wasmengine_anim_time: (a: number) => number;
    readonly wasmengine_anim_toggle: (a: number) => void;
    readonly wasmengine_can_redo: (a: number) => number;
    readonly wasmengine_can_undo: (a: number) => number;
    readonly wasmengine_clear: (a: number) => void;
    readonly wasmengine_clear_all_keyframes: (a: number) => void;
    readonly wasmengine_clear_node_keyframes: (a: number, b: number) => void;
    readonly wasmengine_delete_selected: (a: number) => void;
    readonly wasmengine_deselect_all: (a: number) => void;
    readonly wasmengine_end_drag: (a: number) => void;
    readonly wasmengine_get_all_nodes: (a: number) => [number, number];
    readonly wasmengine_get_selection: (a: number) => [number, number];
    readonly wasmengine_hit_test: (a: number, b: number, c: number) => [number, number];
    readonly wasmengine_new: (a: any) => any;
    readonly wasmengine_node_count: (a: number) => number;
    readonly wasmengine_redo: (a: number) => number;
    readonly wasmengine_remove_shadow: (a: number, b: number) => void;
    readonly wasmengine_render_frame: (a: number) => [number, number];
    readonly wasmengine_render_frame_at: (a: number, b: number) => [number, number];
    readonly wasmengine_resize: (a: number, b: number, c: number) => void;
    readonly wasmengine_rubber_band_rect: (a: number) => [number, number];
    readonly wasmengine_select: (a: number, b: number) => void;
    readonly wasmengine_selection_bounds: (a: number) => [number, number];
    readonly wasmengine_selection_handles: (a: number) => [number, number];
    readonly wasmengine_set_blend_mode: (a: number, b: number, c: number, d: number) => void;
    readonly wasmengine_set_brightness: (a: number, b: number, c: number) => void;
    readonly wasmengine_set_contrast: (a: number, b: number, c: number) => void;
    readonly wasmengine_set_duration: (a: number, b: number) => void;
    readonly wasmengine_set_fill_color: (a: number, b: number, c: number, d: number, e: number, f: number) => void;
    readonly wasmengine_set_hue_rotate: (a: number, b: number, c: number) => void;
    readonly wasmengine_set_looping: (a: number, b: number) => void;
    readonly wasmengine_set_opacity: (a: number, b: number, c: number) => void;
    readonly wasmengine_set_position: (a: number, b: number, c: number, d: number) => void;
    readonly wasmengine_set_saturation: (a: number, b: number, c: number) => void;
    readonly wasmengine_set_shadow: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number) => void;
    readonly wasmengine_set_size: (a: number, b: number, c: number, d: number) => void;
    readonly wasmengine_set_z_index: (a: number, b: number, c: number) => void;
    readonly wasmengine_start_move: (a: number, b: number, c: number) => void;
    readonly wasmengine_start_resize: (a: number, b: number, c: number, d: number, e: number, f: number) => void;
    readonly wasmengine_toggle_select: (a: number, b: number) => void;
    readonly wasmengine_undo: (a: number) => number;
    readonly wasmengine_update_drag: (a: number, b: number, c: number) => void;
    readonly wasm_bindgen__closure__destroy__h5b51be555499dca7: (a: number, b: number) => void;
    readonly wasm_bindgen__convert__closures_____invoke__hce63277061cedf52: (a: number, b: number, c: any, d: any) => void;
    readonly wasm_bindgen__convert__closures_____invoke__h9bdba88a2be08319: (a: number, b: number, c: any) => void;
    readonly __wbindgen_malloc: (a: number, b: number) => number;
    readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
    readonly __wbindgen_exn_store: (a: number) => void;
    readonly __externref_table_alloc: () => number;
    readonly __wbindgen_externrefs: WebAssembly.Table;
    readonly __wbindgen_free: (a: number, b: number, c: number) => void;
    readonly __externref_table_dealloc: (a: number) => void;
    readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
 * Instantiates the given `module`, which can either be bytes or
 * a precompiled `WebAssembly.Module`.
 *
 * @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
 *
 * @returns {InitOutput}
 */
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
 *
 * @returns {Promise<InitOutput>}
 */
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
