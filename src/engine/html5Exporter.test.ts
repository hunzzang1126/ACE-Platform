// ─────────────────────────────────────────────────
// html5Exporter.test — HTML5 export tests
// ─────────────────────────────────────────────────
import { describe, it, expect, beforeEach } from 'vitest';
import { exportToHtml5 } from './html5Exporter';
import type { EngineNode } from '@/hooks/canvasTypes';
import { useAnimPresetStore } from '@/hooks/useAnimationPresets';

// Reset anim presets before each test
beforeEach(() => {
    useAnimPresetStore.setState({ presets: {} });
});

function makeNode(overrides: Partial<EngineNode> = {}): EngineNode {
    return {
        id: 1,
        type: 'rect',
        x: 10, y: 20,
        w: 100, h: 50,
        opacity: 1,
        z_index: 0,
        fill_r: 0.5, fill_g: 0.3, fill_b: 0.8,
        fill_a: 1,
        border_radius: 0,
        name: 'Test Rect',
        ...overrides,
    };
}

describe('exportToHtml5', () => {
    it('generates valid HTML document', () => {
        const result = exportToHtml5([], { width: 300, height: 250 });
        expect(result.html).toContain('<!DOCTYPE html>');
        expect(result.html).toContain('</html>');
        expect(result.html).toContain('width=300,height=250');
    });

    it('includes IAB ad.size meta tag', () => {
        const result = exportToHtml5([], { width: 728, height: 90 });
        expect(result.html).toContain('ad.size');
        expect(result.html).toContain('width=728,height=90');
    });

    it('includes clickTag script', () => {
        const result = exportToHtml5([], {
            width: 300, height: 250,
            clickTagUrl: 'https://example.com',
        });
        expect(result.html).toContain('var clickTag');
        expect(result.html).toContain('https://example.com');
    });

    it('renders rect element as div with background', () => {
        const nodes: EngineNode[] = [makeNode()];
        const result = exportToHtml5(nodes, { width: 300, height: 250 });
        expect(result.html).toContain('ace-el-1');
        expect(result.html).toContain('position: absolute');
        expect(result.html).toContain('left: 10px');
        expect(result.html).toContain('background:');
    });

    it('renders text element with content', () => {
        const nodes: EngineNode[] = [makeNode({
            type: 'text',
            content: 'Hello World',
            fontSize: 24,
            fontFamily: 'Inter',
            color: '#ff0000',
        })];
        const result = exportToHtml5(nodes, { width: 300, height: 250 });
        expect(result.html).toContain('Hello World');
        expect(result.html).toContain('font-size: 24px');
    });

    it('renders ellipse with border-radius 50%', () => {
        const nodes: EngineNode[] = [makeNode({ type: 'ellipse' })];
        const result = exportToHtml5(nodes, { width: 300, height: 250 });
        expect(result.html).toContain('border-radius: 50%');
    });

    it('renders rounded_rect with border-radius', () => {
        const nodes: EngineNode[] = [makeNode({ type: 'rounded_rect', border_radius: 12 })];
        const result = exportToHtml5(nodes, { width: 300, height: 250 });
        expect(result.html).toContain('border-radius: 12px');
    });

    it('renders image element as img tag', () => {
        const nodes: EngineNode[] = [makeNode({
            type: 'image',
            src: 'https://example.com/img.png',
        })];
        const result = exportToHtml5(nodes, { width: 300, height: 250 });
        expect(result.html).toContain('<img');
        expect(result.html).toContain('https://example.com/img.png');
    });

    it('generates CSS keyframes for animated elements', () => {
        const nodes: EngineNode[] = [makeNode({ id: 42 })];
        // Set animation preset
        useAnimPresetStore.getState().setPreset('42', {
            anim: 'fade',
            animDuration: 0.5,
            startTime: 0,
        });

        const result = exportToHtml5(nodes, { width: 300, height: 250 });
        expect(result.html).toContain('@keyframes ace-el-42-anim');
        expect(result.html).toContain('opacity');
    });

    it('exports correct filename', () => {
        const result = exportToHtml5([], {
            width: 300, height: 250,
            title: 'My Banner',
        });
        expect(result.filename).toBe('My_Banner_300x250.html');
    });

    it('creates downloadable blob', () => {
        const result = exportToHtml5([], { width: 300, height: 250 });
        expect(result.blob).toBeInstanceOf(Blob);
        expect(result.blob.type).toBe('text/html');
    });

    it('sorts elements by z_index', () => {
        const nodes: EngineNode[] = [
            makeNode({ id: 2, z_index: 2, name: 'Top' }),
            makeNode({ id: 1, z_index: 0, name: 'Bottom' }),
        ];
        const result = exportToHtml5(nodes, { width: 300, height: 250 });
        const bottomIdx = result.html.indexOf('ace-el-1');
        const topIdx = result.html.indexOf('ace-el-2');
        expect(bottomIdx).toBeLessThan(topIdx); // Lower z-index first
    });

    it('escapes HTML in text content', () => {
        const nodes: EngineNode[] = [makeNode({
            type: 'text',
            content: '<script>alert("xss")</script>',
        })];
        const result = exportToHtml5(nodes, { width: 300, height: 250 });
        expect(result.html).not.toContain('<script>alert');
        expect(result.html).toContain('&lt;script&gt;');
    });
});
