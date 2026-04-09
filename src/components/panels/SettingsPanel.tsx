// ─────────────────────────────────────────────────
// SettingsPanel — Centered modal with tabbed sidebar
// ─────────────────────────────────────────────────
// Claude-style settings: left tab nav + right content area.
// Sub-components in ./settings/ directory.
// ─────────────────────────────────────────────────

import { useState, useCallback, useEffect } from 'react';
import { loadUserPrefs, saveUserPrefs, type UserPrefs } from '@/stores/userPrefs';
import { useAuthStore } from '@/stores/authStore';
import {
    getConnectedAccounts,
    disconnectAccount,
    getMetaOAuthUrl,
    getGoogleAdsOAuthUrl,
} from '@/services/publish/socialAccountService';
import type { SocialAccount } from '@/services/publish/publishTypes';
import { SETTINGS_TABS, type SettingsTab } from './settings/settingsShared';
import { SettingsGeneral } from './settings/SettingsGeneral';
import { SettingsAccount } from './settings/SettingsAccount';
import { SettingsBilling } from './settings/SettingsBilling';
import { SettingsBrand } from './settings/SettingsBrand';
import { SettingsConnections } from './settings/SettingsConnections';
import { SettingsAppearance } from './settings/SettingsAppearance';

interface Props { isOpen: boolean; onClose: () => void; }

export function SettingsPanel({ isOpen, onClose }: Props) {
    const user = useAuthStore(s => s.user);
    const signOut = useAuthStore(s => s.signOut);
    const userId = user?.id;
    const [prefs, setPrefs] = useState<UserPrefs>(() => loadUserPrefs(userId));
    const [activeTab, setActiveTab] = useState<SettingsTab>('general');
    const [socialAccounts, setSocialAccounts] = useState<SocialAccount[]>([]);
    const [accountsLoading, setAccountsLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setPrefs(loadUserPrefs(userId));
            setAccountsLoading(true);
            getConnectedAccounts().then(a => { setSocialAccounts(a); setAccountsLoading(false); }).catch(() => setAccountsLoading(false));
        }
    }, [isOpen, userId]);

    const update = useCallback((patch: Partial<UserPrefs>) => {
        setPrefs(prev => { const next = { ...prev, ...patch }; saveUserPrefs(next, userId); return next; });
    }, [userId]);

    const handleConnect = useCallback((platform: string) => {
        const url = platform === 'google_ads' ? getGoogleAdsOAuthUrl() : getMetaOAuthUrl();
        if (url) window.open(url, '_blank', 'width=600,height=700');
    }, []);

    const handleDisconnect = useCallback(async (id: string) => {
        await disconnectAccount(id);
        setSocialAccounts(prev => prev.filter(a => a.id !== id));
    }, []);

    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <div onClick={onClose} style={{
                position: 'fixed', inset: 0, zIndex: 9998,
                background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)',
                animation: 'settFadeIn 0.2s ease',
            }} />

            {/* Modal */}
            <div style={{
                position: 'fixed', top: '50%', left: '50%',
                transform: 'translate(-50%, -50%)',
                width: 720, maxWidth: '90vw', height: 520, maxHeight: '85vh',
                zIndex: 9999, borderRadius: 16,
                background: '#111318',
                border: '1px solid rgba(255,255,255,0.08)',
                boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
                display: 'flex', overflow: 'hidden',
                animation: 'settScaleIn 0.25s ease',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Inter", sans-serif',
            }}>
                {/* Left Sidebar */}
                <div style={{
                    width: 180, minWidth: 180,
                    borderRight: '1px solid rgba(255,255,255,0.06)',
                    padding: '24px 12px', display: 'flex', flexDirection: 'column', gap: 2,
                }}>
                    <h2 style={{ fontSize: 16, fontWeight: 700, color: '#f5f5f7', margin: '0 8px 16px', letterSpacing: -0.3 }}>
                        Settings
                    </h2>
                    {SETTINGS_TABS.map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            style={{
                                display: 'block', width: '100%', textAlign: 'left',
                                padding: '8px 12px', borderRadius: 8, border: 'none',
                                fontSize: 13, fontWeight: activeTab === tab.key ? 600 : 400,
                                color: activeTab === tab.key ? '#f5f5f7' : '#86868b',
                                background: activeTab === tab.key ? 'rgba(255,255,255,0.08)' : 'transparent',
                                cursor: 'pointer', transition: 'all 0.15s',
                            }}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Right Content */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px' }}>
                    {/* Close button */}
                    <button onClick={onClose} style={{
                        position: 'absolute', top: 16, right: 16,
                        background: 'none', border: 'none', color: '#86868b',
                        cursor: 'pointer', fontSize: 18, padding: '4px 8px',
                        borderRadius: 6, lineHeight: 1,
                    }}>
                        x
                    </button>

                    {activeTab === 'general' && <SettingsGeneral prefs={prefs} onUpdate={update} />}
                    {activeTab === 'appearance' && <SettingsAppearance />}
                    {activeTab === 'account' && <SettingsAccount user={user} prefs={prefs} onSignOut={() => { signOut(); onClose(); }} />}
                    {activeTab === 'billing' && <SettingsBilling user={user} />}
                    {activeTab === 'brand' && <SettingsBrand prefs={prefs} onUpdate={update} />}
                    {activeTab === 'connections' && (
                        <SettingsConnections
                            accounts={socialAccounts} loading={accountsLoading}
                            onConnect={handleConnect} onDisconnect={handleDisconnect}
                        />
                    )}
                </div>
            </div>

            <style>{`
                @keyframes settFadeIn { from { opacity: 0 } to { opacity: 1 } }
                @keyframes settScaleIn { from { opacity: 0; transform: translate(-50%, -50%) scale(0.95) } to { opacity: 1; transform: translate(-50%, -50%) scale(1) } }
            `}</style>
        </>
    );
}
