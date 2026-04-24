import { describe, it, expect } from 'vitest';
import { decideBackgroundImage } from './backgroundImageDecider';

describe('decideBackgroundImage', () => {
    // ── Explicit requests → high confidence YES ──
    it('detects explicit "photo" request', () => {
        const r = decideBackgroundImage('Make a banner with a photo background');
        expect(r.needsImage).toBe(true);
        expect(r.confidence).toBe('high');
    });

    it('detects Korean "사진" request', () => {
        const r = decideBackgroundImage('배경 사진 있는 광고 만들어줘');
        expect(r.needsImage).toBe(true);
        expect(r.confidence).toBe('high');
    });

    it('detects "background image" request', () => {
        const r = decideBackgroundImage('I need a background image for my ad');
        expect(r.needsImage).toBe(true);
        expect(r.confidence).toBe('high');
    });

    it('detects Korean "이미지 넣" request', () => {
        const r = decideBackgroundImage('이미지 넣어줘');
        expect(r.needsImage).toBe(true);
        expect(r.confidence).toBe('high');
    });

    it('detects "hero shot" request', () => {
        const r = decideBackgroundImage('Create a hero shot ad');
        expect(r.needsImage).toBe(true);
        expect(r.confidence).toBe('high');
    });

    // ── Everything else → low confidence (defer to AI) ──
    it('defers iPhone ad to AI', () => {
        const r = decideBackgroundImage('iPhone 17 광고 만들어줘');
        expect(r.confidence).toBe('low');
    });

    it('defers concert poster to AI', () => {
        const r = decideBackgroundImage('Hip hop concert poster');
        expect(r.confidence).toBe('low');
    });

    it('defers SaaS to AI', () => {
        const r = decideBackgroundImage('SaaS dashboard promo');
        expect(r.confidence).toBe('low');
    });

    it('defers restaurant to AI', () => {
        const r = decideBackgroundImage('Italian restaurant opening');
        expect(r.confidence).toBe('low');
    });

    it('defers empty prompt to AI', () => {
        const r = decideBackgroundImage('');
        expect(r.confidence).toBe('low');
    });
});
