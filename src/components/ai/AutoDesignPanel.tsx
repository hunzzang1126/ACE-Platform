// ─────────────────────────────────────────────────
// AutoDesignPanel — Auto-Design 2.0
// ─────────────────────────────────────────────────
// Styles → autoDesignPanelStyles.ts
// ─────────────────────────────────────────────────

import { useState, useCallback, useEffect, useRef } from 'react';
import { useAutoDesign } from '@/hooks/useAutoDesign';
import { useDesignMemoryStore } from '@/stores/designMemoryStore';
import { ScanDesignPanel } from '@/components/ai/ScanDesignPanel';
import { styles } from './autoDesignPanelStyles';

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
    const [activeTab, setActiveTab] = useState<'generate' | 'scan'>('generate');
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
            {/* Tab Switcher */}
            <div style={{ display: 'flex', gap: 2, background: '#fafbfc', borderRadius: 6, padding: 2 }}>
                {(['generate', 'scan'] as const).map(tab => (
                    <button
                        key={tab}
                        style={{
                            flex: 1, padding: '5px 8px', borderRadius: 4, border: 'none',
                            fontSize: 11, fontWeight: 500, cursor: 'pointer',
                            background: activeTab === tab ? '#e2e8f0' : 'transparent',
                            color: activeTab === tab ? '#f0f6fc' : '#6e7681',
                            transition: 'all 0.12s ease',
                        }}
                        onClick={() => setActiveTab(tab)}
                    >
                        {tab === 'generate' ? 'AI Generate' : 'Scan Design'}
                    </button>
                ))}
            </div>

            {/* Scan Design mode */}
            {activeTab === 'scan' && (
                <ScanDesignPanel engine={engine} canvasW={canvasW} canvasH={canvasH} />
            )}

            {/* AI Generate mode — rest of existing UI */}
            {activeTab === 'generate' && <>

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
                        borderColor: isDragging ? '#58a6ff' : '#e2e8f0',
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
                            <span style={{ fontSize: 16, color: '#94a3b8', lineHeight: 1 }}>+</span>
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
                                : '#e2e8f0',
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
                    <div style={{ ...styles.progressRow, borderColor: '#e2e8f0', background: '#fafbfc' }}>
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
                            <span style={{ fontSize: 10, color: '#94a3b8' }}>Rate this design:</span>
                            <button
                                title="Good design — save as example"
                                style={{
                                    background: rated === 5 ? '#238636' : '#e2e8f0',
                                    border: `1px solid ${rated === 5 ? '#2ea043' : '#e2e8f0'}`,
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
                                    background: rated === 1 ? '#6e1a1a' : '#e2e8f0',
                                    border: `1px solid ${rated === 1 ? '#f85149' : '#e2e8f0'}`,
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
            </>}
        </div>
    );
}


