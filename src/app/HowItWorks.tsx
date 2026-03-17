// ─────────────────────────────────────────────────
// HowItWorks — Immersive Apple-style workflow section
// ─────────────────────────────────────────────────
// Professional, scroll-animated "How It Works" section
// that demonstrates ACE's workflow and time savings.

import { useEffect, useRef, useState } from 'react';

// ── Step Data ──

const WORKFLOW_STEPS = [
    {
        number: '01',
        label: 'START',
        title: 'Begin with a Blank Canvas',
        description: 'No templates. No constraints. Start from a clean slate with your chosen dimensions — standard display, social, or custom. Your creative, your rules.',
        timeOld: '15 min',
        timeNew: '30 sec',
        visual: 'canvas',
    },
    {
        number: '02',
        label: 'DESIGN',
        title: 'Let AI Build Your Layout',
        description: 'Describe what you want in natural language. The AI agent generates complete layouts with properly positioned text, shapes, and backgrounds — in seconds, not hours.',
        timeOld: '2 hours',
        timeNew: '10 sec',
        visual: 'ai',
    },
    {
        number: '03',
        label: 'REFINE',
        title: 'Polish with Precision Tools',
        description: 'Fine-tune every detail with a professional design toolkit. Pixel-perfect alignment, advanced typography, brand-compliant colors — all with real-time 60fps feedback.',
        timeOld: '45 min',
        timeNew: '5 min',
        visual: 'tools',
    },
    {
        number: '04',
        label: 'SCALE',
        title: 'Plug and Propagate',
        description: 'Connect your sizes with the plug system. Edit once, and smart sizing automatically adapts your design to every format — 300x250, 728x90, 160x600, social, and beyond.',
        timeOld: '4+ hours',
        timeNew: '1 click',
        visual: 'plug',
    },
    {
        number: '05',
        label: 'ANIMATE',
        title: 'Bring It to Life',
        description: 'Apply animation presets with one click. Fade, slide, scale, stagger — preview in real-time and fine-tune timing with the visual timeline editor.',
        timeOld: '3 hours',
        timeNew: '2 min',
        visual: 'animate',
    },
    {
        number: '06',
        label: 'EXPORT',
        title: 'Ship Everywhere',
        description: 'Export production-ready HTML5, MP4, GIF, or static images. Every format, every platform, every spec — automatically optimized and compliant.',
        timeOld: '30 min',
        timeNew: 'Instant',
        visual: 'export',
    },
];

// ── Visual Element Components (inline SVG — no emojis, no external deps) ──

