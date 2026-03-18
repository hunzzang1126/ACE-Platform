// ─────────────────────────────────────────────────
// SidebarTextTab — Text presets for quick add
// ─────────────────────────────────────────────────

import { useCallback } from 'react';
import type { CanvasEngineActions } from '@/hooks/canvasTypes';

interface Props {
    actions?: CanvasEngineActions | null;
}

const TEXT_PRESETS = [
    { label: 'Add a heading', fontSize: 36, fontWeight: '700', content: 'Heading' },
    { label: 'Add a subheading', fontSize: 24, fontWeight: '600', content: 'Subheading' },
    { label: 'Add body text', fontSize: 16, fontWeight: '400', content: 'Body text' },
    { label: 'Add small text', fontSize: 12, fontWeight: '400', content: 'Small text' },
];

export function SidebarTextTab({ actions }: Props) {
    const handleAdd = useCallback((preset: typeof TEXT_PRESETS[number]) => {
        if (!actions) return;
        // ★ FIX: addText signature is (x, y, content?, opts?)
        // Place at center of canvas
        const cx = (actions.canvasWidth ?? 300) / 2 - 100;
        const cy = (actions.canvasHeight ?? 250) / 2 - 20;
        actions.addText(cx, cy, preset.content, {
            fontSize: preset.fontSize,
            fontWeight: preset.fontWeight,
        });
    }, [actions]);

    return (
        <div className="sidebar-text">
            <p className="sidebar-section-label">Click to add text</p>
            <div className="sidebar-text-presets">
                {TEXT_PRESETS.map((preset, i) => (
                    <button
                        key={i}
                        className="sidebar-text-preset"
                        onClick={() => handleAdd(preset)}
                    >
                        <span style={{
                            fontSize: Math.min(preset.fontSize, 24),
                            fontWeight: preset.fontWeight as any,
                            color: 'var(--text-primary)',
                        }}>
                            {preset.label}
                        </span>
                    </button>
                ))}
            </div>

            <div className="sidebar-divider" />

            <p className="sidebar-section-label">Font combinations</p>
            <div className="sidebar-font-pairs">
                <button className="sidebar-font-pair" onClick={() => {
                    if (!actions) return;
                    const cx = (actions.canvasWidth ?? 300) / 2 - 100;
                    actions.addText(cx, 40, 'Clean and Modern', { fontSize: 28, fontWeight: '700', fontFamily: 'Inter, system-ui, sans-serif' });
                    actions.addText(cx, 90, 'Pair with light body text for a polished look.', { fontSize: 14, fontWeight: '400', fontFamily: 'Inter, system-ui, sans-serif' });
                }}>
                    <span style={{ fontSize: 18, fontWeight: 700, fontFamily: 'Inter' }}>Inter Bold</span>
                    <span style={{ fontSize: 12, fontWeight: 400, fontFamily: 'Inter', color: 'var(--text-secondary)' }}>
                        Clean and modern
                    </span>
                </button>
                <button className="sidebar-font-pair" onClick={() => {
                    if (!actions) return;
                    const cx = (actions.canvasWidth ?? 300) / 2 - 100;
                    actions.addText(cx, 40, 'Classic Editorial', { fontSize: 28, fontWeight: '700', fontFamily: 'Georgia, serif' });
                    actions.addText(cx, 90, 'Perfect for editorial and long-form content.', { fontSize: 14, fontWeight: '400', fontFamily: 'Georgia, serif' });
                }}>
                    <span style={{ fontSize: 18, fontWeight: 700, fontFamily: 'Georgia, serif' }}>Georgia Bold</span>
                    <span style={{ fontSize: 12, fontWeight: 400, fontFamily: 'Georgia, serif', color: 'var(--text-secondary)' }}>
                        Classic editorial
                    </span>
                </button>
                <button className="sidebar-font-pair" onClick={() => {
                    if (!actions) return;
                    const cx = (actions.canvasWidth ?? 300) / 2 - 100;
                    actions.addText(cx, 40, 'Geometric Bold', { fontSize: 28, fontWeight: '700', fontFamily: 'Montserrat, sans-serif' });
                    actions.addText(cx, 90, 'Strong geometric shapes for impactful headlines.', { fontSize: 14, fontWeight: '400', fontFamily: 'Montserrat, sans-serif' });
                }}>
                    <span style={{ fontSize: 18, fontWeight: 700, fontFamily: 'Montserrat, sans-serif' }}>Montserrat</span>
                    <span style={{ fontSize: 12, fontWeight: 400, fontFamily: 'Montserrat, sans-serif', color: 'var(--text-secondary)' }}>
                        Geometric and bold
                    </span>
                </button>
            </div>
        </div>
    );
}
