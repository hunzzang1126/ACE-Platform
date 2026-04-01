// ─────────────────────────────────────────────────
// SettingsPanel — Slide-out overlay for user preferences
// ─────────────────────────────────────────────────
// Accessible from AppSidebar gear icon.
// Sections: Language, Design Preferences, Account.
// ─────────────────────────────────────────────────

import { useState, useCallback, useEffect } from 'react';
import {
    SUPPORTED_LANGUAGES,
    type SupportedLanguage,
    loadUserPrefs,
    saveUserPrefs,
    type UserPrefs,
} from '@/stores/userPrefs';
import { useAuthStore } from '@/stores/authStore';
import {
    getConnectedAccounts,
    disconnectAccount,
    getMetaOAuthUrl,
    getGoogleAdsOAuthUrl,
} from '@/services/publish/socialAccountService';
import type { SocialAccount } from '@/services/publish/publishTypes';

interface Props {
    isOpen: boolean;
    onClose: () => void;
}




export function SettingsPanel({ isOpen, onClose }: Props) {
    const user = useAuthStore(s => s.user);
    const signOut = useAuthStore(s => s.signOut);
    const userId = user?.id;
    const [prefs, setPrefs] = useState<UserPrefs>(() => loadUserPrefs(userId));
    const [socialAccounts, setSocialAccounts] = useState<SocialAccount[]>([]);
    const [accountsLoading, setAccountsLoading] = useState(false);

    // Reload prefs when panel opens (with correct userId)
    useEffect(() => {
        if (isOpen) {
            setPrefs(loadUserPrefs(userId));
            // Load connected social accounts
            setAccountsLoading(true);
            getConnectedAccounts().then(accounts => {
                setSocialAccounts(accounts);
                setAccountsLoading(false);
            }).catch(() => setAccountsLoading(false));
        }
    }, [isOpen, userId]);

    const update = useCallback((patch: Partial<UserPrefs>) => {
        setPrefs(prev => {
            const next = { ...prev, ...patch };
            saveUserPrefs(next, userId);
            return next;
        });
    }, [userId]);

    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                onClick={onClose}
                style={{
                    position: 'fixed', inset: 0, zIndex: 9998,
                    background: 'rgba(0,0,0,0.5)',
                    backdropFilter: 'blur(4px)',
                    animation: 'fadeIn 0.2s ease',
                }}
            />

            {/* Panel */}
            <div style={{
                position: 'fixed', top: 0, right: 0, bottom: 0,
                width: 380, zIndex: 9999,
                background: '#111318',
                borderLeft: '1px solid rgba(255,255,255,0.06)',
                display: 'flex', flexDirection: 'column',
                animation: 'slideInRight 0.25s ease',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Inter", sans-serif',
            }}>
                {/* Header */}
                <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)',
                }}>
                    <h2 style={{ fontSize: 16, fontWeight: 600, color: '#f5f5f7', margin: 0 }}>
                        Settings
                    </h2>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'none', border: 'none', color: '#86868b',
                            cursor: 'pointer', fontSize: 18, padding: '4px 8px',
                            borderRadius: 6,
                        }}
                    >
                        x
                    </button>
                </div>

                <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
                    {/* ── Language Section ── */}
                    <Section title="Content Language">
                        <p style={descStyle}>
                            AI-generated copy will use this language by default
                        </p>
                        <select
                            value={prefs.preferredLanguage}
                            onChange={e => update({ preferredLanguage: e.target.value as SupportedLanguage })}
                            style={selectStyle}
                        >
                            {SUPPORTED_LANGUAGES.map(lang => (
                                <option key={lang} value={lang}>
                                    {lang}
                                </option>
                            ))}
                        </select>
                    </Section>

                    {/* ── Design Preferences ── */}
                    <Section title="Design Preferences">
                        <label style={labelStyle}>Layout Style</label>
                        <select
                            value={prefs.layoutStyle}
                            onChange={e => update({ layoutStyle: e.target.value as UserPrefs['layoutStyle'] })}
                            style={selectStyle}
                        >
                            <option value="minimal">Minimal</option>
                            <option value="balanced">Balanced</option>
                            <option value="dense">Dense</option>
                        </select>

                        <label style={{ ...labelStyle, marginTop: 14 }}>Animation Style</label>
                        <select
                            value={prefs.animationStyle}
                            onChange={e => update({ animationStyle: e.target.value as UserPrefs['animationStyle'] })}
                            style={selectStyle}
                        >
                            <option value="subtle">Subtle</option>
                            <option value="moderate">Moderate</option>
                            <option value="dramatic">Dramatic</option>
                        </select>
                    </Section>

                    {/* ── Brand Colors ── */}
                    <Section title="Brand Colors">
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                            <ColorInput label="Primary" value={prefs.brandColors.primary}
                                onChange={v => update({ brandColors: { ...prefs.brandColors, primary: v } })} />
                            <ColorInput label="Secondary" value={prefs.brandColors.secondary}
                                onChange={v => update({ brandColors: { ...prefs.brandColors, secondary: v } })} />
                            <ColorInput label="Background" value={prefs.brandColors.background}
                                onChange={v => update({ brandColors: { ...prefs.brandColors, background: v } })} />
                            <ColorInput label="Text" value={prefs.brandColors.text}
                                onChange={v => update({ brandColors: { ...prefs.brandColors, text: v } })} />
                        </div>
                    </Section>

                    {/* ── Integrations ── */}
                    <Section title="Connected Accounts">
                        <p style={descStyle}>
                            Link your ad and social accounts to publish directly from GLID
                        </p>
                        {accountsLoading ? (
                            <div style={{ color: '#666', fontSize: 13, padding: '8px 0' }}>Loading...</div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                <IntegrationRow
                                    platform="instagram"
                                    label="Instagram"
                                    icon={igIcon}
                                    account={socialAccounts.find(a => a.platform === 'instagram')}
                                    onConnect={() => {
                                        const url = getMetaOAuthUrl();
                                        if (url) window.open(url, '_blank', 'width=600,height=700');
                                    }}
                                    onDisconnect={async (id) => {
                                        await disconnectAccount(id);
                                        setSocialAccounts(prev => prev.filter(a => a.id !== id));
                                    }}
                                />
                                <IntegrationRow
                                    platform="facebook"
                                    label="Facebook"
                                    icon={fbIcon}
                                    account={socialAccounts.find(a => a.platform === 'facebook')}
                                    onConnect={() => {
                                        const url = getMetaOAuthUrl();
                                        if (url) window.open(url, '_blank', 'width=600,height=700');
                                    }}
                                    onDisconnect={async (id) => {
                                        await disconnectAccount(id);
                                        setSocialAccounts(prev => prev.filter(a => a.id !== id));
                                    }}
                                />
                                <IntegrationRow
                                    platform="google_ads"
                                    label="Google Ads"
                                    icon={googleIcon}
                                    account={socialAccounts.find(a => a.platform === 'google_ads')}
                                    onConnect={() => {
                                        const url = getGoogleAdsOAuthUrl();
                                        if (url) window.open(url, '_blank', 'width=600,height=700');
                                    }}
                                    onDisconnect={async (id) => {
                                        await disconnectAccount(id);
                                        setSocialAccounts(prev => prev.filter(a => a.id !== id));
                                    }}
                                />
                            </div>
                        )}
                    </Section>

                    {/* ── Account ── */}
                    <Section title="Account">
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: '#86868b', fontSize: 13 }}>Email</span>
                                <span style={{ color: '#c8c8cc', fontSize: 13 }}>{user?.email ?? '-'}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: '#86868b', fontSize: 13 }}>Plan</span>
                                <span style={{ color: '#c8c8cc', fontSize: 13, textTransform: 'capitalize' }}>
                                    {user?.plan ?? 'free'}
                                </span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: '#86868b', fontSize: 13 }}>Designs created</span>
                                <span style={{ color: '#c8c8cc', fontSize: 13 }}>{prefs.stats.totalDesigns}</span>
                            </div>
                        </div>
                    </Section>

                    {/* Sign Out */}
                    <button
                        onClick={() => { signOut(); onClose(); }}
                        style={{
                            width: '100%', padding: '10px 16px', marginTop: 16,
                            borderRadius: 10, background: 'rgba(255, 59, 48, 0.08)',
                            border: '1px solid rgba(255, 59, 48, 0.15)',
                            color: '#ff6b6b', fontSize: 13, fontWeight: 600,
                            cursor: 'pointer', transition: 'all 0.2s',
                        }}
                    >
                        Sign Out
                    </button>
                </div>
            </div>

            {/* Animations */}
            <style>{`
                @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
                @keyframes slideInRight { from { transform: translateX(100%) } to { transform: translateX(0) } }
            `}</style>
        </>
    );
}

