// creativeset.css — Contract tests for card header layout

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const css = readFileSync(resolve(__dirname, '../../styles/creativeset.css'), 'utf-8');

/**
 * Extract the CSS rule block for a given selector.
 * Finds the LAST matching block (more specific) to avoid
 * matching nested/prefixed selectors like .banner-card--dragging .banner-card-header.
 */
function extractRule(selector: string): string {
    // Find standalone selector (not preceded by another class)
    const regex = new RegExp(`(?:^|\\n)(${selector.replace('.', '\\.')}\\s*\\{)`, 'g');
    let lastMatch = -1;
    let m: RegExpExecArray | null;
    while ((m = regex.exec(css)) !== null) {
        // Check character before match — must be newline or start of file (not preceded by space or .)
        const preChar = m.index > 0 ? css[m.index - 1] : '\n';
        if (preChar === '\n' || m.index === 0) {
            lastMatch = m.index;
        }
    }
    if (lastMatch === -1) return '';
    const block = css.slice(lastMatch);
    const closeBrace = block.indexOf('}');
    return block.slice(0, closeBrace + 1);
}

describe('★ Banner Card Header Flex Layout (v0.0.0.601)', () => {
    it('card header uses flexbox', () => {
        const rule = extractRule('.banner-card-header');
        expect(rule).toContain('display: flex');
    });

    it('card header uses space-between for dims + kebab alignment', () => {
        const rule = extractRule('.banner-card-header');
        expect(rule).toContain('justify-content: space-between');
    });

    it('card header vertically centers items', () => {
        const rule = extractRule('.banner-card-header');
        expect(rule).toContain('align-items: center');
    });
});
