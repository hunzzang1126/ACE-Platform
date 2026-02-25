// ─────────────────────────────────────────────────
// Scene Graph — all design elements live here
// ─────────────────────────────────────────────────

use glam::Vec2;
use serde::{Deserialize, Serialize};

use crate::effects::NodeEffects;

/// Unique element identifier.
pub type NodeId = u32;

/// The scene graph holds all elements and their hierarchy.
#[derive(Default)]
pub struct SceneGraph {
    nodes: Vec<SceneNode>,
    next_id: NodeId,
}

impl SceneGraph {
    pub fn new() -> Self {
        Self::default()
    }

    /// Internal helper — push a node and return its ID.
    fn push(&mut self, transform: Transform2D, element: ElementKind, z_index: i32, opacity: f32) -> NodeId {
        let id = self.next_id;
        self.next_id += 1;
        self.nodes.push(SceneNode {
            id,
            transform,
            element,
            opacity,
            z_index,
            visible: true,
            effects: NodeEffects::new(),
        });
        id
    }

    // ── Convenience constructors ────────────────────

    /// Add a filled rectangle.
    pub fn add_rect(&mut self, x: f32, y: f32, w: f32, h: f32, color: [f32; 4]) -> NodeId {
        self.push(
            Transform2D::new(x, y, w, h),
            ElementKind::Rect { fill: Fill::Solid(color), border_radius: [0.0; 4] },
            self.nodes.len() as i32,
            1.0,
        )
    }

    /// Add a rounded rectangle.
    pub fn add_rounded_rect(&mut self, x: f32, y: f32, w: f32, h: f32, color: [f32; 4], radius: f32) -> NodeId {
        self.push(
            Transform2D::new(x, y, w, h),
            ElementKind::Rect { fill: Fill::Solid(color), border_radius: [radius; 4] },
            self.nodes.len() as i32,
            1.0,
        )
    }

    /// Add an ellipse (circle if w == h).
    pub fn add_ellipse(&mut self, cx: f32, cy: f32, rx: f32, ry: f32, color: [f32; 4]) -> NodeId {
        self.push(
            Transform2D::new(cx - rx, cy - ry, rx * 2.0, ry * 2.0),
            ElementKind::Ellipse { fill: Fill::Solid(color) },
            self.nodes.len() as i32,
            1.0,
        )
    }

    /// Add a gradient-filled rectangle.
    pub fn add_gradient_rect(
        &mut self, x: f32, y: f32, w: f32, h: f32,
        color_start: [f32; 4], color_end: [f32; 4], angle_deg: f32,
    ) -> NodeId {
        self.push(
            Transform2D::new(x, y, w, h),
            ElementKind::Rect {
                fill: Fill::LinearGradient {
                    stops: vec![
                        GradientStop { offset: 0.0, color: color_start },
                        GradientStop { offset: 1.0, color: color_end },
                    ],
                    angle_deg,
                },
                border_radius: [0.0; 4],
            },
            self.nodes.len() as i32,
            1.0,
        )
    }

    /// Get all visible nodes, sorted by z-index (back to front).
    pub fn visible_nodes_sorted(&self) -> Vec<&SceneNode> {
        let mut nodes: Vec<&SceneNode> = self.nodes.iter().filter(|n| n.visible).collect();
        nodes.sort_by_key(|n| n.z_index);
        nodes
    }

    /// Get all visible nodes (unsorted — insertion order).
    pub fn visible_nodes(&self) -> impl Iterator<Item = &SceneNode> {
        self.nodes.iter().filter(|n| n.visible)
    }

    /// Get node count.
    pub fn len(&self) -> usize {
        self.nodes.len()
    }

    pub fn is_empty(&self) -> bool {
        self.nodes.is_empty()
    }

    /// Set opacity for a node.
    pub fn set_opacity(&mut self, id: NodeId, opacity: f32) {
        if let Some(node) = self.nodes.iter_mut().find(|n| n.id == id) {
            node.opacity = opacity;
        }
    }

    /// Set z-index for a node.
    pub fn set_z_index(&mut self, id: NodeId, z: i32) {
        if let Some(node) = self.nodes.iter_mut().find(|n| n.id == id) {
            node.z_index = z;
        }
    }

    /// Remove a node by ID.
    pub fn remove(&mut self, id: NodeId) {
        self.nodes.retain(|n| n.id != id);
    }

    // ── Node access / mutation ──────────────────────

    /// Get a node by ID (immutable).
    pub fn get_node(&self, id: NodeId) -> Option<&SceneNode> {
        self.nodes.iter().find(|n| n.id == id)
    }

    /// Get a node by ID (mutable).
    pub fn get_node_mut(&mut self, id: NodeId) -> Option<&mut SceneNode> {
        self.nodes.iter_mut().find(|n| n.id == id)
    }

    /// Set position of a node.
    pub fn set_position(&mut self, id: NodeId, pos: glam::Vec2) {
        if let Some(node) = self.get_node_mut(id) {
            node.transform.position = pos;
        }
    }

