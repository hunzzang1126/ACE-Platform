// ─────────────────────────────────────────────────
// OnboardingGuide.test — Source structure tests
// ─────────────────────────────────────────────────
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const guideSrc = fs.readFileSync(
    path.resolve(__dirname, './OnboardingGuide.tsx'), 'utf-8'
);

describe('OnboardingGuide component structure', () => {
    it('imports isGuideDismissed from onboardingStore', () => {
        expect(guideSrc).toContain('isGuideDismissed');
    });

    it('imports dismissGuide from onboardingStore', () => {
        expect(guideSrc).toContain('dismissGuide');
    });

    it('exports GuideStep interface', () => {
        expect(guideSrc).toContain('export interface GuideStep');
    });

    it('exports OnboardingGuide function', () => {
        expect(guideSrc).toContain('export function OnboardingGuide');
    });

    it('has backdrop with z-index 9998', () => {
        expect(guideSrc).toContain('zIndex: 9998');
    });

    it('has card with z-index 9999', () => {
        expect(guideSrc).toContain('zIndex: 9999');
    });

    it('renders step indicator dots for multi-step', () => {
        expect(guideSrc).toContain('steps.length > 1');
    });

    it('has Next and Got It button labels', () => {
        expect(guideSrc).toContain("guide.next");
        expect(guideSrc).toContain("guide.gotIt");
    });

    it('has dont show again button', () => {
        expect(guideSrc).toContain('guide.dontShowAgain');
    });

    it('uses glass card styling with backdrop-filter', () => {
        expect(guideSrc).toContain('backdropFilter');
        expect(guideSrc).toContain('blur(20px)');
    });

    it('uses brand gradient for active dot', () => {
        expect(guideSrc).toContain('#6366F1');
        expect(guideSrc).toContain('#2DD4BF');
    });
});

// ── i18n coverage ──
describe('Guide i18n translations', () => {
    const i18nSrc = fs.readFileSync(
        path.resolve(__dirname, '../../i18n/guideI18n.ts'), 'utf-8'
    );

    it('has en translations', () => {
        expect(i18nSrc).toContain("en: {");
    });

    it('has ko translations', () => {
        expect(i18nSrc).toContain("ko: {");
    });

    it('has all dashboard steps in en', () => {
        expect(i18nSrc).toContain("'dashboard.step1Title'");
        expect(i18nSrc).toContain("'dashboard.step2Title'");
    });

    it('has all sizes steps in en', () => {
        expect(i18nSrc).toContain("'sizes.step1Title'");
        expect(i18nSrc).toContain("'sizes.step2Title'");
    });

    it('has all editor steps in en', () => {
        expect(i18nSrc).toContain("'editor.step1Title'");
        expect(i18nSrc).toContain("'editor.step2Title'");
    });

    it('has common keys: next, gotIt, dontShowAgain', () => {
        expect(i18nSrc).toContain('next:');
        expect(i18nSrc).toContain('gotIt:');
        expect(i18nSrc).toContain('dontShowAgain:');
    });
});

// ── Wiring checks ──
describe('Guide wiring in pages', () => {
    const dashSrc = fs.readFileSync(
        path.resolve(__dirname, '../../app/DashboardPage.tsx'), 'utf-8'
    );
    const sizesSrc = fs.readFileSync(
        path.resolve(__dirname, '../../app/GeneralEditorPage.tsx'), 'utf-8'
    );
    const editorSrc = fs.readFileSync(
        path.resolve(__dirname, '../../app/DetailEditorPage.tsx'), 'utf-8'
    );

    it('DashboardPage imports OnboardingGuide', () => {
        expect(dashSrc).toContain('OnboardingGuide');
    });

    it('DashboardPage uses page="dashboard"', () => {
        expect(dashSrc).toContain('page="dashboard"');
    });

    it('GeneralEditorPage imports OnboardingGuide', () => {
        expect(sizesSrc).toContain('OnboardingGuide');
    });

    it('GeneralEditorPage uses page="sizes"', () => {
        expect(sizesSrc).toContain('page="sizes"');
    });

    it('DetailEditorPage imports OnboardingGuide', () => {
        expect(editorSrc).toContain('OnboardingGuide');
    });

    it('DetailEditorPage uses page="editor"', () => {
        expect(editorSrc).toContain('page="editor"');
    });
});
