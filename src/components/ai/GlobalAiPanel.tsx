// ─────────────────────────────────────────────────
// GlobalAiPanel — THE Unified AI Agent (Pencil-style)
// ─────────────────────────────────────────────────
// One agent to rule them all: Chat + Generate + Scan + Modify + Check
// Features: collapsible progress cards, inline image drop,
// live cursor animation, intent-aware routing
// NO EMOJIS. Clean, Apple/Figma/Linear aesthetic.
// ─────────────────────────────────────────────────

import { useState, useEffect, useRef, useCallback, type CSSProperties } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useUnifiedAgent, type AgentIntent } from '@/hooks/useUnifiedAgent';
import { getModelForRole, type AceModelRole } from '@/services/modelRouter';
import type { AgentMessage } from '@/ai/agentContext';
import { useAuthStore } from '@/stores/authStore';
import {
    IcSend, IcClose, IcChevronRight,
    IcLoader, IcCheck, IcError,
} from '@/components/ui/Icons';

// ── Constants ────────────────────────────────────

const PANEL_WIDTH = 400;

const INTENT_LABELS: Record<AgentIntent, string> = {
    agent: 'Working on your request',
    scan: 'Scanning design',
};

const QUICK_ACTIONS = [
    { id: 'generate', label: 'Generate', hint: 'Create a new design from a prompt' },
    { id: 'scan', label: 'Scan Design', hint: 'Drop a screenshot to recreate' },
] as const;

// ── Component ────────────────────────────────────

