// ─────────────────────────────────────────────────
// AutoDesignPanel — AI Auto-Design UI
// ─────────────────────────────────────────────────
// "Type what you want → AI generates the banner"
// OpenPencil-inspired auto-design panel for the editor.
// ─────────────────────────────────────────────────

import { useState, useCallback } from 'react';
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
    'Nike running shoes sale — bold red/black, 40% off, "Shop Now" CTA',
    'Luxury hotel weekend getaway — dark navy, gold accents, elegant typography',
    'Summer music festival — vibrant gradient, multiple artist names, ticket CTA',
    'SaaS product launch — clean minimal, purple gradient, "Start Free Trial"',
];

export function AutoDesignPanel({ engine, canvasW, canvasH, apiKey }: Props) {
    const [prompt, setPrompt] = useState('');

    const { state, generate, cancel } = useAutoDesign({ engine, canvasW, canvasH, apiKey });

    const handleGenerate = useCallback(() => {
        generate(prompt);
    }, [generate, prompt]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            handleGenerate();
        }
    }, [handleGenerate]);

    const handleExample = useCallback((ex: string) => {
        setPrompt(ex);
    }, []);

    const hasKey = !!apiKey?.trim();
    const canRun = hasKey && !!engine && prompt.trim().length > 0 && !state.isGenerating;

    return (
        <div style={styles.panel}>
            {/* Header */}
            <div style={styles.header}>
                <span style={styles.title}>✨ Auto-Design</span>
                <span style={styles.subtitle}>Describe your banner — AI creates it</span>
            </div>

            {/* Prompt input */}
            <div style={styles.inputWrapper}>
                <textarea
                    id="auto-design-prompt"
                    style={{
                        ...styles.textarea,
                        borderColor: state.isGenerating ? '#1f6feb' : '#30363d',
                        cursor: state.isGenerating ? 'not-allowed' : 'text',
                    }}
                    placeholder="e.g. Summer sale banner with bold orange background, 'UP TO 50% OFF' headline, shop now button..."
                    value={prompt}
                    onChange={e => setPrompt(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={state.isGenerating}
                    rows={3}
                />
                <div style={styles.inputHint}>⌘↵ to generate</div>
            </div>

            {/* Example prompts */}
            {!state.isGenerating && !state.createdCount && (
                <div style={styles.examples}>
                    <div style={styles.examplesLabel}>Try:</div>
                    <div style={styles.examplesList}>
                        {EXAMPLE_PROMPTS.map((ex, i) => (
                            <button
                                key={i}
                                style={styles.exampleChip}
                                onClick={() => handleExample(ex)}
                            >
                                {ex.slice(0, 50)}{ex.length > 50 ? '…' : ''}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Progress */}
            {state.isGenerating && (
                <div style={styles.progressRow}>
                    <span style={styles.spinner} />
                    <span style={styles.progressText}>{state.progress}</span>
                </div>
            )}

            {/* Success */}
            {state.createdCount > 0 && !state.isGenerating && (
                <div style={styles.successBlock}>
                    ✅ {state.createdCount} elements created! Edit freely or generate again.
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
                    opacity: canRun || state.isGenerating ? 1 : 0.4,
                    cursor: canRun ? 'pointer' : state.isGenerating ? 'pointer' : 'not-allowed',
                }}
                onClick={state.isGenerating ? cancel : handleGenerate}
                disabled={!state.isGenerating && !canRun}
            >
                {state.isGenerating ? (
                    <>✕ Cancel</>
                ) : state.createdCount > 0 ? (
                    '↻ Regenerate'
                ) : (
                    '✨ Generate Banner'
                )}
            </button>

            {!hasKey && (
                <div style={styles.noKeyHint}>
                    Set Anthropic API key in the AI Panel settings first
                </div>
            )}

            {!engine && hasKey && (
                <div style={styles.noKeyHint}>
                    Open a banner in the editor to use Auto-Design
                </div>
            )}
        </div>
    );
}

// ── Styles ─────────────────────────────────────────
const styles: Record<string, React.CSSProperties> = {
    panel: {
        background: '#0d1117',
        border: '1px solid #30363d',
        borderRadius: 10,
        padding: '14px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        fontSize: 12,
        color: '#c9d1d9',
        fontFamily: 'Inter, system-ui, sans-serif',
    },
    header: { display: 'flex', flexDirection: 'column', gap: 2 },
    title: { fontWeight: 700, fontSize: 14, color: '#f0f6fc', letterSpacing: -0.3 },
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
        cursor: 'pointer', transition: 'all 0.12s ease',
        lineHeight: 1.4,
    },
    progressRow: {
        display: 'flex', alignItems: 'center', gap: 8,
        background: '#0d1f38', borderRadius: 6, padding: '7px 10px',
    },
    progressText: { color: '#79c0ff', fontSize: 11, fontWeight: 500 },
    successBlock: {
        background: '#0f2a0f', border: '1px solid #238636',
        borderRadius: 6, padding: '7px 10px',
        color: '#3fb950', fontSize: 11, fontWeight: 600,
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
        transition: 'opacity 0.15s ease, transform 0.1s ease',
        letterSpacing: -0.2,
    },
    btnRunning: {
        background: '#21262d', color: '#f85149',
        border: '1px solid #f85149',
    },
    spinner: {
        width: 12, height: 12, borderRadius: '50%',
        border: '2px solid rgba(120,192,255,0.3)', borderTopColor: '#79c0ff',
        animation: 'spin 0.7s linear infinite', display: 'inline-block',
    },
    noKeyHint: { color: '#484f58', fontSize: 10, textAlign: 'center' },
};
