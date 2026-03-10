// ─────────────────────────────────────────────────
// CanvasContextMenu — Right-click menu for canvas elements
// ─────────────────────────────────────────────────
import { useEffect, type CSSProperties } from 'react';
import type { CanvasEngineActions } from '@/hooks/canvasTypes';

interface MenuItem {
    label: string;
    shortcut?: string;
    action: () => void;
    danger?: boolean;
    dividerAfter?: boolean;
}

interface Props {
    x: number;
    y: number;
    actions: CanvasEngineActions;
    hasSelection: boolean;
    selectionCount: number;
    /** IDs of currently selected Fabric objects */
    selectedIds: number[];
    onClose: () => void;
}

const menuStyle: CSSProperties = {
    position: 'fixed',
    zIndex: 10000,
    background: '#1e2231',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 8,
    padding: '4px 0',
    minWidth: 220,
    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
    backdropFilter: 'blur(12px)',
    fontFamily: 'Inter, system-ui, sans-serif',
};

const itemStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    padding: '6px 14px',
    background: 'none',
    border: 'none',
    color: '#e6edf3',
    fontSize: 12,
    cursor: 'pointer',
    textAlign: 'left',
};

const shortcutStyle: CSSProperties = {
    color: '#484f58',
    fontSize: 11,
    marginLeft: 24,
};

const dividerStyle: CSSProperties = {
    borderTop: '1px solid rgba(255,255,255,0.06)',
    margin: '3px 0',
};

export function CanvasContextMenu({ x, y, actions, hasSelection, selectionCount, selectedIds, onClose }: Props) {
    // Close on outside click or Escape
    useEffect(() => {
        const handleClick = () => onClose();
        const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('click', handleClick);
        window.addEventListener('keydown', handleKey);
        return () => {
            window.removeEventListener('click', handleClick);
            window.removeEventListener('keydown', handleKey);
        };
    }, [onClose]);

    const firstId = selectedIds[0] ?? -1;
    const items: MenuItem[] = [];

    if (hasSelection) {
        items.push(
            { label: 'Duplicate', shortcut: 'Cmd+D', action: () => { actions.duplicateSelected(); onClose(); } },
            { label: 'Delete', shortcut: 'Delete', action: () => { actions.deleteSelected(); onClose(); }, dividerAfter: true },
            { label: 'Bring to Front', shortcut: 'Cmd+Shift+]', action: () => { actions.bringToFront(firstId); onClose(); } },
            { label: 'Bring Forward', shortcut: 'Cmd+]', action: () => { actions.bringForward(firstId); onClose(); } },
            { label: 'Send Backward', shortcut: 'Cmd+[', action: () => { actions.sendBackward(firstId); onClose(); } },
            { label: 'Send to Back', shortcut: 'Cmd+Shift+[', action: () => { actions.sendToBack(firstId); onClose(); }, dividerAfter: true },
        );

        if (selectionCount > 1) {
            items.push(
                { label: 'Group', shortcut: 'Cmd+G', action: () => { actions.groupSelected?.(); onClose(); } },
            );
        }
        items.push(
            { label: 'Ungroup', shortcut: 'Cmd+Shift+G', action: () => { actions.ungroupSelected?.(); onClose(); } },
        );
    } else {
        items.push(
            { label: 'Deselect All', shortcut: 'Esc', action: () => { actions.deselectAll(); onClose(); } },
        );
    }

    // Clamp menu position to viewport
    const menuTop = Math.min(y, window.innerHeight - 400);
    const menuLeft = Math.min(x, window.innerWidth - 240);

    return (
        <div
            style={{ ...menuStyle, top: menuTop, left: menuLeft }}
            onClick={(e) => e.stopPropagation()}
        >
            {items.map((item, i) => (
                <div key={i}>
                    <button
                        style={itemStyle}
                        onMouseEnter={(e) => {
                            (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)';
                        }}
                        onMouseLeave={(e) => {
                            (e.currentTarget as HTMLElement).style.background = 'none';
                        }}
                        onClick={item.action}
                    >
                        <span>{item.label}</span>
                        {item.shortcut && <span style={shortcutStyle}>{item.shortcut}</span>}
                    </button>
                    {item.dividerAfter && <div style={dividerStyle} />}
                </div>
            ))}
        </div>
    );
}
