// ─────────────────────────────────────────────────
// HowItWorks — Immersive Apple-style workflow section
// ─────────────────────────────────────────────────
// StepVisual SVG illustrations → StepVisual.tsx
// ─────────────────────────────────────────────────

import { useEffect, useRef, useState } from 'react';
import { StepVisual } from './StepVisual';

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
                    <span className="hiw-comparison-label">With Glid</span>
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
                    Here is exactly how Glid transforms your creative production.
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
                                        <span className="hiw-step-time-label">With Glid</span>
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
