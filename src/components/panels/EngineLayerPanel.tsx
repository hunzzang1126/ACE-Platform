// ─────────────────────────────────────────────────
// EngineLayerPanel — Layer panel synced to WASM engine nodes
// ─────────────────────────────────────────────────
import { useCallback } from 'react';
import type { CanvasEngineActions, EngineNode } from '@/hooks/useCanvasEngine';
import { IcClose } from '@/components/ui/Icons';

interface Props {
    /** Current list of engine nodes (passed from parent via useCanvasEngine state) */
    nodes: EngineNode[];
    /** Currently selected node IDs */
    selection: number[];
    /** Engine actions for add/delete/select */
    actions: CanvasEngineActions | null;
}

/** Pretty label for node type */
function nodeLabel(node: EngineNode, idx: number): string {
    const types: Record<string, string> = {
        rect: 'Rectangle',
        rounded_rect: 'Rounded Rect',
        ellipse: 'Ellipse',
    };
    return `${types[node.type] || node.type} #${idx + 1}`;
}

export function EngineLayerPanel({ nodes, selection, actions }: Props) {
    const handleSelect = useCallback((id: number) => {
        actions?.selectNode(id);
    }, [actions]);

    const handleDelete = useCallback((id: number) => {
        if (!actions) return;
        actions.selectNode(id);
        actions.deleteSelected();
    }, [actions]);

    const handleAddRect = useCallback(() => {
        actions?.addRect();
    }, [actions]);

    const handleAddEllipse = useCallback(() => {
        actions?.addEllipse();
    }, [actions]);

    // Reverse order so topmost layer is first (highest z-index)
    const sorted = [...nodes].reverse();

    return (
        <div style={panelStyle}>
            <div style={headerStyle}>
                <span style={{ fontWeight: 600, fontSize: 11, letterSpacing: '0.05em', color: '#8b949e' }}>
                    LAYERS
                </span>
                <div style={{ display: 'flex', gap: 4 }}>
                    <button onClick={handleAddRect} style={addBtnStyle} title="Add Rectangle (R)">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="3" y="3" width="18" height="18" rx="2" />
                        </svg>
                    </button>
                    <button onClick={handleAddEllipse} style={addBtnStyle} title="Add Ellipse (E)">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <ellipse cx="12" cy="12" rx="10" ry="8" />
                        </svg>
                    </button>
                </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 1, overflow: 'auto' }}>
                {sorted.map((node, i) => {
                    const isSelected = selection.includes(node.id);
                    return (
                        <div
                            key={node.id}
                            onClick={() => handleSelect(node.id)}
                            style={{
                                ...layerRowStyle,
                                background: isSelected ? 'rgba(74, 158, 255, 0.15)' : 'transparent',
                                color: isSelected ? '#4a9eff' : '#8b949e',
                                borderLeft: isSelected ? '2px solid #4a9eff' : '2px solid transparent',
                            }}
                        >
                            <span style={typeIconStyle}>
                                {node.type === 'ellipse' ? '○' : node.type === 'rounded_rect' ? '▢' : '□'}
                            </span>
                            <span style={{ flex: 1, fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {nodeLabel(node, nodes.length - 1 - i)}
                            </span>
                            <button
                                onClick={(e) => { e.stopPropagation(); handleDelete(node.id); }}
                                style={deleteBtnStyle}
                                title="Delete"
                            >
                                <IcClose size={10} />
                            </button>
                        </div>
                    );
                })}
                {nodes.length === 0 && (
                    <div style={{ color: '#484f58', fontSize: 11, padding: '12px 8px', textAlign: 'center' }}>
                        No elements yet. Click the canvas with a shape tool or press R/E to add.
                    </div>
                )}
            </div>
        </div>
    );
}

// ── Styles ──────────────────────────────────────────

const panelStyle: React.CSSProperties = {
    display: 'flex', flexDirection: 'column',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    padding: '8px 0',
    maxHeight: 200,
};

const headerStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '4px 12px 8px',
};

const addBtnStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 4, color: '#8b949e', cursor: 'pointer',
    width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 0,
};

const layerRowStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 6,
    padding: '5px 12px', cursor: 'pointer',
    transition: 'background 0.1s',
};

const typeIconStyle: React.CSSProperties = {
    fontSize: 12, width: 16, textAlign: 'center', flexShrink: 0,
};

const deleteBtnStyle: React.CSSProperties = {
    background: 'none', border: 'none', color: '#484f58',
    cursor: 'pointer', padding: '2px', display: 'flex',
    opacity: 0.6,
};
