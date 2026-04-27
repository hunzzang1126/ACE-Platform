// ─────────────────────────────────────────────────
// aiMemoryService.test.ts — Tests for Persistent AI Memory
// ─────────────────────────────────────────────────

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
    memoryToPromptSection,
    type AiMemory,
    type AiPreferences,
    type DesignEntry,
} from '@/services/aiMemoryService';

// ═══════════════════════════════════════════════════
// memoryToPromptSection — converts memory to LLM prompt
// ═══════════════════════════════════════════════════

describe('aiMemoryService', () => {
    describe('memoryToPromptSection', () => {
        it('returns empty string for empty memory', () => {
            const memory: AiMemory = {
                preferences: {},
                designHistory: [],
                conversationSummary: '',
            };
            expect(memoryToPromptSection(memory)).toBe('');
        });

        it('includes color tone preference', () => {
            const memory: AiMemory = {
                preferences: { colorTone: 'dark' },
                designHistory: [],
                conversationSummary: '',
            };
            const result = memoryToPromptSection(memory);
            expect(result).toContain('Color tone: dark');
            expect(result).toContain('USER PREFERENCES');
        });

        it('includes preferred style', () => {
            const memory: AiMemory = {
                preferences: { preferredStyle: 'minimal' },
                designHistory: [],
                conversationSummary: '',
            };
            const result = memoryToPromptSection(memory);
            expect(result).toContain('Style: minimal');
        });

        it('includes preferred fonts', () => {
            const memory: AiMemory = {
                preferences: { preferredFonts: ['Montserrat', 'Playfair Display'] },
                designHistory: [],
                conversationSummary: '',
            };
            const result = memoryToPromptSection(memory);
            expect(result).toContain('Fonts: Montserrat, Playfair Display');
        });

        it('includes content language', () => {
            const memory: AiMemory = {
                preferences: { contentLanguage: 'Korean' },
                designHistory: [],
                conversationSummary: '',
            };
            const result = memoryToPromptSection(memory);
            expect(result).toContain('Language: Korean');
        });

        it('includes industry', () => {
            const memory: AiMemory = {
                preferences: { industry: 'luxury fashion' },
                designHistory: [],
                conversationSummary: '',
            };
            const result = memoryToPromptSection(memory);
            expect(result).toContain('Industry: luxury fashion');
        });

        it('includes multiple preferences separated by pipe', () => {
            const memory: AiMemory = {
                preferences: {
                    colorTone: 'warm',
                    preferredStyle: 'photography',
                    industry: 'hospitality',
                },
                designHistory: [],
                conversationSummary: '',
            };
            const result = memoryToPromptSection(memory);
            expect(result).toContain('Color tone: warm');
            expect(result).toContain('Style: photography');
            expect(result).toContain('Industry: hospitality');
            expect(result).toContain(' | ');
        });

        it('includes recent design history (last 3)', () => {
            const memory: AiMemory = {
                preferences: {},
                designHistory: [
                    { timestamp: 1, prompt: 'luxury hotel lobby ad', style: 'photography', feedback: 'liked' },
                    { timestamp: 2, prompt: 'summer sale banner', style: 'illustration', feedback: 'disliked' },
                    { timestamp: 3, prompt: 'tech product launch', style: 'minimal', feedback: null },
                    { timestamp: 4, prompt: 'winter holiday promo', feedback: 'modified', modification: 'changed colors' },
                ],
                conversationSummary: '',
            };
            const result = memoryToPromptSection(memory);
            expect(result).toContain('RECENT DESIGNS');
            // Only last 3 should be shown
            expect(result).not.toContain('luxury hotel');
            expect(result).toContain('summer sale');
            expect(result).toContain('tech product');
            expect(result).toContain('winter holiday');
        });

        it('includes feedback markers in design history', () => {
            const memory: AiMemory = {
                preferences: {},
                designHistory: [
                    { timestamp: 1, prompt: 'test prompt', feedback: 'liked' },
                ],
                conversationSummary: '',
            };
            const result = memoryToPromptSection(memory);
            expect(result).toContain('liked');
        });

        it('includes conversation summary', () => {
            const memory: AiMemory = {
                preferences: {},
                designHistory: [],
                conversationSummary: 'User prefers dark themes with gold accents.',
            };
            const result = memoryToPromptSection(memory);
            expect(result).toContain('PREVIOUS SESSION');
            expect(result).toContain('User prefers dark themes');
        });

        it('truncates long conversation summaries to 200 chars', () => {
            const memory: AiMemory = {
                preferences: {},
                designHistory: [],
                conversationSummary: 'A'.repeat(300),
            };
            const result = memoryToPromptSection(memory);
            // The prompt section should contain at most 200 chars of the summary
            const summaryPart = result.split('PREVIOUS SESSION: ')[1];
            expect(summaryPart).toBeDefined();
            expect(summaryPart!.trim().length).toBeLessThanOrEqual(201); // 200 + newline
        });

        it('includes all sections when memory is full', () => {
            const memory: AiMemory = {
                preferences: {
                    colorTone: 'cool',
                    preferredStyle: 'abstract',
                    preferredFonts: ['Inter'],
                    contentLanguage: 'English',
                    industry: 'fintech',
                },
                designHistory: [
                    { timestamp: 1, prompt: 'fintech dashboard banner', style: 'minimal', feedback: 'liked' },
                ],
                conversationSummary: 'User creates fintech marketing materials.',
            };
            const result = memoryToPromptSection(memory);
            expect(result).toContain('User Memory (Persistent)');
            expect(result).toContain('USER PREFERENCES');
            expect(result).toContain('RECENT DESIGNS');
            expect(result).toContain('PREVIOUS SESSION');
        });

        it('truncates long design prompts to 60 chars', () => {
            const memory: AiMemory = {
                preferences: {},
                designHistory: [
                    { timestamp: 1, prompt: 'A very long design prompt that exceeds sixty characters in length and should be truncated', feedback: null },
                ],
                conversationSummary: '',
            };
            const result = memoryToPromptSection(memory);
            // The prompt in the output should be cut at 60 chars
            expect(result).toContain('"A very long design prompt that exceeds sixty characters in');
        });
    });
});

