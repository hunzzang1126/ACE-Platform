// ─────────────────────────────────────────────────
// OnboardingPage — First-time user setup
// ─────────────────────────────────────────────────
// Shown once after first sign-up. Steps:
// 1. Welcome  2. Language  3. Done → Dashboard
// ─────────────────────────────────────────────────

import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import {
    SUPPORTED_LANGUAGES,
    type SupportedLanguage,
    setPreferredLanguage,
    completeOnboardingAsync,
} from '@/stores/userPrefs';
import './landing.css';

// ── Language metadata (2-letter code + native name) ──

const LANG_META: Record<string, { code: string; native: string }> = {
    'English':               { code: 'EN', native: 'English' },
    'Korean':                { code: 'KO', native: '\ud55c\uad6d\uc5b4' },
    'Japanese':              { code: 'JA', native: '\u65e5\u672c\u8a9e' },
    'Chinese (Simplified)':  { code: 'ZH', native: '\u4e2d\u6587(\u7b80\u4f53)' },
    'Chinese (Traditional)': { code: 'ZH', native: '\u4e2d\u6587(\u7e41\u9ad4)' },
    'French':                { code: 'FR', native: 'Fran\u00e7ais' },
    'Spanish':               { code: 'ES', native: 'Espa\u00f1ol' },
    'German':                { code: 'DE', native: 'Deutsch' },
    'Portuguese':            { code: 'PT', native: 'Portugu\u00eas' },
    'Italian':               { code: 'IT', native: 'Italiano' },
    'Dutch':                 { code: 'NL', native: 'Nederlands' },
    'Russian':               { code: 'RU', native: '\u0420\u0443\u0441\u0441\u043a\u0438\u0439' },
    'Arabic':                { code: 'SA', native: '\u0627\u0644\u0639\u0631\u0628\u064a\u0629' },
    'Hindi':                 { code: 'HI', native: '\u0939\u093f\u0928\u094d\u0926\u0940' },
    'Thai':                  { code: 'TH', native: '\u0e44\u0e17\u0e22' },
    'Vietnamese':            { code: 'VI', native: 'Ti\u1ebfng Vi\u1ec7t' },
    'Indonesian':            { code: 'ID', native: 'Bahasa' },
    'Turkish':               { code: 'TR', native: 'T\u00fcrk\u00e7e' },
    'Polish':                { code: 'PL', native: 'Polski' },
    'Swedish':               { code: 'SE', native: 'Svenska' },
};

/** Detect default language from browser locale */
function detectBrowserLanguage(): SupportedLanguage {
    const locale = navigator.language?.toLowerCase() ?? '';
    if (locale.startsWith('ko')) return 'Korean';
    if (locale.startsWith('ja')) return 'Japanese';
    if (locale.startsWith('zh-tw') || locale.startsWith('zh-hant')) return 'Chinese (Traditional)';
    if (locale.startsWith('zh')) return 'Chinese (Simplified)';
    if (locale.startsWith('fr')) return 'French';
    if (locale.startsWith('es')) return 'Spanish';
    if (locale.startsWith('de')) return 'German';
    if (locale.startsWith('pt')) return 'Portuguese';
    if (locale.startsWith('it')) return 'Italian';
    if (locale.startsWith('nl')) return 'Dutch';
    if (locale.startsWith('ru')) return 'Russian';
    if (locale.startsWith('ar')) return 'Arabic';
    if (locale.startsWith('hi')) return 'Hindi';
    if (locale.startsWith('th')) return 'Thai';
    if (locale.startsWith('vi')) return 'Vietnamese';
    if (locale.startsWith('id')) return 'Indonesian';
    if (locale.startsWith('tr')) return 'Turkish';
    if (locale.startsWith('pl')) return 'Polish';
    if (locale.startsWith('sv')) return 'Swedish';
    return 'English';
}

type Step = 'welcome' | 'language' | 'done';

