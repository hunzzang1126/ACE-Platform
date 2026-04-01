// ─────────────────────────────────────────────────
// SmartSizingShowcase — Card-split animation
// ─────────────────────────────────────────────────
// One master card splits into 8 different ad sizes
// using AnimatePresence + framer-motion.
// ─────────────────────────────────────────────────

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import { useLandingI18n } from './landingI18n';

const AD_SIZES = [
    { w: 300, h: 250, label: '300x250' },
    { w: 728, h: 90,  label: '728x90' },
    { w: 160, h: 600, label: '160x600' },
    { w: 320, h: 50,  label: '320x50' },
    { w: 970, h: 250, label: '970x250' },
    { w: 300, h: 600, label: '300x600' },
    { w: 250, h: 250, label: '250x250' },
    { w: 468, h: 60,  label: '468x60' },
];

// Scale down to fit grid cell
function scaleSize(w: number, h: number, maxW: number, maxH: number) {
    const scale = Math.min(maxW / w, maxH / h, 1);
    return { width: w * scale, height: h * scale };
}

export function SmartSizingShowcase() {
    const ref = useRef<HTMLDivElement>(null);
    const isInView = useInView(ref, { once: true, amount: 0.4 });
    const [split, setSplit] = useState(false);
    const { t } = useLandingI18n();

    useEffect(() => {
        if (isInView) {
            const t = setTimeout(() => setSplit(true), 400);
            return () => clearTimeout(t);
        }
    }, [isInView]);

    return (
        <section className="sizing-section" ref={ref}>
            <div className="sizing-header">
                <span className="bento-label">{t('sizingLabel')}</span>
                <h2 className="bento-title">{t('sizingTitle1')}<br /><span style={{ color: '#00ffd6' }}>{t('sizingTitle2')}</span></h2>
                <p className="bento-sub">{t('sizingSub')}</p>
            </div>

            <div className="sizing-stage">
                <AnimatePresence mode="wait">
                    {!split ? (
                        <motion.div
                            key="master"
                            className="sizing-master"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            transition={{ duration: 0.5 }}
                        >
                            <div className="sizing-master-inner">
                                <div className="sizing-master-label">{t('sizingMaster')}</div>
                                <div className="sizing-master-visual">
                                    <div className="sizing-mock-headline" />
                                    <div className="sizing-mock-body" />
                                    <div className="sizing-mock-cta" />
                                </div>
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="grid"
                            className="sizing-grid"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.3 }}
                        >
                            {AD_SIZES.map((size, i) => {
                                const scaled = scaleSize(size.w, size.h, 130, 100);
                                return (
                                    <motion.div
                                        key={size.label}
                                        className="sizing-variant"
                                        initial={{ opacity: 0, scale: 0.3, y: 30 }}
                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                        transition={{
                                            delay: i * 0.08,
                                            duration: 0.5,
                                            ease: [0.16, 1, 0.3, 1],
                                        }}
                                    >
                                        <div
                                            className="sizing-variant-box"
                                            style={{ width: scaled.width, height: scaled.height }}
                                        >
                                            <div className="sizing-variant-lines">
                                                <div className="sizing-mock-line" style={{ width: '60%' }} />
                                                <div className="sizing-mock-line" style={{ width: '40%' }} />
                                            </div>
                                        </div>
                                        <span className="sizing-variant-label">{size.label}</span>
                                    </motion.div>
                                );
                            })}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </section>
    );
}
