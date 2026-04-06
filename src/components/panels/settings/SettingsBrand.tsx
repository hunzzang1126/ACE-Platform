// ─────────────────────────────────────────────────
// SettingsBrand — Brand colors
// ─────────────────────────────────────────────────

import type { UserPrefs } from '@/stores/userPrefs';
import { Section } from './settingsShared';

interface Props {
    prefs: UserPrefs;
    onUpdate: (patch: Partial<UserPrefs>) => void;
}

function ColorInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
                type="color" value={value} onChange={e => onChange(e.target.value)}
                style={{ width: 28, height: 28, padding: 0, border: 'none', borderRadius: 6, cursor: 'pointer', background: 'none' }}
            />
            <div>
                <div style={{ fontSize: 12, color: '#c8c8cc' }}>{label}</div>
                <div style={{ fontSize: 10, color: '#555', fontFamily: 'monospace' }}>{value}</div>
            </div>
        </div>
    );
}

export function SettingsBrand({ prefs, onUpdate }: Props) {
    return (
        <Section title="Brand Colors">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <ColorInput label="Primary" value={prefs.brandColors.primary}
                    onChange={v => onUpdate({ brandColors: { ...prefs.brandColors, primary: v } })} />
                <ColorInput label="Secondary" value={prefs.brandColors.secondary}
                    onChange={v => onUpdate({ brandColors: { ...prefs.brandColors, secondary: v } })} />
                <ColorInput label="Background" value={prefs.brandColors.background}
                    onChange={v => onUpdate({ brandColors: { ...prefs.brandColors, background: v } })} />
                <ColorInput label="Text" value={prefs.brandColors.text}
                    onChange={v => onUpdate({ brandColors: { ...prefs.brandColors, text: v } })} />
            </div>
        </Section>
    );
}
