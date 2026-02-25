// ─────────────────────────────────────────────────
// Renderer — wgpu rendering pipeline with lyon
//   tessellation for shapes, gradients, z-sorting
// ─────────────────────────────────────────────────

use std::sync::Arc;
use bytemuck::{Pod, Zeroable};
use wgpu::util::DeviceExt;

use lyon::math::{point, Point};
use lyon::path::Path;
use lyon::tessellation::{
    BuffersBuilder, FillOptions, FillTessellator, FillVertex, VertexBuffers,
};

use crate::scene::{ElementKind, Fill, GradientStop, SceneGraph};

/// GPU vertex for a colored shape.
#[repr(C)]
#[derive(Clone, Copy, Pod, Zeroable)]
pub struct Vertex {
    pub position: [f32; 2],
    pub color: [f32; 4],
}

impl Vertex {
    const ATTRIBS: [wgpu::VertexAttribute; 2] = wgpu::vertex_attr_array![
        0 => Float32x2,
        1 => Float32x4,
    ];

    pub fn desc() -> wgpu::VertexBufferLayout<'static> {
        wgpu::VertexBufferLayout {
            array_stride: std::mem::size_of::<Vertex>() as wgpu::BufferAddress,
            step_mode: wgpu::VertexStepMode::Vertex,
            attributes: &Self::ATTRIBS,
        }
    }
}

/// The wgpu renderer with lyon tessellation.
pub struct Renderer {
    device: Arc<wgpu::Device>,
    queue: Arc<wgpu::Queue>,
    pipeline: wgpu::RenderPipeline,
    width: u32,
    height: u32,
}

impl Renderer {
    pub fn new(
        device: Arc<wgpu::Device>,
        queue: Arc<wgpu::Queue>,
        surface_format: wgpu::TextureFormat,
        width: u32,
        height: u32,
    ) -> Self {
        let shader = device.create_shader_module(wgpu::ShaderModuleDescriptor {
            label: Some("ace_quad_shader"),
            source: wgpu::ShaderSource::Wgsl(include_str!("shaders/quad.wgsl").into()),
        });

        let pipeline_layout = device.create_pipeline_layout(&wgpu::PipelineLayoutDescriptor {
            label: Some("ace_pipeline_layout"),
            bind_group_layouts: &[],
            push_constant_ranges: &[],
        });

        let pipeline = device.create_render_pipeline(&wgpu::RenderPipelineDescriptor {
            label: Some("ace_render_pipeline"),
            layout: Some(&pipeline_layout),
            vertex: wgpu::VertexState {
                module: &shader,
                entry_point: Some("vs_main"),
                buffers: &[Vertex::desc()],
                compilation_options: Default::default(),
            },
            fragment: Some(wgpu::FragmentState {
                module: &shader,
                entry_point: Some("fs_main"),
                targets: &[Some(wgpu::ColorTargetState {
                    format: surface_format,
                    blend: Some(wgpu::BlendState::ALPHA_BLENDING),
                    write_mask: wgpu::ColorWrites::ALL,
                })],
                compilation_options: Default::default(),
            }),
            primitive: wgpu::PrimitiveState {
                topology: wgpu::PrimitiveTopology::TriangleList,
                strip_index_format: None,
                front_face: wgpu::FrontFace::Ccw,
                cull_mode: None,
                polygon_mode: wgpu::PolygonMode::Fill,
                unclipped_depth: false,
                conservative: false,
            },
            depth_stencil: None,
            multisample: wgpu::MultisampleState::default(),
            multiview: None,
            cache: None,
        });

        Self { device, queue, pipeline, width, height }
    }

    pub fn resize(&mut self, width: u32, height: u32) {
        self.width = width;
        self.height = height;
    }

    // ── Coordinate helpers ──────────────────────────

    fn to_ndc_x(&self, px: f32) -> f32 {
        (px / self.width as f32) * 2.0 - 1.0
    }

    fn to_ndc_y(&self, py: f32) -> f32 {
        1.0 - (py / self.height as f32) * 2.0
    }

    // ── Color interpolation ─────────────────────────

