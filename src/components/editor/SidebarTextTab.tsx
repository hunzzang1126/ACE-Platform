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
        // Use engine add_text if available via actions
        // For now, this will be wired to the Fabric engine's addText action
        if (actions && 'addText' in actions) {
            (actions as any).addText?.(preset.content, preset.fontSize, preset.fontWeight);
        }
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
                <button className="sidebar-font-pair">
                    <span style={{ fontSize: 18, fontWeight: 700, fontFamily: 'Inter' }}>Inter Bold</span>
                    <span style={{ fontSize: 12, fontWeight: 400, fontFamily: 'Inter', color: 'var(--text-secondary)' }}>
                        Clean and modern
                    </span>
                </button>
                <button className="sidebar-font-pair">
                    <span style={{ fontSize: 18, fontWeight: 700, fontFamily: 'Georgia, serif' }}>Georgia Bold</span>
                    <span style={{ fontSize: 12, fontWeight: 400, fontFamily: 'Georgia, serif', color: 'var(--text-secondary)' }}>
                        Classic editorial
                    </span>
                </button>
                <button className="sidebar-font-pair">
                    <span style={{ fontSize: 18, fontWeight: 700, fontFamily: 'Montserrat, sans-serif' }}>Montserrat</span>
                    <span style={{ fontSize: 12, fontWeight: 400, fontFamily: 'Montserrat, sans-serif', color: 'var(--text-secondary)' }}>
                        Geometric and bold
                    </span>
                </button>
            </div>
        </div>
    );
}
