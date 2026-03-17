// ─────────────────────────────────────────────────
// GlidLogo — Official SVG wordmark component
// ─────────────────────────────────────────────────
// Paths sourced from the original Illustrator export:
//   ~/Desktop/glid logo/glid.svg
// Gradient uses the platform accent colors (indigo → purple).

interface GlidLogoProps {
    /** Height in pixels (width auto-scales from aspect ratio) */
    size?: number;
    /** Override gradient — default uses platform accent gradient */
    gradient?: [string, string];
    /** 'default' = gradient fill, 'white' = solid white, 'dark' = solid dark */
    variant?: 'default' | 'white' | 'dark';
    className?: string;
    onClick?: () => void;
}

export function GlidLogo({
    size = 28,
    gradient = ['#6366f1', '#8b5cf6'],
    variant = 'default',
    className = '',
    onClick,
}: GlidLogoProps) {
    // Original viewBox is 1000x1000 but the actual glyph area is roughly 878x380.
    // We crop the viewBox to the glyph bounds for tight sizing.
    const vbX = 50;
    const vbY = 290;
    const vbW = 890;
    const vbH = 410;
    const aspectRatio = vbW / vbH;
    const width = Math.round(size * aspectRatio);
    const gradientId = `glid-grad-${Math.random().toString(36).slice(2, 8)}`;

    const fillValue = variant === 'white' ? '#ffffff'
        : variant === 'dark' ? '#1a1a2e'
        : `url(#${gradientId})`;

    return (
        <svg
            width={width}
            height={size}
            viewBox={`${vbX} ${vbY} ${vbW} ${vbH}`}
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
            onClick={onClick}
            style={{ cursor: onClick ? 'pointer' : undefined, display: 'block' }}
            aria-label="Glid"
        >
            {variant === 'default' && (
                <defs>
                    <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor={gradient[0]} />
                        <stop offset="100%" stopColor={gradient[1]} />
                    </linearGradient>
                </defs>
            )}
            {/* G */}
            <path
                d="M337.16,627.76h-1.04c-25.51,42.7-60.4,57.8-104.66,57.8-56.23,0-99.97-20.31-130.69-54.15-30.72-34.37-48.42-82.27-48.42-138.5,0-61.96,21.87-116.11,60.92-152.04,30.2-27.6,69.77-42.7,119.76-42.7,93.72,0,147.36,51.55,159.33,124.44h-73.94c-8.33-35.93-35.93-61.96-83.83-61.96-70.29,0-105.18,58.32-105.18,132.26s40.09,131.73,104.14,131.73c57.8,0,95.81-43.22,95.81-84.35v-2.08h-89.56v-58.32h156.73v197.86h-56.76l-2.6-49.99Z"
                fill={fillValue}
            />
            {/* l */}
            <path
                d="M444.41,305.45h70.81v372.29h-70.81v-372.29Z"
                fill={fillValue}
            />
            {/* i (dot + stem) */}
            <path
                d="M562.09,305.45h70.81v63.52h-70.81v-63.52ZM562.09,410.63h70.81v267.11h-70.81v-267.11Z"
                fill={fillValue}
            />
            {/* d */}
            <path
                d="M665.71,544.45c0-83.31,47.38-141.11,114.03-141.11,37.49,0,60.92,17.18,75.5,39.57h1.56v-137.46h70.81v372.29h-68.21v-34.89h-1.04c-15.62,25.51-42.18,42.7-79.67,42.7-67.17,0-112.99-54.67-112.99-141.11ZM858.36,546.01c0-51.03-16.66-85.39-61.96-85.39-39.05,0-58.84,34.37-58.84,83.83s20.31,81.75,56.76,81.75c42.18,0,64.04-31.24,64.04-80.19Z"
                fill={fillValue}
            />
        </svg>
    );
}
