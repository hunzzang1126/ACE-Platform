// ─────────────────────────────────────────────────
// ColorPicker.test.tsx — Color picker component
// ─────────────────────────────────────────────────

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ColorPicker } from './ColorPicker';

describe('ColorPicker', () => {
    it('renders without crashing', () => {
        const { container } = render(<ColorPicker color="#ff0000" onChange={vi.fn()} />);
        expect(container).toBeTruthy();
    });

    it('renders with label', () => {
        render(<ColorPicker color="#ff0000" onChange={vi.fn()} label="Text Color" />);
        expect(screen.getByText('Text Color')).toBeTruthy();
    });

    it('renders color display element', () => {
        const { container } = render(<ColorPicker color="#ff0000" onChange={vi.fn()} />);
        expect(container.innerHTML.length).toBeGreaterThan(10);
    });
});
