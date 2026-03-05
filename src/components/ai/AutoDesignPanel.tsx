// ─────────────────────────────────────────────────
// AutoDesignPanel — Auto-Design 2.0 UI
// ─────────────────────────────────────────────────
// - Asset Upload Zone: drop/click to add images to canvas
// - From Scratch: empty canvas → full layout
// - Asset-Context: existing elements → AI reorganizes
// - Vision Feedback Loop: 3-pass quality review
// ─────────────────────────────────────────────────

import { useState, useCallback, useEffect, useRef } from 'react';
import { useAutoDesign } from '@/hooks/useAutoDesign';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Engine = any;

interface Props {
    engine: Engine | null;
    canvasW: number;
    canvasH: number;
    apiKey: string;
}

const EXAMPLE_PROMPTS = [
    'Nike running shoes sale — bold red/black, 40% off, white CTA',
    'Luxury hotel getaway — dark navy, gold accents, elegant',
    'Summer music festival — vibrant gradient, headline + ticket CTA',
    'SaaS product launch — minimal purple gradient, start free trial',
];

export function AutoDesignPanel({ engine, canvasW, canvasH, apiKey }: Props) {
    const [prompt, setPrompt] = useState('');
    const [elementCount, setElementCount] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const [uploadedAssets, setUploadedAssets] = useState<string[]>([]);  // preview thumbnails
    const fileInputRef = useRef<HTMLInputElement>(null);

    const { state, generate, cancel } = useAutoDesign({ engine, canvasW, canvasH, apiKey });

    // Detect how many elements exist on canvas
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

    // ── Image upload → canvas ──────────────────────────
    const placeImageOnCanvas = useCallback(async (file: File) => {
        if (!engine) return;
        const dataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
        // Place image centered on canvas
        const x = Math.round(canvasW * 0.1);
        const y = Math.round(canvasH * 0.1);
        const maxW = Math.round(canvasW * 0.8);
        const maxH = Math.round(canvasH * 0.8);
        await engine.add_image(x, y, dataUrl, maxW, maxH, file.name.replace(/\.[^.]+$/, ''));
        setUploadedAssets(prev => [...prev, dataUrl]);
    }, [engine, canvasW, canvasH]);

    const handleFiles = useCallback((files: FileList | File[]) => {
        const imageFiles = Array.from(files).filter(f => f.type.startsWith('image/'));
        imageFiles.forEach(f => placeImageOnCanvas(f));
    }, [placeImageOnCanvas]);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files.length > 0) handleFiles(e.dataTransfer.files);
    }, [handleFiles]);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback(() => setIsDragging(false), []);

    const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.length) handleFiles(e.target.files);
        e.target.value = '';
    }, [handleFiles]);

    // ── Generate ───────────────────────────────────────
    const isAssetMode = elementCount >= 1;
    const handleGenerate = useCallback(() => generate(prompt), [generate, prompt]);
    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); handleGenerate(); }
    }, [handleGenerate]);

    const hasKey = !!apiKey?.trim();
    const canRun = hasKey && !!engine && prompt.trim().length > 0 && !state.isGenerating;

    const placeholderText = isAssetMode
        ? `Describe the style for your ${elementCount} asset${elementCount > 1 ? 's' : ''}...\ne.g. "Bold summer sale, orange energy, Shop Now CTA"`
        : `e.g. Summer sale — orange bg, '50% OFF' headline, Shop Now button...`;

    return (
        <div style={styles.panel}>
            {/* Header */}
            <div style={styles.header}>
                <div style={styles.titleRow}>
                    <span style={styles.title}>✨ Auto-Design</span>
                    {isAssetMode && (
                        <span style={styles.modeBadge}>
                            🎨 {elementCount} element{elementCount > 1 ? 's' : ''}
                        </span>
                    )}
                </div>
                <span style={styles.subtitle}>
                    {isAssetMode
                        ? 'AI reorganizes your assets + Vision review'
                        : 'Drop assets below, then describe your banner'}
                </span>
            </div>

            {/* ── Asset Upload Zone ────────────────────── */}
            <div
                style={{
                    ...styles.dropZone,
                    borderColor: isDragging ? '#58a6ff' : '#30363d',
                    background: isDragging ? 'rgba(88,166,255,0.08)' : '#0d1117',
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
                        {uploadedAssets.slice(-3).map((src, i) => (
                            <img key={i} src={src} style={styles.thumb} alt={`asset ${i + 1}`} />
                        ))}
                        <span style={styles.dropHintSmall}>+ Drop more</span>
                    </div>
                ) : (
                    <div style={styles.dropContent}>
                        <span style={styles.dropIcon}>🖼</span>
                        <span style={styles.dropText}>Drop logo / image here</span>
                        <span style={styles.dropSub}>or click to browse</span>
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
                            ? (state.phase === 'reviewing' ? '#f78166' : '#1f6feb')
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

            {/* Example prompts — only when idle + empty canvas + no assets */}
            {!state.isGenerating && !state.createdCount && !isAssetMode && (
                <div style={styles.examples}>
                    <div style={styles.examplesLabel}>Try:</div>
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

            {/* Progress — vision review (orange) */}
            {state.isGenerating && state.phase === 'reviewing' && (
                <div style={{ ...styles.progressRow, borderColor: '#f78166', background: '#1a1008' }}>
                    <span style={{ ...styles.spinner, borderTopColor: '#f78166', borderColor: 'rgba(247,129,102,0.3)' }} />
                    <span style={{ ...styles.progressText, color: '#f78166' }}>{state.progress}</span>
                </div>
            )}

            {/* Success */}
            {!state.isGenerating && state.phase === 'done' && (
                <div style={styles.successBlock}>
                    ✅ Done!{state.finalScore > 0 && <span style={{ opacity: 0.7, marginLeft: 4 }}>Score: {state.finalScore}/100</span>}
                    <span style={{ opacity: 0.6, marginLeft: 4 }}>Edit or regenerate.</span>
                </div>
            )}

            {/* Error */}
            {state.error && (
                <div style={styles.errorBlock}>{state.error}</div>
            )}

            {/* CTA Button */}
            <button
                id="auto-design-generate-btn"
                style={{
                    ...styles.btn,
                    ...(state.isGenerating ? styles.btnRunning : {}),
                    opacity: canRun || state.isGenerating ? 1 : 0.4,
                    cursor: canRun ? 'pointer' : state.isGenerating ? 'pointer' : 'not-allowed',
                }}
                onClick={state.isGenerating ? cancel : handleGenerate}
                disabled={!state.isGenerating && !canRun}
            >
                {state.isGenerating ? '✕ Cancel'
                    : state.phase === 'done' ? '↻ Regenerate'
                        : isAssetMode ? '✨ Redesign with AI'
                            : '✨ Generate Banner'}
            </button>

            {!hasKey && (
                <div style={styles.noKeyHint}>Set Anthropic API key in AI Panel settings first</div>
            )}
            {!engine && hasKey && (
                <div style={styles.noKeyHint}>Open a banner in the editor to use Auto-Design</div>
            )}
        </div>
    );
}

// ── Styles ─────────────────────────────────────────
const styles: Record<string, React.CSSProperties> = {
    panel: {
        background: '#0d1117', border: '1px solid #30363d', borderRadius: 10,
        padding: '14px', display: 'flex', flexDirection: 'column', gap: 10,
        fontSize: 12, color: '#c9d1d9', fontFamily: 'Inter, system-ui, sans-serif',
    },
    header: { display: 'flex', flexDirection: 'column', gap: 3 },
    titleRow: { display: 'flex', alignItems: 'center', gap: 8 },
    title: { fontWeight: 700, fontSize: 14, color: '#f0f6fc', letterSpacing: -0.3 },
    modeBadge: {
        fontSize: 10, fontWeight: 600, color: '#ffa657',
        background: 'rgba(255,166,87,0.12)', border: '1px solid rgba(255,166,87,0.3)',
        borderRadius: 4, padding: '1px 6px',
    },
    subtitle: { color: '#8b949e', fontSize: 11 },
    // Drop Zone
    dropZone: {
        border: '1.5px dashed', borderRadius: 8,
        padding: '10px', minHeight: 64,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', transition: 'all 0.15s ease', userSelect: 'none',
    },
    dropContent: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 },
    dropIcon: { fontSize: 20 },
    dropText: { fontSize: 12, color: '#8b949e', fontWeight: 500 },
    dropSub: { fontSize: 10, color: '#484f58' },
    thumbRow: { display: 'flex', alignItems: 'center', gap: 6 },
    thumb: { width: 40, height: 40, objectFit: 'cover', borderRadius: 4, border: '1px solid #30363d' },
    dropHintSmall: { fontSize: 10, color: '#484f58', marginLeft: 4 },
    // Input
    inputWrapper: { position: 'relative' },
    textarea: {
        width: '100%', boxSizing: 'border-box',
        background: '#161b22', border: '1px solid #30363d',
        borderRadius: 8, padding: '8px 10px',
        color: '#e6edf3', fontSize: 12, lineHeight: 1.5,
        fontFamily: 'inherit', resize: 'none', outline: 'none',
        transition: 'border-color 0.15s ease',
    },
    inputHint: { fontSize: 10, color: '#484f58', marginTop: 3, textAlign: 'right' },
    examples: { display: 'flex', flexDirection: 'column', gap: 5 },
    examplesLabel: { fontSize: 10, color: '#8b949e', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 },
    examplesList: { display: 'flex', flexDirection: 'column', gap: 3 },
    exampleChip: {
        background: '#161b22', border: '1px solid #21262d',
        borderRadius: 5, padding: '4px 8px',
        color: '#8b949e', fontSize: 10, textAlign: 'left',
        cursor: 'pointer', transition: 'all 0.12s ease', lineHeight: 1.4,
    },
    progressRow: {
        display: 'flex', alignItems: 'center', gap: 8,
        background: '#0d1f38', border: '1px solid', borderRadius: 6, padding: '7px 10px',
    },
    progressText: { fontSize: 11, fontWeight: 500 },
    successBlock: {
        background: '#0f2a0f', border: '1px solid #238636',
        borderRadius: 6, padding: '7px 10px',
        color: '#3fb950', fontSize: 11, fontWeight: 600,
        display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 2,
    },
    errorBlock: {
        background: '#2d0f0f', border: '1px solid #f85149',
        borderRadius: 6, padding: '7px 10px',
        color: '#f85149', fontSize: 11,
    },
    btn: {
        background: 'linear-gradient(135deg, #6e40c9 0%, #8b5cf6 100%)',
        color: '#fff', border: 'none', borderRadius: 7,
        padding: '9px 14px', fontSize: 13, fontWeight: 700,
        cursor: 'pointer', display: 'flex', alignItems: 'center',
        gap: 6, justifyContent: 'center', width: '100%',
        transition: 'opacity 0.15s ease', letterSpacing: -0.2,
    },
    btnRunning: { background: '#21262d', color: '#f85149', border: '1px solid #f85149' },
    spinner: {
        width: 12, height: 12, borderRadius: '50%', flexShrink: 0,
        border: '2px solid rgba(120,192,255,0.3)', borderTopColor: '#79c0ff',
        animation: 'spin 0.7s linear infinite', display: 'inline-block',
    },
    noKeyHint: { color: '#484f58', fontSize: 10, textAlign: 'center' },
};
