// ─────────────────────────────────────────────────
// UpgradeModal.test.tsx — Billing upgrade modal
// ─────────────────────────────────────────────────

import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { UpgradeModal } from './UpgradeModal';

describe('UpgradeModal', () => {
    it('renders nothing when not open', () => {
        const { container } = render(
            <MemoryRouter>
                <UpgradeModal isOpen={false} onClose={vi.fn()} reason="creative_set_limit" />
            </MemoryRouter>
        );
        expect(container.textContent).toBe('');
    });

    it('renders when open', () => {
        const { container } = render(
            <MemoryRouter>
                <UpgradeModal isOpen={true} onClose={vi.fn()} reason="creative_set_limit" />
            </MemoryRouter>
        );
        expect(container.innerHTML.length).toBeGreaterThan(0);
    });
});
