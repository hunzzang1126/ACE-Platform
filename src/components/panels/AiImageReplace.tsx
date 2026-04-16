// ─────────────────────────────────────────────────
// AiImageReplace — Inline AI image replacement for property panel
// ─────────────────────────────────────────────────
// Two variants:
//   AiImageReplaceSection  — for engine nodes (Fabric.js images)
//   AiOverlayReplaceSection — for overlay elements (uploaded images)
// ─────────────────────────────────────────────────

import { useState } from 'react';
import { Section } from '@/components/panels/PropertyFields';
import type { CanvasEngineActions } from '@/hooks/canvasTypes';

// ── Shared Replace UI ──

const INPUT_STYLE: React.CSSProperties = {
    flex: 1, padding: '6px 10px',
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(99,102,241,0.3)', borderRadius: 6,
    color: '#e2e8f0', fontSize: 12,
    outline: 'none', fontFamily: 'inherit',
};

function ReplaceButton({ loading, disabled, onClick }: { loading: boolean; disabled: boolean; onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            style={{
                padding: '6px 12px',
                background: loading ? 'rgba(99,102,241,0.2)' : 'linear-gradient(135deg, #6366f1, #2dd4bf)',
                border: 'none', borderRadius: 6,
                color: '#fff', fontSize: 11, fontWeight: 600,
                cursor: loading ? 'wait' : 'pointer',
                whiteSpace: 'nowrap', opacity: (disabled && !loading) ? 0.5 : 1,
            }}
        >
            {loading ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'spin 1s linear infinite' }}>
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>
            ) : 'Replace'}
        </button>
    );
}

async function callImageGen(prompt: string, w: number, h: number) {
    const { generateBackgroundImage } = await import('@/services/imageGenClient');
    return generateBackgroundImage(prompt, Math.max(w, 256), Math.max(h, 256), [], new AbortController().signal);
}

// ── Engine Node Version ──

interface AiReplaceProps {
    nodeId: number;
    nodeW: number;
    nodeH: number;
    canvasWidth: number;
    canvasHeight: number;
    actions: CanvasEngineActions;
}

export function AiImageReplaceSection({ nodeId, nodeW, nodeH, canvasWidth, canvasHeight, actions }: AiReplaceProps) {
    const [prompt, setPrompt] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleReplace = async () => {
        const trimmed = prompt.trim();
        if (!trimmed || loading) return;
        setLoading(true);
        setError('');

        try {
            const result = await callImageGen(trimmed, nodeW, nodeH);
            if (result.success && result.imageUrl) {
                const x = (actions as any).getNodePosition?.(nodeId)?.x ?? Math.round((canvasWidth - nodeW) / 2);
                const y = (actions as any).getNodePosition?.(nodeId)?.y ?? Math.round((canvasHeight - nodeH) / 2);
                actions.deleteNode(nodeId);
                await actions.addImage(x, y, result.imageUrl, nodeW, nodeH);
                setPrompt('');
            } else {
                setError(result.message || 'Image generation failed');
            }
        } catch (err) {
            console.error('[AiReplace] Failed:', err);
            setError('Generation failed. Try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Section label="AI Replace">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', gap: 4 }}>
                    <input
                        type="text" value={prompt}
                        onChange={e => setPrompt(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleReplace(); }}
                        placeholder="Describe replacement..."
                        disabled={loading} style={INPUT_STYLE}
                    />
                    <ReplaceButton loading={loading} disabled={loading || !prompt.trim()} onClick={handleReplace} />
                </div>
                {error && <span style={{ fontSize: 10, color: '#f87171' }}>{error}</span>}
                <span style={{ fontSize: 10, color: '#64748b' }}>Enter to generate + replace at same position</span>
            </div>
        </Section>
    );
}

// ── Overlay Version ──

interface AiOverlayReplaceProps {
    overlayW: number;
    overlayH: number;
    onReplace: (newSrc: string) => void;
}

export function AiOverlayReplaceSection({ overlayW, overlayH, onReplace }: AiOverlayReplaceProps) {
    const [prompt, setPrompt] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleReplace = async () => {
        const trimmed = prompt.trim();
        if (!trimmed || loading) return;
        setLoading(true);
        setError('');

        try {
            const result = await callImageGen(trimmed, overlayW, overlayH);
            if (result.success && result.imageUrl) {
                onReplace(result.imageUrl);
                setPrompt('');
            } else {
                setError(result.message || 'Image generation failed');
            }
        } catch (err) {
            console.error('[AiOverlayReplace] Failed:', err);
            setError('Generation failed. Try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Section label="AI Replace">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', gap: 4 }}>
                    <input
                        type="text" value={prompt}
                        onChange={e => setPrompt(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleReplace(); }}
                        placeholder="Describe replacement..."
                        disabled={loading} style={INPUT_STYLE}
                    />
                    <ReplaceButton loading={loading} disabled={loading || !prompt.trim()} onClick={handleReplace} />
                </div>
                {error && <span style={{ fontSize: 10, color: '#f87171' }}>{error}</span>}
                <span style={{ fontSize: 10, color: '#64748b' }}>Enter to generate + replace at same position</span>
            </div>
        </Section>
    );
}
