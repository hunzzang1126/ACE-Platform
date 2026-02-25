// ─────────────────────────────────────────────────
// Commands — Undo/Redo system
// ─────────────────────────────────────────────────

use crate::scene::{NodeId, SceneGraph};
use glam::Vec2;

/// A reversible command.
#[derive(Clone, Debug)]
pub enum Command {
    /// Move one or more nodes by a delta.
    MoveNodes {
        ids: Vec<NodeId>,
        delta: Vec2,
    },
    /// Resize a single node.
    ResizeNode {
        id: NodeId,
        old_pos: Vec2,
        old_size: Vec2,
        new_pos: Vec2,
        new_size: Vec2,
    },
    /// Delete nodes.
    DeleteNodes {
        /// Serialized snapshots of deleted nodes (position, size, element data)
        snapshots: Vec<NodeSnapshot>,
    },
}

/// Snapshot of a node for undo/redo.
#[derive(Clone, Debug)]
pub struct NodeSnapshot {
    pub id: NodeId,
    pub x: f32,
    pub y: f32,
    pub w: f32,
    pub h: f32,
    /// Serialized ElementKind + fill data (JSON)
    pub element_json: String,
    pub z_index: i32,
    pub opacity: f32,
}

impl Command {
    /// Apply (do/redo) this command.
    pub fn apply(&self, scene: &mut SceneGraph) {
        match self {
            Command::MoveNodes { ids, delta } => {
                for &id in ids {
                    if let Some(node) = scene.get_node(id) {
                        let new_pos = node.transform.position + *delta;
                        scene.set_position(id, new_pos);
                    }
                }
            }
            Command::ResizeNode { id, new_pos, new_size, .. } => {
                scene.set_position(*id, *new_pos);
                scene.set_size(*id, *new_size);
            }
            Command::DeleteNodes { snapshots } => {
                for snap in snapshots {
                    scene.remove_node(snap.id);
                }
            }
        }
    }

    /// Reverse (undo) this command.
    pub fn undo(&self, scene: &mut SceneGraph) {
        match self {
            Command::MoveNodes { ids, delta } => {
                for &id in ids {
                    if let Some(node) = scene.get_node(id) {
                        let new_pos = node.transform.position - *delta;
                        scene.set_position(id, new_pos);
                    }
                }
            }
            Command::ResizeNode { id, old_pos, old_size, .. } => {
                scene.set_position(*id, *old_pos);
                scene.set_size(*id, *old_size);
            }
            Command::DeleteNodes { snapshots } => {
                for snap in snapshots {
                    scene.restore_node(snap);
                }
            }
        }
    }
}

/// Manages the undo/redo command history.
pub struct CommandHistory {
    undo_stack: Vec<Command>,
    redo_stack: Vec<Command>,
    max_history: usize,
}

impl Default for CommandHistory {
    fn default() -> Self {
        Self {
            undo_stack: Vec::new(),
            redo_stack: Vec::new(),
            max_history: 100,
        }
    }
}

impl CommandHistory {
    pub fn new() -> Self {
        Self::default()
    }

    /// Execute a command and push it onto the undo stack.
    pub fn execute(&mut self, cmd: Command, scene: &mut SceneGraph) {
        cmd.apply(scene);
        self.undo_stack.push(cmd);
        self.redo_stack.clear(); // New action invalidates redo

        if self.undo_stack.len() > self.max_history {
            self.undo_stack.remove(0);
        }
    }

    /// Push a command onto the undo stack WITHOUT applying it.
    /// Used when the operation was already performed live (e.g. during drag).
    pub fn push_without_apply(&mut self, cmd: Command) {
        self.undo_stack.push(cmd);
        self.redo_stack.clear();

        if self.undo_stack.len() > self.max_history {
            self.undo_stack.remove(0);
        }
    }

    /// Undo the last command.
    pub fn undo(&mut self, scene: &mut SceneGraph) -> bool {
        if let Some(cmd) = self.undo_stack.pop() {
            cmd.undo(scene);
            self.redo_stack.push(cmd);
            true
        } else {
            false
        }
    }

    /// Redo the last undone command.
    pub fn redo(&mut self, scene: &mut SceneGraph) -> bool {
        if let Some(cmd) = self.redo_stack.pop() {
            cmd.apply(scene);
            self.undo_stack.push(cmd);
            true
        } else {
            false
        }
    }

    pub fn can_undo(&self) -> bool {
        !self.undo_stack.is_empty()
    }

    pub fn can_redo(&self) -> bool {
        !self.redo_stack.is_empty()
    }

    pub fn undo_count(&self) -> usize {
        self.undo_stack.len()
    }

    pub fn redo_count(&self) -> usize {
        self.redo_stack.len()
    }
}
