// ─────────────────────────────────────────────────
// circuitBreaker.test.ts — State machine tests
// ─────────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CircuitBreaker, getAiCircuitBreaker, getCircuitOpenMessage } from './circuitBreaker';

describe('CircuitBreaker', () => {
    let cb: CircuitBreaker;

    beforeEach(() => {
        cb = new CircuitBreaker({ failureThreshold: 3, cooldownMs: 1000 });
    });

    describe('initial state', () => {
        it('should start closed', () => {
            expect(cb.getState().state).toBe('closed');
            expect(cb.canCall()).toBe(true);
        });

        it('should have zero failures', () => {
            expect(cb.getState().failureCount).toBe(0);
        });
    });

    describe('failure tracking', () => {
        it('should stay closed below threshold', () => {
            cb.recordFailure();
            cb.recordFailure();
            expect(cb.getState().state).toBe('closed');
            expect(cb.canCall()).toBe(true);
        });

        it('should open at threshold', () => {
            cb.recordFailure();
            cb.recordFailure();
            cb.recordFailure();
            expect(cb.getState().state).toBe('open');
            expect(cb.canCall()).toBe(false);
        });

        it('should reset on success', () => {
            cb.recordFailure();
            cb.recordFailure();
            cb.recordSuccess();
            expect(cb.getState().failureCount).toBe(0);
            expect(cb.getState().state).toBe('closed');
        });
    });

    describe('cooldown', () => {
        it('should block calls when open', () => {
            cb.recordFailure();
            cb.recordFailure();
            cb.recordFailure();
            expect(cb.canCall()).toBe(false);
        });

        it('should transition to half-open after cooldown', () => {
            vi.useFakeTimers();
            cb.recordFailure();
            cb.recordFailure();
            cb.recordFailure();
            expect(cb.canCall()).toBe(false);

            vi.advanceTimersByTime(1100);
            expect(cb.canCall()).toBe(true); // half-open
            expect(cb.getState().state).toBe('half-open');
            vi.useRealTimers();
        });
    });

    describe('half-open state', () => {
        beforeEach(() => {
            vi.useFakeTimers();
            cb.recordFailure();
            cb.recordFailure();
            cb.recordFailure();
            vi.advanceTimersByTime(1100);
            cb.canCall(); // triggers half-open
        });

        afterEach(() => {
            vi.useRealTimers();
        });

        it('should close on success probe', () => {
            cb.recordSuccess();
            expect(cb.getState().state).toBe('closed');
            expect(cb.getState().failureCount).toBe(0);
        });

        it('should re-open on failure probe', () => {
            cb.recordFailure();
            expect(cb.getState().state).toBe('open');
        });
    });

    describe('reset', () => {
        it('should reset to initial state', () => {
            cb.recordFailure();
            cb.recordFailure();
            cb.recordFailure();
            cb.reset();
            expect(cb.getState().state).toBe('closed');
            expect(cb.getState().failureCount).toBe(0);
            expect(cb.canCall()).toBe(true);
        });
    });
});

describe('singleton', () => {
    it('should return same instance', () => {
        const a = getAiCircuitBreaker();
        const b = getAiCircuitBreaker();
        expect(a).toBe(b);
    });

    it('should return user-friendly message', () => {
        const msg = getCircuitOpenMessage();
        expect(msg).toContain('AI');
        expect(msg).toContain('unavailable');
    });
});
