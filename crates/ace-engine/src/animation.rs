// ─────────────────────────────────────────────────
// Animation — Keyframe system with cubic bezier easing
// ─────────────────────────────────────────────────

use crate::scene::{NodeId, SceneGraph};
use glam::Vec2;
use serde::{Deserialize, Serialize};

/// An animatable property of a scene node.
#[derive(Clone, Debug, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum Property {
    PositionX,
    PositionY,
    ScaleX,   // width
    ScaleY,   // height
    Rotation,
    Opacity,
}

/// Easing function for keyframe interpolation.
#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum Easing {
    /// Linear (no easing).
    Linear,
    /// Cubic bezier curve with 2 control points (x1, y1, x2, y2).
    CubicBezier(f32, f32, f32, f32),
}

impl Easing {
    // ── Preset easings ──────────────────────────────
    pub fn ease()       -> Self { Self::CubicBezier(0.25, 0.1, 0.25, 1.0) }
    pub fn ease_in()    -> Self { Self::CubicBezier(0.42, 0.0, 1.0, 1.0) }
    pub fn ease_out()   -> Self { Self::CubicBezier(0.0, 0.0, 0.58, 1.0) }
    pub fn ease_in_out()-> Self { Self::CubicBezier(0.42, 0.0, 0.58, 1.0) }
    pub fn bounce()     -> Self { Self::CubicBezier(0.34, 1.56, 0.64, 1.0) }
    pub fn spring()     -> Self { Self::CubicBezier(0.175, 0.885, 0.32, 1.275) }

    /// Evaluate the easing at parameter t ∈ [0, 1].
    pub fn evaluate(&self, t: f32) -> f32 {
        match self {
            Easing::Linear => t,
            Easing::CubicBezier(x1, y1, x2, y2) => {
                cubic_bezier_y(t, *x1, *y1, *x2, *y2)
            }
        }
    }
}

/// A single keyframe: a value at a specific time.
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Keyframe {
    /// Time in seconds.
    pub time: f32,
    /// Property value at this time.
    pub value: f32,
    /// Easing to the NEXT keyframe.
    pub easing: Easing,
}

/// A track animates one property of one node.
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct AnimationTrack {
    pub node_id: NodeId,
    pub property: Property,
    pub keyframes: Vec<Keyframe>,
}

impl AnimationTrack {
    pub fn new(node_id: NodeId, property: Property) -> Self {
        Self { node_id, property, keyframes: Vec::new() }
    }

    /// Add a keyframe (sorted by time).
    pub fn add_keyframe(&mut self, time: f32, value: f32, easing: Easing) {
        let kf = Keyframe { time, value, easing };
        let pos = self.keyframes.iter().position(|k| k.time > time);
        match pos {
            Some(i) => self.keyframes.insert(i, kf),
            None => self.keyframes.push(kf),
        }
    }

    /// Remove keyframe at index.
    pub fn remove_keyframe(&mut self, index: usize) {
        if index < self.keyframes.len() {
            self.keyframes.remove(index);
        }
    }

    /// Get the interpolated value at time t.
    pub fn evaluate(&self, t: f32) -> Option<f32> {
        if self.keyframes.is_empty() {
            return None;
        }
        if self.keyframes.len() == 1 {
            return Some(self.keyframes[0].value);
        }

        // Before first keyframe
        if t <= self.keyframes[0].time {
            return Some(self.keyframes[0].value);
        }

        // After last keyframe
        let last = self.keyframes.last().unwrap();
        if t >= last.time {
            return Some(last.value);
        }

        // Find the two surrounding keyframes
        for i in 0..self.keyframes.len() - 1 {
            let a = &self.keyframes[i];
            let b = &self.keyframes[i + 1];
            if t >= a.time && t <= b.time {
                let dt = b.time - a.time;
                if dt < 1e-6 { return Some(b.value); }
                let local_t = (t - a.time) / dt;
                let eased_t = a.easing.evaluate(local_t);
                return Some(lerp(a.value, b.value, eased_t));
            }
        }

        Some(last.value)
    }

    /// Get the total duration (last keyframe time).
    pub fn duration(&self) -> f32 {
        self.keyframes.last().map(|k| k.time).unwrap_or(0.0)
    }
}

/// An animation clip is a collection of tracks with a name.
#[derive(Clone, Debug)]
pub struct AnimationClip {
    pub name: String,
    pub tracks: Vec<AnimationTrack>,
    pub looping: bool,
}

impl AnimationClip {
    pub fn new(name: &str) -> Self {
        Self { name: name.to_string(), tracks: Vec::new(), looping: false }
    }

    /// Add a track to this clip.
    pub fn add_track(&mut self, track: AnimationTrack) {
        self.tracks.push(track);
    }

    /// Get or create a track for a node+property pair.
    pub fn get_or_create_track(&mut self, node_id: NodeId, property: Property) -> &mut AnimationTrack {
        let idx = self.tracks.iter().position(|t| t.node_id == node_id && t.property == property);
        match idx {
            Some(i) => &mut self.tracks[i],
            None => {
                self.tracks.push(AnimationTrack::new(node_id, property));
                self.tracks.last_mut().unwrap()
            }
        }
    }

    /// Get the total duration of the clip (longest track).
    pub fn duration(&self) -> f32 {
        self.tracks.iter().map(|t| t.duration()).fold(0.0f32, f32::max)
    }

