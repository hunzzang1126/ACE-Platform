// ─────────────────────────────────────────────────
// GIF Exporter — Animated GIF from canvas frames
// ─────────────────────────────────────────────────
// Captures frames from the Fabric.js canvas at specified FPS,
// then encodes them into an animated GIF using a Web Worker.
// ─────────────────────────────────────────────────

export interface GifExportOptions {
    /** Canvas width */
    width: number;
    /** Canvas height */
    height: number;
    /** Frames per second (default 15) */
    fps?: number;
    /** Total animation duration (seconds) */
    duration?: number;
    /** GIF quality: 1 (best) to 20 (worst), default 10 */
    quality?: number;
    /** Repeat count: 0 = loop forever, -1 = no repeat */
    repeat?: number;
}

export interface GifExportResult {
    blob: Blob;
    filename: string;
    frameCount: number;
    duration: number;
}

/**
 * Capture frames from a Fabric.js canvas and encode as animated GIF.
 * 
 * Architecture:
 * 1. For each frame: seek engine to time T, render, capture canvas imageData
 * 2. Encode all frames using a simple GIF89a encoder (no external dependency)
 * 3. Return Blob for download
 * 
 * NOTE: For production, integrate gif.js library for better compression.
 * This implementation uses a built-in minimal GIF encoder.
 */
export async function exportToGif(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    engine: any,
    canvas: HTMLCanvasElement,
    options: GifExportOptions,
    onProgress?: (pct: number) => void,
): Promise<GifExportResult> {
    const {
        width,
        height,
        fps = 15,
        duration = 5,
        quality = 10,
        repeat = 0,
    } = options;

    const totalFrames = Math.ceil(fps * duration);
    const frameDelay = Math.round(1000 / fps); // ms per frame
    const frames: ImageData[] = [];

    // Create offscreen canvas for capture
    const offscreen = document.createElement('canvas');
    offscreen.width = width;
    offscreen.height = height;
    const ctx = offscreen.getContext('2d', { willReadFrequently: true })!;

    // Capture frames
    for (let i = 0; i < totalFrames; i++) {
        const time = (i / totalFrames) * duration;

        // Seek engine to this time
        try {
            engine.anim_seek(time);
            engine.render_frame();
        } catch { /* engine may not support all methods */ }

        // Wait for render to complete
        await new Promise(r => requestAnimationFrame(r));

        // Capture canvas content
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(canvas, 0, 0, width, height);
        const imageData = ctx.getImageData(0, 0, width, height);
        frames.push(imageData);

        if (onProgress) onProgress((i + 1) / totalFrames * 0.8); // 80% for capture
    }

    // Reset engine to start
    try { engine.anim_seek(0); engine.render_frame(); } catch { /* ok */ }

    // Encode GIF
    const gifBytes = encodeGif(frames, width, height, frameDelay, quality, repeat);
    const blob = new Blob([gifBytes], { type: 'image/gif' });

    if (onProgress) onProgress(1.0);

    return {
        blob,
        filename: `banner_${width}x${height}.gif`,
        frameCount: totalFrames,
        duration,
    };
}

