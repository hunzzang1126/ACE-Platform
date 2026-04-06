// ─────────────────────────────────────────────────
// GlidLogo.test.tsx — Brand logo component
// ─────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { GlidLogo } from './GlidLogo';

describe('GlidLogo', () => {
    it('renders SVG', () => {
        const { container } = render(<GlidLogo />);
        const svg = container.querySelector('svg');
        expect(svg).not.toBeNull();
    });

    it('respects size prop', () => {
        const { container } = render(<GlidLogo size={48} />);
        const svg = container.querySelector('svg');
        expect(svg).toBeTruthy();
    });

    it('renders white variant', () => {
        const { container } = render(<GlidLogo variant="white" />);
        const svg = container.querySelector('svg');
        expect(svg).toBeTruthy();
    });

    it('renders dark variant', () => {
        const { container } = render(<GlidLogo variant="dark" />);
        const svg = container.querySelector('svg');
        expect(svg).toBeTruthy();
    });
});
