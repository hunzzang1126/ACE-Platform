// ─────────────────────────────────────────────────
// LinkedBadge — Interactive plug disconnect badge
// ─────────────────────────────────────────────────
// Shows "Linked" in card header. On hover → "Unlink x" (red).
// Clicking disconnects the plug connection directly.
// ─────────────────────────────────────────────────

import { useState, useCallback } from 'react';
import { useDesignStore } from '@/stores/designStore';

interface Props {
    variantId: string;
}

export function LinkedBadge({ variantId }: Props) {
    const disconnectPlug = useDesignStore(s => s.disconnectPlug);
    const [hovered, setHovered] = useState(false);

    const handleClick = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        disconnectPlug(variantId);
    }, [disconnectPlug, variantId]);

    return (
        <button
            className={`linked-badge ${hovered ? 'linked-badge--danger' : ''}`}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={handleClick}
            title={hovered ? 'Click to unlink this variant' : 'This variant is linked to the master'}
        >
            {hovered ? (
                <>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                    Unlink
                </>
            ) : (
                <>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                    </svg>
                    Linked
                </>
            )}
        </button>
    );
}
