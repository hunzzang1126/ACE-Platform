// ─────────────────────────────────────────────────
// smartContextHelpers.test.ts — Ring buffers, element summarizer, brand detector tests
// ─────────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/services/aiMemoryService', () => ({
    loadMemory: vi.fn().mockResolvedValue(null),
}));

vi.mock('@/ai/actionTracker', () => ({
    initActionTracker: vi.fn(),
}));

import {
    pushAction, getActionHistory, clearActionHistory,
    pushLastTouched, getLastTouched, clearLastTouched,
    pushAiChange, getAiChangeLog, clearAiChangeLog,
    summarizeElement, detectBrand,
} from './smartContextHelpers';

import type { DesignElement, TextElement, ShapeElement, ButtonElement } from '@/schema/elements.types';

// ── Helper factories ──

const makeConstraints = () => ({ position: { x: { anchor: 'left' as const, offset: 0 }, y: { anchor: 'top' as const, offset: 0 } }, size: { width: 100, height: 50 }, rotation: 0 });

function makeText(overrides: Partial<TextElement> = {}): TextElement {
    return {
        id: 'txt-1', name: 'Headline', type: 'text', role: 'headline',
        constraints: makeConstraints(), zIndex: 1, opacity: 1,
        content: 'Hello', fontSize: 24, color: '#ffffff', fontFamily: 'Inter',
        fontWeight: '700', fontStyle: 'normal', textAlign: 'left',
        lineHeight: 1.4, letterSpacing: 0, textDecoration: 'none',
        ...overrides,
    } as TextElement;
}

function makeShape(overrides: Partial<ShapeElement> = {}): ShapeElement {
    return {
        id: 'shp-1', name: 'Background', type: 'shape', role: 'background',
        constraints: makeConstraints(), zIndex: 0, opacity: 1,
        shapeType: 'rect', fill: '#0a0e1a', borderRadius: 0,
        ...overrides,
    } as ShapeElement;
}

function makeButton(overrides: Partial<ButtonElement> = {}): ButtonElement {
    return {
        id: 'btn-1', name: 'CTA', type: 'button', role: 'cta',
        constraints: makeConstraints(), zIndex: 2, opacity: 1,
        label: 'Buy Now', backgroundColor: '#2563eb', color: '#ffffff',
        fontSize: 14, fontFamily: 'Inter', fontWeight: '600', borderRadius: 6,
        ...overrides,
    } as ButtonElement;
}

