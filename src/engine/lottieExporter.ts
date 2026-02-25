// ─────────────────────────────────────────────────
// Lottie Exporter — Convert ACE animations to Lottie JSON
// ─────────────────────────────────────────────────
// Outputs a Bodymovin-compatible JSON that can be played
// by lottie-web, lottie-ios, lottie-android, etc.

export interface LottieExportOptions {
    /** Canvas/composition width */
    width: number;
    /** Canvas/composition height */
    height: number;
    /** Frames per second */
    fps: number;
    /** Animation name */
    name?: string;
}

interface LottieShape {
    nodeId: number;
    type: 'rect' | 'ellipse';
    x: number;
    y: number;
    width: number;
    height: number;
    color: [number, number, number, number]; // RGBA 0-1
    borderRadius?: number;
    opacity: number;
}

interface LottieKeyframe {
    nodeId: number;
    property: string;
    time: number;
    value: number;
    easing: string;
}

/**
 * Export ACE engine state + animation data to Lottie JSON.
 */
export function exportToLottie(
    shapes: LottieShape[],
    keyframes: LottieKeyframe[],
    duration: number,
    options: LottieExportOptions,
): object {
    const { width, height, fps, name = 'ACE Export' } = options;
    const totalFrames = Math.ceil(duration * fps);

    // Build layers (reverse order — Lottie renders first layer on top)
    const layers = shapes.map((shape, index) => {
        const layer = buildLayer(shape, index, keyframes, totalFrames, fps);
        return layer;
    }).reverse();

    return {
        v: '5.7.0',
        fr: fps,
        ip: 0,
        op: totalFrames,
        w: width,
        h: height,
        nm: name,
        ddd: 0,
        assets: [],
        layers,
    };
}

function buildLayer(
    shape: LottieShape,
    index: number,
    keyframes: LottieKeyframe[],
    totalFrames: number,
    fps: number,
): object {
    const nodeKfs = keyframes.filter(k => k.nodeId === shape.nodeId);

    // Build position keyframes
    const posXKfs = nodeKfs.filter(k => k.property === 'x' || k.property === 'positionX');
    const posYKfs = nodeKfs.filter(k => k.property === 'y' || k.property === 'positionY');
    const opacityKfs = nodeKfs.filter(k => k.property === 'opacity');
    const widthKfs = nodeKfs.filter(k => k.property === 'width' || k.property === 'scaleX');
    const heightKfs = nodeKfs.filter(k => k.property === 'height' || k.property === 'scaleY');
    const rotKfs = nodeKfs.filter(k => k.property === 'rotation');

    // Lottie position: center-based
    const cx = shape.x + shape.width / 2;
    const cy = shape.y + shape.height / 2;

    const positionProp = buildPositionProperty(cx, cy, posXKfs, posYKfs, shape, fps);
    const opacityProp = buildScalarProperty(shape.opacity * 100, opacityKfs, fps, 100);
    const rotationProp = buildScalarProperty(0, rotKfs, fps, 180 / Math.PI); // rad to deg

    // Size
    const sizeProp = buildSizeProperty(shape.width, shape.height, widthKfs, heightKfs, fps);

    // Shape contents
    const shapeContent = shape.type === 'ellipse'
        ? buildEllipseContent(sizeProp, shape.color)
        : buildRectContent(sizeProp, shape.color, shape.borderRadius ?? 0);

    return {
        ddd: 0,
        ind: index,
        ty: 4, // Shape layer
        nm: `Layer ${shape.nodeId}`,
        sr: 1,
        ks: {
            o: opacityProp,
            r: rotationProp,
            p: positionProp,
            a: { a: 0, k: [0, 0, 0] }, // Anchor at center
            s: { a: 0, k: [100, 100, 100] }, // Scale 100%
        },
        ao: 0,
        shapes: [shapeContent],
        ip: 0,
        op: totalFrames,
        st: 0,
        bm: 0,
    };
}

function buildPositionProperty(
    cx: number, cy: number,
    xKfs: LottieKeyframe[], yKfs: LottieKeyframe[],
    shape: LottieShape, fps: number,
): object {
    if (xKfs.length === 0 && yKfs.length === 0) {
        return { a: 0, k: [cx, cy, 0] };
    }

    // Merge x and y keyframes by time
    const times = new Set<number>();
    xKfs.forEach(k => times.add(k.time));
    yKfs.forEach(k => times.add(k.time));
    const sortedTimes = [...times].sort((a, b) => a - b);

    const kfArray = sortedTimes.map((t, i) => {
        const x = findValueAt(xKfs, t, shape.x) + shape.width / 2;
        const y = findValueAt(yKfs, t, shape.y) + shape.height / 2;
        const frame = Math.round(t * fps);

        const entry: any = {
            i: { x: 0.42, y: 1 },
            o: { x: 0.58, y: 0 },
            t: frame,
            s: [x, y, 0],
        };

        if (i < sortedTimes.length - 1) {
            const nextT = sortedTimes[i + 1]!;
            const nx = findValueAt(xKfs, nextT, shape.x) + shape.width / 2;
            const ny = findValueAt(yKfs, nextT, shape.y) + shape.height / 2;
            entry.e = [nx, ny, 0];
        }

        return entry;
    });

    return { a: 1, k: kfArray };
}

