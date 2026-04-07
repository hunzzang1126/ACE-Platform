// ─────────────────────────────────────────────────
// LayerRow — Single row in the layer list (overlay or engine node)
// ─────────────────────────────────────────────────

import { useState } from 'react';
import type { OverlayElement } from '@/hooks/useOverlayElements';
import type { EngineNode } from '@/hooks/useCanvasEngine';
import { IcClose } from '@/components/ui/Icons';
import { nodeLabel, nodeIcon } from './bottomPanelHelpers';

interface OverlayRowProps {
    el: OverlayElement;
    isSelected: boolean;
    isRenaming: boolean;
    renameValue: string;
    draggedClass: string;
    dropTargetClass: string;
    onStartDrag: (e: React.MouseEvent, id: string, idx: number) => void;
    idx: number;
    justDragged: React.RefObject<boolean>;
    onSelect: (id: string) => void;
    onRenameStart: (id: string, name: string) => void;
    onRenameChange: (value: string) => void;
    onRenameCommit: (id: string, value: string) => void;
    onRenameCancel: () => void;
    onToggleLock?: (id: string) => void;
    onToggleVisibility?: (id: string) => void;
    onDelete?: (id: string) => void;
}

export function OverlayLayerRow({
    el, isSelected, isRenaming, renameValue, draggedClass, dropTargetClass,
    onStartDrag, idx, justDragged, onSelect,
    onRenameStart, onRenameChange, onRenameCommit, onRenameCancel,
    onToggleLock, onToggleVisibility, onDelete,
}: OverlayRowProps) {
    const isLocked = el.locked ?? false;
    const isVisible = el.visible ?? true;

    return (
        <div
            className={`bp-layer-row bp-layer-drag-row bp-overlay-row ${isSelected ? 'selected' : ''} ${isLocked ? 'locked' : ''} ${!isVisible ? 'hidden-layer' : ''} ${draggedClass} ${dropTargetClass}`}
            onMouseDown={(e) => {
                const tag = (e.target as HTMLElement).tagName;
                if (tag === 'BUTTON' || tag === 'INPUT' || tag === 'SVG' || tag === 'PATH') return;
                onStartDrag(e, el.id, idx);
            }}
            onClick={() => { if (justDragged.current) return; onSelect(el.id); }}
        >
            <span className="bp-layer-icon">{el.type === 'text' ? 'T' : ''}</span>
            {isRenaming ? (
                <input
                    className="bp-rename-input"
                    value={renameValue}
                    onChange={(e) => onRenameChange(e.target.value)}
                    onBlur={() => onRenameCommit(el.id, renameValue)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') onRenameCommit(el.id, renameValue);
                        if (e.key === 'Escape') onRenameCancel();
                        e.stopPropagation();
                    }}
                    autoFocus
                    onClick={(e) => e.stopPropagation()}
                />
            ) : (
                <span
                    className="bp-layer-name"
                    onDoubleClick={(e) => {
                        e.stopPropagation();
                        onRenameStart(el.id, el.name || (el.type === 'text' ? 'Text' : 'Image'));
                    }}
                >
                    {el.name || (el.type === 'text' ? (el.content?.slice(0, 20) || 'Text') : (el.fileName || 'Image'))}
                </span>
            )}
            <div className="bp-layer-actions">
                <button className="bp-layer-action-btn" title={isLocked ? 'Unlock' : 'Lock'} onClick={(e) => { e.stopPropagation(); onToggleLock?.(el.id); }}>
                    {isLocked ? 'Locked' : 'Unlocked'}
                </button>
                <button className="bp-layer-action-btn" title={isVisible ? 'Hide' : 'Show'} onClick={(e) => { e.stopPropagation(); onToggleVisibility?.(el.id); }}>
                    {isVisible ? 'V' : 'H'}
                </button>
                <button className="bp-layer-action-btn" title="Delete" onClick={(e) => { e.stopPropagation(); onDelete?.(el.id); }}>
                    <IcClose size={9} />
                </button>
            </div>
        </div>
    );
}


