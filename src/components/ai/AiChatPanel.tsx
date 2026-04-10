// ─────────────────────────────────────────────────
// AiChatPanel — Premium Gemini-style AI Chat
// ─────────────────────────────────────────────────
// Gradient background, glow effects, typing animation,
// status indicators (thinking/making/scanning).
// ─────────────────────────────────────────────────

import { useState, useRef, useEffect, useCallback } from 'react';
import type { AgentMessage } from '../../ai/agentContext';
import type { SceneNodeInfo } from '../../ai/agentContext';
import type { AiService, AiConfig } from '../../ai/aiService';
import { generateSuggestions } from '../../ai/suggestions';
import { MessageBubble, SuggestionCard } from './MessageBubble';
import { LiveProgressPanel, type LiveState } from './LiveProgressPanel';
import { usePlanLimits } from '@/hooks/usePlanLimits';
import '@/styles/ai-chat.css';

interface Props {
    aiService: AiService;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    engine: any;
    trackedNodes: SceneNodeInfo[];
    onSendMessage?: (msg: string) => void;
}

export default function AiChatPanel({ aiService, engine, trackedNodes, onSendMessage }: Props) {
    const [messages, setMessages] = useState<AgentMessage[]>([]);
    const [input, setInput] = useState('');
    const [live, setLive] = useState<LiveState>({
        phase: 'idle', canvasScan: '', thinking: '', plan: [], steps: [], reflection: '', streamedText: '', error: '',
    });
    const [showSettings, setShowSettings] = useState(false);
    const [config, setConfig] = useState<AiConfig>(aiService.getConfig());
    const bottomRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const suggestions = generateSuggestions(trackedNodes);
    const { canUseAI, recordAIUsage, remainingTokens, limits } = usePlanLimits();

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, live]);

    const handleSend = useCallback(async (text?: string) => {
        const msg = text ?? input.trim();
        if (!msg) return;

        if (!canUseAI()) {
            const limitMsg: AgentMessage = {
                role: 'assistant',
                content: `You've used all ${limits.aiTokensPerMonth} AI generations this month.\n\nUpgrade to Creator ($15/mo) for 200 generations, or Pro ($50/mo) for 500.\n\n→ Visit Settings or go to /pricing to upgrade.`,
                timestamp: Date.now(),
            };
            setMessages(prev => [...prev, { role: 'user', content: msg, timestamp: Date.now() }, limitMsg]);
            return;
        }

        setInput('');
        onSendMessage?.(msg);
        const userMsg: AgentMessage = { role: 'user', content: msg, timestamp: Date.now() };
        setMessages(prev => [...prev, userMsg]);

        setLive({ phase: 'scanning', canvasScan: '', thinking: '', plan: [], steps: [], reflection: '', streamedText: '', error: '' });

        await aiService.chat(msg, engine, {
            onCanvasScan: (summary) => setLive(prev => ({ ...prev, phase: 'scanning', canvasScan: summary })),
            onThinking: (c) => setLive(prev => ({ ...prev, phase: 'thinking', thinking: c })),
            onPlan: (steps) => setLive(prev => ({
                ...prev, phase: 'planning', plan: steps,
                steps: steps.map(s => ({ name: s, params: {}, status: 'pending' as const })),
            })),
            onStepStart: (i, name, params) => setLive(prev => {
                const steps = [...prev.steps];
                if (steps[i]) steps[i] = { ...steps[i]!, name, params, status: 'running' };
                return { ...prev, phase: 'executing', steps };
            }),
            onStepComplete: (i, result) => setLive(prev => {
                const steps = [...prev.steps];
                if (steps[i]) steps[i] = { ...steps[i]!, result, status: result.success ? 'done' : 'error' };
                return { ...prev, steps };
            }),
            onReflection: (c) => setLive(prev => ({ ...prev, phase: 'reflecting', reflection: c })),
            onToken: (t) => setLive(prev => ({ ...prev, streamedText: prev.streamedText + t })),
            onComplete: (assistantMsg) => {
                setMessages(prev => [...prev, assistantMsg]);
                setLive(prev => ({ ...prev, phase: 'done' }));
            },
            onError: (e) => setLive(prev => ({ ...prev, phase: 'error', error: e })),
        });

        // ★ Always record AI usage after chat completes (regardless of success/error path)
        console.log('[AiChatPanel] AI chat completed — recording usage');
        recordAIUsage(1);
    }, [input, aiService, engine, onSendMessage, canUseAI, recordAIUsage]);

    useEffect(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window as any).__aceSendMessage = (msg: string) => { void handleSend(msg); return 'sent'; };
        return () => { delete (window as any).__aceSendMessage; };
    }, [handleSend]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleSaveConfig = () => {
        aiService.updateConfig(config);
        setShowSettings(false);
    };

    const isProcessing = live.phase !== 'idle' && live.phase !== 'done' && live.phase !== 'error';

    return (
        <div className="ai-panel">
            {/* Ambient glow background */}
            <div className="ai-glow-bg" />

            {/* Header */}
            <div className="ai-header">
                <div className="ai-header-left">
                    <div className="ai-logo-orb">
                        <div className={`ai-orb-inner ${isProcessing ? 'pulsing' : ''}`} />
                    </div>
                    <div className="ai-header-text">
                        <span className="ai-header-title">ACE AI</span>
                        <span className="ai-header-subtitle">Canvas Editor</span>
                    </div>
                </div>
                <div className="ai-header-actions">
                    <button className="ai-header-btn" onClick={() => setShowSettings(!showSettings)}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
                            <circle cx="12" cy="12" r="3" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Settings */}
            {showSettings && (
                <div className="ai-settings">
                    <label className="ai-settings-label">
                        API Endpoint
                        <input
                            className="ai-settings-input"
                            value={config.endpoint}
                            onChange={e => setConfig(c => ({ ...c, endpoint: e.target.value }))}
                            placeholder="https://api.openai.com/v1"
                        />
                    </label>
                    <label className="ai-settings-label">
                        Model
                        <input
                            className="ai-settings-input"
                            value={config.model}
                            onChange={e => setConfig(c => ({ ...c, model: e.target.value }))}
                            placeholder="gpt-4o"
                        />
                    </label>
                    <button className="ai-settings-save" onClick={handleSaveConfig}>Save</button>
                </div>
            )}

            {/* Messages */}
            <div className="ai-messages">
                {messages.length === 0 && live.phase === 'idle' && (
                    <div className="ai-empty-state">
                        <div className="ai-empty-orb-container">
                            <div className="ai-empty-orb" />
                        </div>
                        <h3 className="ai-empty-title">What can I help you create?</h3>
                        <p className="ai-empty-desc">I can design, modify, and animate elements on your canvas.</p>
                        <div className="ai-suggestion-grid">
                            {suggestions.map(s => (
                                <SuggestionCard key={s.id} suggestion={s} onAction={(prompt) => handleSend(prompt)} />
                            ))}
                        </div>
                    </div>
                )}

                {(() => {
                    const hasProgress = live.phase !== 'idle';
                    const lastMsg = messages[messages.length - 1];
                    const holdLastReply = hasProgress && live.phase === 'done' && lastMsg?.role === 'assistant';
                    const visibleMessages = holdLastReply ? messages.slice(0, -1) : messages;
                    return (
                        <>
                            {visibleMessages.map((msg, i) => (
                                <MessageBubble key={i} message={msg} />
                            ))}
                            {hasProgress && <LiveProgressPanel live={live} />}
                            {holdLastReply && lastMsg && (
                                <MessageBubble key="final-reply" message={lastMsg} />
                            )}
                        </>
                    );
                })()}

                {live.phase === 'error' && (
                    <div className="ai-error-bubble">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" /><path d="M15 9l-6 6M9 9l6 6" />
                        </svg>
                        {live.error}
                    </div>
                )}

                <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="ai-input-area">
                <div className="ai-input-wrapper">
                    <input
                        ref={inputRef}
                        className="ai-input-field"
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={!aiService.isConfigured() ? 'Set API key in Settings first' : `Ask anything... (${remainingTokens.toLocaleString()} generations left)`}
                        disabled={isProcessing}
                    />
                    <button
                        className={`ai-send-btn ${input.trim() ? 'active' : ''}`}
                        onClick={() => handleSend()}
                        disabled={!input.trim() || isProcessing}
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
                        </svg>
                    </button>
                </div>
                <span className="ai-input-hint">
                    {live.phase === 'idle' || live.phase === 'done' || live.phase === 'error'
                        ? `Claude Sonnet 4 · ${config.model}`
                        : ''}
                </span>
            </div>
        </div>
    );
}