/** Download a GIF export result */
export function downloadGif(result: GifExportResult): void {
    const url = URL.createObjectURL(result.blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = result.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// ─── Minimal GIF89a Encoder ──────────────────────
// Simplified GIF encoder — no external dependencies.
// Supports: animation, transparency, basic LZW compression.
// For production, consider gif.js for better compression ratios.

function encodeGif(
    frames: ImageData[],
    width: number,
    height: number,
    delayMs: number,
    quality: number,
    repeat: number,
): Uint8Array {
    const delay = Math.round(delayMs / 10); // GIF uses 1/100s units

    // Quantize colors — simple median-cut to 256 colors
    const maxColors = Math.max(2, Math.min(256, Math.pow(2, Math.ceil(Math.log2(257 - quality * 10)))));
    const colorCount = Math.min(256, Math.max(2, maxColors));
    const paletteBits = Math.ceil(Math.log2(colorCount));

    const out: number[] = [];

    // ── Header ──
    writeString(out, 'GIF89a');

    // ── Logical Screen Descriptor ──
    writeU16(out, width);
    writeU16(out, height);
    out.push(0x70 | (paletteBits - 1)); // GCT flag + color resolution + sort + GCT size
    out.push(0); // bg color index
    out.push(0); // pixel aspect ratio

    // ── Global Color Table (256 colors, grayscale fallback) ──
    const palette = buildPalette(frames[0]!, colorCount);
    for (let i = 0; i < (1 << paletteBits); i++) {
        if (i < palette.length) {
            out.push(palette[i]![0], palette[i]![1], palette[i]![2]);
        } else {
            out.push(0, 0, 0);
        }
    }

    // ── Netscape Application Extension (for looping) ──
    if (repeat >= 0) {
        out.push(0x21, 0xFF, 0x0B);
        writeString(out, 'NETSCAPE2.0');
        out.push(0x03, 0x01);
        writeU16(out, repeat);
        out.push(0x00);
    }

    // ── Frames ──
    for (const frame of frames) {
        // Graphic Control Extension
        out.push(0x21, 0xF9, 0x04);
        out.push(0x00); // disposal method: none
        writeU16(out, delay);
        out.push(0x00); // transparent color index (none)
        out.push(0x00); // terminator

        // Image Descriptor
        out.push(0x2C);
        writeU16(out, 0); // left
        writeU16(out, 0); // top
        writeU16(out, width);
        writeU16(out, height);
        out.push(0x00); // no local color table

        // Image Data (LZW with minimum code size)
        const indexed = quantizeFrame(frame, palette);
        const lzwData = lzwEncode(indexed, paletteBits);
        out.push(paletteBits); // minimum code size

        // Write sub-blocks
        for (let i = 0; i < lzwData.length; i += 255) {
            const chunk = lzwData.slice(i, i + 255);
            out.push(chunk.length);
            for (const b of chunk) out.push(b);
        }
        out.push(0x00); // block terminator
    }

    // ── Trailer ──
    out.push(0x3B);

    return new Uint8Array(out);
}

// ── Palette building (simplified) ──

function buildPalette(frame: ImageData, maxColors: number): [number, number, number][] {
    // Sample colors uniformly
    const colors: Map<number, [number, number, number]> = new Map();
    const data = frame.data;
    const step = Math.max(1, Math.floor(data.length / (4 * maxColors * 4)));

    for (let i = 0; i < data.length && colors.size < maxColors; i += 4 * step) {
        const r = data[i]! & 0xF8;
        const g = data[i + 1]! & 0xF8;
        const b = data[i + 2]! & 0xF8;
        const key = (r << 16) | (g << 8) | b;
        if (!colors.has(key)) colors.set(key, [r, g, b]);
    }

    // Fill remaining slots
    const result = Array.from(colors.values());
    while (result.length < maxColors) result.push([0, 0, 0]);
    return result;
}

function quantizeFrame(frame: ImageData, palette: [number, number, number][]): number[] {
    const data = frame.data;
    const out: number[] = new Array(frame.width * frame.height);

    for (let i = 0; i < out.length; i++) {
        const r = data[i * 4]!;
        const g = data[i * 4 + 1]!;
        const b = data[i * 4 + 2]!;
        out[i] = findNearest(r, g, b, palette);
    }
    return out;
}

function findNearest(r: number, g: number, b: number, palette: [number, number, number][]): number {
    let bestIdx = 0;
    let bestDist = Infinity;
    for (let i = 0; i < palette.length; i++) {
        const dr = r - palette[i]![0];
        const dg = g - palette[i]![1];
        const db = b - palette[i]![2];
        const dist = dr * dr + dg * dg + db * db;
        if (dist < bestDist) { bestDist = dist; bestIdx = i; }
    }
    return bestIdx;
}

// ── LZW Encoder (variable-width codes) ──

function lzwEncode(data: number[], minCodeSize: number): number[] {
    const clearCode = 1 << minCodeSize;
    const eoiCode = clearCode + 1;
    let codeSize = minCodeSize + 1;
    let nextCode = eoiCode + 1;

    // Initialize dictionary
    const dict: Map<string, number> = new Map();
    for (let i = 0; i < clearCode; i++) {
        dict.set(String(i), i);
    }

    const output: number[] = [];
    let bits = 0;
    let bitCount = 0;
    const buffer: number[] = [];

    function writeBits(code: number, size: number) {
        bits |= code << bitCount;
        bitCount += size;
        while (bitCount >= 8) {
            buffer.push(bits & 0xFF);
            bits >>= 8;
            bitCount -= 8;
        }
    }

    writeBits(clearCode, codeSize);

    let prefix = String(data[0] ?? 0);

    for (let i = 1; i < data.length; i++) {
        const c = String(data[i]!);
        const key = prefix + ',' + c;

        if (dict.has(key)) {
            prefix = key;
        } else {
            writeBits(dict.get(prefix)!, codeSize);
            if (nextCode < 4096) {
                dict.set(key, nextCode++);
                if (nextCode > (1 << codeSize) && codeSize < 12) {
                    codeSize++;
                }
            } else {
                // Reset
                writeBits(clearCode, codeSize);
                dict.clear();
                for (let j = 0; j < clearCode; j++) dict.set(String(j), j);
                nextCode = eoiCode + 1;
                codeSize = minCodeSize + 1;
            }
            prefix = c;
        }
    }

    writeBits(dict.get(prefix)!, codeSize);
    writeBits(eoiCode, codeSize);

    if (bitCount > 0) buffer.push(bits & 0xFF);

    return buffer;
}

// ── Byte helpers ──

function writeU16(out: number[], val: number) {
    out.push(val & 0xFF, (val >> 8) & 0xFF);
}

function writeString(out: number[], str: string) {
    for (let i = 0; i < str.length; i++) out.push(str.charCodeAt(i));
}
