// ─────────────────────────────────────────────────
// ResultPreviewCard — Unit Tests
// ─────────────────────────────────────────────────

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ResultPreviewCard } from './ResultPreviewCard';

// Mock i18n
vi.mock('@/i18n', () => ({
    useAppI18n: () => ({ t: (key: string) => key }),
}));

// Mock memory service
vi.mock('@/services/aiMemoryService', () => ({
    recordFeedback: vi.fn().mockResolvedValue(undefined),
}));

describe('ResultPreviewCard', () => {
    it('renders summary text', () => {
        render(<ResultPreviewCard summary="Design created successfully" />);
        expect(screen.getByText('Design created successfully')).toBeTruthy();
    });

    it('renders design complete header', () => {
        render(<ResultPreviewCard summary="Done" />);
        expect(screen.getByText('ai.designComplete')).toBeTruthy();
    });

    it('renders element count when provided', () => {
        render(<ResultPreviewCard summary="Done" elementCount={5} />);
        expect(screen.getByText(/5/)).toBeTruthy();
    });

    it('renders duration when provided', () => {
        render(<ResultPreviewCard summary="Done" durationSec={3} />);
        expect(screen.getByText('3s')).toBeTruthy();
    });

    it('has thumbs up and down buttons', () => {
        render(<ResultPreviewCard summary="Done" />);
        const likeBtn = screen.getByTitle('ai.feedbackLike');
        const dislikeBtn = screen.getByTitle('ai.feedbackDislike');
        expect(likeBtn).toBeTruthy();
        expect(dislikeBtn).toBeTruthy();
    });

    it('shows confirmation after thumbs up click', async () => {
        render(<ResultPreviewCard summary="Done" />);
        const likeBtn = screen.getByTitle('ai.feedbackLike');
        fireEvent.click(likeBtn);
        // After click, confirmation text appears
        expect(screen.getByText('ai.feedbackThanks')).toBeTruthy();
    });

    it('shows confirmation after thumbs down click', async () => {
        render(<ResultPreviewCard summary="Done" />);
        const dislikeBtn = screen.getByTitle('ai.feedbackDislike');
        fireEvent.click(dislikeBtn);
        expect(screen.getByText('ai.feedbackNoted')).toBeTruthy();
    });

    it('does not render element count when zero', () => {
        const { container } = render(<ResultPreviewCard summary="Done" elementCount={0} />);
        expect(container.textContent).not.toContain('ai.elementsCreated');
    });
});
