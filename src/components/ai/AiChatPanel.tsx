// ─────────────────────────────────────────────────
// AI Chat Panel — Live Progress, @Mentions, Commands
// ─────────────────────────────────────────────────

import { useState, useRef, useEffect, useCallback } from 'react';
import type { AgentMessage } from '../../ai/agentContext';
import type { SceneNodeInfo } from '../../ai/agentContext';
import type { AiService, AiConfig } from '../../ai/aiService';
import { generateSuggestions } from '../../ai/suggestions';
import { MessageBubble, SuggestionCard } from './MessageBubble';
import { LiveProgressPanel, type LiveState } from './LiveProgressPanel';
import {
    panelStyle, headerStyle, iconBtnStyle, settingsStyle,
    labelStyle, settingsInputStyle, saveBtnStyle,
    messagesStyle, bubbleBase,
    inputContainerStyle, inputFieldStyle, sendBtnStyle,
} from './aiChatStyles';

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

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, live]);

    const handleSend = useCallback(async (text?: string) => {
        const msg = text ?? input.trim();
        if (!msg) return;

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
    }, [input, aiService, engine, onSendMessage]);

    // Expose for browser automation / testing (fire-and-forget)
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

    // ── Render ───────────────────────────────────────
    return (
        <div style={panelStyle}>
            {/* Header */}
            <div style={headerStyle}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 16 }}></span>
                    <span style={{ fontWeight: 600, fontSize: 14, letterSpacing: -0.3 }}>ACE AI Agent</span>
                </div>
                <button onClick={() => setShowSettings(!showSettings)} style={iconBtnStyle}>Settings</button>
            </div>

            {/* Settings Panel */}
            {showSettings && (
                <div style={settingsStyle}>
                    <label style={labelStyle}>
                        API Endpoint
                        <input
                            value={config.endpoint}
                            onChange={e => setConfig(c => ({ ...c, endpoint: e.target.value }))}
                            style={settingsInputStyle}
                            placeholder="https://api.openai.com/v1"
                        />
                    </label>
                    <label style={labelStyle}>
                        Model
                        <input
                            value={config.model}
                            onChange={e => setConfig(c => ({ ...c, model: e.target.value }))}
                            style={settingsInputStyle}
                            placeholder="gpt-4o"
                        />
                    </label>
                    <button onClick={handleSaveConfig} style={saveBtnStyle}>Save</button>
                </div>
            )}

            {/* Message List */}
            <div style={messagesStyle}>
                {/* Empty state */}
                {messages.length === 0 && live.phase === 'idle' && (
                    <div style={{ padding: '24px 16px', textAlign: 'center', color: '#8b949e' }}>
                        <div style={{ fontSize: 28, marginBottom: 8 }}></div>
                        <div style={{ fontSize: 13, marginBottom: 16 }}>Ask me to create, modify, or animate elements on your canvas.</div>

                        {suggestions.map(s => (
                            <SuggestionCard key={s.id} suggestion={s} onAction={(prompt) => handleSend(prompt)} />
                        ))}
                    </div>
                )}

                {/* Conversation */}
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

                            {hasProgress && (
                                <LiveProgressPanel live={live} />
                            )}

                            {holdLastReply && lastMsg && (
                                <MessageBubble key="final-reply" message={lastMsg} />
                            )}
                        </>
                    );
                })()}

                {/* Error */}
                {live.phase === 'error' && (
                    <div style={{ ...bubbleBase, background: 'rgba(248,81,73,0.1)', borderColor: 'rgba(248,81,73,0.3)', color: '#f85149' }}>
                        [Error] {live.error}
                    </div>
                )}

                <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div style={inputContainerStyle}>
                <input
                    ref={inputRef}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={aiService.isConfigured() ? "Ask anything... (Cmd+K)" : "Set API key in Settings first"}
                    disabled={live.phase !== 'idle' && live.phase !== 'done' && live.phase !== 'error'}
                    style={inputFieldStyle}
                />
                <button
                    onClick={() => handleSend()}
                    disabled={!input.trim() || (live.phase !== 'idle' && live.phase !== 'done' && live.phase !== 'error')}
                    style={sendBtnStyle}
                >
                    ↑
                </button>
            </div>
        </div>
    );
}
