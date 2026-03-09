// ─────────────────────────────────────────────────────────
// ScanDesignPanel.tsx — Screenshot → Editable Design
// Vision-to-Design: drop a screenshot, get editable layers
// ─────────────────────────────────────────────────────────
// NO EMOJIS. Clean Apple/Figma aesthetic.
// ─────────────────────────────────────────────────────────

import { useState, useCallback, useRef } from 'react';
import { scanDesignScreenshot } from '@/services/screenshotScanService';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Engine = any;

interface Props {
    engine: Engine | null;
    canvasW: number;
    canvasH: number;
}

type ScanPhase = 'idle' | 'scanning' | 'rendering' | 'done' | 'error';

export function ScanDesignPanel({ engine, canvasW, canvasH }: Props) {
    const [phase, setPhase] = useState<ScanPhase>('idle');
    const [progress, setProgress] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [showReference, setShowReference] = useState(true);
    const [elementCount, setElementCount] = useState(0);
    const abortRef = useRef<AbortController | null>(null);
    const referenceIdRef = useRef<number | null>(null);

    const processScreenshot = useCallback(async (file: File) => {
        if (!engine) { setError('Canvas not ready.'); return; }

        // Reset state
        setPhase('scanning');
        setError(null);
        setProgress('Analyzing screenshot with Vision AI...');

        abortRef.current?.abort();
        abortRef.current = new AbortController();
        const signal = abortRef.current.signal;

        // Read file as base64
        const dataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
        setPreviewUrl(dataUrl);

        try {
            // ── Step 1: Vision Scan ──
            setProgress('Claude Vision is mapping all elements...');
            const result = await scanDesignScreenshot(dataUrl, canvasW, canvasH, signal);
            setProgress(`Found ${result.elements.length} elements. Rendering layers...`);
            setPhase('rendering');

            // ── Step 2: Clear canvas & render elements ──
            try { engine.clear_scene?.(); } catch { /* ok */ }

            let rendered = 0;

            for (const el of result.elements) {
                if (el.is_complex_bg) {
                    // Complex background: place as image placeholder rect
                    const r = el.r ?? 0.08, g = el.g ?? 0.08, b = el.b ?? 0.1;
                    engine.add_rect?.(el.x ?? 0, el.y ?? 0, el.w ?? canvasW, el.h ?? canvasH, r, g, b, 1, `${el.name ?? 'background'} (complex — replace with image)`);
                    rendered++;
                    continue;
                }
                if (el.gradient_start_hex && el.gradient_end_hex) {
                    engine.add_gradient_rect?.(el.x, el.y, el.w, el.h, el.gradient_start_hex, el.gradient_end_hex, el.gradient_angle ?? 135, el.radius ?? 0, el.name);
                    rendered++;
                    continue;
                }
                if (el.type === 'text') {
                    const [tr, tg, tb] = el.color_hex
                        ? hexToRgb(el.color_hex)
                        : [1, 1, 1];
                    engine.add_text?.(
                        el.x ?? 0, el.y ?? 0,
                        el.content ?? 'Text',
                        el.font_size ?? 18,
                        (el as any).font_family ?? 'Inter, system-ui',
                        el.font_weight ?? '400',
                        tr, tg, tb, 1.0,
                        el.w ?? canvasW * 0.8,
                        el.text_align ?? 'center',
                        el.name,
                        el.line_height,
                        el.letter_spacing,
                    );
                    rendered++;
                    continue;
                }
                // Shape
                const sr = el.r ?? 0.5, sg = el.g ?? 0.5, sb = el.b ?? 0.5;
                if (el.type === 'rounded_rect') {
                    engine.add_rounded_rect?.(el.x, el.y, el.w, el.h, sr, sg, sb, 1, el.radius ?? 8, el.name);
                } else {
                    engine.add_rect?.(el.x ?? 0, el.y ?? 0, el.w ?? 100, el.h ?? 50, sr, sg, sb, 1, el.name);
                }
                rendered++;
            }

            // ── Step 3: Reference Layer (ghost overlay) ──
            // Place the original screenshot at the bottom (zIndex=0) at 15% opacity
            setProgress('Adding reference layer...');
            try {
                const refId = await engine.add_image?.(0, 0, dataUrl, canvasW, canvasH, '__reference_screenshot__');
                if (typeof refId === 'number') {
                    referenceIdRef.current = refId;
                    engine.set_opacity?.(refId, 0.15);
                    // Move to very back
                    engine.set_z_index?.(refId, -1);
                }
            } catch { /* ok if unsupported */ }

            setElementCount(rendered);
            setPhase('done');
            setProgress('');

        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Scan failed. Please try again.';
            setError(msg);
            setPhase('error');
        }
    }, [engine, canvasW, canvasH]);

    // ── Toggle reference layer visibility ──
    const toggleReference = useCallback(() => {
        const id = referenceIdRef.current;
        if (id === null || !engine) return;
        const next = !showReference;
        setShowReference(next);
        engine.set_opacity?.(id, next ? 0.15 : 0);
        engine.render?.();
    }, [engine, showReference]);

    // ── Drag + Drop ──
    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) processScreenshot(file);
    }, [processScreenshot]);

    const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) processScreenshot(file);
    }, [processScreenshot]);

    const fileInputRef = useRef<HTMLInputElement>(null);

    return (
        <div style={s.panel}>
            <div style={s.header}>
                <span style={s.title}>Scan Design</span>
                <span style={s.subtitle}>Drop a screenshot → editable layers</span>
            </div>

            {/* Drop Zone */}
            <div
                style={{
                    ...s.dropZone,
                    borderColor: isDragging ? '#388bfd' : '#21262d',
                    background: isDragging ? 'rgba(56,139,253,0.07)' : 'transparent',
                }}
                onDragEnter={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
            >
                {previewUrl ? (
                    <div style={s.previewWrapper}>
                        <img src={previewUrl} alt="Reference" style={s.previewImg} />
                        <span style={s.previewHint}>Click to replace</span>
                    </div>
                ) : (
                    <span style={s.dropText}>Drop design screenshot here</span>
                )}
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={handleFileInput}
                />
            </div>

            {/* Progress */}
            {(phase === 'scanning' || phase === 'rendering') && (
                <div style={s.progressRow}>
                    <span style={s.spinner} />
                    <span style={{ ...s.progressText, color: '#79c0ff' }}>{progress}</span>
                </div>
            )}

            {/* Success */}
            {phase === 'done' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div style={s.successRow}>
                        {elementCount} layers created
                    </div>
                    <button
                        style={{
                            ...s.refBtn,
                            background: showReference ? '#21262d' : 'transparent',
                            color: showReference ? '#e6edf3' : '#6e7681',
                        }}
                        onClick={toggleReference}
                    >
                        {showReference ? 'Hide Reference Layer' : 'Show Reference Layer'}
                    </button>
                    <div style={s.tipText}>
                        Reference layer at 15% opacity for alignment. Hidden on export.
                    </div>
                </div>
            )}

            {/* Error */}
            {error && <div style={s.errorBlock}>{error}</div>}

            {/* Scan again */}
            {phase === 'done' && (
                <button style={s.btn} onClick={() => fileInputRef.current?.click()}>
                    Scan Another
                </button>
            )}

            {!engine && <div style={s.hint}>Open a canvas to use Scan Design</div>}
        </div>
    );
}

