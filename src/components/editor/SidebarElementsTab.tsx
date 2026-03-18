// ─────────────────────────────────────────────────
// SidebarElementsTab — Shape presets for quick add
// ─────────────────────────────────────────────────

import { useCallback } from 'react';
import type { CanvasEngineActions } from '@/hooks/canvasTypes';

interface Props {
    actions?: CanvasEngineActions | null;
}

const SHAPES = [
    { id: 'rect', label: 'Rectangle', icon: (
        <svg width="40" height="40" viewBox="0 0 48 48" fill="none">
            <rect x="6" y="10" width="36" height="28" rx="3" fill="var(--accent)" opacity="0.15" stroke="var(--accent)" strokeWidth="1.5" />
        </svg>
    )},
    { id: 'rounded', label: 'Rounded', icon: (
        <svg width="40" height="40" viewBox="0 0 48 48" fill="none">
            <rect x="6" y="10" width="36" height="28" rx="10" fill="#06b6d4" opacity="0.15" stroke="#06b6d4" strokeWidth="1.5" />
        </svg>
    )},
    { id: 'ellipse', label: 'Circle', icon: (
        <svg width="40" height="40" viewBox="0 0 48 48" fill="none">
            <ellipse cx="24" cy="24" rx="18" ry="16" fill="#f43f5e" opacity="0.15" stroke="#f43f5e" strokeWidth="1.5" />
        </svg>
    )},
    { id: 'line', label: 'Line', icon: (
        <svg width="40" height="40" viewBox="0 0 48 48" fill="none">
            <line x1="6" y1="40" x2="42" y2="8" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" />
        </svg>
    )},
];

export function SidebarElementsTab({ actions }: Props) {
    const handleAdd = useCallback((shapeId: string) => {
        if (!actions) return;
        switch (shapeId) {
            case 'rect': actions.addRect?.(); break;
            case 'rounded': actions.addRoundedRect?.(); break;
            case 'ellipse': actions.addEllipse?.(); break;
        }
    }, [actions]);

    return (
        <div className="sidebar-elements">
            <p className="sidebar-section-label">Shapes</p>
            <div className="sidebar-shape-grid">
                {SHAPES.map(shape => (
                    <button
                        key={shape.id}
                        className="sidebar-shape-btn"
                        onClick={() => handleAdd(shape.id)}
                        title={shape.label}
                    >
                        {shape.icon}
                        <span className="sidebar-shape-label">{shape.label}</span>
                    </button>
                ))}
            </div>
        </div>
    );
}
