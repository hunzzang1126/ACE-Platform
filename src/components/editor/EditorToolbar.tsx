// ─────────────────────────────────────────────────
// EditorToolbar – Left vertical tool palette (SVG icons)
// All tools: Select, Shape, Text, Image, Hand, Zoom
// ─────────────────────────────────────────────────
import { type ReactNode, useCallback } from 'react';
import { useEditorStore, type EditorTool } from '@/stores/editorStore';
import { useUIStore } from '@/stores/uiStore';
import { IcCursor, IcImage, IcSearch } from '@/components/ui/Icons';
import { BrandCompliancePanel } from './BrandCompliancePanel';
import type { CanvasEngineActions } from '@/hooks/canvasTypes';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Engine = any;

interface ToolDef {
    id: EditorTool;
    icon: ReactNode;
    label: string;
}

interface Props {
    engine?: Engine;
    actions?: CanvasEngineActions | null;
    onTriggerImageUpload?: () => void;
    onTriggerVideoUpload?: () => void;
}

// ── SVG Icons ──
const ShapeIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="3" y="3" width="18" height="18" rx="2" />
    </svg>
);

const TextIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <line x1="6" y1="5" x2="18" y2="5" />
        <line x1="12" y1="5" x2="12" y2="19" />
        <line x1="9" y1="19" x2="15" y2="19" />
    </svg>
);

const HandIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M18 11V6a2 2 0 0 0-4 0v1M14 10V4a2 2 0 0 0-4 0v6m0 0V3a2 2 0 0 0-4 0v9m16 0a6 6 0 0 1-6 6H8a6 6 0 0 1-6-6V9a2 2 0 0 1 4 0v3" />
    </svg>
);

const VideoIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="2" y="4" width="15" height="16" rx="2" />
        <path d="M17 9l5-3v12l-5-3" />
    </svg>
);

const PenIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M12 19l7-7 3 3-7 7-3-3z" />
        <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
        <path d="M2 2l7.586 7.586" />
        <circle cx="11" cy="11" r="2" />
    </svg>
);

const TOOLS: ToolDef[] = [
    { id: 'select', icon: <IcCursor size={14} />, label: 'Select (V)' },
    { id: 'shape', icon: <ShapeIcon />, label: 'Shape — click canvas to add (S)' },
    { id: 'text', icon: <TextIcon />, label: 'Text — click canvas to add (T)' },
    { id: 'pen', icon: <PenIcon />, label: 'Pen / Freehand Draw (P)' },
    { id: 'image', icon: <IcImage size={14} />, label: 'Import Image (I)' },
    { id: 'video', icon: <VideoIcon />, label: 'Import Video' },
    { id: 'hand', icon: <HandIcon />, label: 'Hand / Pan (H)' },
    { id: 'zoom', icon: <IcSearch size={14} />, label: 'Zoom (Z)' },
];

export function EditorToolbar({ actions, onTriggerImageUpload, onTriggerVideoUpload }: Props) {
    const activeTool = useEditorStore((s) => s.activeTool);
    const setTool = useEditorStore((s) => s.setTool);
    const brandComplianceOpen = useUIStore((s) => s.brandComplianceOpen);
    const toggleBrandCompliance = useUIStore((s) => s.toggleBrandCompliance);

    const handleAddRect = useCallback(() => {
        actions?.addRect();
        setTool('select');
    }, [actions, setTool]);

    const handleAddEllipse = useCallback(() => {
        actions?.addEllipse();
        setTool('select');
    }, [actions, setTool]);

    // Handle tool click — image/video open file browser immediately
    const handleToolClick = useCallback((toolId: EditorTool) => {
        if (toolId === 'image') {
            onTriggerImageUpload?.();
            return;
        }
        if (toolId === 'video') {
            onTriggerVideoUpload?.();
            return;
        }
        setTool(toolId);
    }, [setTool, onTriggerImageUpload, onTriggerVideoUpload]);

    return (
        <aside className="ed-toolbar">
            {TOOLS.map((tool) => (
                <button
                    key={tool.id}
                    className={`ed-tool-btn ${activeTool === tool.id ? 'active' : ''}`}
                    onClick={() => handleToolClick(tool.id)}
                    title={tool.label}
                >
                    <span className="ed-tool-icon">{tool.icon}</span>
                </button>
            ))}

            {/* Divider */}
            <div style={{ width: '60%', height: 1, background: 'rgba(255,255,255,0.06)', margin: '4px auto' }} />

            {/* Quick add buttons */}
            <button
                className="ed-tool-btn"
                onClick={handleAddRect}
                title="Quick Add Rectangle (R)"
                style={{ color: actions ? '#8b949e' : '#484f58' }}
            >
                <span className="ed-tool-icon">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <rect x="3" y="3" width="18" height="18" rx="2" />
                        <line x1="12" y1="8" x2="12" y2="16" />
                        <line x1="8" y1="12" x2="16" y2="12" />
                    </svg>
                </span>
            </button>
            <button
                className="ed-tool-btn"
                onClick={handleAddEllipse}
                title="Quick Add Ellipse (E)"
                style={{ color: actions ? '#8b949e' : '#484f58' }}
            >
                <span className="ed-tool-icon">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <ellipse cx="12" cy="12" rx="10" ry="8" />
                        <line x1="12" y1="8" x2="12" y2="16" />
                        <line x1="8" y1="12" x2="16" y2="12" />
                    </svg>
                </span>
            </button>

            {/* Divider */}
            <div style={{ width: '60%', height: 1, background: 'rgba(255,255,255,0.06)', margin: '4px auto' }} />

            {/* Brand Compliance */}
            <div style={{ position: 'relative' }}>
                <button
                    className={`ed-tool-btn ${brandComplianceOpen ? 'active' : ''}`}
                    onClick={toggleBrandCompliance}
                    title="Brand Compliance"
                >
                    <span className="ed-tool-icon">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <path d="M12 2L3 7v7c0 5.25 3.75 10.74 9 12 5.25-1.26 9-6.75 9-12V7l-9-5z" />
                            <polyline points="9 12 11 14 15 10" />
                        </svg>
                    </span>
                </button>
                {/* Floating panel */}
                {brandComplianceOpen && (
                    <div style={{
                        position: 'absolute',
                        left: 50,
                        top: 0,
                        width: 320,
                        maxHeight: 480,
                        background: 'var(--bg-elevated, #1a1f2e)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: 10,
                        boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
                        zIndex: 100,
                        overflow: 'auto',
                    }}>
                        <BrandCompliancePanel />
                    </div>
                )}
            </div>
        </aside>
    );
}

