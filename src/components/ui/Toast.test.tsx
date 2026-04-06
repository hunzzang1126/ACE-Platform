// ─────────────────────────────────────────────────
// Toast.test.tsx — Toast store + component
// ─────────────────────────────────────────────────

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { useToastStore, toast, ToastContainer } from './Toast';

describe('useToastStore', () => {
    beforeEach(() => {
        useToastStore.setState({ toasts: [] });
    });

    it('starts with empty toasts', () => {
        expect(useToastStore.getState().toasts).toHaveLength(0);
    });

    it('show adds a toast', () => {
        useToastStore.getState().show('success', 'Saved!');
        expect(useToastStore.getState().toasts).toHaveLength(1);
        expect(useToastStore.getState().toasts[0]!.message).toBe('Saved!');
        expect(useToastStore.getState().toasts[0]!.type).toBe('success');
    });

    it('dismiss removes a toast by id', () => {
        useToastStore.getState().show('info', 'Hello');
        const id = useToastStore.getState().toasts[0]!.id;
        useToastStore.getState().dismiss(id);
        expect(useToastStore.getState().toasts).toHaveLength(0);
    });

    it('show multiple toasts', () => {
        useToastStore.getState().show('success', 'One');
        useToastStore.getState().show('error', 'Two');
        expect(useToastStore.getState().toasts).toHaveLength(2);
    });
});

describe('toast helper', () => {
    beforeEach(() => {
        useToastStore.setState({ toasts: [] });
    });

    it('toast.success creates success toast', () => {
        toast.success('Done!');
        expect(useToastStore.getState().toasts[0]!.type).toBe('success');
    });

    it('toast.error creates error toast', () => {
        toast.error('Failed!');
        expect(useToastStore.getState().toasts[0]!.type).toBe('error');
    });

    it('toast.info creates info toast', () => {
        toast.info('FYI');
        expect(useToastStore.getState().toasts[0]!.type).toBe('info');
    });

    it('toast.warning creates warning toast', () => {
        toast.warning('Watch out');
        expect(useToastStore.getState().toasts[0]!.type).toBe('warning');
    });
});

describe('ToastContainer', () => {
    beforeEach(() => {
        useToastStore.setState({ toasts: [] });
    });

    it('renders without crashing when empty', () => {
        const { container } = render(<ToastContainer />);
        expect(container).toBeTruthy();
    });

    it('renders toast messages', () => {
        useToastStore.getState().show('success', 'Test message');
        render(<ToastContainer />);
        expect(screen.getByText('Test message')).toBeTruthy();
    });
});
