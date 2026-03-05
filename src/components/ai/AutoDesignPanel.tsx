// ─────────────────────────────────────────────────
// AutoDesignPanel — Auto-Design 2.0 UI
// ─────────────────────────────────────────────────
// Two modes:
//   - From Scratch: empty canvas → full layout
//   - Asset-Context: existing elements → AI reorganizes
// Both run Vision Feedback Loop after initial placement.
// ─────────────────────────────────────────────────

import { useState, useCallback, useEffect } from 'react';
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

    const { state, generate, cancel } = useAutoDesign({ engine, canvasW, canvasH, apiKey });

    // Detect how many elements exist on canvas (for mode badge)
    useEffect(() => {
        if (!engine) return;
        const refresh = () => {
            try {
                const nodes = JSON.parse(engine.get_all_nodes() as string);
                setElementCount(Array.isArray(nodes) ? nodes.length : 0);
            } catch { setElementCount(0); }
        };
        refresh();
        const id = setInterval(refresh, 2000);
        return () => clearInterval(id);
    }, [engine]);

    const isAssetMode = elementCount >= 1;

    const handleGenerate = useCallback(() => generate(prompt), [generate, prompt]);
    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); handleGenerate(); }
    }, [handleGenerate]);

    const hasKey = !!apiKey?.trim();
    const canRun = hasKey && !!engine && prompt.trim().length > 0 && !state.isGenerating;

    const placeholderText = isAssetMode
        ? `Describe the style (${elementCount} elements detected)...\ne.g. "Make this a bold summer sale banner — orange, energetic"`
        : `e.g. Summer sale — orange background, '50% OFF' headline, Shop Now button...`;

    return (
        <div style={styles.panel}>
            {/* Header */}
            <div style={styles.header}>
                <div style={styles.titleRow}>
                    <span style={styles.title}>✨ Auto-Design</span>
                    {isAssetMode && (
                        <span style={styles.modeBadge}>
                            🎨 {elementCount} element{elementCount > 1 ? 's' : ''} detected
                        </span>
                    )}
                </div>
                <span style={styles.subtitle}>
                    {isAssetMode
                        ? 'AI will reorganize your elements → Vision review'
                        : 'Describe your banner — AI creates it'}
                </span>
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

            {/* Example prompts (only when idle + no result) */}
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

            {/* Progress — generating phase */}
            {state.isGenerating && state.phase === 'generating' && (
                <div style={{ ...styles.progressRow, borderColor: '#1f6feb' }}>
                    <span style={styles.spinner} />
                    <span style={{ ...styles.progressText, color: '#79c0ff' }}>{state.progress}</span>
                </div>
            )}

            {/* Progress — vision review phase */}
            {state.isGenerating && state.phase === 'reviewing' && (
                <div style={{ ...styles.progressRow, borderColor: '#f78166', background: '#1a1008' }}>
                    <span style={{ ...styles.spinner, borderTopColor: '#f78166', borderColor: 'rgba(247,129,102,0.3)' }} />
                    <span style={{ ...styles.progressText, color: '#f78166' }}>{state.progress}</span>
                </div>
            )}

            {/* Success */}
            {!state.isGenerating && state.phase === 'done' && state.createdCount >= 0 && (
                <div style={styles.successBlock}>
                    ✅ Done! {state.finalScore > 0 && <span style={{ opacity: 0.75 }}>Score: {state.finalScore}/100</span>}
                    <span style={{ opacity: 0.7, marginLeft: 6 }}>Edit freely or generate again.</span>
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
                {state.isGenerating ? (
                    <>✕ Cancel</>
                ) : state.phase === 'done' ? (
                    '↻ Regenerate'
                ) : isAssetMode ? (
                    '✨ Redesign with AI'
                ) : (
                    '✨ Generate Banner'
                )}
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
        display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 4,
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
