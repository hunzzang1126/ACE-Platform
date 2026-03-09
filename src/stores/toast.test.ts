// ─────────────────────────────────────────────────
// Toast.test — Toast notification store tests
// ─────────────────────────────────────────────────
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useToastStore, toast } from '../components/ui/Toast';

describe('useToastStore', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        useToastStore.setState({ toasts: [] });
    });

    it('shows a toast', () => {
        const id = useToastStore.getState().show('success', 'Saved');
        expect(id).toBeTruthy();
        expect(useToastStore.getState().toasts.length).toBe(1);
        expect(useToastStore.getState().toasts[0]!.message).toBe('Saved');
        expect(useToastStore.getState().toasts[0]!.type).toBe('success');
    });

    it('auto-dismisses after duration', () => {
        useToastStore.getState().show('info', 'Test', { duration: 1000 });
        expect(useToastStore.getState().toasts.length).toBe(1);

        vi.advanceTimersByTime(1001);
        expect(useToastStore.getState().toasts.length).toBe(0);
    });

    it('dismisses manually', () => {
        const id = useToastStore.getState().show('info', 'Test', { duration: 0 });
        expect(useToastStore.getState().toasts.length).toBe(1);

        useToastStore.getState().dismiss(id);
        expect(useToastStore.getState().toasts.length).toBe(0);
    });

    it('clears all toasts', () => {
        useToastStore.getState().show('success', 'A', { duration: 0 });
        useToastStore.getState().show('error', 'B', { duration: 0 });
        useToastStore.getState().show('info', 'C', { duration: 0 });

        useToastStore.getState().clear();
        expect(useToastStore.getState().toasts.length).toBe(0);
    });

    it('limits visible toasts to 5', () => {
        for (let i = 0; i < 8; i++) {
            useToastStore.getState().show('info', `Toast ${i}`, { duration: 0 });
        }
        expect(useToastStore.getState().toasts.length).toBeLessThanOrEqual(5);
    });

    it('error toast has longer default duration', () => {
        useToastStore.getState().show('error', 'Error');
        const t = useToastStore.getState().toasts[0]!;
        expect(t.duration).toBe(6000);
    });

    it('success toast has shorter default duration', () => {
        useToastStore.getState().show('success', 'Done');
        const t = useToastStore.getState().toasts[0]!;
        expect(t.duration).toBe(3000);
    });
});

describe('toast convenience functions', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        useToastStore.setState({ toasts: [] });
    });

    it('toast.success creates success toast', () => {
        toast.success('Saved');
        expect(useToastStore.getState().toasts[0]!.type).toBe('success');
    });

    it('toast.error creates error toast', () => {
        toast.error('Failed');
        expect(useToastStore.getState().toasts[0]!.type).toBe('error');
    });

    it('toast.info creates info toast', () => {
        toast.info('FYI');
        expect(useToastStore.getState().toasts[0]!.type).toBe('info');
    });

    it('toast.warning creates warning toast', () => {
        toast.warning('Careful');
        expect(useToastStore.getState().toasts[0]!.type).toBe('warning');
    });

    it('supports action button', () => {
        const action = { label: 'Undo', onClick: vi.fn() };
        toast.success('Deleted', { action });
        const t = useToastStore.getState().toasts[0]!;
        expect(t.action).toBeDefined();
        expect(t.action!.label).toBe('Undo');
    });
});
