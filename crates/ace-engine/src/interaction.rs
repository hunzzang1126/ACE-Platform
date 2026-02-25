// ─────────────────────────────────────────────────
// Interaction — hit testing, selection, drag, resize
// ─────────────────────────────────────────────────

use crate::scene::{ElementKind, NodeId, SceneGraph, SceneNode};
use glam::Vec2;

/// Selection handle positions around a bounding box.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum HandleKind {
    TopLeft,
    TopRight,
    BottomLeft,
    BottomRight,
    Top,
    Bottom,
    Left,
    Right,
}

impl HandleKind {
    pub const ALL: [HandleKind; 8] = [
        HandleKind::TopLeft,
        HandleKind::TopRight,
        HandleKind::BottomLeft,
        HandleKind::BottomRight,
        HandleKind::Top,
        HandleKind::Bottom,
        HandleKind::Left,
        HandleKind::Right,
    ];
}

/// Describes what was hit on the canvas.
#[derive(Clone, Debug)]
pub enum HitResult {
    /// Empty canvas — deselect.
    None,
    /// Hit a scene element.
    Node(NodeId),
    /// Hit a resize handle of the selected element.
    Handle(NodeId, HandleKind),
}

/// Current interaction mode (what the user is doing).
#[derive(Clone, Debug)]
pub enum DragMode {
    /// No drag active.
    Idle,
    /// Moving selected elements.
    Move {
        start_mouse: Vec2,
        original_positions: Vec<(NodeId, Vec2)>,
    },
    /// Resizing via a handle.
    Resize {
        handle: HandleKind,
        start_mouse: Vec2,
        original_pos: Vec2,
        original_size: Vec2,
        node_id: NodeId,
    },
    /// Rubber-band selection box.
    RubberBand {
        start: Vec2,
        current: Vec2,
    },
}

/// Manages the full interaction state.
pub struct InteractionState {
    /// Currently selected node IDs.
    pub selection: Vec<NodeId>,
    /// Current drag mode.
    pub drag: DragMode,
    /// Size of resize handles in pixels.
    pub handle_size: f32,
}

impl Default for InteractionState {
    fn default() -> Self {
        Self {
            selection: Vec::new(),
            drag: DragMode::Idle,
            handle_size: 8.0,
        }
    }
}

impl InteractionState {
    pub fn new() -> Self {
        Self::default()
    }

    /// Clear the selection.
    pub fn deselect_all(&mut self) {
        self.selection.clear();
    }

    /// Select a single node (clearing previous selection).
    pub fn select(&mut self, id: NodeId) {
        self.selection.clear();
        self.selection.push(id);
    }

    /// Toggle node in selection (for multi-select with Shift).
    pub fn toggle_select(&mut self, id: NodeId) {
        if let Some(pos) = self.selection.iter().position(|&x| x == id) {
            self.selection.remove(pos);
        } else {
            self.selection.push(id);
        }
    }

    pub fn is_selected(&self, id: NodeId) -> bool {
        self.selection.contains(&id)
    }

    // ── Hit Testing ─────────────────────────────────

    /// Perform hit testing at a canvas point (in pixel coords).
    /// Checks handles first, then elements (front to back = reverse z-order).
    pub fn hit_test(&self, px: f32, py: f32, scene: &SceneGraph) -> HitResult {
        let mouse = Vec2::new(px, py);

        // 1. Check resize handles of selected elements first
        if self.selection.len() == 1 {
            let id = self.selection[0];
            if let Some(node) = scene.get_node(id) {
                for handle in HandleKind::ALL.iter() {
                    let handle_center = Self::handle_position(node, *handle);
                    let half = self.handle_size / 2.0;
                    if (mouse.x - handle_center.x).abs() <= half
                        && (mouse.y - handle_center.y).abs() <= half
                    {
                        return HitResult::Handle(id, *handle);
                    }
                }
            }
        }

        // 2. Check elements in reverse z-order (front first)
        let sorted = scene.visible_nodes_sorted();
        for node in sorted.iter().rev() {
            if Self::point_in_node(mouse, node) {
                return HitResult::Node(node.id);
            }
        }

        HitResult::None
    }

