// ─────────────────────────────────────────────────
// LandingPage — Framer Motion-powered cinematic landing
// ─────────────────────────────────────────────────
// Pricing → LandingPricing.tsx | Workflow → HowItWorks.tsx
// ─────────────────────────────────────────────────

import { useEffect, useRef, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useAuthStore } from '@/stores/authStore';
import { GlidLogo } from '@/components/brand/GlidLogo';
import { HowItWorks } from './HowItWorks';
import { LandingPricing } from './LandingPricing';
import './landing.css';

const SpiralVortex = lazy(() => import('@/components/landing/SpiralVortex').then(m => ({ default: m.SpiralVortex })));

const Arrow = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
);

// Scroll-reveal wrapper
const Reveal = ({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) => (
    <motion.div
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.15 }}
        transition={{ duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] }}
        className={className}
    >
        {children}
    </motion.div>
);

const FEATURES = [
    { label: 'Design Engine', title: 'GPU-Accelerated Canvas', desc: 'A Fabric.js rendering engine delivering 60fps interactions — even on complex multi-layer compositions with animations, effects, and high-res images.', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="1.5"><rect x="4" y="4" width="16" height="16" rx="2" /><rect x="9" y="9" width="6" height="6" /></svg> },
    { label: 'Smart Sizing', title: 'Design Once, Deploy Everywhere', desc: 'Create a single master design and auto-propagate to every ad format — 300x250, 728x90, 160x600, social stories, and beyond.', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="1.5"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></svg> },
    { label: 'AI Agent', title: 'Your Creative Co-Pilot', desc: 'An embedded AI assistant that understands your canvas. Generate layouts, swap colors, add elements, remove backgrounds — through natural conversation.', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="1.5"><path d="M15 4V2M15 16v-2M8 9h2M20 9h2M17.8 11.8 19 13M15 9h0M17.8 6.2 19 5M3 21l9-9M12.2 6.2 11 5" /></svg> },
    { label: 'Animation', title: 'Bring Creatives to Life', desc: 'Timeline-based animation presets with custom easing, stagger, and sequencing. Preview in real-time and export as video, GIF, or HTML5.', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="1.5"><polygon points="5 3 19 12 5 21 5 3" /></svg> },
];

export function LandingPage() {
    const navigate = useNavigate();
    const { isAuthenticated } = useAuthStore();
    const heroRef = useRef<HTMLDivElement>(null);
    const sectionsRef = useRef<HTMLDivElement[]>([]);

    useEffect(() => {
        if (isAuthenticated()) navigate('/dashboard', { replace: true });
    }, [isAuthenticated, navigate]);

    // ★ Force scroll on landing page — override global overflow:hidden
    useEffect(() => {
        const html = document.documentElement;
        const body = document.body;
        html.style.overflow = 'auto';
        html.style.height = 'auto';
        body.style.overflow = 'auto';
        body.style.height = 'auto';
        return () => {
            html.style.overflow = '';
            html.style.height = '';
            body.style.overflow = '';
            body.style.height = '';
        };
    }, []);

    // Intersection observer for legacy HowItWorks sections
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

    // ── Parallax scroll values ──
    const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
    const heroY = useTransform(scrollYProgress, [0, 1], [0, 200]);
    const heroOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);


    return (
        <div className="lp">
            {/* ── Nav ── */}
            <motion.nav className="lp-nav" initial={{ y: -80 }} animate={{ y: 0 }} transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}>
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
            </motion.nav>

            {/* ── Hero ── */}
            <section className="lp-hero" ref={heroRef} style={{ position: 'relative', overflow: 'hidden' }}>
                <Suspense fallback={null}>
                    <SpiralVortex />
                </Suspense>
                <div className="lp-hero-glow lp-hero-glow-1" />
                <div className="lp-hero-glow lp-hero-glow-2" />

                <motion.div className="lp-hero-content" style={{ y: heroY, opacity: heroOpacity }}>
                    <motion.div className="lp-hero-badge" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3, duration: 0.5 }}>
                        <span className="lp-hero-badge-dot" />
                        AI-Native Creative Platform
                    </motion.div>

                    <motion.h1 className="lp-hero-title" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}>
                        Create at the<br />
                        <span className="lp-gradient-text">Speed of Thought</span>
                    </motion.h1>

                    <motion.p className="lp-hero-sub" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7, duration: 0.7 }}>
                        Glid is the creative platform for performance marketing teams.
                        Design, animate, and deploy ad creatives across every channel.
                    </motion.p>

                    <motion.div className="lp-hero-actions" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9, duration: 0.6 }}>
                        <button className="lp-btn-primary" onClick={() => navigate('/login')}>
                            Get Started Free <Arrow />
                        </button>
                        <button className="lp-btn-ghost" onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}>
                            See How It Works
                        </button>
                    </motion.div>
                </motion.div>
            </section>

            {/* ── Metrics ── */}
            <Reveal className="lp-metrics-wrap">
                <div className="lp-metrics">
                    {[
                        { value: '60fps', label: 'GPU-Accelerated Rendering' },
                        { value: '15+', label: 'Ad Sizes, One Click' },
                        { value: 'AI', label: 'Built-in Creative Agent' },
                        { value: '<1s', label: 'Export Latency' },
                    ].map((m, i) => (
                        <motion.div key={i} className="lp-metric" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1, duration: 0.5 }}>
                            <div className="lp-metric-value">{m.value}</div>
                            <div className="lp-metric-label">{m.label}</div>
                        </motion.div>
                    ))}
                </div>
            </Reveal>

            {/* ── Features ── */}
            <section id="features" className="lp-features">
                <Reveal className="lp-features-header">
                    <div className="lp-section-label">Platform</div>
                    <h2 className="lp-section-title">Everything you need.<br />Nothing you don't.</h2>
                    <p className="lp-section-sub">A complete creative platform that replaces your entire tool stack.</p>
                </Reveal>
                <div className="lp-features-grid">
                    {FEATURES.map((f, i) => (
                        <motion.div key={i} className="lp-feature-card" initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.2 }} transition={{ delay: i * 0.12, duration: 0.6, ease: [0.16, 1, 0.3, 1] }} whileHover={{ y: -4, transition: { duration: 0.25 } }}>
                            <div className="lp-feature-icon">{f.icon}</div>
                            <div className="lp-feature-label">{f.label}</div>
                            <h3 className="lp-feature-title">{f.title}</h3>
                            <p className="lp-feature-desc">{f.desc}</p>
                        </motion.div>
                    ))}
                </div>
            </section>

            {/* ── How It Works ── */}
            <HowItWorks addRef={addRef} />

            {/* ── Pricing ── */}
            <LandingPricing addRef={addRef} />

            {/* ── CTA ── */}
            <Reveal>
                <section className="lp-cta">
                    <div className="lp-cta-glow" />
                    <h2 className="lp-cta-title">Ready to create?</h2>
                    <p className="lp-cta-sub">Start building production-ready creatives in minutes. No credit card required.</p>
                    <motion.button className="lp-btn-primary lp-btn-lg" onClick={() => navigate('/login')} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.98 }}>
                        Get Started Free <Arrow />
                    </motion.button>
                </section>
            </Reveal>

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