// ── Utility ──
function hexToRgb(hex: string): [number, number, number] {
    const c = hex.replace('#', '');
    return [
        parseInt(c.substring(0, 2), 16) / 255,
        parseInt(c.substring(2, 4), 16) / 255,
        parseInt(c.substring(4, 6), 16) / 255,
    ];
}

// ── Styles ──
const s: Record<string, React.CSSProperties> = {
    panel: {
        background: '#0d1117', border: '1px solid #21262d', borderRadius: 10,
        padding: '14px', display: 'flex', flexDirection: 'column', gap: 10,
        fontSize: 12, color: '#c9d1d9', fontFamily: 'Inter, system-ui, sans-serif',
    },
    header: { display: 'flex', flexDirection: 'column', gap: 2 },
    title: { fontWeight: 600, fontSize: 13, color: '#f0f6fc', letterSpacing: -0.2 },
    subtitle: { color: '#6e7681', fontSize: 11 },
    dropZone: {
        border: '1.5px dashed', borderRadius: 7, padding: '14px 10px',
        minHeight: 72, display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', transition: 'all 0.12s ease', userSelect: 'none',
        flexDirection: 'column', gap: 6,
    },
    dropText: { fontSize: 11, color: '#484f58', textAlign: 'center' },
    previewWrapper: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 },
    previewImg: { maxHeight: 80, maxWidth: '100%', borderRadius: 4, objectFit: 'contain' },
    previewHint: { fontSize: 10, color: '#484f58' },
    progressRow: {
        display: 'flex', alignItems: 'center', gap: 8,
        background: '#0d1f38', border: '1px solid #1f6feb', borderRadius: 6, padding: '7px 10px',
    },
    progressText: { fontSize: 11, fontWeight: 500 },
    successRow: {
        background: 'transparent', border: '1px solid #238636',
        borderRadius: 6, padding: '6px 10px', color: '#3fb950', fontSize: 11,
    },
    refBtn: {
        border: '1px solid #30363d', borderRadius: 5, padding: '5px 10px',
        fontSize: 11, cursor: 'pointer', transition: 'all 0.1s', width: '100%',
        textAlign: 'center',
    },
    tipText: { fontSize: 10, color: '#484f58', lineHeight: 1.4 },
    errorBlock: {
        background: 'transparent', border: '1px solid #f85149',
        borderRadius: 6, padding: '6px 10px', color: '#f85149', fontSize: 11,
    },
    btn: {
        background: '#21262d', color: '#e6edf3', border: '1px solid #30363d',
        borderRadius: 6, padding: '8px 14px', fontSize: 12, fontWeight: 600,
        cursor: 'pointer', display: 'flex', alignItems: 'center',
        gap: 6, justifyContent: 'center', width: '100%',
        transition: 'opacity 0.12s ease', letterSpacing: -0.1,
    },
    spinner: {
        width: 11, height: 11, borderRadius: '50%', flexShrink: 0,
        border: '1.5px solid rgba(120,192,255,0.2)', borderTopColor: '#79c0ff',
        animation: 'spin 0.7s linear infinite', display: 'inline-block',
    },
    hint: { color: '#484f58', fontSize: 10, textAlign: 'center' },
};
