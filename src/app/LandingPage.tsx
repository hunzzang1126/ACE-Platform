// ─────────────────────────────────────────────────
// LandingPage — Frame.io-inspired cinematic landing
// ─────────────────────────────────────────────────
// Hero → BentoGrid → SmartSizing → Pricing → CTA
// ─────────────────────────────────────────────────

import { useEffect, useRef, lazy, Suspense } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, useScroll, useTransform } from 'framer-motion';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { useAuthStore } from '@/stores/authStore';
import { GlidLogo } from '@/components/brand/GlidLogo';
import { BentoGrid } from '@/components/landing/BentoGrid';
import { SmartSizingShowcase } from '@/components/landing/SmartSizingShowcase';
import { LandingPricing } from './LandingPricing';
import { setScrollVelocity } from '@/components/landing/SpiralVortex';
import { LandingI18nProvider, useLandingI18n } from '@/components/landing/landingI18n';
import { LangSelector } from '@/components/landing/LangSelector';
import './landing.css';

gsap.registerPlugin(ScrollTrigger);

const SpiralVortex = lazy(() =>
    import('@/components/landing/SpiralVortex').then(m => ({ default: m.SpiralVortex })),
);

const Arrow = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
    </svg>
);

export function LandingPage() {
    return (
        <LandingI18nProvider>
            <LandingPageContent />
        </LandingI18nProvider>
    );
}