export function GlobalAiPanel() {
    const [open, setOpen] = useState(false);
    const [showDropZone, setShowDropZone] = useState(false);
    // ★ Default model respects user plan: Starter→Haiku, Pro+→Sonnet 4
    const [selectedRole, setSelectedRole] = useState<AceModelRole>(() => {
        const plan = useAuthStore.getState().user?.plan ?? 'starter';
        return plan === 'starter' ? 'executor' : 'design';
    });
    const [showModelDropdown, setShowModelDropdown] = useState(false);

    const activeModel = getModelForRole(selectedRole);
    const navigate = useNavigate();
    const location = useLocation();

    const bottomRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const agent = useUnifiedAgent({ navigate, selectedRole });

    const currentPage = location.pathname.startsWith('/editor/detail') ? 'detail'
        : location.pathname === '/editor' ? 'editor'
            : 'dashboard';

    const contextLabel = currentPage === 'dashboard' ? 'Dashboard'
        : currentPage === 'editor' ? 'Creative Set'
            : 'Canvas Editor';

    const isBusy = agent.state.phase !== 'idle' && agent.state.phase !== 'done' && agent.state.phase !== 'error';

    // ── Cmd+K Toggle ────────────────────────────
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

    // ── Engine bridge ────────────────────────────
    useEffect(() => {
        // @ts-expect-error — global bridge
        const existing = window.__aceGlobalAi ?? {};
        // @ts-expect-error — global bridge
        window.__aceGlobalAi = {
            ...existing,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            setEngine: (e: any) => agent.setEngine(e),
        };
    }, [agent.setEngine]);

    // Auto-scroll
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [agent.messages, agent.state]);

    // ── Image Drop Handler ───────────────────────
    const handleImageDrop = useCallback(async (file: File) => {
        const dataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
        setShowDropZone(false);
        agent.send('Scan this design', dataUrl);
    }, [agent]);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setShowDropZone(false);
        const file = e.dataTransfer.files[0];
        if (file?.type.startsWith('image/')) handleImageDrop(file);
    }, [handleImageDrop]);

    const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) handleImageDrop(file);
        e.target.value = '';
    }, [handleImageDrop]);

    // ── Quick Action Handlers ────────────────────
    const handleQuickAction = useCallback((actionId: string) => {
        if (actionId === 'scan') {
            fileInputRef.current?.click();
        } else if (actionId === 'generate') {
            inputRef.current?.focus();
            agent.setInput('Create a ');
        } else if (actionId === 'check') {
            agent.send('Run a quality check on the current canvas');
        }
    }, [agent]);

    // ── Send Handler ─────────────────────────────
    const handleSend = useCallback(() => {
        agent.send();
    }, [agent]);

    // ── Render ───────────────────────────────────
    return (
        <div style={{ ...wrapperStyle, width: open ? PANEL_WIDTH : 32 }}>
            {/* Toggle tab */}
            <button
                onClick={() => { setOpen(!open); setTimeout(() => inputRef.current?.focus(), 150); }}
                style={toggleBtnStyle}
                title={open ? 'Close AI (Cmd+K)' : 'Open AI (Cmd+K)'}
            >
                {open
                    ? <IcChevronRight size={14} color="#64748b" />
                    : <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: -0.5, background: 'linear-gradient(135deg, #ff6b6b, #ee5a9f, #8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>G</span>}
            </button>

            {/* Panel content */}
            {open && (
                <div style={panelInnerStyle}>
                    {/* ── Header ────────────────────── */}
                    <div style={headerStyle}>
                        <span style={glidLogoStyle}>G</span>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 600, fontSize: 13, color: '#1e293b', letterSpacing: -0.3 }}>GLID AI</div>
                            <div style={{ fontSize: 10, color: '#64748b', marginTop: 1 }}>{contextLabel}</div>
                        </div>
                        <button onClick={() => agent.clearChat()} style={headerBtnStyle} title="New conversation">
                            <span style={{ fontSize: 12, color: '#64748b' }}>+</span>
                        </button>
                        <button onClick={() => setOpen(false)} style={headerBtnStyle} title="Close (Esc)">
                            <IcClose size={14} color="#64748b" />
                        </button>
                    </div>

                    {/* ── Messages Area ─────────────── */}
                    <div
                        style={msgAreaStyle}
                        onDragOver={(e) => { e.preventDefault(); setShowDropZone(true); }}
                        onDragLeave={() => setShowDropZone(false)}
                        onDrop={handleDrop}
                    >
                        {/* Empty state */}
                        {agent.messages.length === 0 && agent.state.phase === 'idle' && (
                            <div style={emptyStyle}>
                                <span style={glidLogoLargeStyle}>GLID</span>
                                <div style={{ marginTop: 16, fontSize: 14, fontWeight: 500, color: '#1e293b' }}>
                                    What would you like to create?
                                </div>
                                <div style={{ fontSize: 12, color: '#64748b', marginTop: 6, lineHeight: 1.5 }}>
                                    Design social creatives, ads, landing pages, or any visual format.
                                    Drop a screenshot to reverse-engineer an existing design.
                                </div>

                                {/* Quick action buttons */}
                                <div style={quickActionsStyle}>
                                    {QUICK_ACTIONS.map(action => (
                                        <button
                                            key={action.id}
                                            onClick={() => handleQuickAction(action.id)}
                                            style={quickActionBtnStyle}
                                        >
                                            <span style={{ fontSize: 12, fontWeight: 500, color: '#1e293b' }}>{action.label}</span>
                                            <span style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>{action.hint}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Image drop overlay */}
                        {showDropZone && (
                            <div style={dropOverlayStyle}>
                                <div style={{ fontSize: 14, fontWeight: 500, color: '#7c3aed' }}>
                                    Drop screenshot to scan
                                </div>
                                <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
                                    AI will extract all elements as editable layers
                                </div>
                            </div>
                        )}

                        {/* Conversation messages + action cards interleaved */}
                        {agent.messages.map((m, i) => {
                            if (m.role === 'user') {
                                return (
                                    <div key={i} style={userBubbleStyle}>
                                        {m.content}
                                    </div>
                                );
                            }
                            if (m.role === 'action' && m.actionCard) {
                                return <ActionCardInline key={`action-${m.actionCard.id}-${i}`} card={m.actionCard} />;
                            }
                            if (m.role === 'thinking') {
                                return <ThinkingCard key={`thinking-${i}`} content={m.content} />;
                            }
                            if (m.role === 'image_gallery' && m.imageGallery) {
                                return (
                                    <ImageGalleryCard
                                        key={`gallery-${i}`}
                                        images={m.imageGallery.images}
                                        onSelect={(url) => agent.applyGalleryImage(url, m.imageGallery!.canvasW, m.imageGallery!.canvasH)}
                                    />
                                );
                            }
                            // assistant
                            return (
                                <div key={i} style={assistantStyle}>
                                    {m.content}
                                </div>
                            );
                        })}

                        {/* Error */}
                        {agent.state.phase === 'error' && agent.state.error && (
                            <div style={errorStyle}>
                                <IcError size={12} color="#f85149" />
                                <span>{agent.state.error}</span>
                            </div>
                        )}

                        <div ref={bottomRef} />
                    </div>

                    {/* ── Bottom Bar ────────────────── */}
                    <div style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}>
                        {/* Model selector */}
                        <div style={modelBarStyle}>
                            <button
                                onClick={() => setShowModelDropdown(!showModelDropdown)}
                                style={modelSelectorBtnStyle}
                            >
                                <span style={{ fontSize: 11, color: '#1e293b', fontWeight: 500 }}>{activeModel.name}</span>
                                <IcChevronRight size={10} color="#94a3b8" />
                            </button>
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                style={{ ...headerBtnStyle, marginLeft: 'auto' }}
                                title="Scan a screenshot"
                            >
                                <span style={{ fontSize: 11, color: '#64748b' }}>Scan</span>
                            </button>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                style={{ display: 'none' }}
                                onChange={handleFileInput}
                            />
                        </div>

                        {/* Model dropdown */}
                        {showModelDropdown && (
                            <ModelDropdown
                                selectedRole={selectedRole}
                                onSelect={(role) => {
                                    setSelectedRole(role);
                                    setShowModelDropdown(false);
                                }}
                            />
                        )}

                        {/* Input row */}
                        <div style={inputAreaStyle}>
                            <input
                                ref={inputRef}
                                value={agent.input}
                                onChange={e => agent.setInput(e.target.value)}
                                onKeyDown={e => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSend();
                                    }
                                }}
                                placeholder="Ask anything about your creative..."
                                disabled={isBusy}
                                style={inputFieldStyle}
                            />
                            <button
                                onClick={handleSend}
                                disabled={!agent.input.trim() || isBusy}
                                style={{
                                    ...sendBtnStyle,
                                    opacity: !agent.input.trim() || isBusy ? 0.4 : 1,
                                }}
                            >
                                <IcSend size={14} color="#fff" />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ── Sub-components ───────────────────────────────

interface ActionCardData {
    id: string;
    label: string;
    status: 'pending' | 'running' | 'done' | 'error';
    detail?: string;
    reasoning?: string;
    expandedDetail?: string;
}

function ActionCardInline({ card }: { card: ActionCardData }) {
    const [expanded, setExpanded] = useState(false);
    const hasExpandable = !!card.expandedDetail;

    const icon = card.status === 'running' ? <IcLoader size={12} color="#ee5a9f" />
        : card.status === 'done' ? <IcCheck size={12} color="#16a34a" />
            : card.status === 'error' ? <IcError size={12} color="#dc2626" />
                : <span style={{ width: 12, display: 'inline-block', textAlign: 'center', color: '#94a3b8' }}>·</span>;

    return (
        <div style={{
            ...actionCardStyle,
            borderColor: card.status === 'done' ? 'rgba(22,163,106,0.2)'
                : card.status === 'error' ? 'rgba(220,38,38,0.2)'
                    : card.status === 'running' ? 'rgba(238,90,159,0.2)'
                        : 'rgba(0,0,0,0.06)',
            boxShadow: card.status === 'done' ? '0 0 8px rgba(22,163,106,0.08)' : 'none',
        }}>
            {/* Main row */}
            <div
                onClick={() => hasExpandable && setExpanded(!expanded)}
                style={{
                    display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                    cursor: hasExpandable ? 'pointer' : 'default',
                }}
            >
                {icon}
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11, color: card.status === 'error' ? '#dc2626' : '#1e293b', fontWeight: 500 }}>
                        {card.label}
                    </div>
                    {card.reasoning && (
                        <div style={{ fontSize: 10, color: '#64748b', marginTop: 2, fontStyle: 'italic', lineHeight: 1.4 }}>
                            {card.reasoning}
                        </div>
                    )}
                    {card.detail && !expanded && (
                        <div style={{ fontSize: 10, color: '#64748b', marginTop: 1 }}>{card.detail}</div>
                    )}
                </div>
                {hasExpandable && (
                    <span style={{
                        fontSize: 10, color: '#94a3b8', cursor: 'pointer',
                        transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 0.2s ease',
                        flexShrink: 0, padding: '0 2px',
                    }}>
                        &#9660;
                    </span>
                )}
            </div>

            {/* Expanded detail pane */}
            {expanded && card.expandedDetail && (
                <div style={{
                    marginTop: 6, marginLeft: 20,
                    padding: '6px 8px',
                    background: 'rgba(0,0,0,0.03)',
                    border: '1px solid rgba(0,0,0,0.06)',
                    borderRadius: 6,
                    fontSize: 10, lineHeight: 1.6,
                    color: '#475569',
                    fontFamily: 'JetBrains Mono, Menlo, monospace',
                    whiteSpace: 'pre-wrap',
                    maxHeight: 200,
                    overflowY: 'auto',
                }}>
                    {card.expandedDetail}
                </div>
            )}
        </div>
    );
}

// ── Thinking Card (Extended Thinking Visibility) ──

function ThinkingCard({ content }: { content: string }) {
    const [expanded, setExpanded] = useState(false);
    // Estimate thinking duration from content length (~200 chars/sec thinking speed)
    const estimatedSec = Math.max(1, Math.round(content.length / 200));

    return (
        <div
            onClick={() => setExpanded(!expanded)}
            style={{
                margin: '3px 10px',
                padding: '6px 10px',
                background: expanded ? 'rgba(139,92,246,0.04)' : 'rgba(139,92,246,0.03)',
                border: '1px solid rgba(139,92,246,0.12)',
                borderRadius: 8,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
            }}
        >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{
                    width: 14, height: 14, borderRadius: '50%',
                    background: 'linear-gradient(135deg, #8b5cf6, #a78bfa)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 8, color: '#fff', fontWeight: 700, flexShrink: 0,
                }}>T</span>
                <span style={{ fontSize: 11, color: '#7c3aed', fontWeight: 500 }}>
                    Thought for {estimatedSec}s
                </span>
                <span style={{
                    fontSize: 10, color: '#a78bfa', marginLeft: 'auto',
                    transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.2s ease',
                }}>&#9660;</span>
            </div>
            {expanded && (
                <div style={{
                    marginTop: 8, paddingTop: 8,
                    borderTop: '1px solid rgba(139,92,246,0.1)',
                    fontSize: 11, lineHeight: 1.6,
                    color: '#6b7280',
                    fontFamily: 'JetBrains Mono, Menlo, monospace',
                    whiteSpace: 'pre-wrap',
                    maxHeight: 300, overflowY: 'auto',
                }}>
                    {content}
                </div>
            )}
        </div>
    );
}

