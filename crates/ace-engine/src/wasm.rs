// ─────────────────────────────────────────────────
// WASM Entry — Browser-side WebGPU rendering bridge
// ─────────────────────────────────────────────────
// This module is only compiled for wasm32 targets.
// It exposes a JS-callable API for initializing the
// wgpu renderer on an HTML canvas element.

#[cfg(target_arch = "wasm32")]
use wasm_bindgen::prelude::*;

#[cfg(target_arch = "wasm32")]
use std::sync::Arc;

#[cfg(target_arch = "wasm32")]
use web_sys::HtmlCanvasElement;

use crate::animation::{AnimationClip, Easing, Property, Timeline};
use crate::commands::{Command, CommandHistory};
use crate::interaction::{HitResult, InteractionState};
use crate::renderer::Renderer;
use crate::scene::SceneGraph;

/// The WASM-facing engine handle, stored as a JS object.
#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub struct WasmEngine {
    renderer: Renderer,
    scene: SceneGraph,
    interaction: InteractionState,
    commands: CommandHistory,
    timeline: Timeline,
    last_frame_time: Option<f64>,
    surface: wgpu::Surface<'static>,
    surface_config: wgpu::SurfaceConfiguration,
    device: Arc<wgpu::Device>,
    queue: Arc<wgpu::Queue>,
}

#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
impl WasmEngine {
    /// Initialize the WebGPU engine on a canvas element.
    #[wasm_bindgen(constructor)]
    pub async fn new(canvas: HtmlCanvasElement) -> Result<WasmEngine, JsValue> {
        console_error_panic_hook::set_once();
        console_log::init_with_level(log::Level::Info).ok(); // ignore if already set

        log::info!("🚀 ACE WASM Engine: initializing WebGPU...");

        let width = canvas.client_width().max(1) as u32;
        let height = canvas.client_height().max(1) as u32;

        // Create wgpu instance with WebGPU backend
        let instance = wgpu::Instance::new(&wgpu::InstanceDescriptor {
            backends: wgpu::Backends::BROWSER_WEBGPU,
            ..Default::default()
        });

        // Create surface from canvas
        let surface = instance
            .create_surface(wgpu::SurfaceTarget::Canvas(canvas))
            .map_err(|e| JsValue::from_str(&format!("Surface error: {e}")))?;

        // Request adapter
        let adapter = instance
            .request_adapter(&wgpu::RequestAdapterOptions {
                power_preference: wgpu::PowerPreference::HighPerformance,
                compatible_surface: Some(&surface),
                force_fallback_adapter: false,
            })
            .await
            .ok_or_else(|| JsValue::from_str("No WebGPU adapter found"))?;

        log::info!("✅ Adapter: {:?}", adapter.get_info().name);

        // Request device
        let (device, queue) = adapter
            .request_device(&wgpu::DeviceDescriptor::default(), None)
            .await
            .map_err(|e| JsValue::from_str(&format!("Device error: {e}")))?;

        let device = Arc::new(device);
        let queue = Arc::new(queue);

        // Configure surface
        let surface_caps = surface.get_capabilities(&adapter);
        let format = surface_caps
            .formats
            .iter()
            .find(|f| f.is_srgb())
            .copied()
            .unwrap_or(surface_caps.formats[0]);

        let surface_config = wgpu::SurfaceConfiguration {
            usage: wgpu::TextureUsages::RENDER_ATTACHMENT,
            format,
            width,
            height,
            present_mode: wgpu::PresentMode::AutoVsync,
            alpha_mode: surface_caps.alpha_modes[0],
            view_formats: vec![],
            desired_maximum_frame_latency: 2,
        };
        surface.configure(&device, &surface_config);

        // Create renderer
        let renderer = Renderer::new(
            Arc::clone(&device),
            Arc::clone(&queue),
            format,
            width,
            height,
        );

        let scene = SceneGraph::new();
        let interaction = InteractionState::new();
        let commands = CommandHistory::new();
        let timeline = Timeline::new();

        log::info!("✅ ACE WASM Engine ready — {}x{}, format={:?}", width, height, format);

        Ok(WasmEngine {
            renderer,
            scene,
            interaction,
            commands,
            timeline,
            last_frame_time: None,
            surface,
            surface_config,
            device,
            queue,
        })
    }

