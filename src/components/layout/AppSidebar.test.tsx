// ─────────────────────────────────────────────────
// AppSidebar.test.tsx — Layout sidebar
// ─────────────────────────────────────────────────

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AppI18nProvider } from '@/i18n';

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
                <AppI18nProvider>
                    <AppSidebar />
                </AppI18nProvider>
            </MemoryRouter>
        );
        expect(container).toBeTruthy();
    });

    it('shows Projects link', () => {
        render(
            <MemoryRouter>
                <AppI18nProvider>
                    <AppSidebar />
                </AppI18nProvider>
            </MemoryRouter>
        );
        expect(screen.getByText('Projects')).toBeTruthy();
    });

    it('highlights Projects tab when on /dashboard route', () => {
        const { container } = render(
            <MemoryRouter initialEntries={['/dashboard']}>
                <AppI18nProvider>
                    <AppSidebar />
                </AppI18nProvider>
            </MemoryRouter>
        );
        // The active class should be applied
        const activeItems = container.querySelectorAll('.sidebar-nav-item.active');
        expect(activeItems.length).toBeGreaterThan(0);
    });

    it('highlights Projects tab when on / route', () => {
        const { container } = render(
            <MemoryRouter initialEntries={['/']}>
                <AppI18nProvider>
                    <AppSidebar />
                </AppI18nProvider>
            </MemoryRouter>
        );
        const activeItems = container.querySelectorAll('.sidebar-nav-item.active');
        expect(activeItems.length).toBeGreaterThan(0);
    });
});