    /// Sample a color from a linear gradient at normalized position t (0..1).
    fn sample_gradient(stops: &[GradientStop], t: f32) -> [f32; 4] {
        if stops.is_empty() {
            return [1.0, 1.0, 1.0, 1.0];
        }
        if stops.len() == 1 || t <= stops[0].offset {
            return stops[0].color;
        }
        if t >= stops[stops.len() - 1].offset {
            return stops[stops.len() - 1].color;
        }
        // Find the two surrounding stops
        for i in 0..stops.len() - 1 {
            let a = &stops[i];
            let b = &stops[i + 1];
            if t >= a.offset && t <= b.offset {
                let range = b.offset - a.offset;
                let frac = if range > 0.0 { (t - a.offset) / range } else { 0.0 };
                return [
                    a.color[0] + (b.color[0] - a.color[0]) * frac,
                    a.color[1] + (b.color[1] - a.color[1]) * frac,
                    a.color[2] + (b.color[2] - a.color[2]) * frac,
                    a.color[3] + (b.color[3] - a.color[3]) * frac,
                ];
            }
        }
        stops[stops.len() - 1].color
    }

    /// Compute per-vertex color based on fill type and position within the element.
    fn vertex_color(fill: &Fill, px: f32, py: f32, x: f32, y: f32, w: f32, h: f32, opacity: f32) -> [f32; 4] {
        match fill {
            Fill::Solid(c) => [c[0], c[1], c[2], c[3] * opacity],
            Fill::LinearGradient { stops, angle_deg } => {
                let angle = angle_deg.to_radians();
                let cos_a = angle.cos();
                let sin_a = angle.sin();
                // Normalized position within the element
                let nx = if w > 0.0 { (px - x) / w } else { 0.5 };
                let ny = if h > 0.0 { (py - y) / h } else { 0.5 };
                // Project onto gradient axis
                let t = (nx - 0.5) * cos_a + (ny - 0.5) * sin_a + 0.5;
                let t = t.clamp(0.0, 1.0);
                let c = Self::sample_gradient(stops, t);
                [c[0], c[1], c[2], c[3] * opacity]
            }
            Fill::RadialGradient { stops, center, radius } => {
                let nx = if w > 0.0 { (px - x) / w } else { 0.5 };
                let ny = if h > 0.0 { (py - y) / h } else { 0.5 };
                let dx = nx - center.x;
                let dy = ny - center.y;
                let dist = (dx * dx + dy * dy).sqrt();
                let t = (dist / radius).clamp(0.0, 1.0);
                let c = Self::sample_gradient(stops, t);
                [c[0], c[1], c[2], c[3] * opacity]
            }
        }
    }

    // ── Tessellation helpers ────────────────────────

    /// Build a rounded rectangle lyon path.
    fn build_rounded_rect(x: f32, y: f32, w: f32, h: f32, radii: [f32; 4]) -> Path {
        let mut builder = Path::builder();
        let [tl, tr, br, bl] = radii;

        // Clamp radii to half the smallest dimension
        let max_r = (w / 2.0).min(h / 2.0);
        let tl = tl.min(max_r);
        let tr = tr.min(max_r);
        let br = br.min(max_r);
        let bl = bl.min(max_r);

        // Start at top-left after corner
        builder.begin(point(x + tl, y));

        // Top edge → top-right corner
        builder.line_to(point(x + w - tr, y));
        if tr > 0.0 {
            builder.quadratic_bezier_to(point(x + w, y), point(x + w, y + tr));
        }

        // Right edge → bottom-right corner
        builder.line_to(point(x + w, y + h - br));
        if br > 0.0 {
            builder.quadratic_bezier_to(point(x + w, y + h), point(x + w - br, y + h));
        }

        // Bottom edge → bottom-left corner
        builder.line_to(point(x + bl, y + h));
        if bl > 0.0 {
            builder.quadratic_bezier_to(point(x, y + h), point(x, y + h - bl));
        }

        // Left edge → top-left corner
        builder.line_to(point(x, y + tl));
        if tl > 0.0 {
            builder.quadratic_bezier_to(point(x, y), point(x + tl, y));
        }

        builder.end(true);
        builder.build()
    }

    /// Build an ellipse lyon path (approximated with bezier curves).
    fn build_ellipse(cx: f32, cy: f32, rx: f32, ry: f32) -> Path {
        use std::f32::consts::FRAC_1_SQRT_2;

        let mut builder = Path::builder();
        // 4-point bezier approximation of ellipse
        let k = 0.5522847498; // magic number for cubic bezier circle approximation

        let kx = rx * k;
        let ky = ry * k;

        builder.begin(point(cx, cy - ry)); // Top

        // Top → Right
        builder.cubic_bezier_to(
            point(cx + kx, cy - ry),
            point(cx + rx, cy - ky),
            point(cx + rx, cy),
        );
        // Right → Bottom
        builder.cubic_bezier_to(
            point(cx + rx, cy + ky),
            point(cx + kx, cy + ry),
            point(cx, cy + ry),
        );
        // Bottom → Left
        builder.cubic_bezier_to(
            point(cx - kx, cy + ry),
            point(cx - rx, cy + ky),
            point(cx - rx, cy),
        );
        // Left → Top
        builder.cubic_bezier_to(
            point(cx - rx, cy - ky),
            point(cx - kx, cy - ry),
            point(cx, cy - ry),
        );

        builder.end(true);
        builder.build()
    }

