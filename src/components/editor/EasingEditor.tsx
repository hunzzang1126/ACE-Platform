// ─────────────────────────────────────────────────
// EasingEditor — Visual cubic-bezier easing curve editor
// ─────────────────────────────────────────────────
// Renders an interactive bezier curve with draggable control points.
// Used in the timeline keyframe inspector panel.
// ─────────────────────────────────────────────────

import { useState, useRef, useCallback, useEffect, type CSSProperties } from 'react';
import type { EasingType } from '@/stores/timelineStore';

interface Props {
    /** Current easing type */
    easing: EasingType;
    /** Called when easing changes */
    onChange: (easing: EasingType) => void;
}

// ── Preset bezier curves mapped to easing types ──
const EASING_CURVES: Record<EasingType, [number, number, number, number]> = {
    linear: [0, 0, 1, 1],
    ease_in: [0.42, 0, 1, 1],
    ease_out: [0, 0, 0.58, 1],
    ease_in_out: [0.42, 0, 0.58, 1],
    bounce: [0.34, 1.56, 0.64, 1],
    elastic: [0.68, -0.55, 0.27, 1.55],
    spring: [0.175, 0.885, 0.32, 1.275],
};

const EASING_LABELS: Record<EasingType, string> = {
    linear: 'Linear',
    ease_in: 'Ease In',
    ease_out: 'Ease Out',
    ease_in_out: 'Ease In Out',
    bounce: 'Bounce',
    elastic: 'Elastic',
    spring: 'Spring',
};

const BOX = 120; // px canvas size
const PAD = 16;
const INNER = BOX - PAD * 2;

export function EasingEditor({ easing, onChange }: Props) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [dragging, setDragging] = useState<'p1' | 'p2' | null>(null);
    const [curve, setCurve] = useState(EASING_CURVES[easing]);

    // Sync when easing prop changes
    useEffect(() => {
        setCurve(EASING_CURVES[easing]);
    }, [easing]);

    // Draw curve
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d')!;
        const dpr = window.devicePixelRatio || 1;
        canvas.width = BOX * dpr;
        canvas.height = BOX * dpr;
        ctx.scale(dpr, dpr);

        // Background
        ctx.fillStyle = 'rgba(22, 27, 38, 0.95)';
        ctx.fillRect(0, 0, BOX, BOX);

        // Grid
        ctx.strokeStyle = 'rgba(255,255,255,0.06)';
        ctx.lineWidth = 0.5;
        for (let i = 0; i <= 4; i++) {
            const x = PAD + (INNER * i) / 4;
            ctx.beginPath(); ctx.moveTo(x, PAD); ctx.lineTo(x, PAD + INNER); ctx.stroke();
            const y = PAD + (INNER * i) / 4;
            ctx.beginPath(); ctx.moveTo(PAD, y); ctx.lineTo(PAD + INNER, y); ctx.stroke();
        }

        // Diagonal guide
        ctx.strokeStyle = 'rgba(255,255,255,0.1)';
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(PAD, PAD + INNER);
        ctx.lineTo(PAD + INNER, PAD);
        ctx.stroke();
        ctx.setLineDash([]);

        // Control point lines
        const [x1, y1, x2, y2] = curve;
        const p0 = { x: PAD, y: PAD + INNER };
        const p1 = { x: PAD + x1 * INNER, y: PAD + INNER - y1 * INNER };
        const p2 = { x: PAD + x2 * INNER, y: PAD + INNER - y2 * INNER };
        const p3 = { x: PAD + INNER, y: PAD };

        ctx.strokeStyle = 'rgba(74, 158, 255, 0.4)';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(p0.x, p0.y); ctx.lineTo(p1.x, p1.y); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(p3.x, p3.y); ctx.lineTo(p2.x, p2.y); ctx.stroke();

        // Bezier curve
        ctx.strokeStyle = '#4a9eff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        ctx.bezierCurveTo(p1.x, p1.y, p2.x, p2.y, p3.x, p3.y);
        ctx.stroke();

        // Control points
        [p1, p2].forEach((p, i) => {
            ctx.fillStyle = i === 0 ? '#ea4335' : '#34a853';
            ctx.beginPath();
            ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 1.5;
            ctx.stroke();
        });
    }, [curve]);

    // Mouse handling for control point dragging
    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        const rect = canvasRef.current!.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        const [x1, y1, x2, y2] = curve;

        const p1 = { x: PAD + x1 * INNER, y: PAD + INNER - y1 * INNER };
        const p2 = { x: PAD + x2 * INNER, y: PAD + INNER - y2 * INNER };

        const d1 = Math.hypot(mx - p1.x, my - p1.y);
        const d2 = Math.hypot(mx - p2.x, my - p2.y);

        if (d1 < 12) setDragging('p1');
        else if (d2 < 12) setDragging('p2');
    }, [curve]);

    useEffect(() => {
        if (!dragging) return;

        const handleMove = (e: MouseEvent) => {
            const rect = canvasRef.current?.getBoundingClientRect();
            if (!rect) return;
            const mx = Math.max(0, Math.min(1, (e.clientX - rect.left - PAD) / INNER));
            const my = Math.max(-0.5, Math.min(1.5, 1 - (e.clientY - rect.top - PAD) / INNER));

            setCurve(prev => {
                if (dragging === 'p1') return [mx, my, prev[2], prev[3]];
                return [prev[0], prev[1], mx, my];
            });
        };

        const handleUp = () => setDragging(null);

        window.addEventListener('mousemove', handleMove);
        window.addEventListener('mouseup', handleUp);
        return () => {
            window.removeEventListener('mousemove', handleMove);
            window.removeEventListener('mouseup', handleUp);
        };
    }, [dragging]);

    return (
        <div style={containerStyle}>
            <canvas
                ref={canvasRef}
                width={BOX}
                height={BOX}
                style={{ width: BOX, height: BOX, borderRadius: 8, cursor: dragging ? 'grabbing' : 'default' }}
                onMouseDown={handleMouseDown}
            />
            <div style={presetsStyle}>
                {(Object.keys(EASING_LABELS) as EasingType[]).map(type => (
                    <button
                        key={type}
                        style={{
                            ...presetBtnStyle,
                            ...(easing === type ? { background: 'rgba(74, 158, 255, 0.15)', color: '#4a9eff' } : {}),
                        }}
                        onClick={() => onChange(type)}
                    >
                        {EASING_LABELS[type]}
                    </button>
                ))}
            </div>
        </div>
    );
}

// ── Styles ──

const containerStyle: CSSProperties = {
    display: 'flex', flexDirection: 'column', gap: 8,
    padding: 8, background: 'rgba(22, 27, 38, 0.9)',
    borderRadius: 10, border: '1px solid rgba(255,255,255,0.08)',
};

const presetsStyle: CSSProperties = {
    display: 'flex', flexWrap: 'wrap', gap: 4,
};

const presetBtnStyle: CSSProperties = {
    padding: '4px 8px', fontSize: 11, border: 'none',
    background: 'rgba(255,255,255,0.06)', color: '#8b949e',
    borderRadius: 4, cursor: 'pointer',
};
