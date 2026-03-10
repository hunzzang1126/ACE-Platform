// ─────────────────────────────────────────────────
// EditorTopBar – Top navigation + Export menu
// ─────────────────────────────────────────────────
import { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEditorStore } from '@/stores/editorStore';
import { useUIStore } from '@/stores/uiStore';
import { IcBell, IcHelp, IcClose } from '@/components/ui/Icons';
import type { EngineNode } from '@/hooks/canvasTypes';

interface Props {
    setName: string;
    variantLabel: string;
    canvasWidth?: number;
    canvasHeight?: number;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    engine?: any;
    children?: React.ReactNode;
}

export function EditorTopBar({ setName, variantLabel, canvasWidth = 300, canvasHeight = 250, engine, children }: Props) {
    const navigate = useNavigate();
    const zoom = useEditorStore((s) => s.zoom);
    const setZoom = useEditorStore((s) => s.setZoom);

    // UI panel toggles
    const toggleCanvasRuler = useUIStore(s => s.toggleCanvasRuler);
    const toggleAuthModal = useUIStore(s => s.toggleAuthModal);
    const canvasRulerVisible = useUIStore(s => s.canvasRulerVisible);


    return (
        <header className="ed-topbar">
            <div className="ed-topbar-left">
                <button className="ed-topbar-hamburger" onClick={() => navigate('/editor')} title="Back">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></svg>
                </button>
                <div className="ed-topbar-breadcrumb">
                    <button className="ed-topbar-crumb" onClick={() => navigate('/editor')}>{setName}</button>
                    <span className="ed-topbar-sep">/</span>
                    <span className="ed-topbar-crumb active">{variantLabel}</span>
                </div>
            </div>

            <div className="ed-topbar-right">
                {/* Custom actions (Save button) */}
                {children}

                {/* Zoom */}
                <div className="ed-zoom-control">
                    <button className="ed-zoom-btn" onClick={() => setZoom(zoom - 0.1)}>−</button>
                    <span className="ed-zoom-value">{Math.round(zoom * 100)}%</span>
                    <button className="ed-zoom-btn" onClick={() => setZoom(zoom + 0.1)}>+</button>
                </div>

                {/* Ruler/Grid toggle */}
                <button
                    className="ed-topbar-icon-btn"
                    title={canvasRulerVisible ? 'Hide Ruler & Grid' : 'Show Ruler & Grid'}
                    onClick={toggleCanvasRuler}
                    style={canvasRulerVisible ? { color: '#60a5fa' } : {}}
                >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="3" width="18" height="18" rx="1" />
                        <line x1="3" y1="9" x2="7" y2="9" /><line x1="3" y1="15" x2="7" y2="15" />
                        <line x1="9" y1="3" x2="9" y2="7" /><line x1="15" y1="3" x2="15" y2="7" />
                    </svg>
                </button>


                <button className="ed-topbar-icon-btn" title="Notifications"><IcBell size={15} /></button>
                <div className="ed-topbar-avatar" onClick={toggleAuthModal} style={{ cursor: 'pointer' }} title="Account">YA</div>
                <span className="ed-saved-indicator">SAVED</span>
                <button className="ed-topbar-icon-btn" title="Help"><IcHelp size={15} /></button>
                <button className="ed-topbar-close" onClick={() => navigate('/editor')} title="Close"><IcClose size={14} /></button>
            </div>
        </header>
    );
}

const dropdownStyle: React.CSSProperties = {
    position: 'absolute', top: '100%', right: 0, marginTop: 4,
    background: 'rgba(22, 27, 38, 0.98)', border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 10, padding: 4, minWidth: 180, zIndex: 100,
    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
};

const dropdownItem: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 10, width: '100%',
    padding: '8px 12px', background: 'none', border: 'none',
    color: '#c9d1d9', fontSize: 13, cursor: 'pointer', borderRadius: 6, textAlign: 'left',
};