export function OnboardingPage() {
    const navigate = useNavigate();
    const user = useAuthStore(s => s.user);
    const userId = user?.id;
    const displayName = user?.displayName ?? 'there';

    const [step, setStep] = useState<Step>('welcome');
    const [selected, setSelected] = useState<SupportedLanguage>(detectBrowserLanguage);
    const [animating, setAnimating] = useState(false);

    const goNext = useCallback((next: Step) => {
        setAnimating(true);
        setTimeout(() => {
            setStep(next);
            setAnimating(false);
        }, 300);
    }, []);

    const handleFinish = useCallback(async () => {
        // Save to both localStorage + Supabase (cross-device persist)
        if (userId) {
            await completeOnboardingAsync(userId, selected);
        } else {
            // Fallback: no userId available, save to localStorage only
            setPreferredLanguage(selected);
            const { completeOnboarding } = await import('@/stores/userPrefs');
            completeOnboarding();
        }
        navigate('/dashboard', { replace: true });
    }, [selected, navigate, userId]);

    return (
        <div className="landing-page" style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            minHeight: '100vh',
        }}>
            {/* Background glow */}
            <div style={{
                position: 'absolute', width: 600, height: 600, borderRadius: '50%',
                background: 'var(--landing-gradient-1)', filter: 'blur(200px)',
                opacity: 0.06, top: '20%', left: '30%', pointerEvents: 'none',
            }} />

            <div style={{
                width: '100%', maxWidth: step === 'language' ? 640 : 440,
                padding: step === 'language' ? '36px 40px' : 40,
                background: 'var(--landing-card)',
                border: '1px solid var(--landing-card-border)',
                borderRadius: 20, backdropFilter: 'blur(40px)',
                position: 'relative',
                opacity: animating ? 0 : 1,
                transform: animating ? 'translateY(10px)' : 'translateY(0)',
                transition: 'all 0.3s ease',
            }}>
                {/* ── Step 1: Welcome ── */}
                {step === 'welcome' && (
                    <div style={{ textAlign: 'center' }}>
                        <div style={{
                            fontSize: 32, fontWeight: 700, letterSpacing: -1,
                            background: 'linear-gradient(135deg, var(--landing-gradient-1), var(--landing-gradient-2))',
                            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                            marginBottom: 12,
                        }}>
                            Welcome, {displayName}
                        </div>
                        <p style={{ fontSize: 15, color: 'var(--landing-text-muted)', lineHeight: 1.6, margin: '0 0 32px' }}>
                            Let's personalize Glid for you.<br />
                            This takes about 10 seconds.
                        </p>
                        <button onClick={() => goNext('language')} style={primaryBtnStyle}>
                            Get Started
                        </button>
                    </div>
                )}

                {/* ── Step 2: Language ── */}
                {step === 'language' && (
                    <div>
                        <div style={{ textAlign: 'center', marginBottom: 24 }}>
                            <div style={{ fontSize: 22, fontWeight: 700, color: '#f5f5f7', marginBottom: 6 }}>
                                Choose your content language
                            </div>
                            <p style={{ fontSize: 13, color: 'var(--landing-text-muted)', margin: 0 }}>
                                AI-generated copy will be written in this language by default
                            </p>
                        </div>

                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(4, 1fr)',
                            gap: 8,
                            maxHeight: 340,
                            overflowY: 'auto',
                            marginBottom: 24,
                            padding: '2px',
                        }}>
                            {SUPPORTED_LANGUAGES.map(lang => {
                                const meta = LANG_META[lang];
                                const isSelected = selected === lang;
                                return (
                                    <button
                                        key={lang}
                                        onClick={() => setSelected(lang)}
                                        style={{
                                            display: 'flex', flexDirection: 'column',
                                            alignItems: 'center', justifyContent: 'center',
                                            gap: 4, padding: '12px 6px',
                                            borderRadius: 12,
                                            background: isSelected
                                                ? 'rgba(139, 92, 246, 0.15)'
                                                : 'rgba(255, 255, 255, 0.03)',
                                            border: isSelected
                                                ? '1.5px solid rgba(139, 92, 246, 0.6)'
                                                : '1px solid rgba(255, 255, 255, 0.06)',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s',
                                            color: isSelected ? '#c4b5fd' : '#999',
                                        }}
                                    >
                                        <span style={{
                                            fontSize: 13, fontWeight: 700, letterSpacing: 1,
                                            width: 32, height: 32, borderRadius: '50%',
                                            background: isSelected ? 'rgba(139, 92, 246, 0.2)' : 'rgba(255, 255, 255, 0.06)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            color: isSelected ? '#c4b5fd' : '#888',
                                            transition: 'all 0.2s',
                                        }}>
                                            {meta?.code ?? ''}
                                        </span>
                                        <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: 0.3 }}>
                                            {meta?.native ?? lang}
                                        </span>
                                        <span style={{ fontSize: 9, opacity: 0.5 }}>
                                            {lang}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <button onClick={() => goNext('welcome')} style={ghostBtnStyle}>
                                Back
                            </button>
                            <button onClick={() => {
                                setPreferredLanguage(selected, userId);
                                goNext('done');
                            }} style={primaryBtnStyle}>
                                Continue
                            </button>
                        </div>
                    </div>
                )}

                {/* ── Step 3: Done ── */}
                {step === 'done' && (
                    <div style={{ textAlign: 'center' }}>
                        <div style={{
                            width: 64, height: 64, borderRadius: '50%',
                            background: 'linear-gradient(135deg, rgba(139,92,246,0.2), rgba(59,130,246,0.2))',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            margin: '0 auto 20px',
                        }}>
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#c4b5fd" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12" />
                            </svg>
                        </div>
                        <div style={{ fontSize: 24, fontWeight: 700, color: '#f5f5f7', marginBottom: 8 }}>
                            You're all set
                        </div>
                        <p style={{ fontSize: 14, color: 'var(--landing-text-muted)', lineHeight: 1.5, margin: '0 0 8px' }}>
                            Content language: <strong style={{ color: '#c4b5fd' }}>{selected}</strong>
                        </p>
                        <p style={{ fontSize: 12, color: 'var(--landing-text-muted)', margin: '0 0 28px' }}>
                            You can change this anytime in Settings
                        </p>
                        <button onClick={handleFinish} style={primaryBtnStyle}>
                            Go to Dashboard
                        </button>
                    </div>
                )}

                {/* Progress dots */}
                <div style={{
                    display: 'flex', justifyContent: 'center', gap: 6,
                    marginTop: 28,
                }}>
                    {(['welcome', 'language', 'done'] as Step[]).map((s, i) => (
                        <div key={i} style={{
                            width: step === s ? 20 : 6, height: 6, borderRadius: 3,
                            background: step === s
                                ? 'var(--landing-gradient-1)'
                                : 'rgba(255,255,255,0.12)',
                            transition: 'all 0.3s ease',
                        }} />
                    ))}
                </div>
            </div>
        </div>
    );
}

// ── Shared styles ──

const primaryBtnStyle: React.CSSProperties = {
    padding: '12px 32px', borderRadius: 12,
    background: 'linear-gradient(135deg, var(--landing-gradient-1), var(--landing-accent-2))',
    color: '#fff', border: 'none', fontSize: 14, fontWeight: 600,
    cursor: 'pointer', transition: 'all 0.2s', letterSpacing: 0.3,
};

const ghostBtnStyle: React.CSSProperties = {
    padding: '10px 20px', borderRadius: 10,
    background: 'transparent',
    color: 'var(--landing-text-muted)',
    border: '1px solid rgba(255,255,255,0.08)',
    fontSize: 13, fontWeight: 500, cursor: 'pointer',
    transition: 'all 0.2s',
};
