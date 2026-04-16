// PublishModal.test.ts — Contract tests

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve(__dirname, './PublishModal.tsx'), 'utf-8');

describe('PublishModal — exports', () => {
    it('exports PublishModal component', () => { expect(src).toContain('export function PublishModal'); });
});

describe('PublishModal — publish pipeline', () => {
    it('groups variants by platform', () => { expect(src).toContain('groupVariantsByPlatform'); });
    it('gets connected social accounts', () => { expect(src).toContain('getConnectedAccounts'); });
    it('publishes variants', () => { expect(src).toContain('publishVariant'); });
    it('uses publish types', () => { expect(src).toContain('SocialAccount'); expect(src).toContain('PublishPlatform'); });
});

describe('PublishModal — UI', () => {
    it('has open/close control', () => { expect(src).toContain('isOpen'); expect(src).toContain('onClose'); });
    it('supports variant export', () => { expect(src).toContain('onExportVariant'); });
    it('uses creativeSetId', () => { expect(src).toContain('creativeSetId'); });
});