// ── Image Gallery Card (Background Selection) ──

function ImageGalleryCard({
    images,
    onSelect,
}: {
    images: Array<{ id: string; url: string; prompt: string }>;
    onSelect: (url: string) => void;
}) {
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [applying, setApplying] = useState(false);

    const handleSelect = async (img: { id: string; url: string }) => {
        if (applying) return;
        setApplying(true);
        setSelectedId(img.id);
        try {
            onSelect(img.url);
        } finally {
            setTimeout(() => setApplying(false), 1000);
        }
    };

    return (
        <div style={{
            margin: '6px 10px', padding: '8px',
            background: 'rgba(255,255,255,0.6)',
            border: '1px solid rgba(139,92,246,0.12)',
            borderRadius: 10,
        }}>
            <div style={{ fontSize: 11, color: '#7c3aed', fontWeight: 500, marginBottom: 6 }}>
                Choose a background
            </div>
            <div style={{
                display: 'flex', gap: 6, overflowX: 'auto',
                paddingBottom: 4,
            }}>
                {images.map(img => (
                    <div
                        key={img.id}
                        onClick={() => handleSelect(img)}
                        style={{
                            position: 'relative', flexShrink: 0,
                            width: 110, height: 80,
                            borderRadius: 8, overflow: 'hidden',
                            border: selectedId === img.id
                                ? '2px solid #8b5cf6'
                                : '2px solid transparent',
                            cursor: applying ? 'wait' : 'pointer',
                            transition: 'all 0.2s ease',
                            opacity: applying && selectedId !== img.id ? 0.5 : 1,
                        }}
                    >
                        <img
                            src={img.url}
                            alt={img.prompt}
                            style={{
                                width: '100%', height: '100%',
                                objectFit: 'cover',
                            }}
                        />
                        {/* Hover overlay */}
                        <div style={{
                            position: 'absolute', inset: 0,
                            background: selectedId === img.id
                                ? 'rgba(139,92,246,0.3)'
                                : 'rgba(0,0,0,0)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            transition: 'background 0.2s ease',
                        }}>
                            {selectedId === img.id && (
                                <span style={{
                                    fontSize: 10, fontWeight: 600,
                                    color: '#fff', background: 'rgba(139,92,246,0.8)',
                                    padding: '2px 8px', borderRadius: 4,
                                }}>
                                    {applying ? 'Applying...' : 'Applied'}
                                </span>
                            )}
                        </div>
                    </div>
                ))}
            </div>
            {images[0]?.prompt && (
                <div style={{ fontSize: 9, color: '#94a3b8', marginTop: 4, lineHeight: 1.3 }}>
                    {images[0].prompt.slice(0, 60)}...
                </div>
            )}
        </div>
    );
}

