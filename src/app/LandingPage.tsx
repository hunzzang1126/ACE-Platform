// ─────────────────────────────────────────────────
// LandingPage — Apple-style marketing page for ACE
// ─────────────────────────────────────────────────

import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import './landing.css';

// SVG icons as inline components (no emoji, no external deps)
const IconBolt = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
);
const IconLayers = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>
);
const IconCpu = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/><line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="14" x2="23" y2="14"/><line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="14" x2="4" y2="14"/></svg>
);
const IconGrid = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
);
const IconWand = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 4V2"/><path d="M15 16v-2"/><path d="M8 9h2"/><path d="M20 9h2"/><path d="M17.8 11.8 19 13"/><path d="M15 9h0"/><path d="M17.8 6.2 19 5"/><path d="m3 21 9-9"/><path d="M12.2 6.2 11 5"/></svg>
);
const IconZap = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
);
const IconArrow = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
);

const FEATURES = [
    {
        icon: <IconCpu />,
        title: 'WebGPU Rendering Engine',
        description: 'Hardware-accelerated canvas powered by a custom Rust/WASM engine. 60fps interactions with zero jank, even on complex multi-layer compositions.',
    },
    {
        icon: <IconGrid />,
        title: 'Smart Multi-Size System',
        description: 'Design once, deploy everywhere. Edit the master variant and auto-propagate changes to every ad size — 300x250, 970x250, 160x600, and beyond.',
    },
    {
        icon: <IconWand />,
        title: 'AI Creative Agent',
        description: 'An embedded AI assistant that understands your design. Generate layouts, swap colors, add elements, and iterate — all through natural conversation.',
    },
    {
        icon: <IconLayers />,
        title: 'Full Creative Toolkit',
        description: 'Shapes, text, images, videos, gradients, animations, and effects. Everything you need to build production-ready creatives without switching tools.',
    },
    {
        icon: <IconBolt />,
        title: 'Animation Engine',
        description: 'Timeline-based animation presets with custom easing, stagger, and sequencing. Preview in real-time and export as video, GIF, or interactive HTML5.',
    },
    {
        icon: <IconZap />,
        title: 'Brand Compliance',
        description: 'Upload your brand kit — logos, colors, fonts, guidelines. The platform enforces consistency across every creative automatically.',
    },
];

export function LandingPage() {
    const navigate = useNavigate();
    const { isAuthenticated, isApproved } = useAuthStore();
    const sectionsRef = useRef<HTMLDivElement[]>([]);

    // If already logged in, redirect
    useEffect(() => {
        if (isAuthenticated() && isApproved()) {
            navigate('/dashboard', { replace: true });
        }
    }, [isAuthenticated, isApproved, navigate]);

    // Intersection Observer for scroll animations
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('visible');
                    }
                });
            },
            { threshold: 0.15 },
        );

        sectionsRef.current.forEach(el => { if (el) observer.observe(el); });
        return () => observer.disconnect();
    }, []);

    const addRef = (el: HTMLDivElement | null) => {
        if (el && !sectionsRef.current.includes(el)) {
            sectionsRef.current.push(el);
        }
    };

    return (
        <div className="landing-page">
            {/* ── Navigation ── */}
            <nav className="landing-nav">
                <div className="landing-nav-logo">ACE</div>
                <div className="landing-nav-links">
                    <button className="landing-nav-link" onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}>Features</button>
                    <button className="landing-nav-link" onClick={() => document.getElementById('showcase')?.scrollIntoView({ behavior: 'smooth' })}>Platform</button>
                    <button className="landing-nav-cta" onClick={() => navigate('/login')}>Sign In</button>
                </div>
            </nav>

            {/* ── Hero ── */}
            <section className="landing-hero">
                <div className="landing-hero-glow landing-hero-glow-1" />
                <div className="landing-hero-glow landing-hero-glow-2" />

                <div className="landing-hero-badge">
                    <span className="landing-hero-badge-dot" />
                    Autonomous Creative Engine
                </div>

                <h1>
                    Create at the<br />
                    <span className="gradient-text">Speed of Thought</span>
                </h1>

                <p className="landing-hero-sub">
                    ACE is the AI-native creative platform for performance marketing.
                    Design, animate, and deploy ad creatives across every channel
                    — powered by WebGPU and an intelligent design agent.
                </p>

                <div className="landing-hero-actions">
                    <button className="landing-btn-primary" onClick={() => navigate('/login')}>
                        Get Started <IconArrow />
                    </button>
                    <button className="landing-btn-secondary" onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}>
                        Learn More
                    </button>
                </div>
            </section>

            {/* ── Stats ── */}
            <div className="landing-stats fade-in-section" ref={addRef}>
                <div className="landing-stat">
                    <div className="landing-stat-value">60fps</div>
                    <div className="landing-stat-label">GPU-Accelerated Rendering</div>
                </div>
                <div className="landing-stat">
                    <div className="landing-stat-value">15+</div>
                    <div className="landing-stat-label">Ad Sizes, One Click</div>
                </div>
                <div className="landing-stat">
                    <div className="landing-stat-value">AI</div>
                    <div className="landing-stat-label">Built-in Creative Agent</div>
                </div>
                <div className="landing-stat">
                    <div className="landing-stat-value">0ms</div>
                    <div className="landing-stat-label">Export Latency</div>
                </div>
            </div>

            {/* ── Features ── */}
            <section id="features" className="landing-features fade-in-section" ref={addRef}>
                <div className="landing-section-label">Capabilities</div>
                <h2 className="landing-section-title">Everything You Need.<br />Nothing You Don't.</h2>
                <p className="landing-section-sub">
                    A complete creative platform that replaces your entire tool stack.
                    From concept to production in a single workflow.
                </p>

                <div className="landing-features-grid">
                    {FEATURES.map((f, i) => (
                        <div key={i} className="landing-feature-card">
                            <div className="landing-feature-icon">{f.icon}</div>
                            <h3>{f.title}</h3>
                            <p>{f.description}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* ── Showcase ── */}
            <section id="showcase" className="landing-showcase fade-in-section" ref={addRef}>
                <div className="landing-section-label">Platform</div>
                <h2 className="landing-section-title">Built for Scale</h2>
                <p className="landing-section-sub">
                    From solo designers to enterprise teams. ACE adapts to your workflow
                    with cloud sync, version history, and role-based access.
                </p>

                <div className="landing-showcase-window">
                    <div className="landing-showcase-bar">
                        <div className="landing-showcase-dot" />
                        <div className="landing-showcase-dot" />
                        <div className="landing-showcase-dot" />
                    </div>
                    <div className="landing-showcase-content">
                        <span className="landing-showcase-label">ACE Creative Workspace</span>
                    </div>
                </div>
            </section>

            {/* ── CTA ── */}
            <section className="landing-cta fade-in-section" ref={addRef}>
                <div className="landing-cta-glow" />
                <h2>Ready to Create?</h2>
                <p>Start building production-ready creatives in minutes.</p>
                <button className="landing-btn-primary" onClick={() => navigate('/login')}>
                    Get Started Free <IconArrow />
                </button>
            </section>

            {/* ── Footer ── */}
            <footer className="landing-footer">
                <span className="landing-footer-text">ACE — Autonomous Creative Engine</span>
                <span className="landing-footer-text">&copy; {new Date().getFullYear()} All rights reserved.</span>
            </footer>
        </div>
    );
}