function StepVisual({ type }: { type: string }) {
    switch (type) {
        case 'canvas':
            return (
                <div className="hiw-visual-inner">
                    <svg viewBox="0 0 240 160" fill="none">
                        <rect x="20" y="15" width="200" height="130" rx="8" fill="#0d1520" stroke="#2a3040" strokeWidth="1.5" />
                        <rect x="30" y="25" width="180" height="110" rx="4" fill="#111827" strokeDasharray="6 4" stroke="#4a9eff" strokeWidth="1" opacity="0.5" />
                        <line x1="120" y1="25" x2="120" y2="135" stroke="#4a9eff" strokeWidth="0.5" opacity="0.3" />
                        <line x1="30" y1="80" x2="210" y2="80" stroke="#4a9eff" strokeWidth="0.5" opacity="0.3" />
                        <text x="120" y="84" textAnchor="middle" fill="#4a9eff" fontSize="11" fontWeight="500" opacity="0.6">300 x 250</text>
                        <circle cx="120" cy="60" r="3" fill="#4a9eff" opacity="0.8">
                            <animate attributeName="opacity" values="0.4;1;0.4" dur="2s" repeatCount="indefinite" />
                        </circle>
                    </svg>
                </div>
            );
        case 'ai':
            return (
                <div className="hiw-visual-inner">
                    <svg viewBox="0 0 240 160" fill="none">
                        {/* Chat bubble */}
                        <rect x="20" y="20" width="180" height="40" rx="12" fill="#1a1f2e" stroke="#6c5ce7" strokeWidth="1" opacity="0.8" />
                        <text x="30" y="44" fill="#a29bfe" fontSize="10" fontWeight="500">"Create a Nike ad with bold typography"</text>
                        {/* Generated layout */}
                        <rect x="40" y="75" width="160" height="70" rx="6" fill="#111827" stroke="#2a3040" strokeWidth="1">
                            <animate attributeName="opacity" values="0;1" dur="1.5s" fill="freeze" />
                        </rect>
                        <rect x="52" y="85" width="80" height="10" rx="2" fill="#6c5ce7" opacity="0.7">
                            <animate attributeName="width" values="0;80" dur="0.8s" begin="0.5s" fill="freeze" />
                        </rect>
                        <rect x="52" y="100" width="120" height="6" rx="1.5" fill="#484f58" opacity="0.4">
                            <animate attributeName="width" values="0;120" dur="0.6s" begin="0.8s" fill="freeze" />
                        </rect>
                        <rect x="52" y="112" width="60" height="20" rx="10" fill="#00cec9" opacity="0.6">
                            <animate attributeName="opacity" values="0;0.6" dur="0.4s" begin="1.2s" fill="freeze" />
                        </rect>
                    </svg>
                </div>
            );
        case 'tools':
            return (
                <div className="hiw-visual-inner">
                    <svg viewBox="0 0 240 160" fill="none">
                        {/* Canvas with elements */}
                        <rect x="20" y="15" width="140" height="130" rx="6" fill="#0d1520" stroke="#2a3040" strokeWidth="1" />
                        <rect x="30" y="30" width="80" height="14" rx="2" fill="#6c5ce7" opacity="0.8" />
                        <rect x="30" y="50" width="120" height="8" rx="1.5" fill="#484f58" opacity="0.5" />
                        <rect x="30" y="62" width="90" height="8" rx="1.5" fill="#484f58" opacity="0.3" />
                        <rect x="30" y="80" width="50" height="24" rx="12" fill="#00cec9" opacity="0.6" />
                        {/* Selection handles */}
                        <rect x="27" y="27" width="86" height="20" rx="0" fill="none" stroke="#4a9eff" strokeWidth="1.5" strokeDasharray="4 2" />
                        <circle cx="27" cy="27" r="3" fill="#4a9eff" /><circle cx="113" cy="27" r="3" fill="#4a9eff" />
                        <circle cx="27" cy="47" r="3" fill="#4a9eff" /><circle cx="113" cy="47" r="3" fill="#4a9eff" />
                        {/* Property panel */}
                        <rect x="172" y="15" width="55" height="130" rx="6" fill="#111827" stroke="#2a3040" strokeWidth="1" />
                        <rect x="178" y="25" width="42" height="6" rx="1" fill="#484f58" opacity="0.4" />
                        <rect x="178" y="38" width="42" height="12" rx="3" fill="#1a1f2e" stroke="#2a3040" strokeWidth="0.5" />
                        <rect x="178" y="56" width="42" height="6" rx="1" fill="#484f58" opacity="0.4" />
                        <rect x="178" y="68" width="42" height="12" rx="3" fill="#1a1f2e" stroke="#2a3040" strokeWidth="0.5" />
                        <rect x="178" y="86" width="42" height="6" rx="1" fill="#484f58" opacity="0.4" />
                        <circle cx="185" cy="102" r="6" fill="#6c5ce7" opacity="0.6" />
                        <circle cx="199" cy="102" r="6" fill="#00cec9" opacity="0.6" />
                        <circle cx="213" cy="102" r="6" fill="#fd79a8" opacity="0.6" />
                    </svg>
                </div>
            );
        case 'plug':
            return (
                <div className="hiw-visual-inner">
                    <svg viewBox="0 0 240 160" fill="none">
                        {/* Origin card */}
                        <rect x="10" y="40" width="60" height="80" rx="6" fill="#111827" stroke="#4a9eff" strokeWidth="1.5" />
                        <text x="40" y="55" textAnchor="middle" fill="#f5f5f7" fontSize="7" fontWeight="600">300x250</text>
                        <rect x="16" y="62" width="48" height="50" rx="3" fill="#0d1520" />
                        {/* Output port */}
                        <circle cx="70" cy="80" r="6" fill="#0d1520" stroke="#4a9eff" strokeWidth="2" />
                        <circle cx="70" cy="80" r="3" fill="#4a9eff" opacity="0.9" />
                        {/* Cables */}
                        <path d="M76 80 Q110 50 140 45" stroke="url(#pgradA)" strokeWidth="2" fill="none" strokeLinecap="round" />
                        <path d="M76 80 Q110 80 140 80" stroke="url(#pgradA)" strokeWidth="2" fill="none" strokeLinecap="round" />
                        <path d="M76 80 Q110 110 140 115" stroke="url(#pgradA)" strokeWidth="2" fill="none" strokeLinecap="round" />
                        {/* Target cards */}
                        <rect x="140" y="20" width="50" height="50" rx="5" fill="#111827" stroke="#a855f7" strokeWidth="1" />
                        <text x="165" y="35" textAnchor="middle" fill="#f5f5f7" fontSize="6" fontWeight="500">728x90</text>
                        <rect x="140" y="60" width="50" height="40" rx="5" fill="#111827" stroke="#a855f7" strokeWidth="1" />
                        <text x="165" y="75" textAnchor="middle" fill="#f5f5f7" fontSize="6" fontWeight="500">160x600</text>
                        <rect x="140" y="95" width="50" height="40" rx="5" fill="#111827" stroke="#a855f7" strokeWidth="1" />
                        <text x="165" y="110" textAnchor="middle" fill="#f5f5f7" fontSize="6" fontWeight="500">9:16</text>
                        {/* Input sockets */}
                        <circle cx="140" cy="45" r="4" fill="#0d1520" stroke="#a855f7" strokeWidth="1.5" />
                        <circle cx="140" cy="80" r="4" fill="#0d1520" stroke="#a855f7" strokeWidth="1.5" />
                        <circle cx="140" cy="115" r="4" fill="#0d1520" stroke="#a855f7" strokeWidth="1.5" />
                        {/* Checkmarks appear */}
                        <text x="200" y="48" fill="#28c840" fontSize="12" fontWeight="700" opacity="0.8">
                            <animate attributeName="opacity" values="0;0.8" dur="0.3s" begin="0.8s" fill="freeze" />
                            &#10003;</text>
                        <text x="200" y="83" fill="#28c840" fontSize="12" fontWeight="700" opacity="0.8">
                            <animate attributeName="opacity" values="0;0.8" dur="0.3s" begin="1.1s" fill="freeze" />
                            &#10003;</text>
                        <text x="200" y="118" fill="#28c840" fontSize="12" fontWeight="700" opacity="0.8">
                            <animate attributeName="opacity" values="0;0.8" dur="0.3s" begin="1.4s" fill="freeze" />
                            &#10003;</text>
                        <defs>
                            <linearGradient id="pgradA" x1="0" y1="0" x2="1" y2="0">
                                <stop offset="0%" stopColor="#4a9eff" />
                                <stop offset="100%" stopColor="#a855f7" />
                            </linearGradient>
                        </defs>
                    </svg>
                </div>
            );
        case 'animate':
            return (
                <div className="hiw-visual-inner">
                    <svg viewBox="0 0 240 160" fill="none">
                        {/* Preview area */}
                        <rect x="20" y="15" width="200" height="95" rx="6" fill="#0d1520" stroke="#2a3040" strokeWidth="1" />
                        <rect x="60" y="35" width="120" height="14" rx="2" fill="#6c5ce7" opacity="0.8">
                            <animateTransform attributeName="transform" type="translate" values="-40,0;0,0" dur="1.5s" repeatCount="indefinite" />
                            <animate attributeName="opacity" values="0;0.8" dur="1.5s" repeatCount="indefinite" />
                        </rect>
                        <rect x="80" y="55" width="80" height="8" rx="1.5" fill="#484f58" opacity="0.5">
                            <animateTransform attributeName="transform" type="translate" values="40,0;0,0" dur="1.5s" begin="0.2s" repeatCount="indefinite" />
                            <animate attributeName="opacity" values="0;0.5" dur="1.5s" begin="0.2s" repeatCount="indefinite" />
                        </rect>
                        <rect x="90" y="75" width="60" height="20" rx="10" fill="#00cec9" opacity="0.6">
                            <animate attributeName="opacity" values="0;0.6" dur="1.5s" begin="0.5s" repeatCount="indefinite" />
                            <animateTransform attributeName="transform" type="scale" values="0.5;1" dur="1.5s" begin="0.5s" repeatCount="indefinite" />
                        </rect>
                        {/* Timeline */}
                        <rect x="20" y="118" width="200" height="30" rx="4" fill="#111827" stroke="#2a3040" strokeWidth="1" />
                        <line x1="30" y1="133" x2="210" y2="133" stroke="#2a3040" strokeWidth="1" />
                        <rect x="30" y="126" width="60" height="4" rx="2" fill="#6c5ce7" opacity="0.6" />
                        <rect x="50" y="132" width="40" height="4" rx="2" fill="#00cec9" opacity="0.6" />
                        <rect x="70" y="138" width="50" height="4" rx="2" fill="#fd79a8" opacity="0.5" />
                        {/* Playhead */}
                        <line x1="100" y1="122" x2="100" y2="146" stroke="#f5f5f7" strokeWidth="1" opacity="0.6">
                            <animate attributeName="x1" values="30;210;30" dur="4s" repeatCount="indefinite" />
                            <animate attributeName="x2" values="30;210;30" dur="4s" repeatCount="indefinite" />
                        </line>
                    </svg>
                </div>
            );
        case 'export':
            return (
                <div className="hiw-visual-inner">
                    <svg viewBox="0 0 240 160" fill="none">
                        {/* Export cards */}
                        <rect x="20" y="30" width="60" height="40" rx="6" fill="#111827" stroke="#2a3040" strokeWidth="1" />
                        <text x="50" y="47" textAnchor="middle" fill="#4a9eff" fontSize="8" fontWeight="600">HTML5</text>
                        <text x="50" y="60" textAnchor="middle" fill="#484f58" fontSize="6">Interactive</text>

                        <rect x="90" y="30" width="60" height="40" rx="6" fill="#111827" stroke="#2a3040" strokeWidth="1" />
                        <text x="120" y="47" textAnchor="middle" fill="#00cec9" fontSize="8" fontWeight="600">MP4</text>
                        <text x="120" y="60" textAnchor="middle" fill="#484f58" fontSize="6">Video Ad</text>

                        <rect x="160" y="30" width="60" height="40" rx="6" fill="#111827" stroke="#2a3040" strokeWidth="1" />
                        <text x="190" y="47" textAnchor="middle" fill="#fd79a8" fontSize="8" fontWeight="600">PNG</text>
                        <text x="190" y="60" textAnchor="middle" fill="#484f58" fontSize="6">Static</text>

                        {/* Progress bar */}
                        <rect x="50" y="90" width="140" height="8" rx="4" fill="#1a1f2e" />
                        <rect x="50" y="90" width="0" height="8" rx="4" fill="url(#exportGrad)">
                            <animate attributeName="width" values="0;140" dur="2s" repeatCount="indefinite" />
                        </rect>
                        <text x="120" y="116" textAnchor="middle" fill="#f5f5f7" fontSize="9" fontWeight="500" opacity="0.7">Exporting all formats...</text>

                        {/* Platform icons */}
                        <rect x="50" y="125" width="28" height="18" rx="3" fill="#1a1f2e" stroke="#2a3040" strokeWidth="0.5" />
                        <text x="64" y="137" textAnchor="middle" fill="#484f58" fontSize="5">Google</text>
                        <rect x="82" y="125" width="28" height="18" rx="3" fill="#1a1f2e" stroke="#2a3040" strokeWidth="0.5" />
                        <text x="96" y="137" textAnchor="middle" fill="#484f58" fontSize="5">Meta</text>
                        <rect x="114" y="125" width="28" height="18" rx="3" fill="#1a1f2e" stroke="#2a3040" strokeWidth="0.5" />
                        <text x="128" y="137" textAnchor="middle" fill="#484f58" fontSize="5">TikTok</text>
                        <rect x="146" y="125" width="28" height="18" rx="3" fill="#1a1f2e" stroke="#2a3040" strokeWidth="0.5" />
                        <text x="160" y="137" textAnchor="middle" fill="#484f58" fontSize="5">DV360</text>
                        <defs>
                            <linearGradient id="exportGrad" x1="0" y1="0" x2="1" y2="0">
                                <stop offset="0%" stopColor="#6c5ce7" />
                                <stop offset="50%" stopColor="#00cec9" />
                                <stop offset="100%" stopColor="#fd79a8" />
                            </linearGradient>
                        </defs>
                    </svg>
                </div>
            );
        default:
            return null;
    }
}

