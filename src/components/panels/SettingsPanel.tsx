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

interface Props {
    isOpen: boolean;
    onClose: () => void;
}

// Country code → flag emoji
const FLAG_MAP: Record<string, string> = {
    'English': 'GB', 'Korean': 'KR', 'Japanese': 'JP',
    'Chinese (Simplified)': 'CN', 'Chinese (Traditional)': 'TW',
    'French': 'FR', 'Spanish': 'ES', 'German': 'DE',
    'Portuguese': 'PT', 'Italian': 'IT', 'Dutch': 'NL',
    'Russian': 'RU', 'Arabic': 'SA', 'Hindi': 'IN', 'Thai': 'TH',
    'Vietnamese': 'VN', 'Indonesian': 'ID', 'Turkish': 'TR',
    'Polish': 'PL', 'Swedish': 'SE',
};

function flagEmoji(lang: string): string {
    const code = FLAG_MAP[lang] ?? 'GB';
    return code.toUpperCase().split('').map(c =>
        String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65)
    ).join('');
}

export function SettingsPanel({ isOpen, onClose }: Props) {
    const [prefs, setPrefs] = useState<UserPrefs>(loadUserPrefs);
    const user = useAuthStore(s => s.user);
    const signOut = useAuthStore(s => s.signOut);

    // Reload prefs when panel opens
    useEffect(() => {
        if (isOpen) setPrefs(loadUserPrefs());
    }, [isOpen]);

    const update = useCallback((patch: Partial<UserPrefs>) => {
        setPrefs(prev => {
            const next = { ...prev, ...patch };
            saveUserPrefs(next);
            return next;
        });
    }, []);

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
                                    {flagEmoji(lang)}  {lang}
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

// ── Shared styles ──

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