function buildScalarProperty(
    defaultVal: number,
    kfs: LottieKeyframe[],
    fps: number,
    multiplier = 1,
): object {
    if (kfs.length === 0) {
        return { a: 0, k: defaultVal };
    }

    const kfArray = kfs.map((k, i) => {
        const val = k.property === 'opacity' ? k.value * multiplier : k.value * multiplier;
        const entry: any = {
            i: { x: [0.42], y: [1] },
            o: { x: [0.58], y: [0] },
            t: Math.round(k.time * fps),
            s: [val],
        };
        if (i < kfs.length - 1) {
            const nextKf = kfs[i + 1]!;
            const nextVal = nextKf.value * multiplier;
            entry.e = [nextVal];
        }
        return entry;
    });

    return { a: 1, k: kfArray };
}

function buildSizeProperty(
    defaultW: number, defaultH: number,
    wKfs: LottieKeyframe[], hKfs: LottieKeyframe[],
    fps: number,
): object {
    if (wKfs.length === 0 && hKfs.length === 0) {
        return { a: 0, k: [defaultW, defaultH] };
    }

    const times = new Set<number>();
    wKfs.forEach(k => times.add(k.time));
    hKfs.forEach(k => times.add(k.time));
    const sortedTimes = [...times].sort((a, b) => a - b);

    const kfArray = sortedTimes.map((t, i) => {
        const w = findValueAt(wKfs, t, defaultW);
        const h = findValueAt(hKfs, t, defaultH);
        const entry: any = {
            i: { x: 0.42, y: 1 },
            o: { x: 0.58, y: 0 },
            t: Math.round(t * fps),
            s: [w, h],
        };
        if (i < sortedTimes.length - 1) {
            const nextT = sortedTimes[i + 1]!;
            entry.e = [findValueAt(wKfs, nextT, defaultW), findValueAt(hKfs, nextT, defaultH)];
        }
        return entry;
    });

    return { a: 1, k: kfArray };
}

function findValueAt(kfs: LottieKeyframe[], time: number, defaultVal: number): number {
    const exact = kfs.find(k => Math.abs(k.time - time) < 0.001);
    if (exact) return exact.value;
    return defaultVal;
}

function buildRectContent(sizeProp: object, color: [number, number, number, number], radius: number): object {
    return {
        ty: 'gr',
        it: [
            {
                ty: 'rc',
                d: 1,
                s: sizeProp,
                p: { a: 0, k: [0, 0] },
                r: { a: 0, k: radius },
                nm: 'Rect',
            },
            {
                ty: 'fl',
                c: { a: 0, k: [color[0], color[1], color[2], 1] },
                o: { a: 0, k: color[3] * 100 },
                r: 1,
                bm: 0,
                nm: 'Fill',
            },
            {
                ty: 'tr',
                p: { a: 0, k: [0, 0] },
                a: { a: 0, k: [0, 0] },
                s: { a: 0, k: [100, 100] },
                r: { a: 0, k: 0 },
                o: { a: 0, k: 100 },
                sk: { a: 0, k: 0 },
                sa: { a: 0, k: 0 },
                nm: 'Transform',
            },
        ],
        nm: 'Rect Group',
        np: 2,
        cix: 2,
        bm: 0,
        ix: 1,
    };
}

function buildEllipseContent(sizeProp: object, color: [number, number, number, number]): object {
    return {
        ty: 'gr',
        it: [
            {
                ty: 'el',
                d: 1,
                s: sizeProp,
                p: { a: 0, k: [0, 0] },
                nm: 'Ellipse',
            },
            {
                ty: 'fl',
                c: { a: 0, k: [color[0], color[1], color[2], 1] },
                o: { a: 0, k: color[3] * 100 },
                r: 1,
                bm: 0,
                nm: 'Fill',
            },
            {
                ty: 'tr',
                p: { a: 0, k: [0, 0] },
                a: { a: 0, k: [0, 0] },
                s: { a: 0, k: [100, 100] },
                r: { a: 0, k: 0 },
                o: { a: 0, k: 100 },
                sk: { a: 0, k: 0 },
                sa: { a: 0, k: 0 },
                nm: 'Transform',
            },
        ],
        nm: 'Ellipse Group',
        np: 2,
        cix: 2,
        bm: 0,
        ix: 1,
    };
}

/**
 * Download Lottie JSON as a file.
 */
export function downloadLottie(lottie: object, filename = 'animation.json') {
    const json = JSON.stringify(lottie, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
