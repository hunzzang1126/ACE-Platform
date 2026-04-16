// App.test.ts — Contract tests (auto-generated)

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve(__dirname, './App.tsx'), 'utf-8');

describe('App — exports', () => {
    it('exports App', () => { expect(src).toContain('export default function App'); });
});

describe('App — dependencies', () => {
    it('imports react-router-dom', () => { expect(src).toContain("react-router-dom"); });
    it('imports i18n', () => { expect(src).toContain("i18n"); });
    it('imports useCloudSync', () => { expect(src).toContain("useCloudSync"); });
    it('imports LandingPage', () => { expect(src).toContain("LandingPage"); });
    it('imports LoginPage', () => { expect(src).toContain("LoginPage"); });
    it('imports AuthCallback', () => { expect(src).toContain("AuthCallback"); });
    it('imports OnboardingPage', () => { expect(src).toContain("OnboardingPage"); });
    it('imports AdminPage', () => { expect(src).toContain("AdminPage"); });
});

