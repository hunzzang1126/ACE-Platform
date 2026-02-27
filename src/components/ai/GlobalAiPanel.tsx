// ─────────────────────────────────────────────────
// GlobalAiPanel — Fixed right sidebar AI Agent (⌘K)
// Docked to right edge, toggleable, no floating chat
// ─────────────────────────────────────────────────

import { useState, useEffect, useRef, useCallback, type CSSProperties } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useDesignStore } from '@/stores/designStore';
import { AiService, type AiConfig } from '@/ai/aiService';
import { DASHBOARD_TOOL_NAMES } from '@/ai/dashboardTools';
import { executeDashboardTool } from '@/ai/dashboardExecutor';
import type { AgentMessage, SceneNodeInfo } from '@/ai/agentContext';
import type { ExecutionResult } from '@/ai/commandExecutor';
import { IcAi, IcSettings, IcSend, IcClose, IcChevronLeft, IcChevronRight, IcLoader, IcCheck, IcError, IcSearch } from '@/components/ui/Icons';
import type { ToolExecutorOverride } from '@/ai/aiService';

// ── Types ────────────────────────────────────────

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

const LIVE_INIT: LiveState = {
    phase: 'idle', canvasScan: '', thinking: '', plan: [],
    steps: [], reflection: '', streamedText: '', error: '',
};

const PANEL_WIDTH = 360;

// ── Component ────────────────────────────────────

