// ─────────────────────────────────────────────────
// ACE Engine — Core rendering engine (wgpu)
// ─────────────────────────────────────────────────

pub mod animation;
pub mod commands;
pub mod effects;
pub mod interaction;
pub mod renderer;
pub mod scene;
pub mod wasm;

use renderer::Renderer;
use scene::SceneGraph;

/// The main ACE engine handle.
pub struct AceEngine {
    pub renderer: Renderer,
    pub scene: SceneGraph,
}

impl AceEngine {
    /// Create a new engine instance from a wgpu device + queue.
    pub fn new(
        device: std::sync::Arc<wgpu::Device>,
        queue: std::sync::Arc<wgpu::Queue>,
        surface_format: wgpu::TextureFormat,
        width: u32,
        height: u32,
    ) -> Self {
        let renderer = Renderer::new(device, queue, surface_format, width, height);
        let scene = SceneGraph::new();
        Self { renderer, scene }
    }

    /// Resize the rendering surface.
    pub fn resize(&mut self, width: u32, height: u32) {
        self.renderer.resize(width, height);
    }

    /// Render the current scene to the given texture view.
    pub fn render(&mut self, view: &wgpu::TextureView) {
        self.renderer.render(view, &self.scene);
    }
}