    /// Set size (scale) of a node.
    pub fn set_size(&mut self, id: NodeId, size: glam::Vec2) {
        if let Some(node) = self.get_node_mut(id) {
            node.transform.scale = size;
        }
    }

    /// Remove a node by ID and return it (alias for delete).
    pub fn remove_node(&mut self, id: NodeId) {
        self.nodes.retain(|n| n.id != id);
    }

    /// Restore a node from a snapshot (for undo delete).
    pub fn restore_node(&mut self, snap: &crate::commands::NodeSnapshot) {
        // Restore with original element data (parse from JSON)
        // For simplicity, restore as a solid rect
        let element = serde_json::from_str::<SerializableFill>(&snap.element_json)
            .map(|sf| sf.to_element_kind())
            .unwrap_or(ElementKind::Rect {
                fill: Fill::Solid([0.5, 0.5, 0.5, 1.0]),
                border_radius: [0.0; 4],
            });

        self.nodes.push(SceneNode {
            id: snap.id,
            transform: Transform2D::new(snap.x, snap.y, snap.w, snap.h),
            element,
            opacity: snap.opacity,
            z_index: snap.z_index,
            visible: true,
            effects: NodeEffects::new(),
        });
    }

    /// Create a snapshot of a node (for undo support).
    pub fn snapshot_node(&self, id: NodeId) -> Option<crate::commands::NodeSnapshot> {
        self.get_node(id).map(|n| {
            crate::commands::NodeSnapshot {
                id: n.id,
                x: n.transform.position.x,
                y: n.transform.position.y,
                w: n.transform.scale.x,
                h: n.transform.scale.y,
                element_json: SerializableFill::from_element(&n.element).to_json(),
                z_index: n.z_index,
                opacity: n.opacity,
            }
        })
    }
}

// ── Node & Transform ────────────────────────────

/// A single element in the scene.
pub struct SceneNode {
    pub id: NodeId,
    pub transform: Transform2D,
    pub element: ElementKind,
    pub opacity: f32,
    pub z_index: i32,
    pub visible: bool,
    pub effects: NodeEffects,
}

/// Serializable representation of fill for undo snapshots.
#[derive(Clone, Debug, Serialize, Deserialize)]
enum SerializableFill {
    Solid([f32; 4]),
    RoundedRect { color: [f32; 4], radius: [f32; 4] },
    Ellipse([f32; 4]),
}

impl SerializableFill {
    fn from_element(element: &ElementKind) -> Self {
        match element {
            ElementKind::Rect { fill: Fill::Solid(c), border_radius } => {
                if border_radius.iter().any(|r| *r > 0.0) {
                    Self::RoundedRect { color: *c, radius: *border_radius }
                } else {
                    Self::Solid(*c)
                }
            }
            ElementKind::Rect { .. } => Self::Solid([0.5, 0.5, 0.5, 1.0]),
            ElementKind::Ellipse { fill: Fill::Solid(c) } => Self::Ellipse(*c),
            ElementKind::Ellipse { .. } => Self::Ellipse([0.5, 0.5, 0.5, 1.0]),
        }
    }

    fn to_element_kind(&self) -> ElementKind {
        match self {
            Self::Solid(c) => ElementKind::Rect {
                fill: Fill::Solid(*c),
                border_radius: [0.0; 4],
            },
            Self::RoundedRect { color, radius } => ElementKind::Rect {
                fill: Fill::Solid(*color),
                border_radius: *radius,
            },
            Self::Ellipse(c) => ElementKind::Ellipse {
                fill: Fill::Solid(*c),
            },
        }
    }

    fn to_json(&self) -> String {
        serde_json::to_string(self).unwrap_or_default()
    }
}

/// 2D transform (position, size, rotation).
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Transform2D {
    pub position: Vec2,
    pub scale: Vec2,     // Used as width/height
    pub rotation: f32,
}

impl Transform2D {
    pub fn new(x: f32, y: f32, w: f32, h: f32) -> Self {
        Self {
            position: Vec2::new(x, y),
            scale: Vec2::new(w, h),
            rotation: 0.0,
        }
    }
}

// ── Element Types ───────────────────────────────

/// The kind of element.
#[derive(Clone)]
pub enum ElementKind {
    /// A rectangle (with optional rounded corners).
    Rect {
        fill: Fill,
        border_radius: [f32; 4], // [TL, TR, BR, BL]
    },
    /// An ellipse / circle.
    Ellipse {
        fill: Fill,
    },
    // Future: Image, Text, Path, Group
}

// ── Fill Types ──────────────────────────────────

/// How an element is filled.
#[derive(Clone, Debug)]
pub enum Fill {
    /// Solid color.
    Solid([f32; 4]),
    /// Linear gradient.
    LinearGradient {
        stops: Vec<GradientStop>,
        angle_deg: f32,
    },
    /// Radial gradient.
    RadialGradient {
        stops: Vec<GradientStop>,
        center: Vec2,
        radius: f32,
    },
}

/// A single color stop in a gradient.
#[derive(Clone, Debug)]
pub struct GradientStop {
    pub offset: f32,   // 0.0 .. 1.0
    pub color: [f32; 4],
}
