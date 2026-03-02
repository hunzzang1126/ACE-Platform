// ─────────────────────────────────────────────────
// MessageBubble — Chat bubble + TypewriterText + SuggestionCard
// ─────────────────────────────────────────────────

import { useState, useRef, useEffect, type CSSProperties } from 'react';
import type { AgentMessage } from '../../ai/agentContext';
import type { Suggestion } from '../../ai/suggestions';
import { bubbleBase } from './aiChatStyles';

// ── Message Bubble ──

export function MessageBubble({ message }: { message: AgentMessage }) {
    const isUser = message.role === 'user';

    if (isUser) {
        return (
            <div style={{
                ...bubbleBase,
                alignSelf: 'flex-end',
                background: 'rgba(74,158,255,0.12)',
                borderColor: 'rgba(74,158,255,0.2)',
                maxWidth: '85%',
            }}>
                <div style={{ fontSize: 13, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{message.content}</div>
            </div>
        );
    }

    // AI response — flat text with typewriter effect
    return (
        <div style={{
            alignSelf: 'flex-start',
            width: '100%',
            padding: '6px 2px',
        }}>
            <TypewriterText text={message.content} speed={15} />
        </div>
    );
}

// ── Typewriter Text ──

/** Typewriter animation — reveals text char-by-char with a blinking cursor */
export function TypewriterText({ text, speed = 15, style, showCursor = true }: {
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
        <div ref={containerRef} style={{
            fontSize: 14, lineHeight: 1.8, color: '#e6edf3',
            whiteSpace: 'pre-wrap', wordBreak: 'break-word',
            letterSpacing: '0.01em',
            ...style,
        }}>
            {text.slice(0, displayed)}
            {showCursor && !done && <span style={{
                display: 'inline-block',
                width: 2, height: '1em',
                background: '#4a9eff',
                marginLeft: 1,
                verticalAlign: 'text-bottom',
                animation: 'cursorBlink 0.8s step-end infinite',
            }} />}
        </div>
    );
}

// ── Suggestion Card ──

export function SuggestionCard({ suggestion, onAction }: { suggestion: Suggestion; onAction: (prompt: string) => void }) {
    const icon = suggestion.type === 'improvement' ? '' : suggestion.type === 'warning' ? '[Warning]' : '';
    return (
        <div
            onClick={() => suggestion.action && onAction(suggestion.action.prompt)}
            style={{
                background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: 8, padding: '10px 12px', marginBottom: 6, textAlign: 'left',
                cursor: suggestion.action ? 'pointer' : 'default',
                transition: 'background 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
        >
            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 3 }}>{icon} {suggestion.title}</div>
            <div style={{ fontSize: 11, color: '#8b949e' }}>{suggestion.description}</div>
            {suggestion.action && (
                <div style={{ fontSize: 11, color: '#4a9eff', marginTop: 4 }}>→ {suggestion.action.label}</div>
            )}
        </div>
    );
}

// ── Micro-components ──

export function DotLoader() {
    return (
        <span style={{ display: 'inline-flex', gap: 2, marginLeft: 6, verticalAlign: 'middle' }}>
            {[0, 1, 2].map(i => (
                <span key={i} style={{
                    width: 3, height: 3, borderRadius: '50%', background: '#8b949e',
                    animation: `dotFade 1.4s ease-in-out ${i * 0.16}s infinite`,
                }} />
            ))}
            <style>{`
                @keyframes dotFade { 0%, 80%, 100% { opacity: 0.2; } 40% { opacity: 1; } }
                @keyframes spin { to { transform: rotate(360deg); } }
                @keyframes cursorBlink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
            `}</style>
        </span>
    );
}

export function Spinner() {
    return (
        <svg width={14} height={14} viewBox="0 0 14 14" style={{ animation: 'spin 1s linear infinite', flexShrink: 0 }}>
            <circle cx={7} cy={7} r={5.5} stroke="rgba(74,158,255,0.2)" strokeWidth={1.5} fill="none" />
            <path d="M 7 1.5 A 5.5 5.5 0 0 1 12.5 7" stroke="#4a9eff" strokeWidth={1.5} fill="none" strokeLinecap="round" />
        </svg>
    );
}
