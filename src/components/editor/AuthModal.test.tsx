// ─────────────────────────────────────────────────
// AuthModal.test.tsx — Authentication modal
// ─────────────────────────────────────────────────

import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';

vi.mock('@/stores/authStore', () => ({
    useAuthStore: () => ({
        signInWithEmail: vi.fn(async () => {}),
        signUpWithEmail: vi.fn(async () => {}),
        signInWithGoogle: vi.fn(async () => {}),
        signOut: vi.fn(),
        isLoading: false,
        error: null,
        user: null,
    }),
}));

import { AuthModal } from './AuthModal';

describe('AuthModal', () => {
    it('renders login form', () => {
        const { container } = render(<AuthModal onClose={vi.fn()} onSuccess={vi.fn()} />);
        expect(container.innerHTML.length).toBeGreaterThan(0);
    });

    it('shows input fields', () => {
        render(<AuthModal onClose={vi.fn()} onSuccess={vi.fn()} />);
        const inputs = document.querySelectorAll('input');
        expect(inputs.length).toBeGreaterThanOrEqual(1);
    });
});
