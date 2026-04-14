// ─────────────────────────────────────────────────
// aiSuggestions.test.ts — Context-aware AI suggestions tests
// ─────────────────────────────────────────────────
import { describe, it, expect } from 'vitest';
import { getAiSuggestions } from './aiSuggestions';
import type { CanvasContext } from './aiSuggestions';

const base: CanvasContext = { page: 'detail', elementCount: 0, selectionCount: 0, selectedTypes: [], hasText: false, hasImages: false };

describe('getAiSuggestions', () => {
    it('returns dashboard suggestions for dashboard page', () => {
        const result = getAiSuggestions({ ...base, page: 'dashboard' });
        expect(result.length).toBeGreaterThanOrEqual(2);
        expect(result.some(s => s.id === 'create-ad')).toBe(true);
    });

    it('returns dashboard suggestions for editor (size grid) page', () => {
        const result = getAiSuggestions({ ...base, page: 'editor' });
        expect(result.some(s => s.id === 'create-ad')).toBe(true);
    });

    it('returns empty canvas suggestions when no elements', () => {
        const result = getAiSuggestions({ ...base, page: 'detail', elementCount: 0 });
        expect(result.some(s => s.id === 'gen-hero')).toBe(true);
    });

    it('returns canvas idle suggestions when elements exist but none selected', () => {
        const result = getAiSuggestions({ ...base, page: 'detail', elementCount: 5, selectionCount: 0 });
        expect(result.some(s => s.id === 'quality-check')).toBe(true);
    });

    it('returns text suggestions when a text element is selected', () => {
        const result = getAiSuggestions({ ...base, page: 'detail', elementCount: 3, selectionCount: 1, selectedTypes: ['text'] });
        expect(result.some(s => s.id === 'rewrite')).toBe(true);
    });

    it('returns element suggestions when a shape is selected', () => {
        const result = getAiSuggestions({ ...base, page: 'detail', elementCount: 3, selectionCount: 1, selectedTypes: ['rect'] });
        expect(result.some(s => s.id === 'change-color')).toBe(true);
    });

    it('returns multi-select suggestions when 2+ selected', () => {
        const result = getAiSuggestions({ ...base, page: 'detail', elementCount: 5, selectionCount: 3, selectedTypes: ['rect', 'text', 'image'] });
        expect(result.some(s => s.id === 'align-all')).toBe(true);
    });

    it('all suggestions have required fields', () => {
        const contexts: CanvasContext[] = [
            { ...base, page: 'dashboard' },
            { ...base, page: 'detail', elementCount: 0 },
            { ...base, page: 'detail', elementCount: 3, selectionCount: 1, selectedTypes: ['text'] },
            { ...base, page: 'detail', elementCount: 5, selectionCount: 2, selectedTypes: ['rect', 'text'] },
        ];
        for (const ctx of contexts) {
            const result = getAiSuggestions(ctx);
            for (const s of result) {
                expect(s.id).toBeTruthy();
                expect(s.labelKey).toBeTruthy();
                expect(s.hintKey).toBeTruthy();
                expect(typeof s.prompt).toBe('string');
            }
        }
    });

    it('always returns at least 2 suggestions', () => {
        const contexts: CanvasContext[] = [
            { ...base, page: 'dashboard' },
            { ...base, page: 'detail', elementCount: 0 },
            { ...base, page: 'detail', elementCount: 5, selectionCount: 0 },
            { ...base, page: 'detail', elementCount: 3, selectionCount: 1, selectedTypes: ['image'] },
        ];
        for (const ctx of contexts) {
            expect(getAiSuggestions(ctx).length).toBeGreaterThanOrEqual(2);
        }
    });
});