// ── Time Savings Counter ──

function TimeSavingsCounter() {
    const ref = useRef<HTMLDivElement>(null);
    const [count, setCount] = useState(0);
    const target = 87; // 87% time savings

    useEffect(() => {
        const el = ref.current;
        if (!el) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0]?.isIntersecting) {
                    let current = 0;
                    const step = Math.ceil(target / 60); // 60 frames
                    const timer = setInterval(() => {
                        current += step;
                        if (current >= target) {
                            current = target;
                            clearInterval(timer);
                        }
                        setCount(current);
                    }, 16);
                    observer.disconnect();
                }
            },
            { threshold: 0.5 },
        );

        observer.observe(el);
        return () => observer.disconnect();
    }, []);

    return (
        <div className="hiw-savings" ref={ref}>
            <div className="hiw-savings-inner">
                <div className="hiw-savings-number">
                    <span className="hiw-savings-value">{count}</span>
                    <span className="hiw-savings-pct">%</span>
                </div>
                <div className="hiw-savings-label">Average Time Saved</div>
                <div className="hiw-savings-detail">
                    What used to take a full design team 8+ hours
                    now takes a single creative 45 minutes.
                </div>
            </div>

            <div className="hiw-comparison">
                <div className="hiw-comparison-row">
                    <span className="hiw-comparison-label">Traditional Workflow</span>
                    <div className="hiw-comparison-bar hiw-comparison-bar--old">
                        <div className="hiw-comparison-fill hiw-comparison-fill--old" />
                    </div>
                    <span className="hiw-comparison-time">8+ hours</span>
                </div>
                <div className="hiw-comparison-row">
                    <span className="hiw-comparison-label">With ACE</span>
                    <div className="hiw-comparison-bar hiw-comparison-bar--new">
                        <div className="hiw-comparison-fill hiw-comparison-fill--new" />
                    </div>
                    <span className="hiw-comparison-time hiw-comparison-time--accent">~45 min</span>
                </div>
            </div>
        </div>
    );
}

