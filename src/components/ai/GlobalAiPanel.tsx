// ─────────────────────────────────────────────────
// GlobalAiPanel — THE Unified AI Agent (Pencil-style)
// ─────────────────────────────────────────────────
// Sub-components extracted to AiPanelCards.tsx
// Styles extracted to aiPanelStyles.ts
// ─────────────────────────────────────────────────

import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useUnifiedAgent, type AgentIntent } from '@/hooks/useUnifiedAgent';
import { getModelForRole, type AceModelRole } from '@/services/modelRouter';
import { useAuthStore } from '@/stores/authStore';
import { IcSend, IcClose, IcChevronRight, IcError } from '@/components/ui/Icons';
import { ActionCardInline, ThinkingCard, ImageGalleryCard, ModelDropdown } from './AiPanelCards';
import {
    PANEL_WIDTH, wrapperStyle, toggleBtnStyle, panelInnerStyle,
    headerStyle, headerBtnStyle, msgAreaStyle, emptyStyle,
    quickActionsStyle, quickActionBtnStyle, dropOverlayStyle,
    userBubbleStyle, assistantStyle, errorStyle, modelBarStyle,
    modelSelectorBtnStyle, inputAreaStyle, inputFieldStyle,
    sendBtnStyle, glidLogoStyle, glidLogoLargeStyle,
} from './aiPanelStyles';

const INTENT_LABELS: Record<AgentIntent, string> = {
    agent: 'Working on your request',
    scan: 'Scanning design',
};

const QUICK_ACTIONS = [
    { id: 'generate', label: 'Generate', hint: 'Create a new design from a prompt' },
    { id: 'scan', label: 'Scan Design', hint: 'Drop a screenshot to recreate' },
] as const;

