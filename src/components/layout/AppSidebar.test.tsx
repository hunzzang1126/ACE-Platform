// ─────────────────────────────────────────────────
// AppSidebar.test.tsx — Layout sidebar
// ─────────────────────────────────────────────────

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/stores/authStore', () => ({
    useAuthStore: (sel: any) => sel({
        user: { email: 'test@test.com' },
        signOut: vi.fn(),
    }),
}));

vi.mock('@/components/panels/SettingsPanel', () => ({
    SettingsPanel: () => null,
}));

import { AppSidebar } from './AppSidebar';

describe('AppSidebar', () => {
    it('renders without crashing', () => {
        const { container } = render(
            <MemoryRouter>
                <AppSidebar />
            </MemoryRouter>
        );
        expect(container).toBeTruthy();
    });

    it('shows Projects link', () => {
        render(
            <MemoryRouter>
                <AppSidebar />
            </MemoryRouter>
        );
        expect(screen.getByText('Projects')).toBeTruthy();
    });
});