describe('smartContextHelpers', () => {
    beforeEach(() => {
        clearActionHistory();
        clearLastTouched();
        clearAiChangeLog();
    });

    // ── Action History Ring Buffer ──

    describe('actionHistory', () => {
        it('should start empty', () => {
            expect(getActionHistory()).toEqual([]);
        });

        it('should push and retrieve actions', () => {
            pushAction('Added rect');
            pushAction('Changed color');
            const hist = getActionHistory();
            expect(hist).toEqual(['Added rect', 'Changed color']);
        });

        it('should cap at 10 entries', () => {
            for (let i = 0; i < 15; i++) pushAction(`Action ${i}`);
            const hist = getActionHistory();
            expect(hist).toHaveLength(10);
            expect(hist[0]).toBe('Action 5'); // oldest kept
            expect(hist[9]).toBe('Action 14'); // newest
        });

        it('should return a copy (not the internal array)', () => {
            pushAction('test');
            const hist = getActionHistory();
            hist.push('mutated');
            expect(getActionHistory()).toHaveLength(1);
        });

        it('should clear all entries', () => {
            pushAction('a');
            pushAction('b');
            clearActionHistory();
            expect(getActionHistory()).toEqual([]);
        });
    });

    // ── Last Touched Ring Buffer ──

    describe('lastTouched', () => {
        it('should start empty', () => {
            expect(getLastTouched()).toEqual([]);
        });

        it('should push elements with timestamp', () => {
            pushLastTouched('Headline', 0, 'user-selected');
            const touched = getLastTouched();
            expect(touched).toHaveLength(1);
            expect(touched[0].name).toBe('Headline');
            expect(touched[0].id).toBe(0);
            expect(touched[0].action).toBe('user-selected');
            expect(touched[0].timestamp).toBeGreaterThan(0);
        });

        it('should deduplicate same id+action', () => {
            pushLastTouched('Headline', 0, 'user-selected');
            pushLastTouched('Headline', 0, 'user-selected');
            expect(getLastTouched()).toHaveLength(1);
        });

        it('should keep different actions for same id', () => {
            pushLastTouched('Headline', 0, 'user-selected');
            pushLastTouched('Headline', 0, 'user-modified');
            expect(getLastTouched()).toHaveLength(2);
        });

        it('should cap at 5 entries', () => {
            for (let i = 0; i < 8; i++) pushLastTouched(`El${i}`, i, 'sel');
            expect(getLastTouched()).toHaveLength(5);
        });
    });

    // ── AI Change Log Ring Buffer ──

    describe('aiChangeLog', () => {
        it('should start empty', () => {
            expect(getAiChangeLog()).toEqual([]);
        });

        it('should push AI change records', () => {
            pushAiChange({ tool: 'add_shape', elementName: 'BG', summary: 'Added background', timestamp: Date.now() });
            expect(getAiChangeLog()).toHaveLength(1);
        });

        it('should cap at 15 entries', () => {
            for (let i = 0; i < 20; i++) {
                pushAiChange({ tool: 'modify', elementName: `El${i}`, summary: `Change ${i}`, timestamp: Date.now() });
            }
            expect(getAiChangeLog()).toHaveLength(15);
        });
    });

    // ── summarizeElement ──

    describe('summarizeElement', () => {
        it('should summarize text element', () => {
            const el = makeText({ content: 'Hello World' });
            const summary = summarizeElement(el as DesignElement);
            expect(summary.name).toBe('Headline');
            expect(summary.type).toBe('text');
            expect(summary.role).toBe('headline');
            expect(summary.props.content).toBe('Hello World');
            expect(summary.props.fontSize).toBe(24);
        });

        it('should truncate long text content to 40 chars', () => {
            const longContent = 'A'.repeat(50);
            const el = makeText({ content: longContent });
            const summary = summarizeElement(el as DesignElement);
            expect((summary.props.content as string).length).toBeLessThanOrEqual(43); // 40 + '…'
        });

        it('should summarize shape element', () => {
            const el = makeShape({ shapeType: 'ellipse', fill: '#ff0000' });
            const summary = summarizeElement(el as DesignElement);
            expect(summary.type).toBe('shape');
            expect(summary.props.shape).toBe('ellipse');
            expect(summary.props.fill).toBe('#ff0000');
        });

        it('should summarize button element', () => {
            const el = makeButton({ label: 'Click Me', backgroundColor: '#0033ff' });
            const summary = summarizeElement(el as DesignElement);
            expect(summary.type).toBe('button');
            expect(summary.props.label).toBe('Click Me');
            expect(summary.props.bgColor).toBe('#0033ff');
        });

        it('should summarize image element', () => {
            const el = {
                id: 'img-1', name: 'Hero Image', type: 'image' as const, role: 'hero',
                constraints: makeConstraints(), zIndex: 1, opacity: 1,
                src: 'https://example.com/img.png',
            } as DesignElement;
            const summary = summarizeElement(el);
            expect(summary.type).toBe('image');
            expect(summary.props.src).toBe('image');
        });
    });

    // ── detectBrand ──

    describe('detectBrand', () => {
        it('should return undefined for empty elements', () => {
            expect(detectBrand([])).toBeUndefined();
        });

        it('should detect background color from bg element', () => {
            const elements: DesignElement[] = [
                makeShape({ role: 'background', fill: '#1a1a2e' }) as DesignElement,
            ];
            const profile = detectBrand(elements)!;
            expect(profile.backgroundColor).toBe('#1a1a2e');
        });

        it('should detect primary color from accent shape', () => {
            const elements: DesignElement[] = [
                makeShape({ role: 'accent', fill: '#e94560', name: 'Accent' }) as DesignElement,
            ];
            const profile = detectBrand(elements)!;
            expect(profile.primaryColor).toBe('#e94560');
        });

        it('should detect primary color from CTA button', () => {
            const elements: DesignElement[] = [
                makeButton({ role: 'cta', backgroundColor: '#ff6b35' }) as DesignElement,
            ];
            const profile = detectBrand(elements)!;
            expect(profile.primaryColor).toBe('#ff6b35');
        });

        it('should detect text color from headline', () => {
            const elements: DesignElement[] = [
                makeText({ role: 'headline', color: '#ffd700' }) as DesignElement,
            ];
            const profile = detectBrand(elements)!;
            expect(profile.textColor).toBe('#ffd700');
        });

        it('should detect font family from text elements', () => {
            const elements: DesignElement[] = [
                makeText({ fontFamily: 'Outfit' }) as DesignElement,
            ];
            const profile = detectBrand(elements)!;
            expect(profile.fontFamily).toBe('Outfit');
        });

        it('should use defaults when no matching roles found', () => {
            const elements: DesignElement[] = [
                { id: 'img-1', name: 'Photo', type: 'image', constraints: makeConstraints(), zIndex: 0, opacity: 1 } as DesignElement,
            ];
            const profile = detectBrand(elements)!;
            expect(profile.backgroundColor).toBe('#0a0e1a'); // default
            expect(profile.primaryColor).toBe('#c9a84c'); // default
            expect(profile.fontFamily).toBe('Inter'); // default
        });
    });
});
