// ─────────────────────────────────────────────────
// TemplatePreviewCard.test.ts — Cache + queue perf tests
// ─────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import {
    getCachedPreview,
    invalidatePreviewCache,
} from './TemplatePreviewCard';

describe('TemplatePreview cache system', () => {
    it('should return null for uncached templates', () => {
        expect(getCachedPreview('non-existent-template')).toBeNull();
    });

    it('should return null after invalidation', () => {
        // Even if something was cached, invalidation should clear it
        invalidatePreviewCache('test-template-123');
        expect(getCachedPreview('test-template-123')).toBeNull();
    });

    it('should not throw on invalidating non-existent key', () => {
        expect(() => invalidatePreviewCache('does-not-exist')).not.toThrow();
    });
});

describe('TemplatePreviewCard source structure', () => {
    it('should include render queue with concurrency limit', async () => {
        const fs = await import('fs');
        const { resolve } = await import('path');
        const source = fs.readFileSync(resolve(__dirname, 'TemplatePreviewCard.tsx'), 'utf-8');

        expect(source).toContain('MAX_CONCURRENT');
        expect(source).toContain('acquireRenderSlot');
        expect(source).toContain('releaseRenderSlot');
    });

    it('should use useMemo for JSON.parse (prevents re-parsing)', async () => {
        const fs = await import('fs');
        const { resolve } = await import('path');
        const source = fs.readFileSync(resolve(__dirname, 'TemplatePreviewCard.tsx'), 'utf-8');

        expect(source).toContain('useMemo');
        expect(source).toContain('JSON.parse(template.variantSnapshot)');
        // Should depend on variantSnapshot string, not the template object
        expect(source).toContain('[template.variantSnapshot]');
    });

    it('should check cache before rendering', async () => {
        const fs = await import('fs');
        const { resolve } = await import('path');
        const source = fs.readFileSync(resolve(__dirname, 'TemplatePreviewCard.tsx'), 'utf-8');

        // Cache check at top of useEffect
        expect(source).toContain('getCachedPreview(templateId)');
        // Cache store after render
        expect(source).toContain('setCachedPreview(templateId, url)');
    });

    it('should pass templateId to FabricPreview', async () => {
        const fs = await import('fs');
        const { resolve } = await import('path');
        const source = fs.readFileSync(resolve(__dirname, 'TemplatePreviewCard.tsx'), 'utf-8');

        expect(source).toContain('templateId={template.id}');
    });
});