    /// Check if a point is inside a scene node's bounding shape.
    fn point_in_node(p: Vec2, node: &SceneNode) -> bool {
        let x = node.transform.position.x;
        let y = node.transform.position.y;
        let w = node.transform.scale.x;
        let h = node.transform.scale.y;

        match &node.element {
            ElementKind::Rect { .. } => {
                p.x >= x && p.x <= x + w && p.y >= y && p.y <= y + h
            }
            ElementKind::Ellipse { .. } => {
                let cx = x + w / 2.0;
                let cy = y + h / 2.0;
                let rx = w / 2.0;
                let ry = h / 2.0;
                let dx = (p.x - cx) / rx;
                let dy = (p.y - cy) / ry;
                dx * dx + dy * dy <= 1.0
            }
        }
    }

    /// Get the position of a resize handle for a node.
    fn handle_position(node: &SceneNode, handle: HandleKind) -> Vec2 {
        let x = node.transform.position.x;
        let y = node.transform.position.y;
        let w = node.transform.scale.x;
        let h = node.transform.scale.y;

        match handle {
            HandleKind::TopLeft => Vec2::new(x, y),
            HandleKind::TopRight => Vec2::new(x + w, y),
            HandleKind::BottomLeft => Vec2::new(x, y + h),
            HandleKind::BottomRight => Vec2::new(x + w, y + h),
            HandleKind::Top => Vec2::new(x + w / 2.0, y),
            HandleKind::Bottom => Vec2::new(x + w / 2.0, y + h),
            HandleKind::Left => Vec2::new(x, y + h / 2.0),
            HandleKind::Right => Vec2::new(x + w, y + h / 2.0),
        }
    }

    // ── Drag Operations ─────────────────────────────

    /// Begin a move drag.
    pub fn start_move(&mut self, mouse: Vec2, scene: &SceneGraph) {
        let positions: Vec<(NodeId, Vec2)> = self
            .selection
            .iter()
            .filter_map(|&id| {
                scene.get_node(id).map(|n| (id, n.transform.position))
            })
            .collect();
        self.drag = DragMode::Move {
            start_mouse: mouse,
            original_positions: positions,
        };
    }

    /// Begin a resize drag.
    pub fn start_resize(&mut self, mouse: Vec2, node_id: NodeId, handle: HandleKind, scene: &SceneGraph) {
        if let Some(node) = scene.get_node(node_id) {
            self.drag = DragMode::Resize {
                handle,
                start_mouse: mouse,
                original_pos: node.transform.position,
                original_size: node.transform.scale,
                node_id,
            };
        }
    }

    /// Begin rubber-band selection.
    pub fn start_rubber_band(&mut self, mouse: Vec2) {
        self.drag = DragMode::RubberBand {
            start: mouse,
            current: mouse,
        };
    }

    /// Update the current drag with a new mouse position.
    /// Returns true if the scene was modified.
    pub fn update_drag(&mut self, mouse: Vec2, scene: &mut SceneGraph) -> bool {
        match &self.drag {
            DragMode::Idle => false,

            DragMode::Move { start_mouse, original_positions } => {
                let delta = mouse - *start_mouse;
                for (id, orig_pos) in original_positions {
                    scene.set_position(*id, *orig_pos + delta);
                }
                true
            }

            DragMode::Resize { handle, start_mouse, original_pos, original_size, node_id } => {
                let delta = mouse - *start_mouse;
                let (new_pos, new_size) = Self::compute_resize(
                    *handle, delta, *original_pos, *original_size,
                );
                scene.set_position(*node_id, new_pos);
                scene.set_size(*node_id, new_size);
                true
            }

            DragMode::RubberBand { start, .. } => {
                // Update rubber band rectangle
                let start = *start;
                self.drag = DragMode::RubberBand { start, current: mouse };
                false
            }
        }
    }

    /// Take the current drag state and reset to Idle.
    /// Returns the drag data so the caller can create undo commands.
    pub fn take_drag(&mut self) -> DragMode {
        std::mem::replace(&mut self.drag, DragMode::Idle)
    }