    // ── Surface management ──────────────────────────

    /// Resize the rendering surface.
    pub fn resize(&mut self, width: u32, height: u32) {
        if width == 0 || height == 0 {
            return;
        }
        self.surface_config.width = width;
        self.surface_config.height = height;
        self.surface.configure(&self.device, &self.surface_config);
        self.renderer.resize(width, height);
    }

    // ── Scene: Add elements ─────────────────────────

    /// Add a colored rectangle to the scene. Returns node ID.
    pub fn add_rect(&mut self, x: f32, y: f32, w: f32, h: f32, r: f32, g: f32, b: f32, a: f32) -> u32 {
        self.scene.add_rect(x, y, w, h, [r, g, b, a])
    }

    /// Add a rounded rectangle. Returns node ID.
    pub fn add_rounded_rect(&mut self, x: f32, y: f32, w: f32, h: f32, r: f32, g: f32, b: f32, a: f32, radius: f32) -> u32 {
        self.scene.add_rounded_rect(x, y, w, h, [r, g, b, a], radius)
    }

    /// Add an ellipse (circle if w == h). Returns node ID.
    pub fn add_ellipse(&mut self, cx: f32, cy: f32, rx: f32, ry: f32, r: f32, g: f32, b: f32, a: f32) -> u32 {
        self.scene.add_ellipse(cx, cy, rx, ry, [r, g, b, a])
    }

    /// Add a gradient-filled rectangle. Returns node ID.
    pub fn add_gradient_rect(
        &mut self, x: f32, y: f32, w: f32, h: f32,
        r1: f32, g1: f32, b1: f32, a1: f32,
        r2: f32, g2: f32, b2: f32, a2: f32,
        angle_deg: f32,
    ) -> u32 {
        self.scene.add_gradient_rect(x, y, w, h, [r1, g1, b1, a1], [r2, g2, b2, a2], angle_deg)
    }

    /// Clear the scene.
    pub fn clear(&mut self) {
        self.scene = SceneGraph::new();
        self.interaction.deselect_all();
    }

    /// Get the number of scene nodes.
    pub fn node_count(&self) -> usize {
        self.scene.len()
    }

    // ── Interaction: Hit test ───────────────────────

