// ─────────────────────────────────────────────────
// AutoDesignPanel — Auto-Design 2.0
// ─────────────────────────────────────────────────
// - Asset Upload Zone: drop/click images → placed on canvas
// - From Scratch mode: empty canvas → AI generates layout
// - Asset-Context mode: existing elements → AI reorganizes
// - Vision Feedback Loop: 3-pass quality review after generation
//
// NO EMOJIS IN UI. Clean, Apple/Figma-level aesthetic.
// ─────────────────────────────────────────────────

import { useState, useCallback, useEffect, useRef } from 'react';
import { useAutoDesign } from '@/hooks/useAutoDesign';
import { useDesignMemoryStore } from '@/stores/designMemoryStore';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Engine = any;

interface Props {
    engine: Engine | null;
    canvasW: number;
    canvasH: number;
}

const EXAMPLE_PROMPTS = [
    'Nike running shoes sale — bold red/black, 40% off, white CTA',
    'Luxury hotel getaway — dark navy, gold accents, elegant',
    'Summer music festival — vibrant gradient, headline + ticket CTA',
    'SaaS product launch — minimal purple gradient, start free trial',
];

export function AutoDesignPanel({ engine, canvasW, canvasH }: Props) {
    const [prompt, setPrompt] = useState('');
    const [elementCount, setElementCount] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const [uploadedAssets, setUploadedAssets] = useState<string[]>([]);
    const [rated, setRated] = useState<number | null>(null); // current session rating
    const fileInputRef = useRef<HTMLInputElement>(null);
    const lastPromptRef = useRef('');

    const { state, generate, cancel } = useAutoDesign({ engine, canvasW, canvasH });
    const addEntry = useDesignMemoryStore(s => s.addEntry);



    // Poll canvas element count
    useEffect(() => {
        if (!engine) return;
        const refresh = () => {
            try {
                const nodes = JSON.parse(engine.get_all_nodes() as string);
                setElementCount(Array.isArray(nodes) ? nodes.length : 0);
            } catch { setElementCount(0); }
        };
        refresh();
        const id = setInterval(refresh, 1500);
        return () => clearInterval(id);
    }, [engine]);

    // ── Image upload → canvas ──────────────────────
    const placeImageOnCanvas = useCallback(async (file: File) => {
        if (!engine) return;
        const dataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
        // Fit inside 80% of artboard, preserving aspect ratio
        // Pass only maxW — engine calculates h proportionally (h=undefined → auto)
        const x = Math.round(canvasW * 0.1);
        const y = Math.round(canvasH * 0.1);
        const maxW = Math.round(canvasW * 0.8);
        const nodeId = await engine.add_image(x, y, dataUrl, maxW, undefined, file.name.replace(/\.[^.]+$/, ''));
        // Bring image to front so it's always visible (not hidden under shapes)
        try { engine.send_to_front?.(nodeId); } catch { /* ok */ }
        setUploadedAssets(prev => [...prev, dataUrl]);
    }, [engine, canvasW, canvasH]);

    const handleFiles = useCallback((files: FileList | File[]) => {
        Array.from(files).filter(f => f.type.startsWith('image/')).forEach(f => placeImageOnCanvas(f));
    }, [placeImageOnCanvas]);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files.length > 0) handleFiles(e.dataTransfer.files);
    }, [handleFiles]);

    const handleDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); }, []);
    const handleDragLeave = useCallback(() => setIsDragging(false), []);
    const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.length) handleFiles(e.target.files);
        e.target.value = '';
    }, [handleFiles]);

    // ── Controls ───────────────────────────────────
    const isAssetMode = elementCount >= 1;
    // Button enabled when engine is ready (API key is centralized)
    const canRun = !!engine && !state.isGenerating;

    const handleGenerate = useCallback(() => {
        lastPromptRef.current = prompt;
        setRated(null);
        generate(prompt || 'Clean, professional layout');
    }, [generate, prompt]);
    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); handleGenerate(); }
    }, [handleGenerate]);

    const placeholderText = isAssetMode
        ? 'Describe the style (optional)...\ne.g. Bold summer sale, orange energy, Shop Now CTA'
        : 'e.g. Summer sale — orange bg, 50% OFF headline, Shop Now button...';

    return (
        <div style={styles.panel}>
            {/* Header */}
            <div style={styles.header}>
                <div style={styles.titleRow}>
                    <span style={styles.title}>Auto-Design</span>
                    {isAssetMode && (
                        <span style={styles.modeBadge}>
                            {elementCount} element{elementCount > 1 ? 's' : ''}
                        </span>
                    )}
                </div>
                <span style={styles.subtitle}>
                    {isAssetMode
                        ? 'AI reorganizes assets + vision review'
                        : 'Drop an asset or describe your banner'}
                </span>
            </div>

            {/* Asset Upload Zone */}
            <div
                style={{
                    ...styles.dropZone,
                    borderColor: isDragging ? '#58a6ff' : '#30363d',
                    background: isDragging ? 'rgba(88,166,255,0.06)' : 'transparent',
                }}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    style={{ display: 'none' }}
                    onChange={handleFileInput}
                />
                {uploadedAssets.length > 0 ? (
                    <div style={styles.thumbRow}>
                        {uploadedAssets.slice(-4).map((src, i) => (
                            <img key={i} src={src} style={styles.thumb} alt="" />
                        ))}
                        <span style={styles.dropHintSmall}>+ Add more</span>
                    </div>
                ) : (
                    <div style={styles.dropContent}>
                        <span style={{ fontSize: 16, color: '#484f58', lineHeight: 1 }}>+</span>
                        <span style={styles.dropText}>Drop image or click to upload</span>
                    </div>
                )}
            </div>

            {/* Prompt input */}
            <div style={styles.inputWrapper}>
                <textarea
                    id="auto-design-prompt"
                    style={{
                        ...styles.textarea,
                        borderColor: state.isGenerating
                            ? (state.phase === 'reviewing' ? '#6e7681' : '#1f6feb')
                            : '#30363d',
                    }}
                    placeholder={placeholderText}
                    value={prompt}
                    onChange={e => setPrompt(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={state.isGenerating}
                    rows={3}
                />
                <div style={styles.inputHint}>⌘↵ to generate</div>
            </div>

            {/* Example prompts — idle + no elements */}
            {!state.isGenerating && !state.createdCount && !isAssetMode && (
                <div style={styles.examples}>
                    <div style={styles.examplesLabel}>Examples</div>
                    <div style={styles.examplesList}>
                        {EXAMPLE_PROMPTS.map((ex, i) => (
                            <button key={i} style={styles.exampleChip} onClick={() => setPrompt(ex)}>
                                {ex.slice(0, 52)}{ex.length > 52 ? '…' : ''}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Progress — generating */}
            {state.isGenerating && state.phase === 'generating' && (
                <div style={{ ...styles.progressRow, borderColor: '#1f6feb' }}>
                    <span style={styles.spinner} />
                    <span style={{ ...styles.progressText, color: '#79c0ff' }}>{state.progress}</span>
                </div>
            )}

            {/* Progress — vision review */}
            {state.isGenerating && state.phase === 'reviewing' && (
                <div style={{ ...styles.progressRow, borderColor: '#30363d', background: '#161b22' }}>
                    <span style={{ ...styles.spinner, borderTopColor: '#8b949e', borderColor: 'rgba(139,148,158,0.2)' }} />
                    <span style={{ ...styles.progressText, color: '#8b949e' }}>{state.progress}</span>
                </div>
            )}

            {/* Success + Rating */}
            {!state.isGenerating && state.phase === 'done' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div style={styles.successBlock}>
                        Layout complete.
                        {state.finalScore > 0 && <span style={{ opacity: 0.6, marginLeft: 6 }}>Score {state.finalScore}/100</span>}
                    </div>
                    {/* Rating — saves result to design memory for few-shot learning */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 10, color: '#484f58' }}>Rate this design:</span>
                        <button
                            title="Good design — save as example"
                            style={{
                                background: rated === 5 ? '#238636' : '#21262d',
                                border: `1px solid ${rated === 5 ? '#2ea043' : '#30363d'}`,
                                borderRadius: 5, padding: '3px 9px', cursor: 'pointer',
                                color: rated === 5 ? '#fff' : '#8b949e', fontSize: 11,
                                transition: 'all 0.1s',
                            }}
                            onClick={() => {
                                if (rated === 5) return;
                                setRated(5);
                                if (engine) {
                                    try {
                                        const nodes = JSON.parse(engine.get_all_nodes());
                                        addEntry({ prompt: lastPromptRef.current, elements: nodes, canvasW, canvasH, rating: 5, personality: 'auto' });
                                    } catch { /* ok */ }
                                }
                            }}
                        >
                            + Good
                        </button>
                        <button
                            title="Poor design — mark as low quality"
                            style={{
                                background: rated === 1 ? '#6e1a1a' : '#21262d',
                                border: `1px solid ${rated === 1 ? '#f85149' : '#30363d'}`,
                                borderRadius: 5, padding: '3px 9px', cursor: 'pointer',
                                color: rated === 1 ? '#fff' : '#8b949e', fontSize: 11,
                                transition: 'all 0.1s',
                            }}
                            onClick={() => {
                                if (rated === 1) return;
                                setRated(1);
                                if (engine) {
                                    try {
                                        const nodes = JSON.parse(engine.get_all_nodes());
                                        addEntry({ prompt: lastPromptRef.current, elements: nodes, canvasW, canvasH, rating: 1, personality: 'auto' });
                                    } catch { /* ok */ }
                                }
                            }}
                        >
                            - Poor
                        </button>
                    </div>
                </div>
            )}

            {/* Error */}
            {state.error && (
                <div style={styles.errorBlock}>{state.error}</div>
            )}

            {/* CTA */}
            <button
                id="auto-design-generate-btn"
                style={{
                    ...styles.btn,
                    ...(state.isGenerating ? styles.btnRunning : {}),
                    opacity: canRun || state.isGenerating ? 1 : 0.35,
                    cursor: canRun ? 'pointer' : state.isGenerating ? 'pointer' : 'not-allowed',
                }}
                onClick={state.isGenerating ? cancel : handleGenerate}
                disabled={!state.isGenerating && !canRun}
            >
                {state.isGenerating ? 'Cancel'
                    : state.phase === 'done' ? 'Regenerate'
                        : isAssetMode ? 'Redesign with AI'
                            : 'Generate Banner'}
            </button>

            {!engine && (
                <div style={styles.hint}>Open a canvas to use Auto-Design</div>
            )}
        </div>
    );
}

// ── Styles ──────────────────────────────────────────
const styles: Record<string, React.CSSProperties> = {
    panel: {
        background: '#0d1117', border: '1px solid #21262d', borderRadius: 10,
        padding: '14px', display: 'flex', flexDirection: 'column', gap: 10,
        fontSize: 12, color: '#c9d1d9', fontFamily: 'Inter, system-ui, sans-serif',
    },
    header: { display: 'flex', flexDirection: 'column', gap: 3 },
    titleRow: { display: 'flex', alignItems: 'center', gap: 8 },
    title: { fontWeight: 600, fontSize: 13, color: '#f0f6fc', letterSpacing: -0.2 },
    modeBadge: {
        fontSize: 10, fontWeight: 500, color: '#8b949e',
        background: '#21262d', border: '1px solid #30363d',
        borderRadius: 4, padding: '1px 6px',
    },
    subtitle: { color: '#6e7681', fontSize: 11 },
    dropZone: {
        border: '1px dashed', borderRadius: 7,
        padding: '12px 10px', minHeight: 58,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', transition: 'all 0.12s ease', userSelect: 'none',
    },
    dropContent: { display: 'flex', alignItems: 'center', gap: 8 },
    dropText: { fontSize: 11, color: '#6e7681' },
    thumbRow: { display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' },
    thumb: { width: 36, height: 36, objectFit: 'cover', borderRadius: 4, border: '1px solid #30363d' },
    dropHintSmall: { fontSize: 10, color: '#6e7681' },
    inputWrapper: { position: 'relative' },
    textarea: {
        width: '100%', boxSizing: 'border-box',
        background: '#161b22', border: '1px solid',
        borderRadius: 7, padding: '8px 10px',
        color: '#e6edf3', fontSize: 12, lineHeight: 1.5,
        fontFamily: 'inherit', resize: 'none', outline: 'none',
        transition: 'border-color 0.12s ease',
    },
    inputHint: { fontSize: 10, color: '#484f58', marginTop: 3, textAlign: 'right' },
    examples: { display: 'flex', flexDirection: 'column', gap: 5 },
    examplesLabel: { fontSize: 10, color: '#6e7681', fontWeight: 500, textTransform: 'uppercase', letterSpacing: 0.6 },
    examplesList: { display: 'flex', flexDirection: 'column', gap: 3 },
    exampleChip: {
        background: 'transparent', border: '1px solid #21262d',
        borderRadius: 5, padding: '4px 8px',
        color: '#6e7681', fontSize: 10, textAlign: 'left',
        cursor: 'pointer', transition: 'all 0.1s ease', lineHeight: 1.4,
    },
    progressRow: {
        display: 'flex', alignItems: 'center', gap: 8,
        background: '#0d1f38', border: '1px solid', borderRadius: 6, padding: '7px 10px',
    },
    progressText: { fontSize: 11, fontWeight: 500 },
    successBlock: {
        background: 'transparent', border: '1px solid #238636',
        borderRadius: 6, padding: '6px 10px',
        color: '#3fb950', fontSize: 11,
        display: 'flex', alignItems: 'center',
    },
    errorBlock: {
        background: 'transparent', border: '1px solid #f85149',
        borderRadius: 6, padding: '6px 10px',
        color: '#f85149', fontSize: 11,
    },
    btn: {
        background: '#238636',
        color: '#fff', border: 'none', borderRadius: 6,
        padding: '8px 14px', fontSize: 12, fontWeight: 600,
        cursor: 'pointer', display: 'flex', alignItems: 'center',
        gap: 6, justifyContent: 'center', width: '100%',
        transition: 'opacity 0.12s ease', letterSpacing: -0.1,
    },
    btnRunning: { background: 'transparent', color: '#f85149', border: '1px solid #30363d' },
    spinner: {
        width: 11, height: 11, borderRadius: '50%', flexShrink: 0,
        border: '1.5px solid rgba(120,192,255,0.2)', borderTopColor: '#79c0ff',
        animation: 'spin 0.7s linear infinite', display: 'inline-block',
    },
    hint: { color: '#484f58', fontSize: 10, textAlign: 'center' },
};