interface EngineRowProps {
    node: EngineNode;
    isSelected: boolean;
    isRenaming: boolean;
    renameValue: string;
    draggedClass: string;
    dropTargetClass: string;
    onStartDrag: (e: React.MouseEvent, id: string, idx: number) => void;
    idx: number;
    justDragged: React.RefObject<boolean>;
    onSelect: (id: number) => void;
    onDelete: (id: number) => void;
    onRenameStart: (id: string, name: string) => void;
    onRenameChange: (value: string) => void;
    onRenameCommit: (id: string, value: string) => void;
    onRenameCancel: () => void;
    /** Depth level for indentation (0 = top level) */
    depth?: number;
    /** Selection IDs for highlighting children */
    selectionIds?: number[];
}

export function EngineLayerRow({
    node, isSelected, isRenaming, renameValue, draggedClass, dropTargetClass,
    onStartDrag, idx, justDragged, onSelect, onDelete,
    onRenameStart, onRenameChange, onRenameCommit, onRenameCancel,
    depth = 0, selectionIds = [],
}: EngineRowProps) {
    const [expanded, setExpanded] = useState(true);
    const isGroup = node.type === 'group' && node.children && node.children.length > 0;
    const indent = depth * 16;

    return (
        <>
            <div
                key={`eng-${node.id}`}
                className={`bp-layer-row bp-layer-drag-row ${isSelected ? 'selected' : ''} ${draggedClass} ${dropTargetClass}`}
                style={{ paddingLeft: 12 + indent }}
                onMouseDown={(e) => {
                    const tag = (e.target as HTMLElement).tagName;
                    if (tag === 'BUTTON' || tag === 'INPUT' || tag === 'SVG' || tag === 'PATH') return;
                    onStartDrag(e, String(node.id), idx);
                }}
                onClick={() => { if (justDragged.current) return; onSelect(node.id); }}
            >
                {isGroup && (
                    <button
                        className="bp-layer-action-btn"
                        style={{ marginRight: 2, fontSize: 8, width: 14, flexShrink: 0 }}
                        onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
                        title={expanded ? 'Collapse' : 'Expand'}
                    >
                        {expanded ? '\u25BC' : '\u25B6'}
                    </button>
                )}
                <span className="bp-layer-icon">{nodeIcon(node.type)}</span>
                {isRenaming ? (
                    <input
                        className="bp-rename-input"
                        value={renameValue}
                        onChange={(e) => onRenameChange(e.target.value)}
                        onBlur={() => onRenameCommit(String(node.id), renameValue)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') onRenameCommit(String(node.id), renameValue);
                            if (e.key === 'Escape') onRenameCancel();
                            e.stopPropagation();
                        }}
                        autoFocus
                        onClick={(e) => e.stopPropagation()}
                    />
                ) : (
                    <span
                        className="bp-layer-name"
                        onDoubleClick={(e) => {
                            e.stopPropagation();
                            onRenameStart(String(node.id), node.name || nodeLabel(node));
                        }}
                    >
                        {node.name || nodeLabel(node)}
                    </span>
                )}
                <div className="bp-layer-actions">
                    <button className="bp-layer-action-btn" title="Delete" onClick={(e) => { e.stopPropagation(); onDelete(node.id); }}>
                        <IcClose size={9} />
                    </button>
                </div>
            </div>
            {/* ★ Group children — render indented when expanded */}
            {isGroup && expanded && node.children!.map((child, ci) => (
                <EngineLayerRow
                    key={`eng-${child.id}`}
                    node={child}
                    isSelected={selectionIds.includes(child.id)}
                    isRenaming={false}
                    renameValue=""
                    draggedClass=""
                    dropTargetClass=""
                    onStartDrag={onStartDrag}
                    idx={idx + ci + 1}
                    justDragged={justDragged}
                    onSelect={onSelect}
                    onDelete={onDelete}
                    onRenameStart={onRenameStart}
                    onRenameChange={onRenameChange}
                    onRenameCommit={onRenameCommit}
                    onRenameCancel={onRenameCancel}
                    depth={depth + 1}
                    selectionIds={selectionIds}
                />
            ))}
        </>
    );
}