    /// Hit test at pixel coordinates. Returns a JSON string:
    /// { "type": "none" | "node" | "handle", "id": u64?, "handle": string? }
    pub fn hit_test(&self, px: f32, py: f32) -> String {
        let result = self.interaction.hit_test(px, py, &self.scene);
        match result {
            HitResult::None => r#"{"type":"none"}"#.to_string(),
            HitResult::Node(id) => format!(r#"{{"type":"node","id":{id}}}"#),
            HitResult::Handle(id, handle) => {
                format!(r#"{{"type":"handle","id":{id},"handle":"{handle:?}"}}"#)
            }
        }
    }

    // ── Interaction: Selection ──────────────────────

    /// Select a single node (clears previous).
    pub fn select(&mut self, id: u32) {
        self.interaction.select(id);
    }

    /// Toggle selection (for multi-select with Shift).
    pub fn toggle_select(&mut self, id: u32) {
        self.interaction.toggle_select(id);
    }

    /// Deselect all.
    pub fn deselect_all(&mut self) {
        self.interaction.deselect_all();
    }

    /// Get selected node IDs as JSON array.
    pub fn get_selection(&self) -> String {
        serde_json::to_string(&self.interaction.selection).unwrap_or_else(|_| "[]".to_string())
    }

    // ── Interaction: Drag move ──────────────────────

    /// Begin dragging selected elements.
    pub fn start_move(&mut self, px: f32, py: f32) {
        let mouse = glam::Vec2::new(px, py);
        self.interaction.start_move(mouse, &self.scene);
    }

    /// Begin resizing a node via a handle.
    pub fn start_resize(&mut self, node_id: u32, handle_name: &str, px: f32, py: f32) {
        use crate::interaction::HandleKind;
        let handle = match handle_name {
            "TopLeft" => HandleKind::TopLeft,
            "TopRight" => HandleKind::TopRight,
            "BottomLeft" => HandleKind::BottomLeft,
            "BottomRight" => HandleKind::BottomRight,
            "Top" => HandleKind::Top,
            "Bottom" => HandleKind::Bottom,
            "Left" => HandleKind::Left,
            "Right" => HandleKind::Right,
            _ => return,
        };
        let mouse = glam::Vec2::new(px, py);
        self.interaction.start_resize(mouse, node_id, handle, &self.scene);
    }

    /// Update drag with new mouse position.
    pub fn update_drag(&mut self, px: f32, py: f32) {
        let mouse = glam::Vec2::new(px, py);
        self.interaction.update_drag(mouse, &mut self.scene);
    }

    /// End the current drag operation (with undo support).
    pub fn end_drag(&mut self) {
        use crate::interaction::DragMode;

        let drag = self.interaction.end_drag(&self.scene);

        match drag {
            DragMode::Move { original_positions, .. } => {
                // Compute total delta by comparing any node's original vs current position
                if let Some(&(id, orig_pos)) = original_positions.first() {
                    if let Some(node) = self.scene.get_node(id) {
                        let delta = node.transform.position - orig_pos;
                        // Only push if actually moved
                        if delta.x.abs() > 0.5 || delta.y.abs() > 0.5 {
                            let ids: Vec<u32> = original_positions.iter().map(|(id, _)| *id).collect();
                            let cmd = Command::MoveNodes { ids, delta };
                            // Don't apply — already applied during drag. Just push to stack.
                            self.commands.push_without_apply(cmd);
                        }
                    }
                }
            }
            DragMode::Resize { node_id, original_pos, original_size, .. } => {
                if let Some(node) = self.scene.get_node(node_id) {
                    let new_pos = node.transform.position;
                    let new_size = node.transform.scale;
                    // Only push if actually resized
                    let pos_changed = (new_pos - original_pos).length() > 0.5;
                    let size_changed = (new_size - original_size).length() > 0.5;
                    if pos_changed || size_changed {
                        let cmd = Command::ResizeNode {
                            id: node_id,
                            old_pos: original_pos,
                            old_size: original_size,
                            new_pos,
                            new_size,
                        };
                        self.commands.push_without_apply(cmd);
                    }
                }
            }
            _ => {} // Idle, RubberBand — no undo needed
        }
    }

    // ── Commands: Undo/Redo ─────────────────────────

    /// Delete selected nodes (with undo support).
    pub fn delete_selected(&mut self) {
        let ids = self.interaction.selection.clone();
        if ids.is_empty() { return; }

        let snapshots: Vec<_> = ids.iter()
            .filter_map(|&id| self.scene.snapshot_node(id))
            .collect();

        let cmd = Command::DeleteNodes { snapshots };
        self.commands.execute(cmd, &mut self.scene);
        self.interaction.deselect_all();
    }

    /// Undo the last command.
    pub fn undo(&mut self) -> bool {
        self.commands.undo(&mut self.scene)
    }

    /// Redo the last undone command.
    pub fn redo(&mut self) -> bool {
        self.commands.redo(&mut self.scene)
    }

    pub fn can_undo(&self) -> bool { self.commands.can_undo() }
    pub fn can_redo(&self) -> bool { self.commands.can_redo() }

    // ── Node Properties ─────────────────────────────

    /// Set opacity of a node (0.0 to 1.0).
    pub fn set_opacity(&mut self, node_id: u32, opacity: f32) {
        self.scene.set_opacity(node_id, opacity.clamp(0.0, 1.0));
    }

    /// Set z-index (layer order) of a node.
    pub fn set_z_index(&mut self, node_id: u32, z: i32) {
        self.scene.set_z_index(node_id, z);
    }

    /// Set position of a node.
    pub fn set_position(&mut self, node_id: u32, x: f32, y: f32) {
        self.scene.set_position(node_id, glam::Vec2::new(x, y));
    }

    /// Set size of a node.
    pub fn set_size(&mut self, node_id: u32, w: f32, h: f32) {
        self.scene.set_size(node_id, glam::Vec2::new(w.max(1.0), h.max(1.0)));
    }

    /// Set the fill color of a node.
    pub fn set_fill_color(&mut self, node_id: u32, r: f32, g: f32, b: f32, a: f32) {
        if let Some(node) = self.scene.get_node_mut(node_id) {
            let color = [r.clamp(0.0, 1.0), g.clamp(0.0, 1.0), b.clamp(0.0, 1.0), a.clamp(0.0, 1.0)];
            match &mut node.element {
                crate::scene::ElementKind::Rect { fill, .. } => {
                    *fill = crate::scene::Fill::Solid(color);
                }
                crate::scene::ElementKind::Ellipse { fill } => {
                    *fill = crate::scene::Fill::Solid(color);
                }
            }
        }
    }

    /// Get all nodes as JSON array for the layer panel.
    /// Returns: [{ id, type, x, y, w, h, opacity, z_index, fill_r, fill_g, fill_b, fill_a, border_radius }, ...]
    pub fn get_all_nodes(&self) -> String {
        let nodes: Vec<String> = self.scene.visible_nodes_sorted().iter().map(|node| {
            let (kind, fill_r, fill_g, fill_b, fill_a, br) = match &node.element {
                crate::scene::ElementKind::Rect { fill, border_radius } => {
                    let kn = if border_radius.iter().any(|r| *r > 0.0) {
                        "rounded_rect"
                    } else {
                        "rect"
                    };
                    let (r, g, b, a) = match fill {
                        crate::scene::Fill::Solid(c) => (c[0], c[1], c[2], c[3]),
                        crate::scene::Fill::LinearGradient { stops, .. } => {
                            if let Some(s) = stops.first() {
                                (s.color[0], s.color[1], s.color[2], s.color[3])
                            } else {
                                (0.5, 0.5, 0.5, 1.0)
                            }
                        }
                        crate::scene::Fill::RadialGradient { stops, .. } => {
                            if let Some(s) = stops.first() {
                                (s.color[0], s.color[1], s.color[2], s.color[3])
                            } else {
                                (0.5, 0.5, 0.5, 1.0)
                            }
                        }
                    };
                    (kn, r, g, b, a, border_radius[0])
                }
                crate::scene::ElementKind::Ellipse { fill } => {
                    let (r, g, b, a) = match fill {
                        crate::scene::Fill::Solid(c) => (c[0], c[1], c[2], c[3]),
                        _ => (0.5, 0.5, 0.5, 1.0),
                    };
                    ("ellipse", r, g, b, a, 0.0)
                }
            };
            format!(
                r#"{{"id":{},"type":"{}","x":{:.1},"y":{:.1},"w":{:.1},"h":{:.1},"opacity":{:.2},"z_index":{},"fill_r":{:.4},"fill_g":{:.4},"fill_b":{:.4},"fill_a":{:.4},"border_radius":{:.1}}}"#,
                node.id,
                kind,
                node.transform.position.x,
                node.transform.position.y,
                node.transform.scale.x,
                node.transform.scale.y,
                node.opacity,
                node.z_index,
                fill_r, fill_g, fill_b, fill_a,
                br,
            )
        }).collect();
        format!("[{}]", nodes.join(","))
    }

    // ── Overlay: Selection bounds & handles ─────────

    /// Get selection bounding box as JSON: { x, y, w, h } or null.
    pub fn selection_bounds(&self) -> String {
        match self.interaction.selection_bounds(&self.scene) {
            Some((pos, size)) => {
                format!(r#"{{"x":{},"y":{},"w":{},"h":{}}}"#, pos.x, pos.y, size.x, size.y)
            }
            None => "null".to_string(),
        }
    }

    /// Get selection handle positions as JSON array of [x, y].
    pub fn selection_handles(&self) -> String {
        let handles = self.interaction.selection_handles(&self.scene);
        let pairs: Vec<String> = handles.iter().map(|(x, y)| format!("[{x},{y}]")).collect();
        format!("[{}]", pairs.join(","))
    }

    /// Get rubber band rect as JSON: { x, y, w, h } or null.
    pub fn rubber_band_rect(&self) -> String {
        match self.interaction.rubber_band_rect() {
            Some((x, y, w, h)) => {
                format!(r#"{{"x":{x},"y":{y},"w":{w},"h":{h}}}"#)
            }
            None => "null".to_string(),
        }
    }

    // ── Effects ──────────────────────────────────────

    /// Set blend mode for a node.
    /// Modes: "normal", "multiply", "screen", "overlay", "darken", "lighten",
    ///  "color_dodge", "color_burn", "hard_light", "soft_light", "difference", "exclusion"
    pub fn set_blend_mode(&mut self, node_id: u32, mode: &str) {
        if let Some(node) = self.scene.get_node_mut(node_id) {
            node.effects.blend_mode = crate::effects::BlendMode::from_name(mode);
        }
    }

    /// Set a drop shadow on a node.
    pub fn set_shadow(&mut self, node_id: u32, offset_x: f32, offset_y: f32, blur: f32, r: f32, g: f32, b: f32, a: f32) {
        if let Some(node) = self.scene.get_node_mut(node_id) {
            node.effects.shadow = Some(crate::effects::DropShadow {
                offset_x, offset_y, blur, color: [r, g, b, a],
            });
        }
    }

    /// Remove drop shadow from a node.
    pub fn remove_shadow(&mut self, node_id: u32) {
        if let Some(node) = self.scene.get_node_mut(node_id) {
            node.effects.shadow = None;
        }
    }

    /// Set brightness (1.0 = normal).
    pub fn set_brightness(&mut self, node_id: u32, brightness: f32) {
        if let Some(node) = self.scene.get_node_mut(node_id) {
            node.effects.brightness = brightness;
        }
    }

    /// Set contrast (1.0 = normal).
    pub fn set_contrast(&mut self, node_id: u32, contrast: f32) {
        if let Some(node) = self.scene.get_node_mut(node_id) {
            node.effects.contrast = contrast;
        }
    }

    /// Set saturation (1.0 = normal, 0.0 = grayscale).
    pub fn set_saturation(&mut self, node_id: u32, saturation: f32) {
        if let Some(node) = self.scene.get_node_mut(node_id) {
            node.effects.saturation = saturation;
        }
    }

    /// Set hue rotation in degrees.
    pub fn set_hue_rotate(&mut self, node_id: u32, degrees: f32) {
        if let Some(node) = self.scene.get_node_mut(node_id) {
            node.effects.hue_rotate = degrees;
        }
    }

    // ── Animation ───────────────────────────────────

    /// Add a keyframe to the default animation clip.
    /// Creates the clip if it doesn't exist.
    /// easing: "linear", "ease", "ease_in", "ease_out", "ease_in_out", "bounce", "spring"
    pub fn add_keyframe(
        &mut self, node_id: u32, property: &str, time: f32, value: f32, easing: &str,
    ) {
        // Ensure we have at least one clip
        if self.timeline.clips.is_empty() {
            self.timeline.add_clip(AnimationClip::new("default"));
        }

        let prop = match property {
            "x" | "positionX" => Property::PositionX,
            "y" | "positionY" => Property::PositionY,
            "width" | "scaleX" => Property::ScaleX,
            "height" | "scaleY" => Property::ScaleY,
            "rotation" => Property::Rotation,
            "opacity" => Property::Opacity,
            _ => return,
        };

        let ease = match easing {
            "ease" => Easing::ease(),
            "ease_in" | "easeIn" => Easing::ease_in(),
            "ease_out" | "easeOut" => Easing::ease_out(),
            "ease_in_out" | "easeInOut" => Easing::ease_in_out(),
            "bounce" => Easing::bounce(),
            "spring" => Easing::spring(),
            _ => Easing::Linear,
        };

        let clip = &mut self.timeline.clips[0];
        let track = clip.get_or_create_track(node_id, prop);
        track.add_keyframe(time, value, ease);
        self.timeline.duration = clip.duration().max(self.timeline.duration);
    }

    /// Clear ALL keyframes for a specific node (all properties).
    /// Used when replacing an animation preset on a node.
    pub fn clear_node_keyframes(&mut self, node_id: u32) {
        if self.timeline.clips.is_empty() { return; }
        let clip = &mut self.timeline.clips[0];
        clip.tracks.retain(|t| t.node_id != node_id);
    }

    /// Clear all keyframes from the default clip.
    pub fn clear_all_keyframes(&mut self) {
        if let Some(clip) = self.timeline.clips.first_mut() {
            clip.tracks.clear();
        }
    }

    /// Set timeline duration in seconds.
    pub fn set_duration(&mut self, duration: f32) {
        self.timeline.duration = duration;
    }

    /// Set whether the animation loops.
    pub fn set_looping(&mut self, looping: bool) {
        if let Some(clip) = self.timeline.clips.first_mut() {
            clip.looping = looping;
        }
    }

    /// Play the timeline.
    pub fn anim_play(&mut self) {
        self.timeline.play();
        self.last_frame_time = None; // Reset frame time tracking
    }

    /// Pause the timeline.
    pub fn anim_pause(&mut self) {
        self.timeline.pause();
    }

    /// Stop and reset to beginning.
    pub fn anim_stop(&mut self) {
        self.timeline.stop();
        self.timeline.apply(&mut self.scene);
    }

    /// Toggle play/pause.
    pub fn anim_toggle(&mut self) {
        self.timeline.toggle_play();
        if self.timeline.playing {
            self.last_frame_time = None;
        }
    }

    /// Seek to a specific time.
    pub fn anim_seek(&mut self, time: f32) {
        self.timeline.seek(time);
        self.timeline.apply(&mut self.scene);
    }

    /// Get current playback time.
    pub fn anim_time(&self) -> f32 {
        self.timeline.current_time
    }

    /// Get timeline duration.
    pub fn anim_duration(&self) -> f32 {
        self.timeline.duration
    }

    /// Get playback progress (0.0 to 1.0).
    pub fn anim_progress(&self) -> f32 {
        self.timeline.progress()
    }

    /// Check if playing.
    pub fn anim_playing(&self) -> bool {
        self.timeline.playing
    }

    /// Set playback speed multiplier.
    pub fn anim_set_speed(&mut self, speed: f32) {
        self.timeline.speed = speed;
    }

    // ── Render ──────────────────────────────────────

    /// Render one frame to the canvas. Pass current timestamp in ms (from requestAnimationFrame).
    pub fn render_frame_at(&mut self, timestamp_ms: f64) -> Result<(), JsValue> {
        // Calculate delta time
        if let Some(last) = self.last_frame_time {
            let dt = ((timestamp_ms - last) / 1000.0) as f32;
            self.timeline.tick(dt.min(0.1)); // Cap at 100ms to avoid jumps
            self.timeline.apply(&mut self.scene);
        }
        self.last_frame_time = Some(timestamp_ms);

        self.do_render()
    }

    /// Render one frame (no animation tick — backward compatible).
    pub fn render_frame(&mut self) -> Result<(), JsValue> {
        self.do_render()
    }

    fn do_render(&mut self) -> Result<(), JsValue> {
        let output = self
            .surface
            .get_current_texture()
            .map_err(|e| JsValue::from_str(&format!("Surface texture error: {e}")))?;

        let view = output
            .texture
            .create_view(&wgpu::TextureViewDescriptor::default());

        self.renderer.render(&view, &self.scene);
        output.present();

        Ok(())
    }
}
