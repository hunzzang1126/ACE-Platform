// ─────────────────────────────────────────────────
// BentoGrid → Full-viewport feature sections
// ─────────────────────────────────────────────────
// Each feature gets its own full-height immersive section.

import { motion } from 'framer-motion';
import { useLandingI18n } from './landingI18n';
import type { TKey } from './landingI18n';
import {
    GPUCanvasVisual,
    AICoPilotVisual,
    AnimationVisual,
    ResizeVisual,
    ExportVisual,
} from './FeatureVisuals';
import './bentoAnimations.css';

interface FeatureSection {
    id: string;
    labelKey: TKey;
    titleKey: TKey;
    descKey: TKey;
    visual: React.ReactNode;
    align: 'left' | 'right';
}

const FEATURES: FeatureSection[] = [
    {
        id: 'gpu-canvas',
        labelKey: 'feat1Label', titleKey: 'feat1Title', descKey: 'feat1Desc',
        visual: <GPUCanvasVisual />,
        align: 'left',
    },
    {
        id: 'ai-copilot',
        labelKey: 'feat2Label', titleKey: 'feat2Title', descKey: 'feat2Desc',
        visual: <AICoPilotVisual />,
        align: 'right',
    },
    {
        id: 'animation',
        labelKey: 'feat3Label', titleKey: 'feat3Title', descKey: 'feat3Desc',
        visual: <AnimationVisual />,
        align: 'left',
    },
    {
        id: 'smart-resize',
        labelKey: 'sizingLabel', titleKey: 'sizingTitle1', descKey: 'sizingSub',
        visual: <ResizeVisual />,
        align: 'right',
    },
    {
        id: 'export',
        labelKey: 'feat4Label', titleKey: 'feat4Title', descKey: 'feat4Desc',
        visual: <ExportVisual />,
        align: 'left',
    },
];

export function BentoGrid() {
    const { t } = useLandingI18n();
    return (
        <section id="features" className="features-section">
            {/* Header */}
            <motion.div
                className="features-header"
                initial={{ opacity: 0, y: 50, filter: 'blur(8px)' }}
                whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                viewport={{ once: true }}
                transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
            >
                <span className="bento-label">{t('bentoLabel')}</span>
                <h2 className="bento-title">{t('bentoTitle')}<br />{t('bentoTitle2')}</h2>
                <p className="bento-sub">{t('bentoSub')}</p>
            </motion.div>

            {/* Feature Sections */}
            {FEATURES.map((feat, i) => (
                <div key={feat.id} className={`feat-row feat-row--${feat.align} feat-row--${feat.id}`}>
                    {/* Section background glow */}
                    <div className={`feat-bg-glow feat-bg-glow--${feat.id}`} />

                    {/* Text */}
                    <motion.div
                        className="feat-text"
                        initial={{ opacity: 0, x: feat.align === 'left' ? -60 : 60, filter: 'blur(6px)' }}
                        whileInView={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
                        viewport={{ once: true, amount: 0.3 }}
                        transition={{ duration: 0.9, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
                    >
                        <span className="feat-label">{t(feat.labelKey)}</span>
                        <h3 className="feat-title">{t(feat.titleKey)}</h3>
                        <p className="feat-desc">{t(feat.descKey)}</p>
                        <div className="feat-index">0{i + 1}</div>
                    </motion.div>

                    {/* Visual */}
                    <motion.div
                        className="feat-visual"
                        initial={{
                            opacity: 0,
                            x: feat.align === 'left' ? 80 : -80,
                            scale: 0.85,
                            rotateY: feat.align === 'left' ? 8 : -8,
                            filter: 'blur(10px)',
                        }}
                        whileInView={{
                            opacity: 1,
                            x: 0,
                            scale: 1,
                            rotateY: 0,
                            filter: 'blur(0px)',
                        }}
                        viewport={{ once: true, amount: 0.2 }}
                        transition={{
                            duration: 1.1,
                            delay: 0.25,
                            ease: [0.16, 1, 0.3, 1],
                        }}
                    >
                        <div className="feat-visual-border" />
                        {feat.visual}
                    </motion.div>
                </div>
            ))}
        </section>
    );
}
