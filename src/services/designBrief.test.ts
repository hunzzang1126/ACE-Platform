// ─────────────────────────────────────────────────
// designBrief.test.ts — Tests for Content-First Design Brief
// ─────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve(__dirname, './designBrief.ts'), 'utf-8');

describe('designBrief — module structure', () => {
    it('exports generateDesignBrief function', () => {
        expect(src).toContain('export async function generateDesignBrief');
    });

    it('exports DesignBrief interface', () => {
        expect(src).toContain('export interface DesignBrief');
    });

    it('DesignBrief has slots field', () => {
        expect(src).toContain('slots: ContentSlot[]');
    });

    it('DesignBrief has textDensity field', () => {
        expect(src).toContain('textDensity:');
    });

    it('DesignBrief has mood and industry fields', () => {
        expect(src).toContain('mood: string');
        expect(src).toContain('industry: string');
    });

    it('DesignBrief has reasoning field for CoT', () => {
        expect(src).toContain('reasoning: string');
    });
});

describe('designBrief — Chain-of-Thought prompt', () => {
    it('uses STEP 1 ANALYZE / STEP 2 GENERATE structure', () => {
        expect(src).toContain('STEP 1');
        expect(src).toContain('STEP 2');
        expect(src).toContain('ANALYZE');
    });

    it('instructs AI to decide which slots are needed', () => {
        expect(src).toContain('SLOTS this design actually needs');
    });

    it('provides slot guidance for each role', () => {
        expect(src).toContain('Does it need a subheadline');
        expect(src).toContain('Does it need a CTA');
        expect(src).toContain('Does it need a tag');
    });

    it('includes power words guidance', () => {
        expect(src).toContain('POWER WORDS');
        expect(src).toContain('Discover');
        expect(src).toContain('Unlock');
    });

    it('forbids UI terminology as content', () => {
        expect(src).toContain('ABSOLUTE PROHIBITIONS');
        expect(src).toContain('NEVER output font names');
    });
});

describe('designBrief — golden examples integration', () => {
    it('imports from copyExamples', () => {
        expect(src).toContain("from '@/services/copyExamples'");
    });

    it('calls selectExamples for few-shot injection', () => {
        expect(src).toContain('selectExamples');
    });

    it('calls formatExamplesForPrompt', () => {
        expect(src).toContain('formatExamplesForPrompt');
    });
});

describe('designBrief — validation logic', () => {
    it('has validateBrief function', () => {
        expect(src).toContain('validateBrief');
    });

    it('validates headline length', () => {
        expect(src).toContain('headline too short');
        expect(src).toContain('headline too long');
    });

    it('checks headline-subheadline redundancy', () => {
        expect(src).toContain('wordOverlap');
        expect(src).toContain('subheadline repeats headline');
    });

    it('auto-fixes slot consistency', () => {
        // If content exists but slot missing → auto-add
        expect(src).toContain("brief.slots.push('subheadline')");
        // If slot exists but content empty → auto-remove
        expect(src).toContain("brief.slots.filter(s => s !== 'subheadline')");
    });

    it('detects junk content (UI terms)', () => {
        expect(src).toContain('JUNK_PATTERN');
        expect(src).toContain('CTA is a UI term');
    });
});

describe('designBrief — self-correction', () => {
    it('retries on validation failure', () => {
        expect(src).toContain('MAX_ATTEMPTS');
        expect(src).toContain('retrying');
    });

    it('injects validation issues into retry prompt', () => {
        expect(src).toContain('Your previous output had issues');
        expect(src).toContain('Fix these specific problems');
    });

    it('lowers temperature on retry', () => {
        expect(src).toContain('attempt === 0 ? 0.6 : 0.4');
    });
});

describe('designBrief — user text extraction', () => {
    it('has extractUserText function', () => {
        expect(src).toContain('extractUserText');
    });

    it('extracts Korean-style text patterns', () => {
        expect(src).toContain('라는');
        expect(src).toContain('헤드라인');
    });

    it('fast-path when user provides headline + CTA', () => {
        expect(src).toContain('userProvided.headline && userProvided.cta');
        expect(src).toContain('User-provided text (used as-is)');
    });

    it('overrides AI output with user-provided text', () => {
        expect(src).toContain('userProvided.headline || parsed.headline');
    });
});

describe('designBrief — fallback safety', () => {
    it('provides fallback brief on total failure', () => {
        expect(src).toContain("reasoning: 'Fallback (AI generation failed)'");
    });

    it('sanitizes AI output with sanitizeBrief', () => {
        expect(src).toContain('sanitizeBrief');
    });

    it('builds slots from actual content in sanitizer', () => {
        expect(src).toContain("ContentSlot[] = ['headline']");
        expect(src).toContain("slots.push('subheadline')");
    });
});

describe('★ v745: sanitizeBrief — full sanitization pipeline', () => {
    it('has PROMPT_LEAKAGE detection', () => {
        expect(src).toContain('PROMPT_LEAKAGE_RE');
        expect(src).toContain('placeholder text');
        expect(src).toContain('sample');
    });

    it('has DESCRIPTIVE_PREFIX stripping', () => {
        expect(src).toContain('DESCRIPTIVE_PREFIX_RE');
        expect(src).toContain('text about');
        expect(src).toContain('ad copy');
    });

    it('has FONT_NAMES rejection', () => {
        expect(src).toContain('FONT_NAMES_RE');
        expect(src).toContain('inter');
        expect(src).toContain('roboto');
    });

    it('has title case conversion for Latin', () => {
        expect(src).toContain('toTitleCase');
        expect(src).toContain('isLatinOnly');
    });

    it('has Korean CTA term rejection', () => {
        expect(src).toContain('텍스트');
        expect(src).toContain('라벨');
    });

    it('★ REGRESSION: has prompt caching on brief system prompt', () => {
        expect(src).toContain("cache_control: { type: 'ephemeral'");
    });

    it('★ REGRESSION: slots are always content-derived, not AI rawSlots', () => {
        // rawSlots from AI can desync with sanitized content
        expect(src).toContain('Always use content-derived slots');
        expect(src).not.toContain('rawSlots.length > 0 ? rawSlots : slots');
    });
});
