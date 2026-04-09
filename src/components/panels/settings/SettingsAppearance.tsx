// ─────────────────────────────────────────────────
// SettingsAppearance — Theme mode selector
// ─────────────────────────────────────────────────
// Three cards: Light / Dark / System
// Clean, minimal design matching Figma/Linear settings UX.

import { Section } from './settingsShared';
import { useThemeStore } from '@/stores/themeStore';
import type { ThemeMode } from '@/stores/themeStore';

const THEME_OPTIONS: { mode: ThemeMode; label: string; desc: string }[] = [
    { mode: 'light', label: 'Light', desc: 'Clean, bright interface' },
    { mode: 'dark', label: 'Dark', desc: 'Easy on the eyes' },
    { mode: 'system', label: 'System', desc: 'Match OS preference' },
];

/** Mini preview showing surface/text contrast */
function ThemePreview({ mode }: { mode: ThemeMode }) {
    const isDark = mode === 'dark' || (mode === 'system');
    const bg = isDark ? '#0B0F1A' : '#F0F2F5';
    const surface = isDark ? '#111827' : '#FFFFFF';
    const text = isDark ? '#F1F5F9' : '#1A1A2E';
    const muted = isDark ? '#64748B' : '#94A3B8';
    const accent = '#6366F1';

    return (
        <div style={{
            width: '100%', height: 64, borderRadius: 8, overflow: 'hidden',
            background: bg, padding: 8, display: 'flex', gap: 6,
        }}>
            {/* Mini sidebar */}
            <div style={{
                width: 20, background: surface, borderRadius: 4,
                display: 'flex', flexDirection: 'column', gap: 3, padding: 3,
            }}>
                <div style={{ width: 14, height: 3, borderRadius: 2, background: accent }} />
                <div style={{ width: 12, height: 2, borderRadius: 2, background: muted, opacity: 0.4 }} />
                <div style={{ width: 12, height: 2, borderRadius: 2, background: muted, opacity: 0.4 }} />
            </div>
            {/* Mini content */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ display: 'flex', gap: 4 }}>
                    <div style={{ width: 28, height: 4, borderRadius: 2, background: text, opacity: 0.7 }} />
                    <div style={{ width: 20, height: 4, borderRadius: 2, background: muted, opacity: 0.3, marginLeft: 'auto' }} />
                </div>
                <div style={{
                    flex: 1, borderRadius: 4, background: surface,
                    display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3, padding: 4,
                }}>
                    <div style={{ borderRadius: 3, background: muted, opacity: 0.15 }} />
                    <div style={{ borderRadius: 3, background: muted, opacity: 0.15 }} />
                </div>
            </div>
        </div>
    );
}

export function SettingsAppearance() {
    const currentMode = useThemeStore(s => s.mode);
    const setMode = useThemeStore(s => s.setMode);

    return (
        <Section title="Appearance">
            <p style={{ fontSize: 13, color: '#999', marginBottom: 16, lineHeight: 1.5 }}>
                Choose how Glid looks for you. Select a theme or let it follow your system preference.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                {THEME_OPTIONS.map(opt => {
                    const isActive = currentMode === opt.mode;
                    return (
                        <button
                            key={opt.mode}
                            onClick={() => setMode(opt.mode)}
                            style={{
                                padding: 12, borderRadius: 12, cursor: 'pointer',
                                border: isActive
                                    ? '2px solid #6366F1'
                                    : '1px solid rgba(255,255,255,0.08)',
                                background: isActive
                                    ? 'rgba(99,102,241,0.08)'
                                    : 'rgba(255,255,255,0.02)',
                                transition: 'all 0.2s ease',
                                display: 'flex', flexDirection: 'column', gap: 8,
                                textAlign: 'left',
                            }}
                        >
                            <ThemePreview mode={opt.mode} />
                            <div>
                                <div style={{
                                    fontSize: 13, fontWeight: 600,
                                    color: isActive ? '#f5f5f7' : '#c0c0c0',
                                }}>
                                    {opt.label}
                                </div>
                                <div style={{ fontSize: 11, color: '#86868b', marginTop: 2 }}>
                                    {opt.desc}
                                </div>
                            </div>
                            {/* Check indicator */}
                            {isActive && (
                                <div style={{
                                    position: 'absolute', top: 8, right: 8,
                                    width: 18, height: 18, borderRadius: '50%',
                                    background: 'linear-gradient(135deg, #6366F1, #2DD4BF)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}>
                                    <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="2 6 5 9 10 3" />
                                    </svg>
                                </div>
                            )}
                        </button>
                    );
                })}
            </div>
        </Section>
    );
}
