// ─────────────────────────────────────────────────
// AI Chat Panel — Live Progress, @Mentions, Commands
// ─────────────────────────────────────────────────

import { useState, useRef, useEffect, useCallback, type CSSProperties } from 'react';
import type { AgentMessage, AgentPhase, SceneNodeInfo } from '../../ai/agentContext';
import type { ExecutionResult } from '../../ai/commandExecutor';
import type { AiService, AiConfig } from '../../ai/aiService';
import { generateSuggestions, type Suggestion } from '../../ai/suggestions';

interface Props {
    aiService: AiService;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    engine: any;
    trackedNodes: SceneNodeInfo[];
    onSendMessage?: (msg: string) => void;
}

interface LiveState {
    phase: 'idle' | 'scanning' | 'thinking' | 'planning' | 'executing' | 'reflecting' | 'done' | 'error';
    canvasScan: string;
    thinking: string;
    plan: string[];
    steps: { name: string; params: Record<string, unknown>; result?: ExecutionResult; status: 'pending' | 'running' | 'done' | 'error' }[];
    reflection: string;
    streamedText: string;
    error: string;
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

        // Add user message
        const userMsg: AgentMessage = { role: 'user', content: msg, timestamp: Date.now() };
        setMessages(prev => [...prev, userMsg]);

        // Reset live state
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
                    <span style={{ fontSize: 16 }}>🤖</span>
                    <span style={{ fontWeight: 600, fontSize: 14, letterSpacing: -0.3 }}>ACE AI Agent</span>
                </div>
                <button onClick={() => setShowSettings(!showSettings)} style={iconBtnStyle}>⚙️</button>
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
                    <label style={labelStyle}>
                        API Key
                        <input
                            value={config.apiKey}
                            onChange={e => setConfig(c => ({ ...c, apiKey: e.target.value }))}
                            style={settingsInputStyle}
                            type="password"
                            placeholder="sk-..."
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
                        <div style={{ fontSize: 28, marginBottom: 8 }}>🧠</div>
                        <div style={{ fontSize: 13, marginBottom: 16 }}>Ask me to create, modify, or animate elements on your canvas.</div>

