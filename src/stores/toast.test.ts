// ─────────────────────────────────────────────────
// Toast Store — Unit Tests
// ─────────────────────────────────────────────────
// Tests for the toast notification system.

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useToastStore, toast } from '@/components/ui/Toast';

beforeEach(() => {
    useToastStore.setState({ toasts: [] });
    vi.useFakeTimers();
});

describe('useToastStore — show', () => {
    it('creates toast with auto-generated id', () => {
        useToastStore.getState().show('success', 'Saved successfully');
        const toasts = useToastStore.getState().toasts;
        expect(toasts).toHaveLength(1);
        expect(toasts[0]!.type).toBe('success');
        expect(toasts[0]!.message).toBe('Saved successfully');
        expect(toasts[0]!.id).toMatch(/^toast-/);
    });

    it('supports all 4 toast types', () => {
        const store = useToastStore.getState();
        store.show('success', 'OK');
        store.show('error', 'Failed');
        store.show('info', 'Info');
        store.show('warning', 'Warning');

        const toasts = useToastStore.getState().toasts;
        expect(toasts).toHaveLength(4);
        expect(toasts.map(t => t.type)).toEqual(['success', 'error', 'info', 'warning']);
    });

    it('returns the toast id', () => {
        const id = useToastStore.getState().show('success', 'Test');
        expect(id).toMatch(/^toast-/);
    });

    it('error defaults to 6000ms duration', () => {
        useToastStore.getState().show('error', 'Oops');
        expect(useToastStore.getState().toasts[0]!.duration).toBe(6000);
    });

    it('success defaults to 3000ms duration', () => {
        useToastStore.getState().show('success', 'OK');
        expect(useToastStore.getState().toasts[0]!.duration).toBe(3000);
    });

    it('caps at 5 visible toasts (slice -4 + 1 new)', () => {
        const store = useToastStore.getState();
        for (let i = 0; i < 10; i++) {
            store.show('info', `Message ${i}`, { duration: 0 }); // no auto-dismiss
        }
        expect(useToastStore.getState().toasts.length).toBeLessThanOrEqual(5);
    });
});

describe('useToastStore — dismiss', () => {
    it('removes toast by id', () => {
        const id = useToastStore.getState().show('success', 'Test', { duration: 0 });
        expect(useToastStore.getState().toasts).toHaveLength(1);

        useToastStore.getState().dismiss(id);
        expect(useToastStore.getState().toasts).toHaveLength(0);
    });

    it('non-existent id does nothing', () => {
        useToastStore.getState().show('success', 'Test', { duration: 0 });
        useToastStore.getState().dismiss('non-existent');
        expect(useToastStore.getState().toasts).toHaveLength(1);
    });
});

describe('useToastStore — clear', () => {
    it('removes all toasts', () => {
        const store = useToastStore.getState();
        store.show('success', 'A', { duration: 0 });
        store.show('info', 'B', { duration: 0 });
        store.show('error', 'C', { duration: 0 });
        expect(useToastStore.getState().toasts).toHaveLength(3);

        useToastStore.getState().clear();
        expect(useToastStore.getState().toasts).toHaveLength(0);
    });
});

describe('toast convenience functions', () => {
    it('toast.success creates success toast', () => {
        toast.success('OK');
        expect(useToastStore.getState().toasts[0]!.type).toBe('success');
    });

    it('toast.error creates error toast', () => {
        toast.error('Fail');
        expect(useToastStore.getState().toasts[0]!.type).toBe('error');
    });

    it('toast.info creates info toast', () => {
        toast.info('Info');
        expect(useToastStore.getState().toasts[0]!.type).toBe('info');
    });

    it('toast.warning creates warning toast', () => {
        toast.warning('Warn');
        expect(useToastStore.getState().toasts[0]!.type).toBe('warning');
    });
});

describe('useToastStore — auto-dismiss', () => {
    it('auto-removes toast after duration', () => {
        useToastStore.getState().show('success', 'Test'); // default 3000ms
        expect(useToastStore.getState().toasts).toHaveLength(1);

        vi.advanceTimersByTime(3100);
        expect(useToastStore.getState().toasts).toHaveLength(0);
    });

    it('does NOT auto-remove if duration=0', () => {
        useToastStore.getState().show('success', 'Persistent', { duration: 0 });
        vi.advanceTimersByTime(10000);
        expect(useToastStore.getState().toasts).toHaveLength(1);
    });
});