function LandingPageContent() {
    const navigate = useNavigate();
    const { isAuthenticated } = useAuthStore();
    const heroRef = useRef<HTMLDivElement>(null);
    const lpRef = useRef<HTMLDivElement>(null);
    const { t } = useLandingI18n();

    useEffect(() => {
        if (isAuthenticated()) navigate('/dashboard', { replace: true });
    }, [isAuthenticated, navigate]);

    // ★ Lenis smooth scroll
    useEffect(() => {
        const html = document.documentElement;
        const body = document.body;
        html.style.overflow = 'auto';
        html.style.height = 'auto';
        body.style.overflow = 'auto';
        body.style.height = 'auto';

        const lenis = new Lenis({
            duration: 1.2,
            easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
            smoothWheel: true,
        });
        lenis.on('scroll', ScrollTrigger.update);
        gsap.ticker.add((time) => lenis.raf(time * 1000));
        gsap.ticker.lagSmoothing(0);

        return () => {
            lenis.destroy();
            html.style.overflow = '';
            html.style.height = '';
            body.style.overflow = '';
            body.style.height = '';
        };
    }, []);

    // ★ GSAP — scroll velocity → vortex
    useEffect(() => {
        const ctx = gsap.context(() => {
            let lastScroll = window.scrollY;
            const velocityTicker = () => {
                const cur = window.scrollY;
                setScrollVelocity(Math.abs(cur - lastScroll) / 16);
                lastScroll = cur;
            };
            gsap.ticker.add(velocityTicker);
            return () => gsap.ticker.remove(velocityTicker);
        }, lpRef);
        return () => ctx.revert();
    }, []);

    // ── Hero parallax ──
    const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
    const heroY = useTransform(scrollYProgress, [0, 1], [0, 200]);
    const heroOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
    // 3D canvas element scales down on scroll
    const canvasScale = useTransform(scrollYProgress, [0, 1], [1, 0.6]);
    const canvasY = useTransform(scrollYProgress, [0, 1], [0, 120]);
    const canvasRotateX = useTransform(scrollYProgress, [0, 1], [0, 15]);

    return (
        <div className="lp" ref={lpRef}>
            {/* ── Nav ── */}
            <motion.nav className="lp-nav" initial={{ y: -80 }} animate={{ y: 0 }} transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}>
                <div className="lp-nav-inner">
                    <GlidLogo size={22} variant="white" className="lp-nav-logo" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} />
                    <div className="lp-nav-links">
                        <button className="lp-nav-link" onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}>{t('navFeatures')}</button>
                        <button className="lp-nav-link" onClick={() => document.getElementById('smart-sizing')?.scrollIntoView({ behavior: 'smooth' })}>{t('navSizing')}</button>
                        <button className="lp-nav-link" onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })}>{t('navPricing')}</button>
                    </div>
                    <div className="lp-nav-actions">
                        <LangSelector />
                        <button className="lp-nav-link" onClick={() => navigate('/login')}>{t('navSignIn')}</button>
                        <button className="lp-nav-cta" onClick={() => navigate('/login')}>{t('navCta')}</button>
                    </div>
                </div>
            </motion.nav>

            {/* ── Hero ── */}
            <section className="lp-hero" ref={heroRef} style={{ position: 'relative', overflow: 'hidden' }}>
                <Suspense fallback={null}>
                    <SpiralVortex />
                </Suspense>

                <motion.div className="lp-hero-content" style={{ y: heroY, opacity: heroOpacity }}>
                    <motion.div className="lp-hero-badge" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3, duration: 0.5 }}>
                        <span className="lp-hero-badge-dot" />
                        {t('heroBadge')}
                    </motion.div>

                    <motion.h1 className="lp-hero-title" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}>
                        {t('heroTitle1')}<br />
                        <span className="lp-gradient-text">{t('heroTitle2')}</span>
                    </motion.h1>

                    <motion.p className="lp-hero-sub" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7, duration: 0.7 }}>
                        {t('heroSub')}
                    </motion.p>

                    <motion.div className="lp-hero-actions" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9, duration: 0.6 }}>
                        <button className="lp-btn-primary" onClick={() => navigate('/login')}>
                            {t('heroBtn')} <Arrow />
                        </button>
                        <button className="lp-btn-ghost" onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}>
                            {t('heroBtn2')}
                        </button>
                    </motion.div>
                </motion.div>

                {/* 3D Floating Demo Video */}
                <motion.div
                    className="hero-canvas-3d"
                    style={{ scale: canvasScale, y: canvasY, rotateX: canvasRotateX }}
                    initial={{ opacity: 0, y: 80 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.1, duration: 1, ease: [0.16, 1, 0.3, 1] }}
                >
                    <div className="hero-video-frame">
                        <div className="hero-video-chrome">
                            <div className="hero-canvas-dots"><span /><span /><span /></div>
                            <span className="hero-video-url">glid.ai</span>
                        </div>
                        <div className="hero-video-container">
                            <video
                                className="hero-demo-video"
                                src="/video/glid_DEMO.mp4"
                                autoPlay
                                muted
                                loop
                                playsInline
                                preload="auto"
                            />
                        </div>
                    </div>
                    <div className="hero-video-glow" />
                </motion.div>
            </section>

            {/* ── Bento Grid ── */}
            <BentoGrid />

            {/* ── Smart Sizing ── */}
            <div id="smart-sizing">
                <SmartSizingShowcase />
            </div>

            {/* ── Pricing ── */}
            <LandingPricing addRef={() => {}} />

            {/* ── CTA ── */}
            <motion.section
                className="lp-cta"
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8 }}
            >
                <div className="lp-cta-glow" />
                <h2 className="lp-cta-title">{t('ctaTitle')}</h2>
                <p className="lp-cta-sub">{t('ctaSub')}</p>
                <motion.button className="lp-btn-primary lp-btn-lg" onClick={() => navigate('/login')} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.98 }}>
                    {t('heroBtn')} <Arrow />
                </motion.button>
            </motion.section>

            {/* ── Footer ── */}
            <footer className="lp-footer">
                <div className="lp-footer-inner">
                    <div className="lp-footer-brand">
                        <GlidLogo size={20} variant="white" />
                        <span className="lp-footer-tagline">Global Intelligence Design</span>
                    </div>
                    <div className="lp-footer-cols">
                        <div className="lp-footer-col">
                            <h4>{t('footerProduct')}</h4>
                            <button onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}>{t('navFeatures')}</button>
                            <button onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })}>{t('navPricing')}</button>
                        </div>
                        <div className="lp-footer-col">
                            <h4>{t('footerCompany')}</h4>
                            <Link to="/about">About Us</Link>
                            <a href="mailto:hello@glid.ai">{t('footerContact')}</a>
                            <a href="mailto:sales@glid.ai">{t('footerSales')}</a>
                        </div>
                        <div className="lp-footer-col">
                            <h4>Legal</h4>
                            <Link to="/privacy">Privacy Policy</Link>
                            <Link to="/terms">Terms of Service</Link>
                        </div>
                    </div>
                </div>
                <div className="lp-footer-bottom">
                    <span>&copy; {new Date().getFullYear()} Glid Technologies Inc. All rights reserved.</span>
                    <span className="lp-footer-address">50 Power St, Toronto, ON M5A 0V3, Canada</span>
                </div>
            </footer>
        </div>
    );
}
