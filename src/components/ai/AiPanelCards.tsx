// ─────────────────────────────────────────────────
// AiPanelCards — Sub-components for GlobalAiPanel
// ─────────────────────────────────────────────────
// ActionCardInline, ThinkingCard, ImageGalleryCard,
// ModelDropdown
// ─────────────────────────────────────────────────

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getModelForRole, type AceModelRole } from '@/services/modelRouter';
import { IcLoader, IcCheck, IcError } from '@/components/ui/Icons';
import { actionCardStyle, modelDropdownStyle, modelOptionStyle } from './aiPanelStyles';

// ── Types ────────────────────────────────────────

export interface ActionCardData {
    id: string;
    label: string;
    status: 'pending' | 'running' | 'done' | 'error';
    detail?: string;
    reasoning?: string;
    expandedDetail?: string;
}

// ── Action Card ──────────────────────────────────

export function ActionCardInline({ card }: { card: ActionCardData }) {
    const [expanded, setExpanded] = useState(false);
    const hasExpandable = !!card.expandedDetail;

    const icon = card.status === 'running' ? <IcLoader size={12} color="#ee5a9f" />
        : card.status === 'done' ? <IcCheck size={12} color="#16a34a" />
            : card.status === 'error' ? <IcError size={12} color="#dc2626" />
                : <span style={{ width: 12, display: 'inline-block', textAlign: 'center', color: '#94a3b8' }}>·</span>;

    return (
        <div style={{
            ...actionCardStyle,
            borderColor: card.status === 'done' ? 'rgba(22,163,106,0.2)' : card.status === 'error' ? 'rgba(220,38,38,0.2)' : card.status === 'running' ? 'rgba(238,90,159,0.2)' : 'rgba(0,0,0,0.06)',
            boxShadow: card.status === 'done' ? '0 0 8px rgba(22,163,106,0.08)' : 'none',
        }}>
            <div onClick={() => hasExpandable && setExpanded(!expanded)} style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', cursor: hasExpandable ? 'pointer' : 'default' }}>
                {icon}
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11, color: card.status === 'error' ? '#dc2626' : '#1e293b', fontWeight: 500 }}>{card.label}</div>
                    {card.reasoning && (<div style={{ fontSize: 10, color: '#64748b', marginTop: 2, fontStyle: 'italic', lineHeight: 1.4 }}>{card.reasoning}</div>)}
                    {card.detail && !expanded && (<div style={{ fontSize: 10, color: '#64748b', marginTop: 1 }}>{card.detail}</div>)}
                </div>
                {hasExpandable && (<span style={{ fontSize: 10, color: '#94a3b8', cursor: 'pointer', transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease', flexShrink: 0, padding: '0 2px' }}>&#9660;</span>)}
            </div>
            {expanded && card.expandedDetail && (
                <div style={{ marginTop: 6, marginLeft: 20, padding: '6px 8px', background: 'rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.06)', borderRadius: 6, fontSize: 10, lineHeight: 1.6, color: '#475569', fontFamily: 'JetBrains Mono, Menlo, monospace', whiteSpace: 'pre-wrap', maxHeight: 200, overflowY: 'auto' }}>
                    {card.expandedDetail}
                </div>
            )}
        </div>
    );
}

// ── Thinking Card ────────────────────────────────

export function ThinkingCard({ content }: { content: string }) {
    const [expanded, setExpanded] = useState(false);
    const estimatedSec = Math.max(1, Math.round(content.length / 200));

    return (
        <div onClick={() => setExpanded(!expanded)} style={{ margin: '3px 10px', padding: '6px 10px', background: expanded ? 'rgba(139,92,246,0.04)' : 'rgba(139,92,246,0.03)', border: '1px solid rgba(139,92,246,0.12)', borderRadius: 8, cursor: 'pointer', transition: 'all 0.2s ease' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 14, height: 14, borderRadius: '50%', background: 'linear-gradient(135deg, #8b5cf6, #a78bfa)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, color: '#fff', fontWeight: 700, flexShrink: 0 }}>T</span>
                <span style={{ fontSize: 11, color: '#7c3aed', fontWeight: 500 }}>Thought for {estimatedSec}s</span>
                <span style={{ fontSize: 10, color: '#a78bfa', marginLeft: 'auto', transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }}>&#9660;</span>
            </div>
            {expanded && (
                <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid rgba(139,92,246,0.1)', fontSize: 11, lineHeight: 1.6, color: '#6b7280', fontFamily: 'JetBrains Mono, Menlo, monospace', whiteSpace: 'pre-wrap', maxHeight: 300, overflowY: 'auto' }}>
                    {content}
                </div>
            )}
        </div>
    );
}

// ── Image Gallery Card ───────────────────────────

export function ImageGalleryCard({ images, onSelect }: { images: Array<{ id: string; url: string; prompt: string }>; onSelect: (url: string) => void }) {
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [applying, setApplying] = useState(false);

    const handleSelect = async (img: { id: string; url: string }) => {
        if (applying) return;
        setApplying(true); setSelectedId(img.id);
        try { onSelect(img.url); } finally { setTimeout(() => setApplying(false), 1000); }
    };

    return (
        <div style={{ margin: '6px 10px', padding: '8px', background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(139,92,246,0.12)', borderRadius: 10 }}>
            <div style={{ fontSize: 11, color: '#7c3aed', fontWeight: 500, marginBottom: 6 }}>Choose a background</div>
            <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4 }}>
                {images.map(img => (
                    <div key={img.id} onClick={() => handleSelect(img)} style={{ position: 'relative', flexShrink: 0, width: 110, height: 80, borderRadius: 8, overflow: 'hidden', border: selectedId === img.id ? '2px solid #8b5cf6' : '2px solid transparent', cursor: applying ? 'wait' : 'pointer', transition: 'all 0.2s ease', opacity: applying && selectedId !== img.id ? 0.5 : 1 }}>
                        <img src={img.url} alt={img.prompt} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        <div style={{ position: 'absolute', inset: 0, background: selectedId === img.id ? 'rgba(139,92,246,0.3)' : 'rgba(0,0,0,0)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s ease' }}>
                            {selectedId === img.id && (<span style={{ fontSize: 10, fontWeight: 600, color: '#fff', background: 'rgba(139,92,246,0.8)', padding: '2px 8px', borderRadius: 4 }}>{applying ? 'Applying...' : 'Applied'}</span>)}
                        </div>
                    </div>
                ))}
            </div>
            {images[0]?.prompt && (<div style={{ fontSize: 9, color: '#94a3b8', marginTop: 4, lineHeight: 1.3 }}>{images[0].prompt.slice(0, 60)}...</div>)}
        </div>
    );
}

// ── Model Dropdown ───────────────────────────────

const MODEL_OPTIONS: Array<{ role: AceModelRole; label: string; minPlan: 'starter' | 'creator' | 'pro' }> = [
    { role: 'design', label: 'Claude Sonnet 4', minPlan: 'creator' },
    { role: 'executor', label: 'Claude 3.5 Haiku (Fast)', minPlan: 'starter' },
];

const PLAN_RANK: Record<string, number> = { starter: 0, creator: 1, pro: 2, enterprise: 3, admin: 4 };

export function ModelDropdown({ selectedRole, onSelect }: { selectedRole: AceModelRole; onSelect: (role: AceModelRole) => void }) {
    const [userPlan, setUserPlan] = useState<string>('starter');
    useEffect(() => { import('@/stores/authStore').then(({ useAuthStore }) => { setUserPlan(useAuthStore.getState().user?.plan ?? 'starter'); }); }, []);
    const navigate = useNavigate();
    const userRank = PLAN_RANK[userPlan] ?? 0;

    return (
        <div style={modelDropdownStyle}>
            {MODEL_OPTIONS.map(opt => {
                const m = getModelForRole(opt.role);
                const active = opt.role === selectedRole;
                const isLocked = userRank < (PLAN_RANK[opt.minPlan] ?? 0);
                return (
                    <button key={opt.role} onClick={() => isLocked ? navigate('/pricing') : onSelect(opt.role)} style={{ ...modelOptionStyle, background: active ? 'rgba(56,139,253,0.1)' : 'transparent', borderLeft: active ? '2px solid #388bfd' : '2px solid transparent', opacity: isLocked ? 0.6 : 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                            <span style={{ fontSize: 12, color: active ? '#1e293b' : '#334155' }}>{opt.label}</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                {m.costPer1MInput > 0 && (<span style={{ fontSize: 10, color: '#64748b' }}>${m.costPer1MInput}/{m.costPer1MOutput}</span>)}
                                {isLocked && (<span style={{ fontSize: 9, fontWeight: 700, color: '#818cf8', background: 'rgba(129,140,248,0.12)', padding: '1px 6px', borderRadius: 4, letterSpacing: '0.3px', textTransform: 'uppercase' }}>Pro</span>)}
                            </div>
                        </div>
                        <div style={{ fontSize: 10, color: isLocked ? '#94a3b8' : '#64748b', marginTop: 2 }}>{isLocked ? 'Upgrade to Pro to use this model' : m.id}</div>
                    </button>
                );
            })}
        </div>
    );
}