// ── Model Dropdown (plan-gated) ──────────────────

const MODEL_OPTIONS: Array<{ role: AceModelRole; label: string; minPlan: 'starter' | 'pro' }> = [
    { role: 'design', label: 'Claude Sonnet 4', minPlan: 'pro' },
    { role: 'executor', label: 'Claude 3.5 Haiku (Fast)', minPlan: 'starter' },
];

const PLAN_RANK: Record<string, number> = { starter: 0, pro: 1, enterprise: 2, admin: 3 };

function ModelDropdown({ selectedRole, onSelect }: { selectedRole: AceModelRole; onSelect: (role: AceModelRole) => void }) {
    // Get user's plan for gating
    const [userPlan, setUserPlan] = useState<string>('starter');
    useEffect(() => {
        import('@/stores/authStore').then(({ useAuthStore }) => {
            const plan = useAuthStore.getState().user?.plan ?? 'starter';
            setUserPlan(plan);
        });
    }, []);

    const navigate = useNavigate();
    const userRank = PLAN_RANK[userPlan] ?? 0;

    return (
        <div style={modelDropdownStyle}>
            {MODEL_OPTIONS.map(opt => {
                const m = getModelForRole(opt.role);
                const active = opt.role === selectedRole;
                const requiredRank = PLAN_RANK[opt.minPlan] ?? 0;
                const isLocked = userRank < requiredRank;

                return (
                    <button
                        key={opt.role}
                        onClick={() => {
                            if (isLocked) {
                                // Navigate to pricing page
                                navigate('/pricing');
                            } else {
                                onSelect(opt.role);
                            }
                        }}
                        style={{
                            ...modelOptionStyle,
                            background: active ? 'rgba(56,139,253,0.1)' : 'transparent',
                            borderLeft: active ? '2px solid #388bfd' : '2px solid transparent',
                            opacity: isLocked ? 0.6 : 1,
                        }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                            <span style={{ fontSize: 12, color: active ? '#1e293b' : '#334155' }}>{opt.label}</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                {m.costPer1MInput > 0 && (
                                    <span style={{ fontSize: 10, color: '#64748b' }}>
                                        ${m.costPer1MInput}/{m.costPer1MOutput}
                                    </span>
                                )}
                                {isLocked && (
                                    <span style={{
                                        fontSize: 9, fontWeight: 700, color: '#818cf8',
                                        background: 'rgba(129,140,248,0.12)',
                                        padding: '1px 6px', borderRadius: 4,
                                        letterSpacing: '0.3px', textTransform: 'uppercase',
                                    }}>
                                        Pro
                                    </span>
                                )}
                            </div>
                        </div>
                        <div style={{ fontSize: 10, color: isLocked ? '#94a3b8' : '#64748b', marginTop: 2 }}>
                            {isLocked ? 'Upgrade to Pro to use this model' : m.id}
                        </div>
                    </button>
                );
            })}
        </div>
    );
}

// ── Styles ───────────────────────────────────────

const wrapperStyle: CSSProperties = {
    flexShrink: 0, height: '100%', display: 'flex',
    transition: 'width 0.3s cubic-bezier(0.4,0,0.2,1)',
    overflow: 'hidden',
};

const toggleBtnStyle: CSSProperties = {
    width: 32, flexShrink: 0, height: '100%',
    background: '#f0f2f5', border: 'none',
    borderLeft: '1px solid rgba(0,0,0,0.06)',
    color: '#475569', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
};

const panelInnerStyle: CSSProperties = {
    width: PANEL_WIDTH - 32, flexShrink: 0, height: '100%',
    background: '#f0f2f5', borderLeft: '1px solid rgba(0,0,0,0.06)',
    display: 'flex', flexDirection: 'column',
    fontFamily: 'Inter, system-ui, sans-serif', color: '#1e293b',
};

const headerStyle: CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px',
    borderBottom: '1px solid rgba(0,0,0,0.06)',
};

