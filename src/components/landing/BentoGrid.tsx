// ─────────────────────────────────────────────────
// BentoGrid — Interactive feature grid for landing
// ─────────────────────────────────────────────────
// Frame.io-inspired bento layout with electric cyan
// border glow on hover.
// ─────────────────────────────────────────────────

import { motion } from 'framer-motion';

const BENTO_ITEMS = [
    {
        span: 'wide',
        label: 'Design Engine',
        title: 'GPU-Accelerated Canvas',
        desc: '60fps rendering engine for complex multi-layer compositions with real-time animations and effects.',
        visual: (
            <svg width="100%" height="120" viewBox="0 0 400 120" fill="none">
                <rect x="20" y="10" width="140" height="100" rx="8" fill="rgba(129,140,248,0.08)" stroke="rgba(129,140,248,0.2)" />
                <rect x="30" y="20" width="60" height="20" rx="4" fill="rgba(129,140,248,0.15)" />
                <rect x="30" y="50" width="120" height="8" rx="2" fill="rgba(255,255,255,0.06)" />
                <rect x="30" y="65" width="80" height="8" rx="2" fill="rgba(255,255,255,0.04)" />
                <rect x="180" y="20" width="200" height="80" rx="8" fill="rgba(0,255,214,0.04)" stroke="rgba(0,255,214,0.1)" />
                <circle cx="280" cy="60" r="20" fill="rgba(129,140,248,0.1)" stroke="rgba(129,140,248,0.2)" />
                <rect x="210" y="40" width="40" height="40" rx="6" fill="rgba(0,255,214,0.06)" stroke="rgba(0,255,214,0.12)" />
            </svg>
        ),
    },
    {
        span: 'normal',
        label: 'AI Agent',
        title: 'Creative Co-Pilot',
        desc: 'Generate layouts, swap colors, add elements through natural conversation.',
        visual: (
            <svg width="100%" height="90" viewBox="0 0 200 90" fill="none">
                <rect x="10" y="10" width="180" height="30" rx="6" fill="rgba(0,255,214,0.04)" stroke="rgba(0,255,214,0.1)" />
                <rect x="20" y="20" width="80" height="10" rx="3" fill="rgba(255,255,255,0.06)" />
                <rect x="10" y="50" width="120" height="30" rx="6" fill="rgba(129,140,248,0.06)" stroke="rgba(129,140,248,0.12)" />
                <rect x="20" y="60" width="60" height="10" rx="3" fill="rgba(129,140,248,0.15)" />
            </svg>
        ),
    },
    {
        span: 'normal',
        label: 'Animation',
        title: 'Bring Creatives to Life',
        desc: 'Timeline-based presets with custom easing. Export as video, GIF, or HTML5.',
        visual: (
            <svg width="100%" height="90" viewBox="0 0 200 90" fill="none">
                <rect x="10" y="50" width="180" height="4" rx="2" fill="rgba(255,255,255,0.06)" />
                <circle cx="30" cy="52" r="6" fill="rgba(0,255,214,0.2)" />
                <circle cx="80" cy="52" r="6" fill="rgba(129,140,248,0.2)" />
                <circle cx="140" cy="52" r="6" fill="rgba(192,132,252,0.2)" />
                <polyline points="30,30 60,15 90,25 120,10 150,20 180,5" stroke="rgba(0,255,214,0.3)" strokeWidth="1.5" fill="none" />
            </svg>
        ),
    },
    {
        span: 'wide',
        label: 'Export',
        title: 'Production-Ready Output',
        desc: 'PNG, JPG, HTML5, GIF, MP4, JS Bundle. Every format your campaign needs, in one click.',
        visual: (
            <svg width="100%" height="100" viewBox="0 0 400 100" fill="none">
                {[0, 1, 2, 3, 4].map(i => (
                    <g key={i} transform={`translate(${20 + i * 76}, 15)`}>
                        <rect width="64" height="70" rx="8" fill="rgba(255,255,255,0.02)" stroke="rgba(255,255,255,0.06)" />
                        <text x="32" y="45" textAnchor="middle" fill="rgba(255,255,255,0.25)" fontSize="9" fontFamily="monospace">
                            {['PNG', 'JPG', 'HTML5', 'GIF', 'MP4'][i]}
                        </text>
                    </g>
                ))}
            </svg>
        ),
    },
];

export function BentoGrid() {
    return (
        <section id="features" className="bento-section">
            <div className="bento-header">
                <span className="bento-label">Platform</span>
                <h2 className="bento-title">Everything you need.<br />Nothing you don't.</h2>
                <p className="bento-sub">A complete creative engine that replaces your entire tool stack.</p>
            </div>
            <div className="bento-grid">
                {BENTO_ITEMS.map((item, i) => (
                    <motion.div
                        key={i}
                        className={`bento-card ${item.span === 'wide' ? 'bento-card--wide' : ''}`}
                        initial={{ opacity: 0, y: 40 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, amount: 0.2 }}
                        transition={{ delay: i * 0.1, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                    >
                        {/* Electric cyan glow border */}
                        <div className="bento-glow" />
                        <div className="bento-card-inner">
                            <div className="bento-visual">{item.visual}</div>
                            <span className="bento-card-label">{item.label}</span>
                            <h3 className="bento-card-title">{item.title}</h3>
                            <p className="bento-card-desc">{item.desc}</p>
                        </div>
                    </motion.div>
                ))}
            </div>
        </section>
    );
}
