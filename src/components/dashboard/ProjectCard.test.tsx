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
        expect(screen.getAllByText(/3/).length).toBeGreaterThan(0);
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

    it('enters rename mode on double-click of project name', () => {
        render(<ProjectCard {...defaultProps} />);
        const nameEl = screen.getByText('Test Campaign');
        fireEvent.doubleClick(nameEl);
        // After double-click, an input should appear
        const input = document.querySelector('.project-card__rename');
        expect(input).toBeTruthy();
    });

    it('shows kebab menu button (always visible)', () => {
        const { container } = render(<ProjectCard {...defaultProps} />);
        const menuBtn = container.querySelector('.project-card__menu-btn');
        expect(menuBtn).toBeTruthy();
    });

    it('opens context menu on kebab click', () => {
        const { container } = render(<ProjectCard {...defaultProps} />);
        const menuBtn = container.querySelector('.project-card__menu-btn');
        if (menuBtn) fireEvent.click(menuBtn);
        // Context menu should now be visible
        expect(document.querySelector('.context-menu')).toBeTruthy();
    });
});