const headerBtnStyle: CSSProperties = {
    background: 'none', border: 'none', cursor: 'pointer', padding: 4, borderRadius: 4,
    display: 'flex', alignItems: 'center',
};

const msgAreaStyle: CSSProperties = {
    flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2, padding: '4px 0',
    position: 'relative',
};

const emptyStyle: CSSProperties = {
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    color: '#1e293b', padding: '40px 20px', textAlign: 'center',
};

const quickActionsStyle: CSSProperties = {
    display: 'flex', flexDirection: 'column', gap: 6, width: '100%', marginTop: 20,
};

const quickActionBtnStyle: CSSProperties = {
    display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
    background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(0,0,0,0.06)',
    borderRadius: 8, padding: '10px 14px', cursor: 'pointer',
    transition: 'all 0.15s ease', textAlign: 'left', width: '100%',
};

const dropOverlayStyle: CSSProperties = {
    position: 'absolute', inset: 0, zIndex: 10,
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    background: 'rgba(255,255,255,0.92)',
    border: '2px dashed #ee5a9f', borderRadius: 8,
    margin: 8,
};

const userBubbleStyle: CSSProperties = {
    padding: '8px 14px', margin: '4px 14px', alignSelf: 'flex-end',
    background: 'linear-gradient(135deg, #ff6b6b, #ee5a9f, #8b5cf6)', borderRadius: '12px 12px 4px 12px',
    maxWidth: '85%', fontSize: 13, lineHeight: '1.6', color: '#ffffff',
};

