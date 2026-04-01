// ─────────────────────────────────────────────────
// BentoGrid — Dynamic feature grid for landing page
// ─────────────────────────────────────────────────
// Each card has a unique animated visual matching its feature.

import { motion } from 'framer-motion';
import { useLandingI18n } from './landingI18n';
import type { TKey } from './landingI18n';
import './bentoAnimations.css';

interface BentoItem {
    span: 'wide' | 'normal';
    labelKey: TKey;
    titleKey: TKey;
    descKey: TKey;
    visualClass: string;
    visual: React.ReactNode;
}

// ── GPU Canvas Visual: animated layers with floating shapes ──
function GPUCanvasVisual() {
    return (
        <div className="bento-vis bento-vis--gpu">
            <div className="gpu-layer gpu-layer--1" />
            <div className="gpu-layer gpu-layer--2" />
            <div className="gpu-layer gpu-layer--3" />
            <div className="gpu-shape gpu-shape--rect" />
            <div className="gpu-shape gpu-shape--circle" />
            <div className="gpu-cursor" />
        </div>
    );
}

// ── AI Co-Pilot Visual: typing chat bubbles ──
function AICoPilotVisual() {
    return (
        <div className="bento-vis bento-vis--ai">
            <div className="ai-bubble ai-bubble--user">
                <span>Make the headline bolder</span>
            </div>
            <div className="ai-bubble ai-bubble--bot">
                <span>Done. Updated font weight to 800</span>
                <div className="ai-typing">
                    <i /><i /><i />
                </div>
            </div>
        </div>
    );
}

// ── Animation Visual: orbiting keyframes ──
function AnimationVisual() {
    return (
        <div className="bento-vis bento-vis--anim">
            <div className="anim-timeline">
                <div className="anim-track" />
                <div className="anim-playhead" />
            </div>
            <div className="anim-object">
                <div className="anim-orbit anim-orbit--1" />
                <div className="anim-orbit anim-orbit--2" />
                <div className="anim-dot" />
            </div>
        </div>
    );
}

// ── Export Visual: file format badges flying in ──
function ExportVisual() {
    const formats = ['PNG', 'JPG', 'HTML5', 'GIF', 'MP4'];
    return (
        <div className="bento-vis bento-vis--export">
            {formats.map((fmt, i) => (
                <motion.div
                    key={fmt}
                    className={`export-badge export-badge--${i}`}
                    initial={{ opacity: 0, scale: 0.5, y: 20 }}
                    whileInView={{ opacity: 1, scale: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.3 + i * 0.1, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                >
                    {fmt}
                </motion.div>
            ))}
        </div>
    );
}

const BENTO_ITEMS: BentoItem[] = [
    {
        span: 'wide', labelKey: 'feat1Label', titleKey: 'feat1Title', descKey: 'feat1Desc',
        visualClass: 'gpu', visual: <GPUCanvasVisual />,
    },
    {
        span: 'normal', labelKey: 'feat2Label', titleKey: 'feat2Title', descKey: 'feat2Desc',
        visualClass: 'ai', visual: <AICoPilotVisual />,
    },
    {
        span: 'normal', labelKey: 'feat3Label', titleKey: 'feat3Title', descKey: 'feat3Desc',
        visualClass: 'anim', visual: <AnimationVisual />,
    },
    {
        span: 'wide', labelKey: 'feat4Label', titleKey: 'feat4Title', descKey: 'feat4Desc',
        visualClass: 'export', visual: <ExportVisual />,
    },
];

export function BentoGrid() {
    const { t } = useLandingI18n();
    return (
        <section id="features" className="bento-section">
            <div className="bento-header">
                <span className="bento-label">{t('bentoLabel')}</span>
                <h2 className="bento-title">{t('bentoTitle')}<br />{t('bentoTitle2')}</h2>
                <p className="bento-sub">{t('bentoSub')}</p>
            </div>
            <div className="bento-grid">
                {BENTO_ITEMS.map((item, i) => (
                    <motion.div
                        key={i}
                        className={`bento-card bento-card--${item.visualClass} ${item.span === 'wide' ? 'bento-card--wide' : ''}`}
                        initial={{ opacity: 0, y: 40 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, amount: 0.2 }}
                        transition={{ delay: i * 0.1, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                        whileHover={{ y: -4, transition: { duration: 0.3 } }}
                    >
                        <div className="bento-glow" />
                        <div className="bento-card-inner">
                            <div className="bento-visual">{item.visual}</div>
                            <span className="bento-card-label">{t(item.labelKey)}</span>
                            <h3 className="bento-card-title">{t(item.titleKey)}</h3>
                            <p className="bento-card-desc">{t(item.descKey)}</p>
                        </div>
                    </motion.div>
                ))}
            </div>
        </section>
    );
}
