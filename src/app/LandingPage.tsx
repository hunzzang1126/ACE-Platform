// ─────────────────────────────────────────────────
// LandingPage — frame.io-inspired premium marketing page
// ─────────────────────────────────────────────────
// Pricing → LandingPricing.tsx
// How It Works → HowItWorks.tsx
// ─────────────────────────────────────────────────

import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { GlidLogo } from '@/components/brand/GlidLogo';
import { HowItWorks } from './HowItWorks';
import { LandingPricing } from './LandingPricing';
import './landing.css';

const ArrowRight = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
);

const FEATURES = [
    {
        label: 'Design Engine',
        title: 'GPU-Accelerated Canvas',
        description: 'A Fabric.js-powered rendering engine that delivers 60fps interactions — even on complex multi-layer compositions with animations, effects, and high-res images.',
        icon: (
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="4" width="16" height="16" rx="2" /><rect x="9" y="9" width="6" height="6" /><line x1="9" y1="1" x2="9" y2="4" /><line x1="15" y1="1" x2="15" y2="4" /><line x1="9" y1="20" x2="9" y2="23" /><line x1="15" y1="20" x2="15" y2="23" /><line x1="20" y1="9" x2="23" y2="9" /><line x1="20" y1="14" x2="23" y2="14" /><line x1="1" y1="9" x2="4" y2="9" /><line x1="1" y1="14" x2="4" y2="14" /></svg>
        ),
    },
    {
        label: 'Smart Sizing',
        title: 'Design Once, Deploy Everywhere',
        description: 'Create a single master design and auto-propagate to every ad format — 300x250, 728x90, 160x600, social stories, and beyond. One click, infinite sizes.',
        icon: (
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></svg>
        ),
    },
    {
        label: 'AI Agent',
        title: 'Your Creative Co-Pilot',
        description: 'An embedded AI assistant that understands your canvas. Generate layouts, swap colors, add elements, remove backgrounds — all through natural conversation.',
        icon: (
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 4V2" /><path d="M15 16v-2" /><path d="M8 9h2" /><path d="M20 9h2" /><path d="M17.8 11.8 19 13" /><path d="M15 9h0" /><path d="M17.8 6.2 19 5" /><path d="m3 21 9-9" /><path d="M12.2 6.2 11 5" /></svg>
        ),
    },
    {
        label: 'Animation',
        title: 'Bring Creatives to Life',
        description: 'Timeline-based animation presets with custom easing, stagger, and sequencing. Preview in real-time and export as video, GIF, or interactive HTML5.',
        icon: (
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>
        ),
    },
];

