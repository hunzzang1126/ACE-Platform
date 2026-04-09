// ─────────────────────────────────────────────────
// settingsShared — Shared styles + Section component
// ─────────────────────────────────────────────────

import type React from 'react';

export type SettingsTab = 'general' | 'appearance' | 'account' | 'billing' | 'brand' | 'connections';

export const SETTINGS_TABS: { key: SettingsTab; label: string }[] = [
    { key: 'general', label: 'General' },
    { key: 'appearance', label: 'Appearance' },
    { key: 'account', label: 'Account' },
    { key: 'billing', label: 'Billing' },
    { key: 'brand', label: 'Brand' },
    { key: 'connections', label: 'Connections' },
];

export function Section({ title, children }: { title: string; children: React.ReactNode }) {
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

export const selectStyle: React.CSSProperties = {
    width: '100%', padding: '10px 12px', borderRadius: 10,
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    color: '#e5e5e7', fontSize: 13, fontFamily: 'inherit',
    outline: 'none', appearance: 'none',
    cursor: 'pointer',
};

export const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: 12, color: '#999',
    marginBottom: 6, fontWeight: 500,
};

export const descStyle: React.CSSProperties = {
    fontSize: 12, color: '#666', margin: '0 0 10px', lineHeight: 1.4,
};
