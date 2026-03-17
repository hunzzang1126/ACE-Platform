// ─────────────────────────────────────────────────
// GlidLogo — SVG wordmark component with gradient
// ─────────────────────────────────────────────────
// Uses the user's custom "Glid" wordmark design with
// the platform's accent gradient (indigo → purple).
// Props: size (height in px), gradient (override), variant.

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
    // Aspect ratio from user's logo: approx 2.8:1 (width:height)
    const width = Math.round(size * 2.8);
    const gradientId = `glid-grad-${Math.random().toString(36).slice(2, 8)}`;

    const fillValue = variant === 'white' ? '#ffffff'
        : variant === 'dark' ? '#1a1a2e'
        : `url(#${gradientId})`;

    return (
        <svg
            width={width}
            height={size}
            viewBox="0 0 280 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
            onClick={onClick}
            style={{ cursor: onClick ? 'pointer' : undefined }}
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
                d="M0 80V20C0 8.95 8.95 0 20 0H52V20H24C22.9 20 22 20.9 22 22V78C22 79.1 22.9 80 24 80H48V52H32V36H68V80H20C8.95 80 0 71.05 0 60V80Z"
                fill={fillValue}
            />
            {/* l */}
            <path
                d="M82 0H104V80H82V0Z"
                fill={fillValue}
            />
            {/* i — dot */}
            <path
                d="M120 0H142V18H120V0Z"
                fill={fillValue}
            />
            {/* i — stem */}
            <path
                d="M120 28H142V80H120V28Z"
                fill={fillValue}
            />
            {/* d */}
            <path
                d="M158 28H198C209.05 28 218 36.95 218 48V60C218 71.05 209.05 80 198 80H158V28ZM180 60H194C195.1 60 196 59.1 196 58V50C196 48.9 195.1 48 194 48H180V60Z"
                fill={fillValue}
            />
        </svg>
    );
}
