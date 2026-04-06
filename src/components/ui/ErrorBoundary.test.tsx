// ─────────────────────────────────────────────────
// ErrorBoundary.test.tsx — Error recovery component
// ─────────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import { render, screen } from '@testing-library/react';

// Suppress console.error from React error boundary
const originalError = console.error;
beforeEach(() => { console.error = vi.fn(); });

import { ErrorBoundary } from './ErrorBoundary';

function BrokenChild() {
    throw new Error('Test error');
    return null;
}

function WorkingChild() {
    return <div data-testid="child">Hello</div>;
}

describe('ErrorBoundary', () => {
    it('renders children when no error', () => {
        render(<ErrorBoundary><WorkingChild /></ErrorBoundary>);
        expect(screen.getByTestId('child').textContent).toBe('Hello');
    });

    it('catches errors and shows recovery UI', () => {
        render(<ErrorBoundary><BrokenChild /></ErrorBoundary>);
        // Should not show the child content
        expect(screen.queryByTestId('child')).toBeNull();
    });

    it('renders custom fallback when provided', () => {
        render(
            <ErrorBoundary fallback={<div data-testid="fallback">Custom Fallback</div>}>
                <BrokenChild />
            </ErrorBoundary>
        );
        expect(screen.getByTestId('fallback').textContent).toBe('Custom Fallback');
    });

    it('calls onError callback when error occurs', () => {
        const onError = vi.fn();
        render(
            <ErrorBoundary onError={onError}>
                <BrokenChild />
            </ErrorBoundary>
        );
        expect(onError).toHaveBeenCalledWith(
            expect.any(Error),
            expect.objectContaining({ componentStack: expect.any(String) }),
        );
    });

    afterAll(() => { console.error = originalError; });
});