// ── Main Export ──

export function HowItWorks({ addRef }: { addRef: (el: HTMLDivElement | null) => void }) {
    return (
        <section id="how-it-works" className="hiw-section">
            {/* Section header */}
            <div className="hiw-header fade-in-section" ref={addRef}>
                <div className="hiw-header-glow" />
                <div className="landing-section-label">Workflow</div>
                <h2 className="landing-section-title">
                    Six Steps.<br />
                    <span className="gradient-text">Zero Busywork.</span>
                </h2>
                <p className="landing-section-sub">
                    From blank canvas to deployed campaign in minutes.
                    Here is exactly how ACE transforms your creative production.
                </p>
            </div>

            {/* Workflow steps */}
            <div className="hiw-steps">
                {WORKFLOW_STEPS.map((step, i) => (
                    <div
                        key={i}
                        className="hiw-step fade-in-section"
                        ref={addRef}
                        style={{ transitionDelay: `${i * 80}ms` }}
                    >
                        {/* Connector line */}
                        {i < WORKFLOW_STEPS.length - 1 && (
                            <div className="hiw-step-connector" />
                        )}

                        <div className="hiw-step-meta">
                            <span className="hiw-step-number">{step.number}</span>
                            <span className="hiw-step-label">{step.label}</span>
                        </div>

                        <div className="hiw-step-content">
                            <div className="hiw-step-text">
                                <h3>{step.title}</h3>
                                <p>{step.description}</p>
                                <div className="hiw-step-time">
                                    <div className="hiw-step-time-old">
                                        <span className="hiw-step-time-label">Before</span>
                                        <span className="hiw-step-time-value">{step.timeOld}</span>
                                    </div>
                                    <div className="hiw-step-time-arrow">
                                        <svg width="24" height="12" viewBox="0 0 24 12" fill="none">
                                            <path d="M0 6H20M20 6L15 1M20 6L15 11" stroke="#00cec9" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                    </div>
                                    <div className="hiw-step-time-new">
                                        <span className="hiw-step-time-label">With ACE</span>
                                        <span className="hiw-step-time-value">{step.timeNew}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="hiw-step-visual">
                                <StepVisual type={step.visual} />
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Time savings counter */}
            <div className="fade-in-section" ref={addRef}>
                <TimeSavingsCounter />
            </div>
        </section>
    );
}
