// ─────────────────────────────────────────────────
// Icons.test.tsx — Render smoke tests for all icons
// ─────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import {
    IcAi, IcSettings, IcSearch, IcExport, IcPlay, IcPause, IcStop, IcLoop,
    IcWarning, IcError, IcBell, IcImage, IcFilm, IcCode, IcSparkle, IcBolt,
    IcAlignLeft, IcAlignCenterH, IcAlignRight, IcAlignTop, IcAlignCenterV, IcAlignBottom,
    IcCursor, IcLayout, IcClose, IcChevronLeft, IcChevronRight, IcChevronDown, IcChevronUp,
    IcSend, IcHelp, IcLoader, IcFolder, IcCheck,
} from './Icons';

const ALL_ICONS = [
    ['IcAi', IcAi], ['IcSettings', IcSettings], ['IcSearch', IcSearch],
    ['IcExport', IcExport], ['IcPlay', IcPlay], ['IcPause', IcPause],
    ['IcStop', IcStop], ['IcLoop', IcLoop], ['IcWarning', IcWarning],
    ['IcError', IcError], ['IcBell', IcBell], ['IcImage', IcImage],
    ['IcFilm', IcFilm], ['IcCode', IcCode], ['IcSparkle', IcSparkle],
    ['IcBolt', IcBolt], ['IcAlignLeft', IcAlignLeft],
    ['IcAlignCenterH', IcAlignCenterH], ['IcAlignRight', IcAlignRight],
    ['IcAlignTop', IcAlignTop], ['IcAlignCenterV', IcAlignCenterV],
    ['IcAlignBottom', IcAlignBottom], ['IcCursor', IcCursor],
    ['IcLayout', IcLayout], ['IcClose', IcClose],
    ['IcChevronLeft', IcChevronLeft], ['IcChevronRight', IcChevronRight],
    ['IcChevronDown', IcChevronDown], ['IcChevronUp', IcChevronUp],
    ['IcSend', IcSend], ['IcHelp', IcHelp], ['IcLoader', IcLoader],
    ['IcFolder', IcFolder], ['IcCheck', IcCheck],
] as const;

describe('Icons — render smoke tests', () => {
    it.each(ALL_ICONS)('%s renders an SVG', (name, Icon) => {
        const { container } = render(<Icon />);
        const svg = container.querySelector('svg');
        expect(svg).not.toBeNull();
    });

    it.each(ALL_ICONS)('%s respects size prop', (name, Icon) => {
        const { container } = render(<Icon size={32} />);
        const svg = container.querySelector('svg');
        expect(svg?.getAttribute('width')).toBe('32');
        expect(svg?.getAttribute('height')).toBe('32');
    });

    it.each(ALL_ICONS)('%s respects color prop', (name, Icon) => {
        const { container } = render(<Icon color="#ff0000" />);
        const svg = container.querySelector('svg');
        // Some icons use stroke, some use fill for the color
        const hasColor = svg?.getAttribute('stroke') === '#ff0000' || svg?.getAttribute('fill') === '#ff0000';
        expect(hasColor).toBe(true);
    });

    it('uses default size 16', () => {
        const { container } = render(<IcAi />);
        const svg = container.querySelector('svg');
        expect(svg?.getAttribute('width')).toBe('16');
    });

    it('uses default color currentColor', () => {
        const { container } = render(<IcAi />);
        const svg = container.querySelector('svg');
        expect(svg?.getAttribute('stroke')).toBe('currentColor');
    });
});