export function LandingPage() {
    const navigate = useNavigate();
    const { isAuthenticated, isApproved } = useAuthStore();
    const sectionsRef = useRef<HTMLDivElement[]>([]);

    useEffect(() => {
        if (isAuthenticated() && isApproved()) {
            navigate('/dashboard', { replace: true });
        }
    }, [isAuthenticated, isApproved, navigate]);

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => { entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); }); },
            { threshold: 0.1 },
        );
        sectionsRef.current.forEach(el => { if (el) observer.observe(el); });
        return () => observer.disconnect();
    }, []);

    const addRef = (el: HTMLDivElement | null) => {
        if (el && !sectionsRef.current.includes(el)) sectionsRef.current.push(el);
    };

    return (
        <div className="lp">
            {/* ── Nav ── */}
            <nav className="lp-nav">
                <div className="lp-nav-inner">
                    <GlidLogo size={22} variant="white" className="lp-nav-logo" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} />
                    <div className="lp-nav-links">
                        <button className="lp-nav-link" onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}>Features</button>
                        <button className="lp-nav-link" onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}>Workflow</button>
                        <button className="lp-nav-link" onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })}>Pricing</button>
                    </div>
                    <div className="lp-nav-actions">
                        <button className="lp-nav-link" onClick={() => navigate('/login')}>Sign In</button>
                        <button className="lp-nav-cta" onClick={() => navigate('/login')}>Get Started Free</button>
                    </div>
                </div>
            </nav>

            {/* ── Hero ── */}
            <section className="lp-hero">
                <div className="lp-hero-glow lp-hero-glow-1" />
                <div className="lp-hero-glow lp-hero-glow-2" />
                <div className="lp-hero-content">
                    <div className="lp-hero-badge">
                        <span className="lp-hero-badge-dot" />
                        AI-Native Creative Platform
                    </div>
                    <h1 className="lp-hero-title">
                        Create at the<br />
                        <span className="lp-gradient-text">Speed of Thought</span>
                    </h1>
                    <p className="lp-hero-sub">
                        Glid is the creative platform for performance marketing teams.
                        Design, animate, and deploy ad creatives across every channel
                        — powered by AI and an intelligent design agent.
                    </p>
                    <div className="lp-hero-actions">
                        <button className="lp-btn-primary" onClick={() => navigate('/login')}>
                            Get Started Free <ArrowRight />
                        </button>
                        <button className="lp-btn-ghost" onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}>
                            See How It Works
                        </button>
                    </div>
                </div>
                <div className="lp-hero-visual fade-in-section" ref={addRef}>
                    <img src="/hero-mockup.png" alt="Glid Creative Platform" className="lp-hero-img" />
                    <div className="lp-hero-img-glow" />
                </div>
            </section>

            {/* ── Metrics ── */}
            <div className="lp-metrics fade-in-section" ref={addRef}>
                <div className="lp-metric">
                    <div className="lp-metric-value">60fps</div>
                    <div className="lp-metric-label">GPU-Accelerated Rendering</div>
                </div>
                <div className="lp-metric-divider" />
                <div className="lp-metric">
                    <div className="lp-metric-value">15+</div>
                    <div className="lp-metric-label">Ad Sizes, One Click</div>
                </div>
                <div className="lp-metric-divider" />
                <div className="lp-metric">
                    <div className="lp-metric-value">AI</div>
                    <div className="lp-metric-label">Built-in Creative Agent</div>
                </div>
                <div className="lp-metric-divider" />
                <div className="lp-metric">
                    <div className="lp-metric-value">&lt;1s</div>
                    <div className="lp-metric-label">Export Latency</div>
                </div>
            </div>

            {/* ── Features ── */}
            <section id="features" className="lp-features">
                <div className="lp-features-header fade-in-section" ref={addRef}>
                    <div className="lp-section-label">Platform</div>
                    <h2 className="lp-section-title">Everything you need.<br />Nothing you don't.</h2>
                    <p className="lp-section-sub">
                        A complete creative platform that replaces your entire tool stack.
                    </p>
                </div>
                <div className="lp-features-grid">
                    {FEATURES.map((f, i) => (
                        <div key={i} className="lp-feature-card fade-in-section" ref={addRef} style={{ transitionDelay: `${i * 100}ms` }}>
                            <div className="lp-feature-icon">{f.icon}</div>
                            <div className="lp-feature-label">{f.label}</div>
                            <h3 className="lp-feature-title">{f.title}</h3>
                            <p className="lp-feature-desc">{f.description}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* ── How It Works ── */}
            <HowItWorks addRef={addRef} />

            {/* ── Pricing ── */}
            <LandingPricing addRef={addRef} />

            {/* ── CTA ── */}
            <section className="lp-cta fade-in-section" ref={addRef}>
                <div className="lp-cta-glow" />
                <h2 className="lp-cta-title">Ready to create?</h2>
                <p className="lp-cta-sub">Start building production-ready creatives in minutes. No credit card required.</p>
                <button className="lp-btn-primary lp-btn-lg" onClick={() => navigate('/login')}>
                    Get Started Free <ArrowRight />
                </button>
            </section>

            {/* ── Footer ── */}
            <footer className="lp-footer">
                <div className="lp-footer-inner">
                    <div className="lp-footer-brand">
                        <GlidLogo size={20} variant="white" />
                        <span className="lp-footer-tagline">Global Intelligence Design</span>
                    </div>
                    <div className="lp-footer-cols">
                        <div className="lp-footer-col">
                            <h4>Product</h4>
                            <button onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}>Features</button>
                            <button onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })}>Pricing</button>
                            <button onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}>Workflow</button>
                        </div>
                        <div className="lp-footer-col">
                            <h4>Company</h4>
                            <a href="mailto:hello@glid.ai">Contact</a>
                            <a href="mailto:sales@glid.ai">Sales</a>
                        </div>
                    </div>
                </div>
                <div className="lp-footer-bottom">
                    <span>&copy; {new Date().getFullYear()} Glid. All rights reserved.</span>
                </div>
            </footer>
        </div>
    );
}
