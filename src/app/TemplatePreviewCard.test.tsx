// ─────────────────────────────────────────────────
// TemplatePreviewCard.test.tsx — Tests for Fabric.js-based template preview
// ─────────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TemplatePreview } from './TemplatePreviewCard';
import type { DesignTemplate } from '@/stores/templateStore';
import type { BannerVariant } from '@/schema/design.types';

// Mock Fabric.js headless renderer
const mockRenderVariant = vi.fn();
vi.mock('@/components/creativeset/fabricHeadlessRenderer', () => ({
    renderVariantWithFabric: (...args: any[]) => mockRenderVariant(...args),
}));

const mockVariant: BannerVariant = {
    id: 'v-test',
    preset: { id: 'p-1080', name: '1080x1080', width: 1080, height: 1080, category: 'social' },
    elements: [],
    backgroundColor: '#ffffff',
    overriddenElementIds: [],
    syncLocked: false,
};

function makeTemplate(overrides: Partial<DesignTemplate> = {}): DesignTemplate {
    return {
        id: 'test-template',
        name: 'Test Template',
        description: 'A test template',
        category: 'display',
        tags: ['test'],
        thumbnailSrc: '',
        width: 1080,
        height: 1080,
        variantSnapshot: JSON.stringify(mockVariant),
        usageCount: 0,
        isBuiltIn: false,
        isFavorite: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ...overrides,
    };
}

describe('TemplatePreview — fallback states', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockRenderVariant.mockResolvedValue('data:image/png;base64,abc');
    });

    it('shows dimension placeholder when variantSnapshot is invalid JSON', () => {
        const template = makeTemplate({ variantSnapshot: 'INVALID_JSON' });
        render(<TemplatePreview template={template} />);
        expect(screen.getByText('1080 x 1080')).toBeTruthy();
    });

    it('shows dimension placeholder when variantSnapshot is empty', () => {
        const template = makeTemplate({ variantSnapshot: '' });
        render(<TemplatePreview template={template} />);
        expect(screen.getByText('1080 x 1080')).toBeTruthy();
    });

    it('calls renderVariantWithFabric when variant is valid', () => {
        const template = makeTemplate();
        render(<TemplatePreview template={template} />);
        expect(mockRenderVariant).toHaveBeenCalledTimes(1);
    });

    it('passes correct preset dimensions to renderer', () => {
        const template = makeTemplate();
        render(<TemplatePreview template={template} />);
        const calledVariant = mockRenderVariant.mock.calls[0][0] as BannerVariant;
        expect(calledVariant.preset.width).toBe(1080);
        expect(calledVariant.preset.height).toBe(1080);
    });

    it('shows loading spinner before render completes', () => {
        // Never resolve
        mockRenderVariant.mockReturnValue(new Promise(() => {}));
        const template = makeTemplate();
        const { container } = render(<TemplatePreview template={template} />);
        // Should have a spinning div (the loading indicator)
        const spinner = container.querySelector('[style*="animation"]');
        expect(spinner).toBeTruthy();
    });

    it('shows error fallback when renderer throws', async () => {
        mockRenderVariant.mockRejectedValue(new Error('Canvas error'));
        const template = makeTemplate();
        render(<TemplatePreview template={template} />);
        // Wait for error state
        await vi.waitFor(() => {
            expect(screen.getByText('1080 x 1080')).toBeTruthy();
        });
    });

    it('renders img element after successful render', async () => {
        mockRenderVariant.mockResolvedValue('data:image/png;base64,testdata');
        const template = makeTemplate();
        render(<TemplatePreview template={template} />);
        await vi.waitFor(() => {
            const img = screen.getByAltText('1080x1080');
            expect(img).toBeTruthy();
            expect(img.getAttribute('src')).toBe('data:image/png;base64,testdata');
        });
    });

    it('sets correct preview dimensions (220px width, proportional height)', async () => {
        mockRenderVariant.mockResolvedValue('data:image/png;base64,abc');
        // 300x250 template — different aspect ratio
        const variant = { ...mockVariant, preset: { ...mockVariant.preset, width: 300, height: 250 } };
        const template = makeTemplate({ width: 300, height: 250, variantSnapshot: JSON.stringify(variant) });
        render(<TemplatePreview template={template} />);
        await vi.waitFor(() => {
            const img = screen.getByAltText('300x250');
            expect(img.getAttribute('width')).toBe('220');
            // 250 * (220/300) ≈ 183.33
            const expectedH = Math.round(250 * (220 / 300));
            expect(Number(img.getAttribute('height'))).toBeCloseTo(expectedH, 0);
        });
    });
});
