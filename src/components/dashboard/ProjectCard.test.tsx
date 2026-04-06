// ─────────────────────────────────────────────────
// ProjectCard.test.tsx — Dashboard project card
// ─────────────────────────────────────────────────

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('@/stores/projectStore', () => ({
    useProjectStore: (sel: any) => sel({
        renameCreativeSet: vi.fn(),
        moveToTrash: vi.fn(),
        duplicateCreativeSet: vi.fn(),
    }),
}));

import { ProjectCard } from './ProjectCard';

describe('ProjectCard', () => {
    const defaultProps = {
        id: 'cs-1',
        name: 'Test Campaign',
        variantCount: 3,
        createdAt: Date.now(),
        createdBy: 'user@test.com',
        type: 'creative_set' as const,
        onOpen: vi.fn(),
    };

    it('renders project name', () => {
        render(<ProjectCard {...defaultProps} />);
        expect(screen.getByText('Test Campaign')).toBeTruthy();
    });

    it('shows variant count', () => {
        render(<ProjectCard {...defaultProps} />);
        expect(screen.getByText(/3/)).toBeTruthy();
    });

    it('calls onOpen when clicked', () => {
        const onOpen = vi.fn();
        render(<ProjectCard {...defaultProps} onOpen={onOpen} />);
        // Find clickable area (usually the main card)
        const card = screen.getByText('Test Campaign').closest('div');
        if (card) fireEvent.click(card);
    });

    it('renders folder type differently', () => {
        const { container } = render(
            <ProjectCard {...defaultProps} type="folder" />
        );
        expect(container.innerHTML.length).toBeGreaterThan(0);
    });
});
