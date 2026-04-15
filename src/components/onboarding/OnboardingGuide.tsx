// ─────────────────────────────────────────────────
// OnboardingGuide — Glass tooltip walkthrough
// ─────────────────────────────────────────────────
// Lightweight spotlight guide for new users.
// Shows per-page steps with glass card + gradient accent.
// Persists dismissal via onboardingStore (localStorage).
// ─────────────────────────────────────────────────

import { useState, useEffect, useCallback } from 'react';
import { isGuideDismissed, dismissGuide, type GuidePage } from '@/stores/onboardingStore';
import { useAppI18n } from '@/i18n';

export interface GuideStep {
    /** i18n key for title */
    titleKey: string;
    /** i18n key for description */
    descKey: string;
    /** CSS selector to highlight (optional — if null, centered) */
    targetSelector?: string;
    /** Position relative to target */
    position?: 'bottom' | 'top' | 'right' | 'left';
}

interface Props {
    page: GuidePage;
    steps: GuideStep[];
}

export function OnboardingGuide({ page, steps }: Props) {
    const [dismissed, setDismissed] = useState(true); // start hidden
    const [stepIdx, setStepIdx] = useState(0);
    const [visible, setVisible] = useState(false);
    const { t } = useAppI18n();

    useEffect(() => {
        const isDismissed = isGuideDismissed(page);
        setDismissed(isDismissed);
        if (!isDismissed) {
            // Delay show for page to render targets
            const timer = setTimeout(() => setVisible(true), 600);
            return () => clearTimeout(timer);
        }
    }, [page]);

    const handleNext = useCallback(() => {
        if (stepIdx < steps.length - 1) {
            setVisible(false);
            setTimeout(() => { setStepIdx(s => s + 1); setVisible(true); }, 250);
        } else {
            setVisible(false);
            setTimeout(() => setDismissed(true), 250);
        }
    }, [stepIdx, steps.length]);

    const handleDismissForever = useCallback(() => {
        dismissGuide(page);
        setVisible(false);
        setTimeout(() => setDismissed(true), 250);
    }, [page]);

    const handleBackdropClick = useCallback(() => {
        // Close but don't dismiss permanently
        setVisible(false);
        setTimeout(() => setDismissed(true), 250);
    }, []);

    if (dismissed || steps.length === 0) return null;

    const step = steps[stepIdx]!;
    const isLast = stepIdx === steps.length - 1;
    const cardPos = getCardPosition(step);

    return (
        <>
            {/* Backdrop — semi-transparent, click to close (not dismiss) */}
            <div
                onClick={handleBackdropClick}
                style={{
                    position: 'fixed', inset: 0, zIndex: 9998,
                    background: 'rgba(0,0,0,0.35)',
                    opacity: visible ? 1 : 0,
                    transition: 'opacity 0.3s ease',
                    pointerEvents: visible ? 'auto' : 'none',
                }}
            />

            {/* Guide Card */}
            <div
                onClick={e => e.stopPropagation()}
                style={{
                    position: 'fixed', zIndex: 9999,
                    ...cardPos,
                    width: 320, maxWidth: 'calc(100vw - 32px)',
                    padding: '20px 22px',
                    background: 'rgba(255,255,255,0.92)',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    border: '1px solid rgba(99,102,241,0.15)',
                    borderRadius: 16,
                    boxShadow: '0 8px 40px rgba(0,0,0,0.15), 0 0 0 1px rgba(255,255,255,0.1) inset',
                    opacity: visible ? 1 : 0,
                    transform: visible ? 'translateY(0) scale(1)' : 'translateY(8px) scale(0.97)',
                    transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                    pointerEvents: visible ? 'auto' : 'none',
                }}
            >
                {/* Step indicator dots */}
                {steps.length > 1 && (
                    <div style={{ display: 'flex', gap: 5, marginBottom: 14 }}>
                        {steps.map((_, i) => (
                            <div key={i} style={{
                                width: i === stepIdx ? 18 : 6, height: 6,
                                borderRadius: 3,
                                background: i === stepIdx
                                    ? 'linear-gradient(90deg, #6366F1, #2DD4BF)'
                                    : i < stepIdx ? '#2DD4BF' : 'rgba(0,0,0,0.1)',
                                transition: 'all 0.3s ease',
                            }} />
                        ))}
                    </div>
                )}

                {/* Title */}
                <div style={{
                    fontSize: 15, fontWeight: 700, color: '#1e293b',
                    marginBottom: 6, letterSpacing: '-0.2px',
                }}>
                    {t(step.titleKey)}
                </div>

                {/* Description */}
                <div style={{
                    fontSize: 13, color: '#64748b', lineHeight: 1.6,
                    marginBottom: 18,
                }}>
                    {t(step.descKey)}
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <button
                        onClick={handleDismissForever}
                        style={{
                            background: 'none', border: 'none',
                            fontSize: 11, color: '#94a3b8', cursor: 'pointer',
                            padding: '4px 0',
                            transition: 'color 0.15s',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.color = '#64748b'; }}
                        onMouseLeave={e => { e.currentTarget.style.color = '#94a3b8'; }}
                    >
                        {t('guide.dontShowAgain')}
                    </button>
                    <button
                        onClick={handleNext}
                        style={{
                            height: 32, padding: '0 18px',
                            background: 'linear-gradient(135deg, #6366F1, #2DD4BF)',
                            color: '#fff', border: 'none', borderRadius: 8,
                            fontSize: 12, fontWeight: 600, cursor: 'pointer',
                            boxShadow: '0 2px 12px rgba(99,102,241,0.25)',
                            transition: 'all 0.2s ease',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; }}
                        onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; }}
                    >
                        {isLast ? t('guide.gotIt') : t('guide.next')}
                    </button>
                </div>
            </div>
        </>
    );
}

// ── Position helper ──────────────────────────────

function getCardPosition(step: GuideStep): React.CSSProperties {
    if (!step.targetSelector) {
        return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
    }

    const el = document.querySelector(step.targetSelector);
    if (!el) {
        return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
    }

    const rect = el.getBoundingClientRect();
    const pos = step.position ?? 'bottom';
    const pad = 16;
    const cardW = 320;
    const cardH = 200; // approximate
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // Clamp helpers
    const clampX = (x: number) => Math.max(16, Math.min(x, vw - cardW - 16));
    const clampY = (y: number) => Math.max(16, Math.min(y, vh - cardH - 16));

    switch (pos) {
        case 'bottom':
            return {
                top: clampY(rect.bottom + pad),
                left: clampX(rect.left + rect.width / 2 - cardW / 2),
            };
        case 'top':
            return {
                top: clampY(rect.top - cardH - pad),
                left: clampX(rect.left + rect.width / 2 - cardW / 2),
            };
        case 'right':
            return {
                top: clampY(rect.top + rect.height / 2 - cardH / 2),
                left: clampX(rect.right + pad),
            };
        case 'left':
            return {
                top: clampY(rect.top + rect.height / 2 - cardH / 2),
                left: clampX(rect.left - cardW - pad),
            };
    }
}