    /// Tessellate a lyon path into vertex data.
    fn tessellate_path(&self, path: &Path, fill: &Fill, x: f32, y: f32, w: f32, h: f32, opacity: f32) -> Vec<Vertex> {
        let mut geometry: VertexBuffers<Vertex, u32> = VertexBuffers::new();
        let mut tessellator = FillTessellator::new();

        let renderer = self; // borrow for closures

        tessellator
            .tessellate_path(
                path,
                &FillOptions::tolerance(0.5),
                &mut BuffersBuilder::new(&mut geometry, |vertex: FillVertex| {
                    let pos = vertex.position();
                    let px = pos.x;
                    let py = pos.y;
                    let color = Self::vertex_color(fill, px, py, x, y, w, h, opacity);
                    Vertex {
                        position: [renderer.to_ndc_x(px), renderer.to_ndc_y(py)],
                        color,
                    }
                }),
            )
            .expect("tessellation failed");

        // Expand indexed triangles to vertex list
        let mut vertices = Vec::with_capacity(geometry.indices.len());
        for idx in &geometry.indices {
            vertices.push(geometry.vertices[*idx as usize]);
        }
        vertices
    }

    // ── Main render ─────────────────────────────────

    /// Render the scene to the given texture view.
    pub fn render(&self, view: &wgpu::TextureView, scene: &SceneGraph) {
        let mut all_vertices: Vec<Vertex> = Vec::new();

        // Z-sorted iteration (back to front for correct alpha blending)
        let sorted_nodes = scene.visible_nodes_sorted();

        for node in &sorted_nodes {
            let x = node.transform.position.x;
            let y = node.transform.position.y;
            let w = node.transform.scale.x;
            let h = node.transform.scale.y;
            let opacity = node.opacity;
            let effects = &node.effects;

            // ── Shadow pass (render shadow geometry behind shape) ──
            let shadow_passes = effects.shadow_passes();
            for (sx, sy, alpha) in &shadow_passes {
                let shadow_x = x + sx;
                let shadow_y = y + sy;
                let shadow_color = effects.shadow.as_ref()
                    .map(|s| [s.color[0], s.color[1], s.color[2], *alpha])
                    .unwrap_or([0.0, 0.0, 0.0, *alpha]);

                match &node.element {
                    ElementKind::Rect { border_radius, .. } => {
                        let has_radius = border_radius.iter().any(|r| *r > 0.5);
                        if has_radius {
                            let path = Self::build_rounded_rect(shadow_x, shadow_y, w, h, *border_radius);
                            let verts = self.tessellate_path(&path, &Fill::Solid(shadow_color), shadow_x, shadow_y, w, h, 1.0);
                            all_vertices.extend(verts);
                        } else {
                            let x0 = self.to_ndc_x(shadow_x);
                            let y0 = self.to_ndc_y(shadow_y);
                            let x1 = self.to_ndc_x(shadow_x + w);
                            let y1 = self.to_ndc_y(shadow_y + h);
                            all_vertices.push(Vertex { position: [x0, y0], color: shadow_color });
                            all_vertices.push(Vertex { position: [x1, y0], color: shadow_color });
                            all_vertices.push(Vertex { position: [x0, y1], color: shadow_color });
                            all_vertices.push(Vertex { position: [x0, y1], color: shadow_color });
                            all_vertices.push(Vertex { position: [x1, y0], color: shadow_color });
                            all_vertices.push(Vertex { position: [x1, y1], color: shadow_color });
                        }
                    }
                    ElementKind::Ellipse { .. } => {
                        let cx = shadow_x + w / 2.0;
                        let cy = shadow_y + h / 2.0;
                        let path = Self::build_ellipse(cx, cy, w / 2.0, h / 2.0);
                        let verts = self.tessellate_path(&path, &Fill::Solid(shadow_color), shadow_x, shadow_y, w, h, 1.0);
                        all_vertices.extend(verts);
                    }
                }
            }

            // ── Main shape pass (with color filter applied) ──
            let has_filter = (effects.brightness - 1.0).abs() > 1e-4
                || (effects.contrast - 1.0).abs() > 1e-4
                || (effects.saturation - 1.0).abs() > 1e-4
                || effects.hue_rotate.abs() > 1e-4;

            match &node.element {
                ElementKind::Rect { fill, border_radius } => {
                    let has_radius = border_radius.iter().any(|r| *r > 0.5);

                    if has_radius {
                        let path = Self::build_rounded_rect(x, y, w, h, *border_radius);
                        let mut verts = self.tessellate_path(&path, fill, x, y, w, h, opacity);
                        if has_filter {
                            for v in &mut verts { v.color = effects.apply_color_filter(v.color); }
                        }
                        all_vertices.extend(verts);
                    } else {
                        let mut c0 = Self::vertex_color(fill, x, y, x, y, w, h, opacity);
                        let mut c1 = Self::vertex_color(fill, x + w, y, x, y, w, h, opacity);
                        let mut c2 = Self::vertex_color(fill, x, y + h, x, y, w, h, opacity);
                        let mut c3 = Self::vertex_color(fill, x + w, y + h, x, y, w, h, opacity);

                        if has_filter {
                            c0 = effects.apply_color_filter(c0);
                            c1 = effects.apply_color_filter(c1);
                            c2 = effects.apply_color_filter(c2);
                            c3 = effects.apply_color_filter(c3);
                        }

                        let x0 = self.to_ndc_x(x);
                        let y0 = self.to_ndc_y(y);
                        let x1 = self.to_ndc_x(x + w);
                        let y1 = self.to_ndc_y(y + h);

                        all_vertices.push(Vertex { position: [x0, y0], color: c0 });
                        all_vertices.push(Vertex { position: [x1, y0], color: c1 });
                        all_vertices.push(Vertex { position: [x0, y1], color: c2 });
                        all_vertices.push(Vertex { position: [x0, y1], color: c2 });
                        all_vertices.push(Vertex { position: [x1, y0], color: c1 });
                        all_vertices.push(Vertex { position: [x1, y1], color: c3 });
                    }
                }

                ElementKind::Ellipse { fill } => {
                    let cx = x + w / 2.0;
                    let cy = y + h / 2.0;
                    let rx = w / 2.0;
                    let ry = h / 2.0;
                    let path = Self::build_ellipse(cx, cy, rx, ry);
                    let mut verts = self.tessellate_path(&path, fill, x, y, w, h, opacity);
                    if has_filter {
                        for v in &mut verts { v.color = effects.apply_color_filter(v.color); }
                    }
                    all_vertices.extend(verts);
                }
            }
        }

        if all_vertices.is_empty() {
            // Nothing to draw — just clear
            let mut encoder = self.device.create_command_encoder(&wgpu::CommandEncoderDescriptor {
                label: Some("ace_clear_encoder"),
            });
            {
                let _pass = encoder.begin_render_pass(&wgpu::RenderPassDescriptor {
                    label: Some("ace_clear_pass"),
                    color_attachments: &[Some(wgpu::RenderPassColorAttachment {
                        view,
                        resolve_target: None,
                        ops: wgpu::Operations {
                            load: wgpu::LoadOp::Clear(wgpu::Color {
                                r: 0.086, g: 0.098, b: 0.122, a: 1.0,
                            }),
                            store: wgpu::StoreOp::Store,
                        },
                    })],
                    depth_stencil_attachment: None,
                    timestamp_writes: None,
                    occlusion_query_set: None,
                });
            }
            self.queue.submit(std::iter::once(encoder.finish()));
            return;
        }

        let vertex_buffer = self.device.create_buffer_init(&wgpu::util::BufferInitDescriptor {
            label: Some("ace_vertex_buffer"),
            contents: bytemuck::cast_slice(&all_vertices),
            usage: wgpu::BufferUsages::VERTEX,
        });

        let mut encoder = self.device.create_command_encoder(&wgpu::CommandEncoderDescriptor {
            label: Some("ace_render_encoder"),
        });

        {
            let mut render_pass = encoder.begin_render_pass(&wgpu::RenderPassDescriptor {
                label: Some("ace_render_pass"),
                color_attachments: &[Some(wgpu::RenderPassColorAttachment {
                    view,
                    resolve_target: None,
                    ops: wgpu::Operations {
                        load: wgpu::LoadOp::Clear(wgpu::Color {
                            r: 0.086, g: 0.098, b: 0.122, a: 1.0,
                        }),
                        store: wgpu::StoreOp::Store,
                    },
                })],
                depth_stencil_attachment: None,
                timestamp_writes: None,
                occlusion_query_set: None,
            });

            render_pass.set_pipeline(&self.pipeline);
            render_pass.set_vertex_buffer(0, vertex_buffer.slice(..));
            render_pass.draw(0..all_vertices.len() as u32, 0..1);
        }

        self.queue.submit(std::iter::once(encoder.finish()));
    }
}
