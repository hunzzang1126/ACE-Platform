// ─────────────────────────────────────────────────
// ShareModal — Copy link + embed code for creatives
// ─────────────────────────────────────────────────
// Shows shareable link and HTML embed snippet.
// Brand palette: Indigo→Mint gradient accent.
// ─────────────────────────────────────────────────

import { useState, useCallback } from 'react';
import { useAppI18n } from '@/i18n';

interface ShareModalProps {
    isOpen: boolean;
    onClose: () => void;
    projectId: string;
    projectName: string;
}

export function ShareModal({ isOpen, onClose, projectId, projectName }: ShareModalProps) {
    const { t } = useAppI18n();
    const [copied, setCopied] = useState<'link' | 'embed' | null>(null);

    const shareUrl = `${window.location.origin}/share/${projectId}`;
    const embedCode = `<iframe src="${shareUrl}" width="300" height="250" frameBorder="0" style="border:none;"></iframe>`;

    const copyToClipboard = useCallback(async (text: string, type: 'link' | 'embed') => {
        try {
            await navigator.clipboard.writeText(text);
            setCopied(type);
            setTimeout(() => setCopied(null), 2000);
        } catch {
            // Fallback
            const ta = document.createElement('textarea');
            ta.value = text;
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
            setCopied(type);
            setTimeout(() => setCopied(null), 2000);
        }
    }, []);

    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <div onClick={onClose} style={{
                position: 'fixed', inset: 0, zIndex: 999,
                background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)',
            }} />

            {/* Modal */}
            <div style={{
                position: 'fixed', top: '50%', left: '50%',
                transform: 'translate(-50%, -50%)', zIndex: 1000,
                width: 420, maxWidth: '90vw',
                background: '#ffffff', borderRadius: 16, overflow: 'hidden',
                boxShadow: '0 24px 64px rgba(0,0,0,0.2)',
                animation: 'modalIn 0.25s ease',
            }}>
                {/* Header */}
                <div style={{
                    padding: '18px 22px 14px', borderBottom: '1px solid rgba(0,0,0,0.06)',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                    <div>
                        <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1e293b', margin: 0, letterSpacing: '-0.3px' }}>
                            {t('share.title')}
                        </h3>
                        <p style={{ fontSize: 11, color: '#94a3b8', margin: '2px 0 0' }}>{projectName}</p>
                    </div>
                    <button onClick={onClose} style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        width: 28, height: 28, borderRadius: 6, display: 'flex',
                        alignItems: 'center', justifyContent: 'center',
                    }}>
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round">
                            <line x1="3" y1="3" x2="13" y2="13" /><line x1="13" y1="3" x2="3" y2="13" />
                        </svg>
                    </button>
                </div>

                <div style={{ padding: '18px 22px 22px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {/* Share Link */}
                    <div>
                        <label style={{ fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' as const, letterSpacing: '0.05em', marginBottom: 6, display: 'block' }}>
                            {t('share.linkLabel')}
                        </label>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <input readOnly value={shareUrl} style={{
                                flex: 1, padding: '8px 12px', borderRadius: 8,
                                border: '1px solid rgba(0,0,0,0.1)', fontSize: 12,
                                color: '#334155', background: '#f8fafc', outline: 'none',
                            }} onClick={e => (e.target as HTMLInputElement).select()} />
                            <button onClick={() => copyToClipboard(shareUrl, 'link')} style={{
                                padding: '8px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                                border: 'none', cursor: 'pointer', transition: 'all 0.2s',
                                background: copied === 'link' ? '#16a34a' : 'linear-gradient(135deg, #6366F1, #2DD4BF)',
                                color: '#fff', whiteSpace: 'nowrap' as const,
                            }}>
                                {copied === 'link' ? t('share.copied') : t('share.copy')}
                            </button>
                        </div>
                    </div>

                    {/* Embed Code */}
                    <div>
                        <label style={{ fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' as const, letterSpacing: '0.05em', marginBottom: 6, display: 'block' }}>
                            {t('share.embedLabel')}
                        </label>
                        <div style={{
                            padding: '10px 12px', borderRadius: 8,
                            background: '#1e293b', fontSize: 11, fontFamily: 'monospace',
                            color: '#94a3b8', lineHeight: 1.5, wordBreak: 'break-all' as const,
                        }}>
                            {embedCode}
                        </div>
                        <button onClick={() => copyToClipboard(embedCode, 'embed')} style={{
                            marginTop: 8, padding: '6px 12px', borderRadius: 6, fontSize: 11,
                            fontWeight: 500, border: '1px solid rgba(0,0,0,0.1)', cursor: 'pointer',
                            background: copied === 'embed' ? '#16a34a' : 'transparent',
                            color: copied === 'embed' ? '#fff' : '#64748b',
                            transition: 'all 0.2s',
                        }}>
                            {copied === 'embed' ? t('share.copied') : t('share.copyEmbed')}
                        </button>
                    </div>

                    {/* Availability note */}
                    <div style={{
                        padding: '10px 14px', borderRadius: 8,
                        background: 'rgba(99,102,241,0.04)',
                        border: '1px solid rgba(99,102,241,0.08)',
                        fontSize: 11, color: '#64748b', lineHeight: 1.5,
                    }}>
                        {t('share.note')}
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes modalIn { from { opacity: 0; transform: translate(-50%, -48%); } to { opacity: 1; transform: translate(-50%, -50%); } }
            `}</style>
        </>
    );
}