    /// Apply the clip at a given time to the scene graph.
    pub fn apply(&self, time: f32, scene: &mut SceneGraph) {
        let t = if self.looping && self.duration() > 0.0 {
            time % self.duration()
        } else {
            time
        };

        for track in &self.tracks {
            if let Some(value) = track.evaluate(t) {
                Self::apply_property(track.node_id, &track.property, value, scene);
            }
        }
    }

    fn apply_property(node_id: NodeId, prop: &Property, value: f32, scene: &mut SceneGraph) {
        if let Some(node) = scene.get_node_mut(node_id) {
            match prop {
                Property::PositionX => node.transform.position.x = value,
                Property::PositionY => node.transform.position.y = value,
                Property::ScaleX   => node.transform.scale.x = value,
                Property::ScaleY   => node.transform.scale.y = value,
                Property::Rotation => node.transform.rotation = value,
                Property::Opacity  => node.opacity = value.clamp(0.0, 1.0),
            }
        }
    }
}

/// The animation timeline manages playback state.
pub struct Timeline {
    /// All animation clips.
    pub clips: Vec<AnimationClip>,
    /// Current playback time in seconds.
    pub current_time: f32,
    /// Playback speed multiplier (1.0 = normal).
    pub speed: f32,
    /// Whether the timeline is playing.
    pub playing: bool,
    /// Total timeline duration (can be set manually or auto-calculated).
    pub duration: f32,
}

impl Default for Timeline {
    fn default() -> Self {
        Self {
            clips: Vec::new(),
            current_time: 0.0,
            speed: 1.0,
            playing: false,
            duration: 5.0, // Default 5-second timeline
        }
    }
}

impl Timeline {
    pub fn new() -> Self {
        Self::default()
    }

    /// Add a clip to the timeline.
    pub fn add_clip(&mut self, clip: AnimationClip) -> usize {
        let idx = self.clips.len();
        self.clips.push(clip);
        self.recalc_duration();
        idx
    }

    /// Advance the timeline by dt seconds.
    pub fn tick(&mut self, dt: f32) {
        if !self.playing {
            return;
        }
        self.current_time += dt * self.speed;

        // Clamp to duration (unless all clips loop)
        let all_loop = self.clips.iter().all(|c| c.looping);
        if !all_loop && self.current_time >= self.duration {
            self.current_time = self.duration;
            self.playing = false;
        }
    }

    /// Apply all clips at the current time to the scene.
    pub fn apply(&self, scene: &mut SceneGraph) {
        for clip in &self.clips {
            clip.apply(self.current_time, scene);
        }
    }

    /// Play from current position.
    pub fn play(&mut self) {
        self.playing = true;
    }

    /// Pause playback.
    pub fn pause(&mut self) {
        self.playing = false;
    }

    /// Stop and reset to beginning.
    pub fn stop(&mut self) {
        self.playing = false;
        self.current_time = 0.0;
    }

    /// Seek to a specific time.
    pub fn seek(&mut self, time: f32) {
        self.current_time = time.clamp(0.0, self.duration);
    }

    /// Toggle play/pause.
    pub fn toggle_play(&mut self) {
        if self.playing {
            self.pause();
        } else {
            // If at end, restart from beginning
            if self.current_time >= self.duration {
                self.current_time = 0.0;
            }
            self.play();
        }
    }

    /// Recalculate duration from clips.
    fn recalc_duration(&mut self) {
        let clip_dur = self.clips.iter().map(|c| c.duration()).fold(0.0f32, f32::max);
        if clip_dur > 0.0 {
            self.duration = clip_dur;
        }
    }

    /// Get playback progress (0.0 to 1.0).
    pub fn progress(&self) -> f32 {
        if self.duration <= 0.0 { return 0.0; }
        (self.current_time / self.duration).clamp(0.0, 1.0)
    }
}

// ── Math helpers ────────────────────────────────

fn lerp(a: f32, b: f32, t: f32) -> f32 {
    a + (b - a) * t
}

/// Evaluate a cubic bezier curve Y value at parameter t.
/// Uses Newton's method to find the t parameter on the X axis,
/// then evaluates Y at that parameter.
fn cubic_bezier_y(t: f32, x1: f32, y1: f32, x2: f32, y2: f32) -> f32 {
    if t <= 0.0 { return 0.0; }
    if t >= 1.0 { return 1.0; }

    // Find the bezier parameter that gives us the desired x value
    let mut guess = t;
    for _ in 0..8 {
        let x = bezier_component(guess, x1, x2) - t;
        if x.abs() < 1e-6 { break; }
        let dx = bezier_derivative(guess, x1, x2);
        if dx.abs() < 1e-6 { break; }
        guess -= x / dx;
    }
    guess = guess.clamp(0.0, 1.0);

    bezier_component(guess, y1, y2)
}

/// Evaluate one component of a cubic bezier at parameter t.
/// P0 = 0, P1 = p1, P2 = p2, P3 = 1
fn bezier_component(t: f32, p1: f32, p2: f32) -> f32 {
    let t2 = t * t;
    let t3 = t2 * t;
    let mt = 1.0 - t;
    let mt2 = mt * mt;
    3.0 * mt2 * t * p1 + 3.0 * mt * t2 * p2 + t3
}

/// Derivative of bezier_component.
fn bezier_derivative(t: f32, p1: f32, p2: f32) -> f32 {
    let mt = 1.0 - t;
    3.0 * mt * mt * p1 + 6.0 * mt * t * (p2 - p1) + 3.0 * t * t * (1.0 - p2)
}
