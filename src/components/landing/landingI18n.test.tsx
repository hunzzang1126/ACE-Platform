// ─────────────────────────────────────────────────
// landingI18n.test.tsx — Landing page i18n
// ─────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { LANG_OPTIONS, useLandingI18n, LandingI18nProvider, type LandingLang } from './landingI18n';

// Test component that uses the hook
function TestConsumer() {
    const { t, lang, setLang } = useLandingI18n();
    return (
        <div>
            <span data-testid="lang">{lang}</span>
            <span data-testid="text">{t('navFeatures')}</span>
            <button onClick={() => setLang('ko')}>switch</button>
        </div>
    );
}

describe('LANG_OPTIONS', () => {
    it('has 10 languages', () => {
        expect(LANG_OPTIONS).toHaveLength(10);
    });

    it('starts with English', () => {
        expect(LANG_OPTIONS[0]!.code).toBe('en');
    });

    it('all have code and label', () => {
        for (const opt of LANG_OPTIONS) {
            expect(opt.code.length).toBeGreaterThan(0);
            expect(opt.label.length).toBeGreaterThan(0);
        }
    });

    it('includes major languages', () => {
        const codes = LANG_OPTIONS.map(o => o.code);
        expect(codes).toContain('en');
        expect(codes).toContain('ko');
        expect(codes).toContain('ja');
        expect(codes).toContain('zh');
        expect(codes).toContain('es');
    });
});

describe('LandingI18nProvider + useLandingI18n', () => {
    it('renders provider without crashing', () => {
        const { container } = render(
            <LandingI18nProvider>
                <div>child</div>
            </LandingI18nProvider>
        );
        expect(container.textContent).toContain('child');
    });

    it('provides English translations by default', () => {
        render(
            <LandingI18nProvider>
                <TestConsumer />
            </LandingI18nProvider>
        );
        expect(screen.getByTestId('lang').textContent).toBe('en');
        expect(screen.getByTestId('text').textContent).toBe('Features');
    });

    it('switches language via setLang', () => {
        render(
            <LandingI18nProvider>
                <TestConsumer />
            </LandingI18nProvider>
        );
        act(() => {
            screen.getByText('switch').click();
        });
        expect(screen.getByTestId('lang').textContent).toBe('ko');
        expect(screen.getByTestId('text').textContent).toBe('기능');
    });
});