// ── Sub-components ──

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div style={{ marginBottom: 24 }}>
            <h3 style={{
                fontSize: 12, fontWeight: 600, color: '#86868b', letterSpacing: 0.8,
                textTransform: 'uppercase', marginBottom: 10,
            }}>
                {title}
            </h3>
            {children}
        </div>
    );
}

function ColorInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
                type="color"
                value={value}
                onChange={e => onChange(e.target.value)}
                style={{
                    width: 28, height: 28, padding: 0, border: 'none',
                    borderRadius: 6, cursor: 'pointer', background: 'none',
                }}
            />
            <div>
                <div style={{ fontSize: 12, color: '#c8c8cc' }}>{label}</div>
                <div style={{ fontSize: 10, color: '#555', fontFamily: 'monospace' }}>{value}</div>
            </div>
        </div>
    );
}

// ── Integration row component ──
function IntegrationRow({ platform, label, icon, account, onConnect, onDisconnect }: {
    platform: string;
    label: string;
    icon: string;
    account?: SocialAccount;
    onConnect: () => void;
    onDisconnect: (id: string) => void;
}) {
    const [disconnecting, setDisconnecting] = useState(false);
    return (
        <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '10px 12px', borderRadius: 10,
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.06)',
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 16, width: 24, textAlign: 'center' }}  dangerouslySetInnerHTML={{ __html: icon }} />
                <div>
                    <div style={{ fontSize: 13, color: '#e5e5e7', fontWeight: 500 }}>{label}</div>
                    {account ? (
                        <div style={{ fontSize: 11, color: '#34c759' }}>
                            {account.accountName || 'Connected'}
                        </div>
                    ) : (
                        <div style={{ fontSize: 11, color: '#666' }}>Not connected</div>
                    )}
                </div>
            </div>
            {account ? (
                <button
                    onClick={async () => { setDisconnecting(true); await onDisconnect(account.id); setDisconnecting(false); }}
                    disabled={disconnecting}
                    style={{
                        padding: '5px 12px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                        background: 'rgba(255,59,48,0.08)', border: '1px solid rgba(255,59,48,0.15)',
                        color: '#ff6b6b', cursor: 'pointer',
                    }}
                >
                    {disconnecting ? '...' : 'Disconnect'}
                </button>
            ) : (
                <button
                    onClick={onConnect}
                    style={{
                        padding: '5px 12px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                        background: 'rgba(13,153,255,0.1)', border: '1px solid rgba(13,153,255,0.2)',
                        color: '#0d99ff', cursor: 'pointer',
                    }}
                >
                    Connect
                </button>
            )}
        </div>
    );
}

// ── Shared styles ──

// ── Platform icons (inline SVG strings) ──
const igIcon = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#E1306C" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="5"/><circle cx="17.5" cy="6.5" r="1.5"/></svg>';
const fbIcon = '<svg width="16" height="16" viewBox="0 0 24 24" fill="#1877F2"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>';
const googleIcon = '<svg width="16" height="16" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>';

const selectStyle: React.CSSProperties = {
    width: '100%', padding: '10px 12px', borderRadius: 10,
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    color: '#e5e5e7', fontSize: 13, fontFamily: 'inherit',
    outline: 'none', appearance: 'none',
    cursor: 'pointer',
};

const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: 12, color: '#999',
    marginBottom: 6, fontWeight: 500,
};

const descStyle: React.CSSProperties = {
    fontSize: 12, color: '#666', margin: '0 0 10px', lineHeight: 1.4,
};
