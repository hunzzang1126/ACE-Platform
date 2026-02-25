// ─────────────────────────────────────────────────
// Video Exporter — WebCodecs H.264 + mp4-muxer
// ─────────────────────────────────────────────────
// Captures frames from the ACE engine by stepping the timeline,
// encodes to H.264 via WebCodecs, muxes into MP4 with mp4-muxer.

import { Muxer, ArrayBufferTarget } from 'mp4-muxer';

export interface ExportOptions {
    /** Output width in pixels */
    width: number;
    /** Output height in pixels */
    height: number;
    /** Frames per second */
    fps: number;
    /** H.264 bitrate in bps (default: 5Mbps) */
    bitrate?: number;
    /** Codec (default: 'avc1.42001f' — H.264 Baseline) */
    codec?: string;
}

export interface ExportProgress {
    phase: 'encoding' | 'muxing' | 'done' | 'error';
    currentFrame: number;
    totalFrames: number;
    percent: number;
    error?: string;
}

export type ProgressCallback = (progress: ExportProgress) => void;

/**
 * Export animation to MP4 video.
 *
 * @param engine - ACE WasmEngine instance
 * @param canvas - The WebGPU canvas element
 * @param duration - Animation duration in seconds
 * @param options - Export configuration
 * @param onProgress - Progress callback
 * @returns ArrayBuffer containing the MP4 file
 */
export async function exportToMp4(
    engine: any,
    canvas: HTMLCanvasElement,
    duration: number,
    options: ExportOptions,
    onProgress?: ProgressCallback,
): Promise<ArrayBuffer> {
    const {
        width,
        height,
        fps,
        bitrate = 5_000_000,
        codec = 'avc1.42001f',
    } = options;

    const totalFrames = Math.ceil(duration * fps);

    // Check WebCodecs support
    if (typeof VideoEncoder === 'undefined') {
        throw new Error('WebCodecs API not available. Use Chrome 94+.');
    }

    // Create MP4 muxer
    const target = new ArrayBufferTarget();
    const muxer = new Muxer({
        target,
        video: {
            codec: 'avc',
            width,
            height,
        },
        fastStart: 'in-memory',
    });

    // Create H.264 encoder
    let encodedFrames = 0;
    const encoder = new VideoEncoder({
        output: (chunk, meta) => {
            muxer.addVideoChunk(chunk, meta ?? undefined);
            encodedFrames++;
        },
        error: (e) => {
            console.error('[ACE Export] Encode error:', e);
            onProgress?.({
                phase: 'error',
                currentFrame: encodedFrames,
                totalFrames,
                percent: 0,
                error: String(e),
            });
        },
    });

    encoder.configure({
        codec,
        width,
        height,
        bitrate,
        framerate: fps,
    });

    // ── Frame capture loop ──────────────────────────
    for (let i = 0; i < totalFrames; i++) {
        const time = (i / fps);

        // Seek the engine timeline to this frame's time
        engine.anim_seek(time);
        // Render one frame
        engine.render_frame();

        // Capture frame from canvas
        const bitmap = await createImageBitmap(canvas);

        const frame = new VideoFrame(bitmap, {
            timestamp: Math.round((i / fps) * 1_000_000), // microseconds
            duration: Math.round((1 / fps) * 1_000_000),
        });

        const keyFrame = i % (fps * 2) === 0; // Key frame every 2 seconds
        encoder.encode(frame, { keyFrame });
        frame.close();
        bitmap.close();

        onProgress?.({
            phase: 'encoding',
            currentFrame: i + 1,
            totalFrames,
            percent: ((i + 1) / totalFrames) * 100,
        });

        // Yield to browser event loop every 10 frames
        if (i % 10 === 0) {
            await new Promise(r => setTimeout(r, 0));
        }
    }

    // Flush encoder
    await encoder.flush();
    encoder.close();

    // Finalize MP4
    onProgress?.({
        phase: 'muxing',
        currentFrame: totalFrames,
        totalFrames,
        percent: 100,
    });

    muxer.finalize();

    onProgress?.({
        phase: 'done',
        currentFrame: totalFrames,
        totalFrames,
        percent: 100,
    });

    return target.buffer!;
}

/**
 * Trigger a browser download of the exported video.
 */
export function downloadBlob(buffer: ArrayBuffer, filename: string, mime = 'video/mp4') {
    const blob = new Blob([buffer], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
