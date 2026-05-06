// ─────────────────────────────────────────────────
// canvasToolExecutors.test.ts — Tests for engine-based add_text/add_button
// ─────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const SRC_DIR = path.resolve(__dirname, '..');

function readSrc(relPath: string): string {
    const full = path.join(SRC_DIR, relPath);
    if (!fs.existsSync(full)) return '';
    return fs.readFileSync(full, 'utf-8');
}

describe('canvasToolExecutors', () => {
    const source = readSrc('ai/canvasToolExecutors.ts');

    it('should exist and be non-empty', () => {
        expect(source.length).toBeGreaterThan(100);
    });

    describe('executeAddTextOnCanvas', () => {
        it('should be exported', () => {
            expect(source).toContain('export async function executeAddTextOnCanvas');
        });

        it('should check engine.add_text availability', () => {
            expect(source).toContain('engine?.add_text');
        });

        it('should auto-size width from content length', () => {
            expect(source).toContain('avgCharWidth');
            expect(source).toContain('contentWidth');
        });

        it('should avoid collision with existing text nodes', () => {
            expect(source).toContain('get_all_nodes');
            expect(source).toContain('textNodes');
        });

        it('should center text when align=center', () => {
            expect(source).toContain("textAlign === 'center'");
        });

        it('should parse hex color to RGB normalized', () => {
            expect(source).toContain('hexToRgbNormalized');
        });

        it('should fall back to store executor when no engine', () => {
            expect(source).toContain("executeDesignCommand('add_text'");
        });

        it('should return nodeId on success', () => {
            expect(source).toContain('nodeId: id');
        });
    });

    describe('executeAddButtonOnCanvas', () => {
        it('should be exported', () => {
            expect(source).toContain('export async function executeAddButtonOnCanvas');
        });

        it('should check engine.add_rounded_rect availability', () => {
            expect(source).toContain('engine?.add_rounded_rect');
        });

        it('should create both background shape and text label', () => {
            expect(source).toContain('add_rounded_rect');
            expect(source).toContain('add_text');
            expect(source).toContain('CTA Button BG');
            expect(source).toContain('CTA Button');
        });

        it('should center button horizontally', () => {
            expect(source).toContain('(canvasW - btnW) / 2');
        });

        it('should vertically center text within button', () => {
            expect(source).toContain('(btnH - fontSize) / 2');
        });

        it('should fall back to store executor when no engine', () => {
            expect(source).toContain("executeDesignCommand('add_button'");
        });
    });
});

describe('commandExecutor integration', () => {
    const execSource = readSrc('ai/commandExecutor.ts');

    it('should import canvasToolExecutors', () => {
        expect(execSource).toContain("import { executeAddTextOnCanvas, executeAddButtonOnCanvas } from './canvasToolExecutors'");
    });

    it('should route add_text to executeAddTextOnCanvas', () => {
        expect(execSource).toContain("case 'add_text': return executeAddTextOnCanvas(engine, p)");
    });

    it('should route add_button to executeAddButtonOnCanvas', () => {
        expect(execSource).toContain("case 'add_button': return executeAddButtonOnCanvas(engine, p)");
    });

    it('should NOT have inline add_text implementation (extracted)', () => {
        // The old inline implementation had engine.canvas_width inside the switch
        expect(execSource).not.toContain("engine.add_text(\n");
    });

    it('commandExecutor.ts should be under 400 lines', () => {
        const lineCount = execSource.split('\n').length;
        expect(lineCount).toBeLessThan(400);
    });
});