    /// End the current drag (handles rubber-band selection, returns taken drag).
    pub fn end_drag(&mut self, scene: &SceneGraph) -> DragMode {
        let drag = self.take_drag();
        if let DragMode::RubberBand { ref start, ref current } = drag {
            // Select all nodes within the rubber band rectangle
            let min_x = start.x.min(current.x);
            let max_x = start.x.max(current.x);
            let min_y = start.y.min(current.y);
            let max_y = start.y.max(current.y);

            self.selection.clear();
            for node in scene.visible_nodes() {
                let nx = node.transform.position.x;
                let ny = node.transform.position.y;
                let nw = node.transform.scale.x;
                let nh = node.transform.scale.y;

                // Check if node bbox intersects rubber band
                if nx + nw >= min_x && nx <= max_x && ny + nh >= min_y && ny <= max_y {
                    self.selection.push(node.id);
                }
            }
        }
        drag
    }

    /// Compute new position and size after a resize operation.
    fn compute_resize(handle: HandleKind, delta: Vec2, pos: Vec2, size: Vec2) -> (Vec2, Vec2) {
        let min_size = 4.0; // Minimum element dimension
        match handle {
            HandleKind::BottomRight => {
                let w = (size.x + delta.x).max(min_size);
                let h = (size.y + delta.y).max(min_size);
                (pos, Vec2::new(w, h))
            }
            HandleKind::BottomLeft => {
                let dx = delta.x.min(size.x - min_size);
                (Vec2::new(pos.x + dx, pos.y), Vec2::new(size.x - dx, (size.y + delta.y).max(min_size)))
            }
            HandleKind::TopRight => {
                let dy = delta.y.min(size.y - min_size);
                (Vec2::new(pos.x, pos.y + dy), Vec2::new((size.x + delta.x).max(min_size), size.y - dy))
            }
            HandleKind::TopLeft => {
                let dx = delta.x.min(size.x - min_size);
                let dy = delta.y.min(size.y - min_size);
                (Vec2::new(pos.x + dx, pos.y + dy), Vec2::new(size.x - dx, size.y - dy))
            }
            HandleKind::Right => {
                let w = (size.x + delta.x).max(min_size);
                (pos, Vec2::new(w, size.y))
            }
            HandleKind::Left => {
                let dx = delta.x.min(size.x - min_size);
                (Vec2::new(pos.x + dx, pos.y), Vec2::new(size.x - dx, size.y))
            }
            HandleKind::Bottom => {
                let h = (size.y + delta.y).max(min_size);
                (pos, Vec2::new(size.x, h))
            }
            HandleKind::Top => {
                let dy = delta.y.min(size.y - min_size);
                (Vec2::new(pos.x, pos.y + dy), Vec2::new(size.x, size.y - dy))
            }
        }
    }

    // ── Selection Overlay Data ──────────────────────

    /// Get the bounding box of the current selection.
    pub fn selection_bounds(&self, scene: &SceneGraph) -> Option<(Vec2, Vec2)> {
        if self.selection.is_empty() {
            return None;
        }
        let mut min = Vec2::new(f32::MAX, f32::MAX);
        let mut max = Vec2::new(f32::MIN, f32::MIN);

        for &id in &self.selection {
            if let Some(node) = scene.get_node(id) {
                let p = node.transform.position;
                let s = node.transform.scale;
                min = min.min(p);
                max = max.max(p + s);
            }
        }

        if min.x < max.x && min.y < max.y {
            Some((min, max - min))
        } else {
            None
        }
    }

    /// Get handle rectangles for the current selection (for overlay rendering).
    /// Returns Vec of (center_x, center_y, handle_size).
    pub fn selection_handles(&self, scene: &SceneGraph) -> Vec<(f32, f32)> {
        if self.selection.len() != 1 {
            return Vec::new();
        }
        let id = self.selection[0];
        if let Some(node) = scene.get_node(id) {
            HandleKind::ALL
                .iter()
                .map(|h| {
                    let p = Self::handle_position(node, *h);
                    (p.x, p.y)
                })
                .collect()
        } else {
            Vec::new()
        }
    }

    /// Get the rubber band rectangle (if active).
    pub fn rubber_band_rect(&self) -> Option<(f32, f32, f32, f32)> {
        if let DragMode::RubberBand { start, current } = &self.drag {
            let x = start.x.min(current.x);
            let y = start.y.min(current.y);
            let w = (start.x - current.x).abs();
            let h = (start.y - current.y).abs();
            Some((x, y, w, h))
        } else {
            None
        }
    }
}