export function GlobalAiPanel() {
    const [open, setOpen] = useState(false);
    const [messages, setMessages] = useState<AgentMessage[]>([]);
    const [input, setInput] = useState('');
    const [live, setLive] = useState<LiveState>(LIVE_INIT);
    const [showSettings, setShowSettings] = useState(false);
    const [config, setConfig] = useState<AiConfig>({
        apiKey: '',
        endpoint: 'https://api.anthropic.com',
        model: 'claude-sonnet-4-20250514',
        maxToolRounds: 30,
    });

    const bottomRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const serviceRef = useRef<AiService | null>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const engineRef = useRef<any>(null);

    const location = useLocation();
    const navigate = useNavigate();

    const currentPage = location.pathname.startsWith('/editor/detail') ? 'detail'
        : location.pathname === '/editor' ? 'editor'
            : 'dashboard';

    const contextLabel = currentPage === 'dashboard' ? 'Dashboard'
        : currentPage === 'editor' ? 'Creative Set'
            : 'Canvas Editor';

    // ── ⌘K Toggle ────────────────────────────
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setOpen(prev => !prev);
                setTimeout(() => inputRef.current?.focus(), 150);
            }
            if (e.key === 'Escape' && open) setOpen(false);
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [open]);

    // ── Engine bridge ────────────────────────
    useEffect(() => {
        // @ts-expect-error — global bridge
        const existing = window.__aceGlobalAi ?? {};
        // @ts-expect-error — global bridge
        window.__aceGlobalAi = {
            ...existing,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            setEngine: (e: any) => {
                // e may be a React ref (has .current) or direct engine
                engineRef.current = e?.current ?? e;
            },
        };
    }, []);

    // ── AI Service init ──────────────────────
    useEffect(() => {
        const saved = localStorage.getItem('ace-ai-config');
        if (saved) {
            try {
                const parsed = JSON.parse(saved) as AiConfig;
                setConfig(parsed);
                const svc = new AiService([]);
                svc.updateConfig(parsed);
                serviceRef.current = svc;
            } catch { /* ignore */ }
        }
    }, []);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, live]);

    // ── Context ──────────────────────────────
    const buildContextSummary = useCallback((): string => {
        const cs = useDesignStore.getState().creativeSet;
        const lines: string[] = [`Page: ${currentPage}`];
        if (cs) {
            lines.push(`Set: "${cs.name}"`);
            lines.push(`Variants: ${cs.variants.map(v => `${v.preset.width}x${v.preset.height}`).join(', ')}`);
        }
        if (currentPage === 'detail' && engineRef.current) {
            try { lines.push(`Canvas: ${engineRef.current.node_count?.() ?? 0} elements`); } catch { /* */ }
        }
        return lines.join('\n');
    }, [currentPage]);

    // ── Send ─────────────────────────────────
    const handleSend = useCallback(async (text?: string) => {
        const msg = text ?? input.trim();
        if (!msg) return;

        if (!serviceRef.current) {
            if (!config.apiKey) { setShowSettings(true); return; }
            const svc = new AiService([]);
            svc.updateConfig(config);
            serviceRef.current = svc;
        }

        setInput('');
        const userMsg: AgentMessage = { role: 'user', content: msg, timestamp: Date.now() };
        setMessages(prev => [...prev, userMsg]);
        setLive({ ...LIVE_INIT, phase: 'thinking' });

        // Track whether an error occurred during the agentic loop
        let hadError = '';

        // Build executor override that routes dashboard tools properly
        const dashboardOverride: ToolExecutorOverride = (toolName, params) => {
            console.log(`[GlobalAiPanel] Tool override check: "${toolName}", isDashboardTool=${DASHBOARD_TOOL_NAMES.has(toolName)}, allNames=[${Array.from(DASHBOARD_TOOL_NAMES).join(',')}]`);
            if (DASHBOARD_TOOL_NAMES.has(toolName)) {
                const result = executeDashboardTool(toolName, params, navigate);
                console.log(`[GlobalAiPanel] Dashboard tool "${toolName}" result:`, result);
                return { success: result.success, message: result.message, data: result.data };
            }
            return null; // Fall through to default executor
        };

        try {
            // Dereference engine — could be a ref wrapper or direct engine
            const engine = engineRef.current?.current ?? engineRef.current;
            console.log('[GlobalAiPanel] Engine for AI:', engine ? 'connected' : 'null');

            // Inject design context so AI knows about the current creative set
            const designState = useDesignStore.getState();
            serviceRef.current.setDesignContext(
                designState.creativeSet ?? null,
                designState.creativeSet?.masterVariantId,
            );

            await serviceRef.current.chat(msg, engine, {
                onCanvasScan: (s: string) => setLive(prev => ({ ...prev, phase: 'scanning', canvasScan: s })),
                onThinking: (t: string) => setLive(prev => ({ ...prev, phase: 'thinking', thinking: t })),
                onPlan: (steps: string[]) => setLive(prev => ({ ...prev, phase: 'planning', plan: steps })),
                onStepStart: (idx: number, name: string, params: Record<string, unknown>) => {
                    setLive(prev => {
                        const steps = [...prev.steps]; steps[idx] = { name, params, status: 'running' };
                        return { ...prev, phase: 'executing', steps };
                    });
                },
                onStepComplete: (idx: number, result: ExecutionResult) => {
                    setLive(prev => {
                        const steps = [...prev.steps]; if (steps[idx]) steps[idx] = { ...steps[idx], result, status: result.success ? 'done' : 'error' };
                        return { ...prev, steps };
                    });
                },
                onReflection: (t: string) => setLive(prev => ({ ...prev, phase: 'reflecting', reflection: t })),
                onToken: (token: string) => setLive(prev => ({ ...prev, streamedText: prev.streamedText + token })),
                onComplete: () => setLive(prev => ({ ...prev, phase: 'done' })),
                onError: (err: string) => {
                    hadError = err;
                    setLive(prev => ({ ...prev, phase: 'error', error: err }));
                },
            }, dashboardOverride);

            // Show the actual reply, or the error, never a blind "Done."
            const reply = serviceRef.current.getLastReply();
            if (reply) {
                setMessages(prev => [...prev, { role: 'assistant', content: reply, timestamp: Date.now() }]);
            } else if (hadError) {
                setMessages(prev => [...prev, { role: 'assistant', content: `⚠️ ${hadError}`, timestamp: Date.now() }]);
            } else {
                setMessages(prev => [...prev, { role: 'assistant', content: 'Request completed.', timestamp: Date.now() }]);
            }
            setLive(prev => ({ ...prev, phase: hadError ? 'error' : 'done' }));
        } catch (err) {
            const errMsg = String(err);
            setMessages(prev => [...prev, { role: 'assistant', content: `⚠️ ${errMsg}`, timestamp: Date.now() }]);
            setLive(prev => ({ ...prev, phase: 'error', error: errMsg }));
        }
    }, [input, config, buildContextSummary, navigate]);

    const saveConfig = useCallback((newConfig: AiConfig) => {
        setConfig(newConfig);
        localStorage.setItem('ace-ai-config', JSON.stringify(newConfig));
        const svc = new AiService([]);
        svc.updateConfig(newConfig);
        serviceRef.current = svc;
        setShowSettings(false);
    }, []);

    const isBusy = live.phase !== 'idle' && live.phase !== 'done' && live.phase !== 'error';

    // ── Render ───────────────────────────────
    return (
        <div style={{ ...wrapperStyle, width: open ? PANEL_WIDTH : 32 }}>
            {/* Toggle tab — always visible */}
            <button
                onClick={() => { setOpen(!open); setTimeout(() => inputRef.current?.focus(), 150); }}
                style={toggleBtnStyle}
                title={open ? 'Close AI (⌘K)' : 'Open AI (⌘K)'}
            >
                {open
                    ? <IcChevronRight size={14} color="#8b949e" />
                    : <IcAi size={16} color="#c9d1d9" />}
            </button>

            {/* Panel content — visible when open */}
            {open && (
                <div style={panelInnerStyle}>
                    {/* Header */}
                    <div style={headerStyle}>
                        <IcAi size={18} color="#c9d1d9" />
                        <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 600, fontSize: 13, color: '#e6edf3' }}>ACE AI</div>
                            <div style={{ fontSize: 10, color: '#6e7681', marginTop: 1 }}>{contextLabel}</div>
                        </div>
                        <button onClick={() => setShowSettings(!showSettings)} style={headerBtnStyle} title="Settings">
                            <IcSettings size={14} color="#6e7681" />
                        </button>
                        <button onClick={() => setOpen(false)} style={headerBtnStyle} title="Close (Esc)">
                            <IcClose size={14} color="#6e7681" />
                        </button>
                    </div>

                    {/* Settings */}
                    {showSettings && (
                        <div style={settingsStyle}>
                            <label style={labelS}>API Key</label>
                            <input type="password" value={config.apiKey}
                                onChange={e => setConfig(prev => ({ ...prev, apiKey: e.target.value }))}
                                style={fieldS} placeholder="sk-..." />
                            <label style={{ ...labelS, marginTop: 8 }}>Model</label>
                            <input value={config.model}
                                onChange={e => setConfig(prev => ({ ...prev, model: e.target.value }))}
                                style={fieldS} />
                            <button onClick={() => saveConfig(config)} style={saveBtnS}>Save</button>
                        </div>
                    )}

                    {/* Messages */}
                    <div style={msgAreaStyle}>
                        {messages.length === 0 && (
                            <div style={emptyStyle}>
                                <IcAi size={32} color="#30363d" />
                                <div style={{ marginTop: 12, fontSize: 13 }}>Ask anything about your project.</div>
                                <div style={{ fontSize: 11, color: '#484f58', marginTop: 4 }}>
                                    Manage sets, sizes, canvas elements, effects, or animations.
                                </div>
                            </div>
                        )}

                        {messages.map((m, i) => (
                            <div key={i} style={m.role === 'user' ? userBubbleStyle : assistantStyle}>
                                {m.content}
                            </div>
                        ))}

                        {/* Live progress — visible during active phases AND after completion */}
                        {live.phase !== 'idle' && (
                            <div style={progressStyle}>
                                {/* Scanning phase */}
                                {live.canvasScan && (
                                    <div style={progressRow}>
                                        {live.phase === 'scanning' ? <IcLoader size={12} color="#58a6ff" /> : <IcCheck size={12} color="#3fb950" />}
                                        <span style={{ opacity: live.phase === 'scanning' ? 1 : 0.5 }}>Scanning canvas</span>
                                    </div>
                                )}
                                {/* Thinking phase */}
                                {(live.phase === 'thinking' || live.thinking) && (
                                    <div style={progressRow}>
                                        {live.phase === 'thinking' ? <IcLoader size={12} color="#58a6ff" /> : <IcCheck size={12} color="#3fb950" />}
                                        <span style={{ opacity: live.phase === 'thinking' ? 1 : 0.5 }}>{live.thinking || 'Thinking...'}</span>
                                    </div>
                                )}
                                {/* Planning phase */}
                                {live.plan.length > 0 && (
                                    <div style={progressRow}>
                                        {live.phase === 'planning' ? <IcLoader size={12} color="#58a6ff" /> : <IcCheck size={12} color="#3fb950" />}
                                        <span style={{ opacity: live.phase === 'planning' ? 1 : 0.5 }}>Planning: {live.plan.length} steps</span>
                                    </div>
                                )}
                                {/* Executing phase — show each step */}
                                {live.steps.length > 0 && live.steps.map((step, idx) => (
                                    <div key={idx} style={{ ...progressRow, paddingLeft: 8 }}>
                                        {step.status === 'running' ? <IcLoader size={12} color="#58a6ff" />
                                            : step.status === 'done' ? <IcCheck size={12} color="#3fb950" />
                                                : step.status === 'error' ? <IcError size={12} color="#f85149" />
                                                    : <span style={{ width: 12, display: 'inline-block' }}>·</span>}
                                        <span style={{ opacity: step.status === 'running' ? 1 : 0.6 }}>
                                            {step.name}({Object.keys(step.params).length > 0 ? '…' : ''})
                                        </span>
                                        {step.result && (
                                            <span style={{ fontSize: 10, color: step.result.success ? '#3fb950' : '#f85149', marginLeft: 4 }}>
                                                {step.result.success ? '✓' : '✗'}
                                            </span>
                                        )}
                                    </div>
                                ))}
                                {/* Reflecting phase */}
                                {live.reflection && (
                                    <div style={progressRow}><IcCheck size={12} color="#3fb950" /> <span>{live.reflection}</span></div>
                                )}
                                {/* Error */}
                                {live.phase === 'error' && live.error && (
                                    <div style={{ ...progressRow, color: '#f85149' }}><IcError size={12} color="#f85149" /> <span>{live.error}</span></div>
                                )}
                            </div>
                        )}

                        <div ref={bottomRef} />
                    </div>

                    {/* Input */}
                    <div style={inputAreaStyle}>
                        <input ref={inputRef} value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                            placeholder={`Message AI... (${contextLabel.toLowerCase()})`}
                            style={inputFieldStyle}
                        />
                        <button onClick={() => handleSend()} disabled={!input.trim() || isBusy} style={sendBtnStyle}>
                            <IcSend size={14} color="#fff" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

// ── Styles ──────────────────────────────────────

// Outer wrapper — flex child in the App layout
const wrapperStyle: CSSProperties = {
    flexShrink: 0, height: '100%', display: 'flex',
    transition: 'width 0.3s cubic-bezier(0.4,0,0.2,1)',
    overflow: 'hidden',
};

const toggleBtnStyle: CSSProperties = {
    width: 32, flexShrink: 0, height: '100%',
    background: 'rgba(22, 27, 38, 0.95)', border: 'none',
    borderLeft: '1px solid rgba(255,255,255,0.06)',
    color: '#8b949e', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
};

const panelInnerStyle: CSSProperties = {
    width: PANEL_WIDTH - 32, flexShrink: 0, height: '100%',
    background: '#0d1117', borderLeft: '1px solid rgba(255,255,255,0.06)',
    display: 'flex', flexDirection: 'column',
    fontFamily: 'Inter, system-ui, sans-serif', color: '#e6edf3',
};

const headerStyle: CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
};