export function GlobalAiPanel() {
    const [open, setOpen] = useState(false);
    const [showDropZone, setShowDropZone] = useState(false);
    const [selectedRole, setSelectedRole] = useState<AceModelRole>(() => {
        const plan = useAuthStore.getState().user?.plan ?? 'starter';
        return plan === 'starter' ? 'executor' : 'design';
    });
    const userPlan = useAuthStore(s => s.user?.plan ?? 'starter');
    useEffect(() => { if (userPlan === 'starter' && selectedRole === 'design') setSelectedRole('executor'); }, [userPlan, selectedRole]);
    const [showModelDropdown, setShowModelDropdown] = useState(false);

    const activeModel = getModelForRole(selectedRole);
    const navigate = useNavigate();
    const location = useLocation();

    const bottomRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const agent = useUnifiedAgent({ navigate, selectedRole });

    const currentPage = location.pathname.startsWith('/editor/detail') ? 'detail' : location.pathname === '/editor' ? 'editor' : 'dashboard';
    const contextLabel = currentPage === 'dashboard' ? 'Dashboard' : currentPage === 'editor' ? 'Creative Set' : 'Canvas Editor';
    const isBusy = agent.state.phase !== 'idle' && agent.state.phase !== 'done' && agent.state.phase !== 'error';

    // ── Cmd+K Toggle ──
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setOpen(prev => !prev); setTimeout(() => inputRef.current?.focus(), 150); }
            if (e.key === 'Escape' && open) setOpen(false);
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [open]);

    // ── Engine bridge ──
    useEffect(() => {
        // @ts-expect-error — global bridge
        const existing = window.__aceGlobalAi ?? {};
        // @ts-expect-error — global bridge
        window.__aceGlobalAi = { ...existing, setEngine: (e: any) => agent.setEngine(e) };
    }, [agent.setEngine]);

    // Auto-scroll
    useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [agent.messages, agent.state]);

    // ── Image Drop ──
    const handleImageDrop = useCallback(async (file: File) => {
        const dataUrl = await new Promise<string>((resolve, reject) => { const r = new FileReader(); r.onload = () => resolve(r.result as string); r.onerror = reject; r.readAsDataURL(file); });
        setShowDropZone(false);
        agent.send('Scan this design', dataUrl);
    }, [agent]);

    const handleDrop = useCallback((e: React.DragEvent) => { e.preventDefault(); setShowDropZone(false); const f = e.dataTransfer.files[0]; if (f?.type.startsWith('image/')) handleImageDrop(f); }, [handleImageDrop]);
    const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (f) handleImageDrop(f); e.target.value = ''; }, [handleImageDrop]);

    const handleQuickAction = useCallback((actionId: string) => {
        if (actionId === 'scan') fileInputRef.current?.click();
        else if (actionId === 'generate') { inputRef.current?.focus(); agent.setInput('Create a '); }
        else if (actionId === 'check') agent.send('Run a quality check on the current canvas');
    }, [agent]);

    const handleSend = useCallback(() => { agent.send(); }, [agent]);

    return (
        <div style={{ ...wrapperStyle, width: open ? PANEL_WIDTH : 32 }}>
            <button onClick={() => { setOpen(!open); setTimeout(() => inputRef.current?.focus(), 150); }} style={toggleBtnStyle} title={open ? 'Close AI (Cmd+K)' : 'Open AI (Cmd+K)'}>
                {open ? <IcChevronRight size={14} color="#64748b" /> : <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: -0.5, background: 'linear-gradient(135deg, #ff6b6b, #ee5a9f, #8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>G</span>}
            </button>

            {open && (
                <div style={panelInnerStyle}>
                    {/* Header */}
                    <div style={headerStyle}>
                        <span style={glidLogoStyle}>G</span>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 600, fontSize: 13, color: '#1e293b', letterSpacing: -0.3 }}>GLID AI</div>
                            <div style={{ fontSize: 10, color: '#64748b', marginTop: 1 }}>{contextLabel}</div>
                        </div>
                        <button onClick={() => agent.clearChat()} style={headerBtnStyle} title="New conversation"><span style={{ fontSize: 12, color: '#64748b' }}>+</span></button>
                        <button onClick={() => setOpen(false)} style={headerBtnStyle} title="Close (Esc)"><IcClose size={14} color="#64748b" /></button>
                    </div>

                    {/* Messages */}
                    <div style={msgAreaStyle} onDragOver={(e) => { e.preventDefault(); setShowDropZone(true); }} onDragLeave={() => setShowDropZone(false)} onDrop={handleDrop}>
                        {agent.messages.length === 0 && agent.state.phase === 'idle' && (
                            <div style={emptyStyle}>
                                <span style={glidLogoLargeStyle}>GLID</span>
                                <div style={{ marginTop: 16, fontSize: 14, fontWeight: 500, color: '#1e293b' }}>What would you like to create?</div>
                                <div style={{ fontSize: 12, color: '#64748b', marginTop: 6, lineHeight: 1.5 }}>Design social creatives, ads, landing pages, or any visual format. Drop a screenshot to reverse-engineer an existing design.</div>
                                <div style={quickActionsStyle}>
                                    {QUICK_ACTIONS.map(action => (<button key={action.id} onClick={() => handleQuickAction(action.id)} style={quickActionBtnStyle}><span style={{ fontSize: 12, fontWeight: 500, color: '#1e293b' }}>{action.label}</span><span style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>{action.hint}</span></button>))}
                                </div>
                            </div>
                        )}

                        {showDropZone && (<div style={dropOverlayStyle}><div style={{ fontSize: 14, fontWeight: 500, color: '#7c3aed' }}>Drop screenshot to scan</div><div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>AI will extract all elements as editable layers</div></div>)}

                        {agent.messages.map((m, i) => {
                            if (m.role === 'user') return <div key={i} style={userBubbleStyle}>{m.content}</div>;
                            if (m.role === 'action' && m.actionCard) return <ActionCardInline key={`action-${m.actionCard.id}-${i}`} card={m.actionCard} />;
                            if (m.role === 'thinking') return <ThinkingCard key={`thinking-${i}`} content={m.content} />;
                            if (m.role === 'image_gallery' && m.imageGallery) return <ImageGalleryCard key={`gallery-${i}`} images={m.imageGallery.images} onSelect={(url) => agent.applyGalleryImage(url, m.imageGallery!.canvasW, m.imageGallery!.canvasH)} />;
                            return <div key={i} style={assistantStyle}>{m.content}</div>;
                        })}

                        {agent.state.phase === 'error' && agent.state.error && (<div style={errorStyle}><IcError size={12} color="#f85149" /><span>{agent.state.error}</span></div>)}
                        <div ref={bottomRef} />
                    </div>

                    {/* Bottom Bar */}
                    <div style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}>
                        <div style={modelBarStyle}>
                            <button onClick={() => setShowModelDropdown(!showModelDropdown)} style={modelSelectorBtnStyle}>
                                <span style={{ fontSize: 11, color: '#1e293b', fontWeight: 500 }}>{activeModel.name}</span>
                                <IcChevronRight size={10} color="#94a3b8" />
                            </button>
                            <button onClick={() => fileInputRef.current?.click()} style={{ ...headerBtnStyle, marginLeft: 'auto' }} title="Scan a screenshot"><span style={{ fontSize: 11, color: '#64748b' }}>Scan</span></button>
                            <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileInput} />
                        </div>
                        {showModelDropdown && <ModelDropdown selectedRole={selectedRole} onSelect={(role) => { setSelectedRole(role); setShowModelDropdown(false); }} />}
                        <div style={inputAreaStyle}>
                            <input ref={inputRef} value={agent.input} onChange={e => agent.setInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }} placeholder="Ask anything about your creative..." disabled={isBusy} style={inputFieldStyle} />
                            <button onClick={handleSend} disabled={!agent.input.trim() || isBusy} style={{ ...sendBtnStyle, opacity: !agent.input.trim() || isBusy ? 0.4 : 1 }}><IcSend size={14} color="#fff" /></button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