// ═══════════════════════════════════════════════════
// extractFacts — passive preference learning
// ═══════════════════════════════════════════════════

import { extractFacts } from '@/services/aiMemoryService';
import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('extractFacts — keyword-based preference extraction', () => {
    it('detects dark color tone', () => {
        const facts = extractFacts('make it dark and moody', '');
        expect(facts.colorTone).toBe('dark');
    });

    it('detects bright color tone', () => {
        const facts = extractFacts('use vibrant bright colors', '');
        expect(facts.colorTone).toBe('bright');
    });

    it('detects warm color tone', () => {
        const facts = extractFacts('I want a warm cozy feel', '');
        expect(facts.colorTone).toBe('warm');
    });

    it('detects cool color tone', () => {
        const facts = extractFacts('cool icy winter theme', '');
        expect(facts.colorTone).toBe('cool');
    });

    it('detects neutral/minimal color tone', () => {
        const facts = extractFacts('keep it minimal and clean', '');
        expect(facts.colorTone).toBe('neutral');
    });

    it('detects minimal style', () => {
        const facts = extractFacts('minimal clean design please', '');
        expect(facts.preferredStyle).toBe('minimal');
    });

    it('detects realistic/photo style', () => {
        const facts = extractFacts('use realistic photo style', '');
        expect(facts.preferredStyle).toBe('realistic');
    });

    it('detects illustration style', () => {
        const facts = extractFacts('give me an illustration cartoon look', '');
        expect(facts.preferredStyle).toBe('illustration');
    });

    it('detects fashion industry from shoe keyword', () => {
        const facts = extractFacts('create a shoe advertisement banner', '');
        expect(facts.industry).toBe('fashion');
    });

    it('detects food industry from restaurant keyword', () => {
        const facts = extractFacts('design a restaurant menu promo', '');
        expect(facts.industry).toBe('food');
    });

    it('detects technology industry', () => {
        const facts = extractFacts('make a tech software product ad', '');
        expect(facts.industry).toBe('technology');
    });

    it('detects Korean language from Hangul', () => {
        const facts = extractFacts('포트나이트 광고 만들어줘', '');
        expect(facts.contentLanguage).toBe('Korean');
    });

    it('detects Japanese language from Kana', () => {
        // Uses pure Hiragana/Katakana (no Kanji) so it doesn't match Chinese regex first
        const facts = extractFacts('こんにちは', '');
        expect(facts.contentLanguage).toBe('Japanese');
    });

    it('detects Chinese language from Hanzi', () => {
        const facts = extractFacts('创建一个广告设计', '');
        expect(facts.contentLanguage).toBe('Chinese');
    });

    it('returns empty for neutral prompts', () => {
        const facts = extractFacts('create a fortnite game ad', '');
        // 'fortnite' doesn't match any industry keyword
        expect(Object.keys(facts).length).toBeLessThanOrEqual(1); // might detect language only
    });
});

// ═══════════════════════════════════════════════════
// ★ REGRESSION GUARD: Design flow saves to AI memory
// ═══════════════════════════════════════════════════

describe('★ REGRESSION GUARD: AI Memory is saved after design generation', () => {
    it('agentGenerateFlow.ts calls addDesignEntry after design', () => {
        const src = readFileSync(resolve(__dirname, '../hooks/agentGenerateFlow.ts'), 'utf-8');
        expect(src).toContain('addDesignEntry');
        expect(src).toContain('saveAiMemory');
        expect(src).toContain("import('@/services/aiMemoryService')");
    });

    it('aiService.ts imports saveInteractionMemory', () => {
        const src = readFileSync(resolve(__dirname, '../ai/aiService.ts'), 'utf-8');
        expect(src).toContain('saveInteractionMemory');
        expect(src).toContain("from './aiServiceHelpers'");
    });

    it('aiServiceHelpers.ts contains extractFacts and saveAiMemory', () => {
        const src = readFileSync(resolve(__dirname, '../ai/aiServiceHelpers.ts'), 'utf-8');
        expect(src).toContain('extractFacts');
        expect(src).toContain('saveAiMemory');
    });

    it('saveAiMemory function exists and is exported', async () => {
        const mod = await import('@/services/aiMemoryService');
        expect(typeof mod.saveAiMemory).toBe('function');
    });

    it('addDesignEntry function exists and is exported', async () => {
        const mod = await import('@/services/aiMemoryService');
        expect(typeof mod.addDesignEntry).toBe('function');
    });

    it('extractFacts function exists and is exported', async () => {
        const mod = await import('@/services/aiMemoryService');
        expect(typeof mod.extractFacts).toBe('function');
    });
});