const assistantStyle: CSSProperties = {
    padding: '8px 14px', margin: '4px 14px', fontSize: 13, lineHeight: '1.7',
    color: '#334155', whiteSpace: 'pre-wrap',
};

const actionCardStyle: CSSProperties = {
    margin: '3px 10px',
    padding: '6px 10px',
    background: 'rgba(255,255,255,0.6)',
    border: '1px solid rgba(0,0,0,0.06)',
    borderRadius: 8,
    display: 'flex', flexDirection: 'column', gap: 4,
    transition: 'border-color 0.3s ease, box-shadow 0.3s ease',
};

const errorStyle: CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 6,
    margin: '4px 14px', padding: '8px 12px',
    background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.15)',
    borderRadius: 8, fontSize: 12, color: '#dc2626',
};

const modelBarStyle: CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 6,
    padding: '6px 12px',
    borderBottom: '1px solid rgba(0,0,0,0.04)',
};

const modelSelectorBtnStyle: CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 4,
    background: 'none', border: 'none', cursor: 'pointer',
    padding: '3px 6px', borderRadius: 4,
};

const modelDropdownStyle: CSSProperties = {
    background: '#ffffff',
    border: '1px solid rgba(0,0,0,0.08)',
    borderRadius: 8,
    margin: '0 8px 4px',
    padding: '6px 0',
    boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
    maxHeight: 280,
    overflowY: 'auto',
};

const modelOptionStyle: CSSProperties = {
    display: 'flex', flexDirection: 'column',
    width: '100%', textAlign: 'left',
    background: 'none', border: 'none',
    padding: '6px 12px', cursor: 'pointer',
    transition: 'background 0.1s',
};

const inputAreaStyle: CSSProperties = {
    display: 'flex', gap: 6, padding: '10px 12px',
    borderTop: '1px solid rgba(0,0,0,0.06)', alignItems: 'center',
};

const inputFieldStyle: CSSProperties = {
    flex: 1, background: '#ffffff', border: '1px solid rgba(0,0,0,0.1)',
    borderRadius: 8, padding: '9px 12px', color: '#1e293b', fontSize: 13, outline: 'none',
};

const sendBtnStyle: CSSProperties = {
    width: 34, height: 34, borderRadius: 8,
    background: 'linear-gradient(135deg, #ff6b6b, #ee5a9f, #8b5cf6)', border: 'none', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'opacity 0.15s ease',
};

// ── GLID Logo Styles ─────────────────────────────

const glidLogoStyle: CSSProperties = {
    fontSize: 16, fontWeight: 800, letterSpacing: -0.5,
    background: 'linear-gradient(135deg, #ff6b6b, #ee5a9f, #8b5cf6)',
    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
    lineHeight: 1,
};

const glidLogoLargeStyle: CSSProperties = {
    fontSize: 36, fontWeight: 900, letterSpacing: -1.5,
    background: 'linear-gradient(135deg, #ff6b6b, #ee5a9f, #8b5cf6)',
    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
    lineHeight: 1,
};