                        {/* Suggestions */}
                        {suggestions.map(s => (
                            <SuggestionCard key={s.id} suggestion={s} onAction={(prompt) => handleSend(prompt)} />
                        ))}
                    </div>
                )}

                {/* Conversation — show messages, but hold back the latest assistant reply when progress is visible */}
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

                            {/* Live Progress — persists after completion */}
                            {hasProgress && (
                                <LiveProgressPanel live={live} />
                            )}

                            {/* Last assistant reply appears AFTER progress */}
                            {holdLastReply && lastMsg && (
                                <MessageBubble key="final-reply" message={lastMsg} />
                            )}
                        </>
                    );
                })()}

                {/* Error */}
                {live.phase === 'error' && (
                    <div style={{ ...bubbleBase, background: 'rgba(248,81,73,0.1)', borderColor: 'rgba(248,81,73,0.3)', color: '#f85149' }}>
                        ❌ {live.error}
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
                    placeholder={aiService.isConfigured() ? "Ask anything... (⌘K)" : "Set API key in ⚙️ first"}
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

// ── Sub Components ───────────────────────────────

function MessageBubble({ message }: { message: AgentMessage }) {
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

/** Typewriter animation — reveals text char-by-char with a blinking cursor */
function TypewriterText({ text, speed = 15, style, showCursor = true }: {
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
        // Variable speed: pause on punctuation/newlines, fast on normal chars
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

// ── Natural language labels for tool names ──────
const TOOL_LABELS: Record<string, string> = {
    add_rect: 'Creating a rectangle',
    add_ellipse: 'Creating a circle / ellipse',
    add_text: 'Adding text element',
    add_line: 'Drawing a line',
    add_path: 'Drawing a path',
    add_group: 'Creating a group',
    set_fill: 'Setting fill color',
    set_stroke: 'Setting stroke / border',
    set_opacity: 'Adjusting opacity',
    set_corner_radius: 'Rounding corners',
    set_shadow: 'Adding drop shadow',
    set_blur: 'Applying blur effect',
    set_gradient: 'Applying gradient',
    set_blend_mode: 'Changing blend mode',
    move_node: 'Moving element',
    resize_node: 'Resizing element',
    rotate_node: 'Rotating element',
    delete_node: 'Deleting element',
    duplicate_node: 'Duplicating element',
    rename_node: 'Renaming element',
    set_visible: 'Toggling visibility',
    set_locked: 'Toggling lock state',
    select_node: 'Selecting element',
    select_all: 'Selecting all elements',
    deselect_all: 'Clearing selection',
    group_selection: 'Grouping selected elements',
    ungroup_selection: 'Ungrouping elements',
    bring_to_front: 'Moving to front',
    send_to_back: 'Moving to back',
    undo: 'Undoing last action',
    redo: 'Redoing action',
    animate_node: 'Adding animation',
    set_animation: 'Configuring animation',
    create_layout: 'Creating a layout',
    animate_all: 'Animating all elements',
    analyze_scene: 'Analyzing current scene',
};

function humanizeToolCall(rawName: string, params: Record<string, unknown>): string {
    const base = TOOL_LABELS[rawName];
    if (base) return base;
    // fallback: capitalize and replace underscores
    return rawName.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function humanizePlanStep(raw: string): string {
    // raw looks like: add_rect({"x":150,"y":150,...})
    const match = raw.match(/^(\w+)\((.*)\)$/);
    if (!match) return raw;
    const [, toolName] = match;
    const label = TOOL_LABELS[toolName ?? ''];
    if (label) return label;
    return (toolName ?? raw).replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

// ── Build rich detail text for execution steps ──

function buildRichStepDetail(
    step: { name: string; params: Record<string, unknown>; result?: { success: boolean; message: string; nodeId?: number }; status: string }
): string {
    const parts: string[] = [];
    const p = step.params;

    // Position info
    if (p.x !== undefined && p.y !== undefined) {
        parts.push(`📍 Position: (${p.x}, ${p.y})`);
    }
    // Size info
    if (p.width !== undefined && p.height !== undefined) {
        parts.push(`📐 Size: ${p.width}×${p.height}`);
    }
    // Color info
    if (p.color) {
        parts.push(`🎨 Color: ${p.color}`);
    }
    if (p.fill) {
        parts.push(`🎨 Fill: ${p.fill}`);
    }
    // Radius
    if (p.radius !== undefined) {
        parts.push(`⬜ Corner radius: ${p.radius}px`);
    }
    // Shadow
    if (p.blur !== undefined || p.offset_x !== undefined) {
        const blur = p.blur ?? 0;
        const ox = p.offset_x ?? 0;
        const oy = p.offset_y ?? 0;
        parts.push(`🌑 Shadow: blur ${blur}, offset (${ox}, ${oy})`);
    }
    // Opacity
    if (p.opacity !== undefined) {
        parts.push(`👁 Opacity: ${Number(p.opacity) * 100}%`);
    }
    // Text content
    if (p.text) {
        const txt = String(p.text);
        parts.push(`📝 Text: "${txt.length > 40 ? txt.slice(0, 40) + '...' : txt}"`);
    }
    // Font size
    if (p.font_size !== undefined) {
        parts.push(`🔤 Font size: ${p.font_size}px`);
    }
    // Node target
    if (p.node_id !== undefined) {
        parts.push(`🎯 Target: node #${p.node_id}`);
    }

    // Running state
    if (step.status === 'running') {
        parts.push(parts.length > 0 ? '\n⏳ Executing...' : '⏳ Working on it...');
    }

    // Completed result
    if (step.result) {
        const icon = step.result.success ? '✅' : '❌';
        parts.push(`${icon} ${step.result.message}`);
    }

    return parts.length > 0 ? parts.join('\n') : (step.status === 'running' ? 'Working on it...' : 'Waiting...');
}

function LiveProgressPanel({ live }: { live: LiveState }) {
    const [collapsed, setCollapsed] = useState(false);

    // Build ordered progress entries
    const entries: { label: string; detail: string; status: 'active' | 'done' | 'error' }[] = [];

    // 1. Canvas scan
    if (live.canvasScan || live.phase !== 'idle') {
        entries.push({
            label: 'Scanned canvas',
            detail: live.canvasScan || 'Reading current canvas state...',
            status: live.phase === 'scanning' ? 'active' : 'done',
        });
    }

    // 2. Thinking
    if (live.phase === 'thinking' || live.plan.length > 0 || live.steps.length > 0 || live.reflection) {
        entries.push({
            label: 'Analyzing your request',
            detail: live.thinking || 'Understanding what you want...',
            status: live.phase === 'thinking' ? 'active' : 'done',
        });
    }

    // 3. Plan
    if (live.plan.length > 0) {
        entries.push({
            label: `Planning ${live.plan.length} step${live.plan.length > 1 ? 's' : ''}`,
            detail: live.plan.map((s, i) => `${i + 1}. ${humanizePlanStep(s)}`).join('\n'),
            status: live.phase === 'planning' ? 'active' : 'done',
        });
    }

    // 4. Execution steps — with rich detail from params
    for (const step of live.steps) {
        if (step.status !== 'pending') {
            const richDetail = buildRichStepDetail(step);
            entries.push({
                label: humanizeToolCall(step.name, step.params),
                detail: richDetail,
                status: step.status === 'running' ? 'active' : step.status === 'done' ? 'done' : 'error',
            });
        }
    }

    // 5. Reflection — omitted because the AI response text below already contains this

    const isActive = live.phase !== 'done' && live.phase !== 'idle' && live.phase !== 'error';

    return (
        <div style={progressCardStyle}>
            {/* Header */}
            <div style={progressHeaderStyle}>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#8b949e', letterSpacing: 0.3, textTransform: 'uppercase' }}>
                    Progress Updates
                </span>
                <button
                    onClick={() => setCollapsed(c => !c)}
                    style={{ background: 'none', border: 'none', color: '#4a9eff', fontSize: 11, cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}
                >
                    {collapsed ? 'Expand all' : 'Collapse all'}
                </button>
            </div>

            {/* Steps */}
            {!collapsed && (
                <div style={{ padding: '8px 14px 4px' }}>
                    {entries.map((entry, i) => (
                        <ProgressEntry key={i} index={i + 1} entry={entry} />
                    ))}
                </div>
            )}

            {/* Generating indicator */}
            {isActive && (
                <div style={generatingStyle}>
                    <Spinner />
                    <span>Generating.</span>
                </div>
            )}
        </div>
    );
}

function ProgressEntry({ index, entry }: {
    index: number;
    entry: { label: string; detail: string; status: 'active' | 'done' | 'error' };
}) {
    const [expanded, setExpanded] = useState(true);

    return (
        <div style={{ marginBottom: 14 }}>
            {/* Step header */}
            <div
                onClick={() => setExpanded(e => !e)}
                style={{
                    display: 'flex', alignItems: 'flex-start', gap: 10,
                    cursor: 'pointer', userSelect: 'none',
                }}
            >
                {/* Plain number */}
                <span style={{
                    fontSize: 13, fontWeight: 600, color: '#484f58',
                    minWidth: 16, textAlign: 'right', lineHeight: '20px',
                    flexShrink: 0,
                }}>
                    {index}
                </span>

                {/* Bold label */}
                <span style={{
                    flex: 1, fontSize: 14, fontWeight: 600, color: '#e6edf3',
                    lineHeight: '20px',
                }}>
                    {entry.label}
                </span>

                {/* Collapse chevron */}
                <svg
                    width={12} height={12} viewBox="0 0 12 12"
                    style={{
                        marginTop: 4, flexShrink: 0, color: '#484f58',
                        transform: expanded ? 'rotate(0deg)' : 'rotate(-90deg)',
                        transition: 'transform 0.15s ease',
                    }}
                >
                    <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth={1.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            </div>

            {/* Detail text — typewriter for active steps, static for done */}
            {expanded && (
                entry.status === 'active'
                    ? <TypewriterText
                        text={entry.detail}
                        speed={10}
                        showCursor={false}
                        style={{
                            marginLeft: 26, marginTop: 6,
                            fontSize: 12.5, lineHeight: 1.65, color: '#8b949e',
                        }}
                    />
                    : <div style={{
                        marginLeft: 26, marginTop: 6,
                        fontSize: 12.5, lineHeight: 1.65, color: '#8b949e',
                        whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                    }}>
                        {entry.detail}
                    </div>
            )}
        </div>
    );
}

function DotLoader() {
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

function Spinner() {
    return (
        <svg width={14} height={14} viewBox="0 0 14 14" style={{ animation: 'spin 1s linear infinite', flexShrink: 0 }}>
            <circle cx={7} cy={7} r={5.5} stroke="rgba(74,158,255,0.2)" strokeWidth={1.5} fill="none" />
            <path d="M 7 1.5 A 5.5 5.5 0 0 1 12.5 7" stroke="#4a9eff" strokeWidth={1.5} fill="none" strokeLinecap="round" />
        </svg>
    );
}


function SuggestionCard({ suggestion, onAction }: { suggestion: Suggestion; onAction: (prompt: string) => void }) {
    const icon = suggestion.type === 'improvement' ? '💡' : suggestion.type === 'warning' ? '⚠️' : '✨';
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

// ── Styles ───────────────────────────────────────

const panelStyle: CSSProperties = {
    display: 'flex', flexDirection: 'column',
    height: '100%', width: '100%',
    background: '#0d1117',
    borderLeft: '1px solid rgba(255,255,255,0.06)',
    fontFamily: 'Inter, system-ui, sans-serif',
    color: '#e6edf3',
};

const headerStyle: CSSProperties = {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '10px 14px',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    background: 'rgba(255,255,255,0.02)',
};

const iconBtnStyle: CSSProperties = {
    background: 'none', border: 'none', cursor: 'pointer',
    fontSize: 16, padding: 4,
};

const settingsStyle: CSSProperties = {
    padding: '12px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)',
    background: 'rgba(255,255,255,0.02)', display: 'flex', flexDirection: 'column', gap: 8,
};

const labelStyle: CSSProperties = {
    fontSize: 11, color: '#8b949e', display: 'flex', flexDirection: 'column', gap: 3,
};

const settingsInputStyle: CSSProperties = {
    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 6, padding: '5px 8px', color: '#e6edf3', fontSize: 12,
    fontFamily: 'monospace', outline: 'none',
};

const saveBtnStyle: CSSProperties = {
    background: 'rgba(74,158,255,0.15)', border: '1px solid rgba(74,158,255,0.3)',
    borderRadius: 6, padding: '5px 12px', color: '#4a9eff', fontSize: 12,
    cursor: 'pointer', alignSelf: 'flex-end',
};

const messagesStyle: CSSProperties = {
    flex: 1, overflowY: 'auto', padding: '12px',
    display: 'flex', flexDirection: 'column', gap: 8,
};

const bubbleBase: CSSProperties = {
    padding: '10px 14px', borderRadius: 10,
    border: '1px solid rgba(255,255,255,0.06)',
};

const progressCardStyle: CSSProperties = {
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: 10,
    alignSelf: 'flex-start',
    width: '100%',
    overflow: 'hidden',
};

const progressHeaderStyle: CSSProperties = {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '8px 14px',
    borderBottom: '1px solid rgba(255,255,255,0.04)',
};

const generatingStyle: CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '10px 14px',
    borderTop: '1px solid rgba(255,255,255,0.04)',
    fontSize: 12, color: '#8b949e',
    fontStyle: 'italic',
};

const inputContainerStyle: CSSProperties = {
    display: 'flex', gap: 6, padding: '10px 12px',
    borderTop: '1px solid rgba(255,255,255,0.06)',
    background: 'rgba(255,255,255,0.02)',
};

const inputFieldStyle: CSSProperties = {
    flex: 1, background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8,
    padding: '8px 12px', color: '#e6edf3', fontSize: 13,
    fontFamily: 'inherit', outline: 'none',
};

const sendBtnStyle: CSSProperties = {
    width: 34, height: 34, borderRadius: 8,
    background: 'rgba(74,158,255,0.2)', border: '1px solid rgba(74,158,255,0.3)',
    color: '#4a9eff', fontSize: 18, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
};
