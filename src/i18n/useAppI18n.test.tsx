// ─────────────────────────────────────────────────
// useAppI18n Tests
// ─────────────────────────────────────────────────
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { AppI18nProvider, useAppI18n, registerTranslations } from './useAppI18n';
import type { ReactNode } from 'react';

// Register test translations
registerTranslations('test', {
    en: { hello: 'Hello', greeting: 'Welcome' },
    ko: { hello: '안녕하세요', greeting: '환영합니다' },
    ja: { hello: 'こんにちは', greeting: 'ようこそ' },
});

function wrapper({ children }: { children: ReactNode }) {
    return <AppI18nProvider>{children}</AppI18nProvider>;
}

describe('useAppI18n', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it('should provide default locale as en', () => {
        const { result } = renderHook(() => useAppI18n(), { wrapper });
        expect(result.current.locale).toBe('en');
    });

    it('should translate keys using t()', () => {
        const { result } = renderHook(() => useAppI18n(), { wrapper });
        expect(result.current.t('test.hello')).toBe('Hello');
        expect(result.current.t('test.greeting')).toBe('Welcome');
    });

    it('should return key when namespace not found', () => {
        const { result } = renderHook(() => useAppI18n(), { wrapper });
        expect(result.current.t('nonexistent.key')).toBe('nonexistent.key');
    });

    it('should return key when translation key not found in namespace', () => {
        const { result } = renderHook(() => useAppI18n(), { wrapper });
        expect(result.current.t('test.missingKey')).toBe('test.missingKey');
    });

    it('should return key as-is when no dot separator', () => {
        const { result } = renderHook(() => useAppI18n(), { wrapper });
        expect(result.current.t('nodot')).toBe('nodot');
    });

    it('should change locale and translate accordingly', () => {
        const { result } = renderHook(() => useAppI18n(), { wrapper });
        
        act(() => {
            result.current.setLocale('ko');
        });

        expect(result.current.locale).toBe('ko');
        expect(result.current.t('test.hello')).toBe('안녕하세요');
        expect(result.current.t('test.greeting')).toBe('환영합니다');
    });

    it('should fall back to English when locale has no translation', () => {
        const { result } = renderHook(() => useAppI18n(), { wrapper });
        
        act(() => {
            result.current.setLocale('th'); // Thai has no 'test' translations
        });

        // Should fall back to English
        expect(result.current.t('test.hello')).toBe('Hello');
    });

    it('should persist locale to localStorage', () => {
        const { result } = renderHook(() => useAppI18n(), { wrapper });
        
        act(() => {
            result.current.setLocale('ja');
        });

        expect(localStorage.getItem('glid-app-locale')).toBe('ja');
    });

    it('should restore locale from localStorage', () => {
        localStorage.setItem('glid-app-locale', 'ko');
        
        const { result } = renderHook(() => useAppI18n(), { wrapper });
        expect(result.current.locale).toBe('ko');
    });

    it('should detect locale from userPrefs in localStorage', () => {
        localStorage.setItem('glid-prefs-user-1', JSON.stringify({ preferredLanguage: 'Japanese' }));
        
        const { result } = renderHook(() => useAppI18n(), { wrapper });
        expect(result.current.locale).toBe('ja');
    });
});

describe('registerTranslations', () => {
    it('should merge translations for same namespace', () => {
        registerTranslations('merge-test', {
            en: { a: 'A' },
        });
        registerTranslations('merge-test', {
            en: { b: 'B' },
            ko: { a: 'ㄱ' },
        });

        const { result } = renderHook(() => useAppI18n(), { wrapper });
        expect(result.current.t('merge-test.a')).toBe('A');
        expect(result.current.t('merge-test.b')).toBe('B');

        act(() => { result.current.setLocale('ko'); });
        expect(result.current.t('merge-test.a')).toBe('ㄱ');
    });
});
