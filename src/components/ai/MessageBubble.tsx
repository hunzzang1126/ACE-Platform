import { useState, useRef, useEffect, type CSSProperties } from 'react';
import type { AgentMessage } from '../../ai/agentContext';
import type { Suggestion } from '../../ai/suggestions';
import { promoteToSkill } from '../../ai/skillRegistry';

// ── Message Bubble ──

export function MessageBubble({ message }: { message: AgentMessage }) {
    const isUser = message.role === 'user';

    if (isUser) {
        return (
            <div className="ai-bubble ai-bubble-user">
                <div className="ai-bubble-content">{message.content}</div>
            </div>
        );
    }

    // Check if this message involved a successful dynamic action
    const dynamicAction = message.toolCalls?.find(
        tc => tc.name === 'execute_dynamic_action' && tc.result?.success
    );

    return (
        <div className="ai-bubble ai-bubble-ai">
            <div className="ai-bubble-avatar">
                <div className="ai-mini-orb" />
            </div>
            <div className="ai-bubble-body">
                <TypewriterText text={message.content} speed={12} />
                {dynamicAction && (
                    <SkillLearnButton
                        code={String((dynamicAction.input as Record<string, unknown>)?.code ?? '')}
                        description={message.content.slice(0, 100)}
                    />
                )}
            </div>
        </div>
    );
}

// ── Typewriter Text ──

export function TypewriterText({ text, speed = 12, style, showCursor = true }: {
    text: string; speed?: number; style?: CSSProperties; showCursor?: boolean;
}) {
    const [displayed, setDisplayed] = useState(0);
    const [done, setDone] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setDisplayed(0);
        setDone(false);
    }, [text]);

    useEffect(() => {
        if (displayed >= text.length) {
            setDone(true);
            return;
        }
        const ch = text[displayed];
        const delay = ch === '\n' ? speed * 3 : '.!?'.includes(ch ?? '') ? speed * 4 : speed;
        const timer = setTimeout(() => {
            setDisplayed(prev => prev + 1);
            containerRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'nearest' });
        }, delay);
        return () => clearTimeout(timer);
    }, [displayed, text, speed]);

    return (
        <div ref={containerRef} className="ai-typewriter" style={style}>
            {text.slice(0, displayed)}
            {showCursor && !done && <span className="ai-cursor" />}
        </div>
    );
}

// ── Suggestion Card ──

export function SuggestionCard({ suggestion, onAction }: { suggestion: Suggestion; onAction: (prompt: string) => void }) {
    return (
        <button
            className="ai-suggestion-card"
            onClick={() => suggestion.action && onAction(suggestion.action.prompt)}
            disabled={!suggestion.action}
        >
            <span className="ai-suggestion-title">{suggestion.title}</span>
            <span className="ai-suggestion-desc">{suggestion.description}</span>
            {suggestion.action && (
                <span className="ai-suggestion-action">{suggestion.action.label}</span>
            )}
        </button>
    );
}

// ── Skill Learn Button (thumbs-up for dynamic actions) ──

function SkillLearnButton({ code, description }: { code: string; description: string }) {
    const [saved, setSaved] = useState(false);
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        if (saved || saving) return;
        setSaving(true);

        // Auto-generate a name from the description
        const autoName = description
            .replace(/[^\w\s]/g, '')
            .split(/\s+/)
            .slice(0, 4)
            .join(' ')
            .trim() || 'Custom Action';

        try {
            await promoteToSkill(
                autoName,
                description,
                `User validated this pattern with thumbs-up`,
                [description.slice(0, 60)],
                code,
            );
            setSaved(true);
        } catch {
            /* ok */
        } finally {
            setSaving(false);
        }
    };

    return (
        <button
            className="ai-skill-learn-btn"
            onClick={handleSave}
            disabled={saved || saving}
            title={saved ? 'Saved as reusable skill' : 'Save this as a reusable skill'}
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                marginTop: 8,
                padding: '4px 10px',
                fontSize: 11,
                color: saved ? '#10b981' : '#94a3b8',
                background: saved ? 'rgba(16,185,129,0.08)' : 'rgba(148,163,184,0.06)',
                border: `1px solid ${saved ? 'rgba(16,185,129,0.2)' : 'rgba(148,163,184,0.1)'}`,
                borderRadius: 6,
                cursor: saved ? 'default' : 'pointer',
                transition: 'all 0.2s ease',
            }}
        >
            {saved ? (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5">
                    <path d="M20 6L9 17l-5-5" />
                </svg>
            ) : (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14zM4 22H2V11h2" />
                </svg>
            )}
            {saving ? 'Saving...' : saved ? 'Skill saved' : 'Save as skill'}
        </button>
    );
}

// ── Micro-components ──

export function DotLoader() {
    return (
        <span className="ai-dot-loader">
            {[0, 1, 2].map(i => (
                <span key={i} className="ai-dot" style={{ animationDelay: `${i * 0.16}s` }} />
            ))}
        </span>
    );
}

export function Spinner() {
    return (
        <svg className="ai-spinner" width={14} height={14} viewBox="0 0 14 14">
            <circle cx={7} cy={7} r={5.5} stroke="rgba(124,58,237,0.15)" strokeWidth={1.5} fill="none" />
            <path d="M 7 1.5 A 5.5 5.5 0 0 1 12.5 7" stroke="url(#ai-spinner-grad)" strokeWidth={1.5} fill="none" strokeLinecap="round" />
            <defs>
                <linearGradient id="ai-spinner-grad">
                    <stop offset="0%" stopColor="#7c3aed" />
                    <stop offset="100%" stopColor="#06b6d4" />
                </linearGradient>
            </defs>
        </svg>
    );
}
