// ─────────────────────────────────────────────────
// UpgradeModal.test.tsx — Billing upgrade modal
// ─────────────────────────────────────────────────

import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { UpgradeModal, type UpgradeReason } from './UpgradeModal';

const ALL_REASONS: UpgradeReason[] = [
    'creative_set_limit', 'ai_token_limit', 'export_format',
    'variant_limit', 'brand_cloud', 'team_seats',
];

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

    it.each(ALL_REASONS)('renders for reason: %s', (reason) => {
        const { container } = render(
            <MemoryRouter>
                <UpgradeModal isOpen={true} onClose={vi.fn()} reason={reason} />
            </MemoryRouter>
        );
        // Should have content (title, description, buttons)
        expect(container.innerHTML.length).toBeGreaterThan(100);
    });

    it('renders usage bar when usage props provided', () => {
        const { container } = render(
            <MemoryRouter>
                <UpgradeModal isOpen={true} onClose={vi.fn()} reason="ai_token_limit" currentUsage={18} limit={20} />
            </MemoryRouter>
        );
        expect(container.innerHTML).toContain('18');
        expect(container.innerHTML).toContain('20');
    });

    it('renders feature chips', () => {
        const { container } = render(
            <MemoryRouter>
                <UpgradeModal isOpen={true} onClose={vi.fn()} reason="creative_set_limit" />
            </MemoryRouter>
        );
        // Feature chips should render (at least 2 spans with feature text)
        const spans = container.querySelectorAll('span');
        expect(spans.length).toBeGreaterThanOrEqual(3);
    });
});
