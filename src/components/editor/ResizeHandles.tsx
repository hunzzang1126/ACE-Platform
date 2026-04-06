// ─────────────────────────────────────────────────
// ResizeHandles — Figma-style selection handles
// ─────────────────────────────────────────────────
// Corner: 8×8 square, white fill + #0D99FF border
// Side: invisible hit area, edge hover shows resize cursor
// Rotation: corner outside hover zone → cursor changes
// ─────────────────────────────────────────────────

import type { OverlayElement } from '@/hooks/useOverlayElements';

const CORNER_SIZE = 8;
const CORNER_HALF = CORNER_SIZE / 2;
const EDGE_HIT = 6; // invisible edge hit area width

export type HandleDir = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

// ── Corner handles (visible squares) ──
const CORNER_HANDLES: { dir: HandleDir; cursor: string; style: React.CSSProperties }[] = [
    { dir: 'nw', cursor: 'nwse-resize', style: { top: -CORNER_HALF, left: -CORNER_HALF } },
    { dir: 'ne', cursor: 'nesw-resize', style: { top: -CORNER_HALF, right: -CORNER_HALF } },
    { dir: 'sw', cursor: 'nesw-resize', style: { bottom: -CORNER_HALF, left: -CORNER_HALF } },
    { dir: 'se', cursor: 'nwse-resize', style: { bottom: -CORNER_HALF, right: -CORNER_HALF } },
];

// ── Edge handles (invisible hit zones) ──
const EDGE_HANDLES: { dir: HandleDir; cursor: string; style: React.CSSProperties }[] = [
    { dir: 'n', cursor: 'ns-resize', style: { top: -EDGE_HIT / 2, left: CORNER_SIZE, right: CORNER_SIZE, height: EDGE_HIT } },
    { dir: 's', cursor: 'ns-resize', style: { bottom: -EDGE_HIT / 2, left: CORNER_SIZE, right: CORNER_SIZE, height: EDGE_HIT } },
    { dir: 'w', cursor: 'ew-resize', style: { left: -EDGE_HIT / 2, top: CORNER_SIZE, bottom: CORNER_SIZE, width: EDGE_HIT } },
    { dir: 'e', cursor: 'ew-resize', style: { right: -EDGE_HIT / 2, top: CORNER_SIZE, bottom: CORNER_SIZE, width: EDGE_HIT } },
];

// ── Rotation zones (invisible, outside corners) ──
const ROTATION_SIZE = 14;
const ROTATION_ZONES: { style: React.CSSProperties; cursor: string }[] = [
    { style: { top: -ROTATION_SIZE, left: -ROTATION_SIZE, width: ROTATION_SIZE, height: ROTATION_SIZE }, cursor: 'url("data:image/svg+xml,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'20\' height=\'20\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%230D99FF\' stroke-width=\'2\'><path d=\'M21 12a9 9 0 11-6.22-8.56\'/><path d=\'M21 3v9h-9\'/></svg>") 10 10, pointer' },
    { style: { top: -ROTATION_SIZE, right: -ROTATION_SIZE, width: ROTATION_SIZE, height: ROTATION_SIZE }, cursor: 'url("data:image/svg+xml,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'20\' height=\'20\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%230D99FF\' stroke-width=\'2\'><path d=\'M21 12a9 9 0 11-6.22-8.56\'/><path d=\'M21 3v9h-9\'/></svg>") 10 10, pointer' },
    { style: { bottom: -ROTATION_SIZE, left: -ROTATION_SIZE, width: ROTATION_SIZE, height: ROTATION_SIZE }, cursor: 'url("data:image/svg+xml,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'20\' height=\'20\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%230D99FF\' stroke-width=\'2\'><path d=\'M21 12a9 9 0 11-6.22-8.56\'/><path d=\'M21 3v9h-9\'/></svg>") 10 10, pointer' },
    { style: { bottom: -ROTATION_SIZE, right: -ROTATION_SIZE, width: ROTATION_SIZE, height: ROTATION_SIZE }, cursor: 'url("data:image/svg+xml,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'20\' height=\'20\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%230D99FF\' stroke-width=\'2\'><path d=\'M21 12a9 9 0 11-6.22-8.56\'/><path d=\'M21 3v9h-9\'/></svg>") 10 10, pointer' },
];

export function ResizeHandles({ el, onResizeStart, onRotateStart }: {
    el: OverlayElement;
    onResizeStart: (e: React.MouseEvent, el: OverlayElement, dir: HandleDir) => void;
    onRotateStart?: (e: React.MouseEvent, el: OverlayElement) => void;
}) {
    return (
        <>
            {/* Edge hit zones (invisible, cursor-only) */}
            {EDGE_HANDLES.map(({ dir, cursor, style }) => (
                <div
                    key={`edge-${dir}`}
                    onMouseDown={(e) => onResizeStart(e, el, dir)}
                    style={{ position: 'absolute', background: 'transparent', cursor, zIndex: 9998, ...style }}
                />
            ))}
            {/* Corner handles (visible Figma squares) */}
            {CORNER_HANDLES.map(({ dir, cursor, style }) => (
                <div
                    key={`corner-${dir}`}
                    onMouseDown={(e) => onResizeStart(e, el, dir)}
                    style={{
                        position: 'absolute', width: CORNER_SIZE, height: CORNER_SIZE,
                        background: '#FFFFFF', border: '1.5px solid #0D99FF',
                        borderRadius: 1, boxShadow: '0 0 0 0.5px rgba(0,0,0,0.1)',
                        cursor, zIndex: 9999, ...style,
                    }}
                />
            ))}
            {/* Rotation zones (invisible, outside corners) */}
            {onRotateStart && ROTATION_ZONES.map((zone, i) => (
                <div
                    key={`rot-${i}`}
                    onMouseDown={(e) => onRotateStart(e, el)}
                    style={{ position: 'absolute', background: 'transparent', cursor: zone.cursor, zIndex: 9997, ...zone.style }}
                />
            ))}
        </>
    );
}

// ── Dimension tooltip (shown during resize) ──
export function DimensionTooltip({ w, h, x, y }: { w: number; h: number; x: number; y: number }) {
    return (
        <div style={{
            position: 'absolute', left: x + w / 2, top: y + h + 8,
            background: '#0D99FF', color: '#fff', fontSize: 11, fontWeight: 500,
            padding: '2px 6px', borderRadius: 3, whiteSpace: 'nowrap',
            pointerEvents: 'none', zIndex: 10000, fontFamily: 'Inter, system-ui, sans-serif',
            transform: 'translateX(-50%)',
        }}>
            {Math.round(w)} x {Math.round(h)}
        </div>
    );
}

// ── Rotation tooltip ──
export function RotationTooltip({ angle, x, y }: { angle: number; x: number; y: number }) {
    return (
        <div style={{
            position: 'absolute', left: x, top: y - 28,
            background: '#0D99FF', color: '#fff', fontSize: 11, fontWeight: 500,
            padding: '2px 6px', borderRadius: 3, whiteSpace: 'nowrap',
            pointerEvents: 'none', zIndex: 10000, fontFamily: 'Inter, system-ui, sans-serif',
            transform: 'translateX(-50%)',
        }}>
            {Math.round(angle)}°
        </div>
    );
}

// ── EditorCanvas styles (kept from original) ──

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
