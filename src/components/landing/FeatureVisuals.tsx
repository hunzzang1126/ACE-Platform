// ─────────────────────────────────────────────────
// FeatureVisuals — Animated visual per feature section
// ─────────────────────────────────────────────────

import { motion } from 'framer-motion';

// ═══════════════════════════════════════════════
// 1. GPU Canvas — floating layers + roaming cursor
// ═══════════════════════════════════════════════
export function GPUCanvasVisual() {
    return (
        <div className="fv fv--gpu">
            <div className="fv-canvas-frame">
                <div className="fv-canvas-toolbar">
                    <div className="fv-dots"><span /><span /><span /></div>
                    <span className="fv-tab active">Canvas</span>
                    <span className="fv-tab">Layers</span>
                </div>
                <div className="fv-canvas-body">
                    {/* Floating layers */}
                    <div className="gpu-fl gpu-fl--1" />
                    <div className="gpu-fl gpu-fl--2" />
                    <div className="gpu-fl gpu-fl--3" />
                    {/* Design elements */}
                    <div className="gpu-el gpu-el--rect" />
                    <div className="gpu-el gpu-el--circle" />
                    <div className="gpu-el gpu-el--text">Headline</div>
                    {/* Cursor */}
                    <div className="gpu-cursor" />
                    {/* FPS counter */}
                    <div className="gpu-fps">60 FPS</div>
                </div>
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════
// 2. AI Co-Pilot — 4-message conversation
// ═══════════════════════════════════════════════
const AI_MESSAGES = [
    { role: 'user', text: 'Create a Nike running shoe campaign' },
    { role: 'bot', text: 'Setting up 1080x1080 canvas. Applied dynamic sports layout with motion lines and bold typography.' },
    { role: 'user', text: 'Make it more energetic. Use red and black.' },
    { role: 'bot', text: 'Updated palette to #E53935 accent on #111. Increased headline weight to 900. Added diagonal composition.' },
];

export function AICoPilotVisual() {
    return (
        <div className="fv fv--ai">
            <div className="fv-chat">
                {AI_MESSAGES.map((msg, i) => (
                    <motion.div
                        key={i}
                        className={`fv-msg fv-msg--${msg.role}`}
                        initial={{ opacity: 0, y: 16, scale: 0.96 }}
                        whileInView={{ opacity: 1, y: 0, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.3 + i * 0.35, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                    >
                        <span className="fv-msg-avatar">{msg.role === 'user' ? 'Y' : 'G'}</span>
                        <span className="fv-msg-text">{msg.text}</span>
                    </motion.div>
                ))}
                {/* Typing indicator */}
                <motion.div
                    className="fv-typing"
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 1.8 }}
                >
                    <i /><i /><i />
                </motion.div>
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════
// 3. Animation — timeline + orbiting element
// ═══════════════════════════════════════════════
export function AnimationVisual() {
    return (
        <div className="fv fv--anim">
            <div className="fv-anim-stage">
                {/* Orbiting object */}
                <div className="anim-planet">
                    <div className="anim-ring anim-ring--1" />
                    <div className="anim-ring anim-ring--2" />
                    <div className="anim-ring anim-ring--3" />
                    <div className="anim-core" />
                    <div className="anim-particle anim-particle--1" />
                    <div className="anim-particle anim-particle--2" />
                </div>
            </div>
            {/* Timeline scrubber */}
            <div className="fv-timeline">
                <div className="fv-tl-bar" />
                <div className="fv-tl-fill" />
                <div className="fv-tl-head" />
                <div className="fv-tl-labels">
                    <span>0:00</span><span>0:15</span><span>0:30</span>
                </div>
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════
// 4. Smart Sizing — resize with dotted borders
// ═══════════════════════════════════════════════
export function ResizeVisual() {
    return (
        <div className="fv fv--resize">
            {/* Master frame */}
            <div className="rsz-master">
                <div className="rsz-label">1080 x 1080</div>
                <div className="rsz-content">
                    <div className="rsz-headline">JUST DO IT</div>
                    <div className="rsz-cta">Shop Now</div>
                </div>
                {/* Resize handles */}
                <div className="rsz-handle rsz-handle--r" />
                <div className="rsz-handle rsz-handle--b" />
                <div className="rsz-handle rsz-handle--br" />
                {/* Dotted resize guides */}
                <div className="rsz-guide rsz-guide--h" />
                <div className="rsz-guide rsz-guide--v" />
            </div>
            {/* Variant previews appearing */}
            <motion.div className="rsz-variants"
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.5, duration: 0.6 }}
            >
                <div className="rsz-variant rsz-variant--wide">
                    <span>728 x 90</span>
                </div>
                <div className="rsz-variant rsz-variant--tall">
                    <span>160 x 600</span>
                </div>
                <div className="rsz-variant rsz-variant--mid">
                    <span>300 x 250</span>
                </div>
            </motion.div>
        </div>
    );
}

// ═══════════════════════════════════════════════
// 5. Export — format badges with reveal
// ═══════════════════════════════════════════════
const FORMATS = [
    { name: 'PNG', color: '#6366f1' },
    { name: 'HTML5', color: '#00ffd6' },
    { name: 'GIF', color: '#c084fc' },
    { name: 'MP4', color: '#f472b6' },
    { name: 'JPG', color: '#818cf8' },
];

export function ExportVisual() {
    return (
        <div className="fv fv--export">
            {FORMATS.map((fmt, i) => (
                <motion.div
                    key={fmt.name}
                    className="fv-format"
                    style={{ '--fc': fmt.color } as React.CSSProperties}
                    initial={{ opacity: 0, y: 30, scale: 0.8 }}
                    whileInView={{ opacity: 1, y: 0, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.2 + i * 0.12, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                >
                    <div className="fv-format-icon" />
                    <span>{fmt.name}</span>
                </motion.div>
            ))}
        </div>
    );
}