const headerBtnStyle: CSSProperties = {
    background: 'none', border: 'none', cursor: 'pointer', padding: 4, borderRadius: 4,
    display: 'flex', alignItems: 'center',
};

const settingsStyle: CSSProperties = {
    padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)',
};

const labelS: CSSProperties = { display: 'block', fontSize: 10, color: '#6e7681', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.5px' };
const fieldS: CSSProperties = {
    width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 6, padding: '6px 8px', color: '#e6edf3', fontSize: 12, outline: 'none',
};
const saveBtnS: CSSProperties = {
    marginTop: 10, background: '#238636', border: 'none', color: '#fff', padding: '5px 14px',
    borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer',
};

const msgAreaStyle: CSSProperties = {
    flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2, padding: '4px 0',
};

const emptyStyle: CSSProperties = {
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    color: '#30363d', padding: '60px 20px', textAlign: 'center',
};

const userBubbleStyle: CSSProperties = {
    padding: '8px 14px', margin: '2px 14px', alignSelf: 'flex-end',
    background: 'rgba(56,139,253,0.1)', borderRadius: '12px 12px 4px 12px',
    maxWidth: '85%', fontSize: 13, lineHeight: '1.6', color: '#c9d1d9',
};

const assistantStyle: CSSProperties = {
    padding: '8px 14px', margin: '2px 14px', fontSize: 13, lineHeight: '1.7',
    color: '#e6edf3', whiteSpace: 'pre-wrap',
};

const progressStyle: CSSProperties = {
    padding: '6px 14px', display: 'flex', flexDirection: 'column', gap: 4,
};

const progressRow: CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#8b949e',
};

const inputAreaStyle: CSSProperties = {
    display: 'flex', gap: 6, padding: '10px 12px',
    borderTop: '1px solid rgba(255,255,255,0.06)', alignItems: 'center',
};

const inputFieldStyle: CSSProperties = {
    flex: 1, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 8, padding: '9px 12px', color: '#e6edf3', fontSize: 13, outline: 'none',
};

const sendBtnStyle: CSSProperties = {
    width: 34, height: 34, borderRadius: 8,
    background: '#238636', border: 'none', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
};
