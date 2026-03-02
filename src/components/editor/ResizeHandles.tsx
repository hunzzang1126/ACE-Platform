// ─────────────────────────────────────────────────
// ResizeHandles — 8-directional resize handles for overlay elements
// ─────────────────────────────────────────────────

import type { OverlayElement } from '@/hooks/useOverlayElements';

const HANDLE_SIZE = 8;
const HALF = HANDLE_SIZE / 2;

export type HandleDir = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

const HANDLE_POSITIONS: { dir: HandleDir; cursor: string; style: React.CSSProperties }[] = [
    { dir: 'nw', cursor: 'nw-resize', style: { top: -HALF, left: -HALF } },
    { dir: 'n', cursor: 'n-resize', style: { top: -HALF, left: `calc(50% - ${HALF}px)` } },
    { dir: 'ne', cursor: 'ne-resize', style: { top: -HALF, right: -HALF } },
    { dir: 'w', cursor: 'w-resize', style: { top: `calc(50% - ${HALF}px)`, left: -HALF } },
    { dir: 'e', cursor: 'e-resize', style: { top: `calc(50% - ${HALF}px)`, right: -HALF } },
    { dir: 'sw', cursor: 'sw-resize', style: { bottom: -HALF, left: -HALF } },
    { dir: 's', cursor: 's-resize', style: { bottom: -HALF, left: `calc(50% - ${HALF}px)` } },
    { dir: 'se', cursor: 'se-resize', style: { bottom: -HALF, right: -HALF } },
];

export function ResizeHandles({ el, onResizeStart }: {
    el: OverlayElement;
    onResizeStart: (e: React.MouseEvent, el: OverlayElement, dir: string) => void;
}) {
    return (
        <>
            {HANDLE_POSITIONS.map(({ dir, cursor, style }) => (
                <div
                    key={dir}
                    onMouseDown={(e) => onResizeStart(e, el, dir)}
                    style={{
                        position: 'absolute',
                        width: HANDLE_SIZE,
                        height: HANDLE_SIZE,
                        background: '#fff',
                        border: '1px solid #4a9eff',
                        borderRadius: 2,
                        cursor,
                        zIndex: 9999,
                        ...style,
                    }}
                />
            ))}
        </>
    );
}

// ── EditorCanvas styles ──

export const overlayMessage: React.CSSProperties = {
    position: 'absolute', inset: 0,
    display: 'flex', flexDirection: 'column', gap: 12,
    alignItems: 'center', justifyContent: 'center',
    color: '#8b949e', fontSize: 14, zIndex: 10,
};

export const spinnerStyle: React.CSSProperties = {
    width: 24, height: 24,
    border: '2px solid rgba(255,255,255,0.1)',
    borderTopColor: '#4a9eff',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
};

export const statusBarStyle: React.CSSProperties = {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    display: 'flex', gap: 8, alignItems: 'center',
    padding: '6px 12px',
    fontSize: 11, color: '#6e7681',
    background: 'rgba(13, 17, 23, 0.8)',
    borderTop: '1px solid rgba(255,255,255,0.06)',
};

export const zoomBtnStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 3,
    color: '#9aa0a6',
    cursor: 'pointer',
    width: 20, height: 18,
    fontSize: 12,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
};
