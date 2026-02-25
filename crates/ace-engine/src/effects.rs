// ─────────────────────────────────────────────────
// Effects — Blend modes, shadows, filters per node
// ─────────────────────────────────────────────────

use serde::{Deserialize, Serialize};

/// Blend mode for compositing an element.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub enum BlendMode {
    Normal,
    Multiply,
    Screen,
    Overlay,
    Darken,
    Lighten,
    ColorDodge,
    ColorBurn,
    HardLight,
    SoftLight,
    Difference,
    Exclusion,
}

impl Default for BlendMode {
    fn default() -> Self { Self::Normal }
}

impl BlendMode {
    /// Convert to a numeric ID for GPU vertex encoding (0.0 - 11.0).
    pub fn to_gpu_id(&self) -> f32 {
        match self {
            BlendMode::Normal     => 0.0,
            BlendMode::Multiply   => 1.0,
            BlendMode::Screen     => 2.0,
            BlendMode::Overlay    => 3.0,
            BlendMode::Darken     => 4.0,
            BlendMode::Lighten    => 5.0,
            BlendMode::ColorDodge => 6.0,
            BlendMode::ColorBurn  => 7.0,
            BlendMode::HardLight  => 8.0,
            BlendMode::SoftLight  => 9.0,
            BlendMode::Difference => 10.0,
            BlendMode::Exclusion  => 11.0,
        }
    }

    pub fn from_name(name: &str) -> Self {
        match name {
            "multiply"     => Self::Multiply,
            "screen"       => Self::Screen,
            "overlay"      => Self::Overlay,
            "darken"       => Self::Darken,
            "lighten"      => Self::Lighten,
            "color_dodge" | "colorDodge" => Self::ColorDodge,
            "color_burn"  | "colorBurn"  => Self::ColorBurn,
            "hard_light"  | "hardLight"  => Self::HardLight,
            "soft_light"  | "softLight"  => Self::SoftLight,
            "difference"   => Self::Difference,
            "exclusion"    => Self::Exclusion,
            _ => Self::Normal,
        }
    }
}

/// Drop shadow effect.
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct DropShadow {
    /// Horizontal offset in pixels.
    pub offset_x: f32,
    /// Vertical offset in pixels.
    pub offset_y: f32,
    /// Blur radius in pixels (0 = hard shadow).
    pub blur: f32,
    /// Shadow color [r, g, b, a].
    pub color: [f32; 4],
}

impl Default for DropShadow {
    fn default() -> Self {
        Self {
            offset_x: 4.0,
            offset_y: 4.0,
            blur: 8.0,
            color: [0.0, 0.0, 0.0, 0.4],
        }
    }
}

/// Visual effects applied to a scene node.
#[derive(Clone, Debug, Default, Serialize, Deserialize)]
pub struct NodeEffects {
    /// Blend mode for compositing.
    pub blend_mode: BlendMode,
    /// Optional drop shadow.
    pub shadow: Option<DropShadow>,
    /// Gaussian blur radius (0 = no blur).
    pub blur: f32,
    /// Brightness multiplier (1.0 = normal, >1 = brighter, <1 = darker).
    pub brightness: f32,
    /// Contrast multiplier (1.0 = normal).
    pub contrast: f32,
    /// Saturation multiplier (1.0 = normal, 0 = grayscale).
    pub saturation: f32,
    /// Hue rotation in degrees.
    pub hue_rotate: f32,
}

impl NodeEffects {
    pub fn new() -> Self {
        Self {
            blend_mode: BlendMode::Normal,
            shadow: None,
            blur: 0.0,
            brightness: 1.0,
            contrast: 1.0,
            saturation: 1.0,
            hue_rotate: 0.0,
        }
    }

    /// Apply color adjustments (brightness, contrast, saturation, hue) to an RGBA color.
    pub fn apply_color_filter(&self, color: [f32; 4]) -> [f32; 4] {
        let [mut r, mut g, mut b, a] = color;

        // Brightness
        if (self.brightness - 1.0).abs() > 1e-4 {
            r *= self.brightness;
            g *= self.brightness;
            b *= self.brightness;
        }

        // Contrast
        if (self.contrast - 1.0).abs() > 1e-4 {
            r = (r - 0.5) * self.contrast + 0.5;
            g = (g - 0.5) * self.contrast + 0.5;
            b = (b - 0.5) * self.contrast + 0.5;
        }

        // Saturation (luminance-preserving)
        if (self.saturation - 1.0).abs() > 1e-4 {
            let lum = 0.299 * r + 0.587 * g + 0.114 * b;
            r = lum + (r - lum) * self.saturation;
            g = lum + (g - lum) * self.saturation;
            b = lum + (b - lum) * self.saturation;
        }

        // Hue rotation
        if self.hue_rotate.abs() > 1e-4 {
            let angle = self.hue_rotate.to_radians();
            let cos_a = angle.cos();
            let sin_a = angle.sin();
            let nr = r * (0.213 + 0.787 * cos_a - 0.213 * sin_a)
                   + g * (0.715 - 0.715 * cos_a - 0.715 * sin_a)
                   + b * (0.072 - 0.072 * cos_a + 0.928 * sin_a);
            let ng = r * (0.213 - 0.213 * cos_a + 0.143 * sin_a)
                   + g * (0.715 + 0.285 * cos_a + 0.140 * sin_a)
                   + b * (0.072 - 0.072 * cos_a - 0.283 * sin_a);
            let nb = r * (0.213 - 0.213 * cos_a - 0.787 * sin_a)
                   + g * (0.715 - 0.715 * cos_a + 0.715 * sin_a)
                   + b * (0.072 + 0.928 * cos_a + 0.072 * sin_a);
            r = nr;
            g = ng;
            b = nb;
        }

        [r.clamp(0.0, 1.0), g.clamp(0.0, 1.0), b.clamp(0.0, 1.0), a]
    }

    /// Generate shadow geometry offsets for a soft shadow.
    /// Returns a list of (offset_x, offset_y, alpha_multiplier) for multi-pass blur approximation.
    pub fn shadow_passes(&self) -> Vec<(f32, f32, f32)> {
        let shadow = match &self.shadow {
            Some(s) => s,
            None => return vec![],
        };

        if shadow.blur < 1.0 {
            // Hard shadow — single pass
            return vec![(shadow.offset_x, shadow.offset_y, shadow.color[3])];
        }

        // Approximate Gaussian blur with multiple offset passes
        let steps = (shadow.blur / 2.0).ceil().min(5.0) as usize;
        let step_alpha = shadow.color[3] / (steps as f32 * 1.5);
        let mut passes = Vec::with_capacity(steps * 2 + 1);

        for i in 0..=steps {
            let t = i as f32 / steps as f32;
            let spread = shadow.blur * t;
            passes.push((shadow.offset_x, shadow.offset_y + spread, step_alpha));
            if i > 0 {
                passes.push((shadow.offset_x, shadow.offset_y - spread, step_alpha));
                passes.push((shadow.offset_x + spread, shadow.offset_y, step_alpha));
                passes.push((shadow.offset_x - spread, shadow.offset_y, step_alpha));
            }
        }

        passes
    }
}
