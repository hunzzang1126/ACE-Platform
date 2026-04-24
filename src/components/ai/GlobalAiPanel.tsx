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
import { useAppI18n } from '@/i18n';
import { IcSend, IcClose, IcChevronRight, IcError } from '@/components/ui/Icons';
import { ActionCardInline, ThinkingCard, ImageGalleryCard, ModelDropdown, ProgressCard } from './AiPanelCards';
import { ResultPreviewCard } from './ResultPreviewCard';
import { getAiSuggestions } from '@/ai/aiSuggestions';
import type { CanvasContext } from '@/ai/aiSuggestions';
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

export function GlobalAiPanel() {
    const { t } = useAppI18n();
    const [open, setOpen] = useState(false);
    const [showDropZone, setShowDropZone] = useState(false);
    const [selectedRole, setSelectedRole] = useState<AceModelRole>('design');
    const userPlan = useAuthStore(s => s.user?.plan ?? 'starter');
    // ★ All plans use Sonnet 4 (design role) — no starter enforcement needed
    const [showModelDropdown, setShowModelDropdown] = useState(false);

    const activeModel = getModelForRole(selectedRole);
    const navigate = useNavigate();
    const location = useLocation();

    const bottomRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const agent = useUnifiedAgent({ navigate, selectedRole });

    const currentPage = location.pathname.startsWith('/editor/detail') ? 'detail' : location.pathname === '/editor' ? 'editor' : 'dashboard';
    const contextLabel = currentPage === 'dashboard' ? t('nav.dashboard') : currentPage === 'editor' ? t('nav.creativeSet') : t('nav.canvasEditor');
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
        window.__aceGlobalAi = {
            ...existing,
            setEngine: (e: any) => agent.setEngine(e),
            // ★ Locale / external callers can send messages directly
            send: (msg: string) => { setOpen(true); setTimeout(() => agent.send(msg), 200); },
        };
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

    // ── Context-aware suggestions ──
    const canvasCtx: CanvasContext = (() => {
        const page = currentPage as CanvasContext['page'];
        if (page !== 'detail') return { page, elementCount: 0, selectionCount: 0, selectedTypes: [], hasText: false, hasImages: false };
        try {
            const eng = agent.engineRef?.current;
            const nodesJson = eng?.get_all_nodes?.();
            const nodes: { type: string }[] = nodesJson ? JSON.parse(nodesJson) : [];
            const sel = eng?.get_selection_ids?.() ?? [];
            const selTypes = nodes.filter((n: any) => sel.includes(n.id)).map((n: any) => n.type);
            return { page, elementCount: nodes.length, selectionCount: sel.length, selectedTypes: selTypes, hasText: nodes.some(n => n.type === 'text'), hasImages: nodes.some(n => n.type === 'image') };
        } catch { return { page, elementCount: 0, selectionCount: 0, selectedTypes: [], hasText: false, hasImages: false }; }
    })();
    const suggestions = getAiSuggestions(canvasCtx);

    const quickActions = suggestions.map(s => ({
        id: s.id,
        label: t(s.labelKey) || s.labelKey.split('.').pop() || s.id,
        hint: t(s.hintKey) || s.hintKey.split('.').pop() || '',
    }));

    const handleQuickAction = useCallback((actionId: string) => {
        const sug = suggestions.find(s => s.id === actionId);
        if (!sug) return;
        if (sug.action === 'scan') fileInputRef.current?.click();
        else if (sug.action === 'send') agent.send(sug.prompt);
        else if (sug.action === 'focus') { agent.setInput(sug.prompt); inputRef.current?.focus(); }
        else if (sug.action === 'export') agent.send(sug.prompt);
    }, [agent, suggestions]);

    const handleSend = useCallback(() => { agent.send(); }, [agent]);

    return (
        <div style={{ ...wrapperStyle, width: open ? PANEL_WIDTH : 32 }}>
            <button onClick={() => { setOpen(!open); setTimeout(() => inputRef.current?.focus(), 150); }} style={toggleBtnStyle} title={open ? `${t('ai.closeAi')} (Cmd+K)` : `${t('ai.openAi')} (Cmd+K)`}>
                {open ? <IcChevronRight size={14} color="#64748b" /> : <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: -0.5, background: 'linear-gradient(135deg, #2DD4BF, #818cf8, #c084fc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>G</span>}
            </button>

            {open && (
                <div style={panelInnerStyle}>
                    {/* Header */}
                    <div style={headerStyle}>
                        <span style={glidLogoStyle}>G</span>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 600, fontSize: 13, color: '#1e293b', letterSpacing: -0.3 }}>{t('ai.title')}</div>
                            <div style={{ fontSize: 10, color: '#64748b', marginTop: 1 }}>{contextLabel}</div>
                        </div>
                        <button onClick={() => agent.clearChat()} style={headerBtnStyle} title={t('ai.newConversation')}><span style={{ fontSize: 12, color: '#64748b' }}>+</span></button>
                        <button onClick={() => setOpen(false)} style={headerBtnStyle} title={`${t('ai.close')} (Esc)`}><IcClose size={14} color="#64748b" /></button>
                    </div>

                    {/* Messages */}
                    <div style={msgAreaStyle} onDragOver={(e) => { e.preventDefault(); setShowDropZone(true); }} onDragLeave={() => setShowDropZone(false)} onDrop={handleDrop}>
                        {agent.messages.length === 0 && agent.state.phase === 'idle' && (
                            <div style={emptyStyle}>
                                <span style={glidLogoLargeStyle}>GLID</span>
                                <div style={{ marginTop: 16, fontSize: 14, fontWeight: 500, color: '#1e293b' }}>{t('ai.whatCreate')}</div>
                                <div style={{ fontSize: 12, color: '#64748b', marginTop: 6, lineHeight: 1.5 }}>{t('ai.description')}</div>
                                <div style={quickActionsStyle}>
                                    {quickActions.map(action => (<button key={action.id} onClick={() => handleQuickAction(action.id)} style={quickActionBtnStyle}><span style={{ fontSize: 12, fontWeight: 500, color: '#1e293b' }}>{action.label}</span><span style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>{action.hint}</span></button>))}
                                </div>
                            </div>
                        )}

                        {showDropZone && (<div style={dropOverlayStyle}><div style={{ fontSize: 14, fontWeight: 500, color: '#6366F1' }}>{t('ai.dropToScan')}</div><div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>{t('ai.dropHint')}</div></div>)}

                        {agent.messages.map((m, i) => {
                            if (m.role === 'user') return <div key={i} style={userBubbleStyle}>{m.content}</div>;
                            if (m.role === 'action' && m.actionCard) return <ActionCardInline key={`action-${m.actionCard.id}-${i}`} card={m.actionCard} />;
                            if (m.role === 'thinking') return <ThinkingCard key={`thinking-${i}`} content={m.content} />;
                            if (m.role === 'image_gallery' && m.imageGallery) return <ImageGalleryCard key={`gallery-${i}`} images={m.imageGallery.images} onSelect={(url) => agent.applyGalleryImage(url, m.imageGallery!.canvasW, m.imageGallery!.canvasH)} />;
                            if (m.role === 'narration') return <div key={i} style={{ ...assistantStyle, fontSize: 11, color: '#6366F1', fontStyle: 'italic' }}>{m.content}</div>;
                            if (m.role === 'design_complete') {
                                // Find the most recent assistant message with toolCalls before this design_complete
                                const prevAssistant = messages.slice(0, i).reverse().find(pm => pm.toolCalls && pm.toolCalls.length > 0);
                                const lastTool = prevAssistant?.toolCalls?.[prevAssistant.toolCalls.length - 1];
                                const lastToolName = lastTool?.name;
                                const lastCodePattern = lastToolName === 'execute_dynamic_action' && lastTool?.input?.code
                                    ? String(lastTool.input.code).slice(0, 200) : undefined;
                                return <ResultPreviewCard key={`result-${i}`} summary={m.content}
                                    elementCount={m.actionCard?.id ? parseInt(m.actionCard.id, 10) : undefined}
                                    durationSec={m.phases?.[0] ? Math.round((Date.now() - m.phases[0].timestamp) / 1000) : undefined}
                                    lastToolName={lastToolName} lastCodePattern={lastCodePattern} />;
                            }
                            return <div key={i} style={assistantStyle}>{m.content}</div>;
                        })}

                        {isBusy && <ProgressCard phase={agent.state.phase as any} narration={agent.messages.filter(m => m.role === 'narration').pop()?.content} />}
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
                            <button onClick={() => fileInputRef.current?.click()} style={{ ...headerBtnStyle, marginLeft: 'auto' }} title={t('ai.scanScreenshot')}><span style={{ fontSize: 11, color: '#64748b' }}>{t('ai.scan')}</span></button>
                            <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileInput} />
                        </div>
                        {showModelDropdown && <ModelDropdown selectedRole={selectedRole} onSelect={(role) => { setSelectedRole(role); setShowModelDropdown(false); }} />}
                        <div style={inputAreaStyle}>
                            <input ref={inputRef} value={agent.input} onChange={e => agent.setInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }} placeholder={t('ai.askAnything')} disabled={isBusy} style={inputFieldStyle} />
                            <button onClick={handleSend} disabled={!agent.input.trim() || isBusy} style={{ ...sendBtnStyle, opacity: !agent.input.trim() || isBusy ? 0.4 : 1 }}><IcSend size={14} color="#fff" /></button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
