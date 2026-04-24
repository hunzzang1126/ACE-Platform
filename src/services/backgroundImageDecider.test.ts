import { describe, it, expect } from 'vitest';
import { decideBackgroundImage } from './backgroundImageDecider';

describe('decideBackgroundImage', () => {
    // ── Explicit requests → always yes ──
    it('returns true with high confidence for explicit photo request', () => {
        const r = decideBackgroundImage('Make a banner with a photo background');
        expect(r.needsImage).toBe(true);
        expect(r.confidence).toBe('high');
    });

    it('returns true for Korean explicit request (사진)', () => {
        const r = decideBackgroundImage('배경 사진 있는 광고 만들어줘');
        expect(r.needsImage).toBe(true);
        expect(r.confidence).toBe('high');
    });

    // ── Scene keywords → yes ──
    it('returns true for concert', () => {
        const r = decideBackgroundImage('Hip hop concert poster');
        expect(r.needsImage).toBe(true);
        expect(r.confidence).toBe('high');
    });

    it('returns true for restaurant', () => {
        const r = decideBackgroundImage('Italian restaurant grand opening');
        expect(r.needsImage).toBe(true);
        expect(r.confidence).toBe('high');
    });

    it('returns true for car ad', () => {
        const r = decideBackgroundImage('New car launch ad for sedan');
        expect(r.needsImage).toBe(true);
        expect(r.confidence).toBe('high');
    });

    it('returns true for Korean food prompt', () => {
        const r = decideBackgroundImage('맛집 광고 만들어줘');
        expect(r.needsImage).toBe(true);
        expect(r.confidence).toBe('high');
    });

    // ── Abstract keywords → no ──
    it('returns false for SaaS', () => {
        const r = decideBackgroundImage('SaaS analytics dashboard promo');
        expect(r.needsImage).toBe(false);
        expect(r.confidence).toBe('high');
    });

    it('returns false for finance', () => {
        const r = decideBackgroundImage('Investment fund banner ad');
        expect(r.needsImage).toBe(false);
        expect(r.confidence).toBe('high');
    });

    it('returns false for sale/discount', () => {
        const r = decideBackgroundImage('Flash sale 50% off everything');
        expect(r.needsImage).toBe(false);
        expect(r.confidence).toBe('high');
    });

    it('returns false for Korean fintech', () => {
        const r = decideBackgroundImage('핀테크 은행 서비스 광고');
        expect(r.needsImage).toBe(false);
        expect(r.confidence).toBe('high');
    });

    // ── Ambiguous → low confidence ──
    it('returns low confidence for ambiguous prompt', () => {
        const r = decideBackgroundImage('iPhone 17 광고 만들어줘');
        expect(r.confidence).toBe('low');
    });

    it('returns low confidence for generic brand ad', () => {
        const r = decideBackgroundImage('Nike summer campaign');
        expect(r.confidence).toBe('low');
    });

    it('returns low confidence for empty prompt', () => {
        const r = decideBackgroundImage('');
        expect(r.confidence).toBe('low');
    });
});
