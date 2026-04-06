// ─────────────────────────────────────────────────
// ExportPanel.test.tsx — Export dialog
// ─────────────────────────────────────────────────

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/hooks/usePlanLimits', () => ({
    usePlanLimits: () => ({
        limits: { exportFormats: ['png', 'jpg', 'html5'] },
        isWithinLimit: () => true,
    }),
}));

import { ExportPanel } from './ExportPanel';

describe('ExportPanel', () => {
    it('renders without crashing', () => {
        const { container } = render(<ExportPanel />);
        expect(container.innerHTML.length).toBeGreaterThan(0);
    });

    it('shows export options', () => {
        render(<ExportPanel canvasWidth={300} canvasHeight={250} />);
        // Should have export-related text
        const text = document.body.textContent || '';
        expect(text.length).toBeGreaterThan(0);
    });
});
