// ─────────────────────────────────────────────────
// alignElements — Multi-element alignment logic
// ─────────────────────────────────────────────────
// Pure functions (no engine dependency) for testability.
// Takes bounding boxes, returns new positions.
// ─────────────────────────────────────────────────

export type AlignDirection =
    | 'left' | 'center-h' | 'right'
    | 'top' | 'center-v' | 'bottom'
    | 'distribute-h' | 'distribute-v';

export interface ElementBounds {
    id: number;
    x: number;
    y: number;
    w: number;
    h: number;
}

export interface AlignResult {
    id: number;
    x: number;
    y: number;
}

/**
 * Compute new positions for selected elements based on alignment direction.
 * "Align" operations snap elements to the group bounding box edge/center.
 * "Distribute" operations space elements evenly within the group bounds.
 * 
 * @param elements - Bounding boxes of selected elements (must have >= 2)
 * @param direction - Alignment direction
 * @returns Array of { id, x, y } with updated positions (only changed elements)
 */
export function computeAlignment(
    elements: ElementBounds[],
    direction: AlignDirection,
): AlignResult[] {
    if (elements.length < 2) return [];

    switch (direction) {
        case 'left': {
            const minX = Math.min(...elements.map(e => e.x));
            return elements.map(e => ({ id: e.id, x: minX, y: e.y }));
        }
        case 'center-h': {
            const groupLeft = Math.min(...elements.map(e => e.x));
            const groupRight = Math.max(...elements.map(e => e.x + e.w));
            const centerX = (groupLeft + groupRight) / 2;
            return elements.map(e => ({ id: e.id, x: centerX - e.w / 2, y: e.y }));
        }
        case 'right': {
            const maxRight = Math.max(...elements.map(e => e.x + e.w));
            return elements.map(e => ({ id: e.id, x: maxRight - e.w, y: e.y }));
        }
        case 'top': {
            const minY = Math.min(...elements.map(e => e.y));
            return elements.map(e => ({ id: e.id, x: e.x, y: minY }));
        }
        case 'center-v': {
            const groupTop = Math.min(...elements.map(e => e.y));
            const groupBottom = Math.max(...elements.map(e => e.y + e.h));
            const centerY = (groupTop + groupBottom) / 2;
            return elements.map(e => ({ id: e.id, x: e.x, y: centerY - e.h / 2 }));
        }
        case 'bottom': {
            const maxBottom = Math.max(...elements.map(e => e.y + e.h));
            return elements.map(e => ({ id: e.id, x: e.x, y: maxBottom - e.h }));
        }
        case 'distribute-h': {
            const sorted = [...elements].sort((a, b) => a.x - b.x);
            const totalWidth = sorted.reduce((sum, e) => sum + e.w, 0);
            const groupLeft = sorted[0].x;
            const groupRight = Math.max(...sorted.map(e => e.x + e.w));
            const totalSpace = (groupRight - groupLeft) - totalWidth;
            const gaps = sorted.length - 1;
            const gap = gaps > 0 ? totalSpace / gaps : 0;
            let currentX = groupLeft;
            return sorted.map(e => {
                const result = { id: e.id, x: currentX, y: e.y };
                currentX += e.w + gap;
                return result;
            });
        }
        case 'distribute-v': {
            const sorted = [...elements].sort((a, b) => a.y - b.y);
            const totalHeight = sorted.reduce((sum, e) => sum + e.h, 0);
            const groupTop = sorted[0].y;
            const groupBottom = Math.max(...sorted.map(e => e.y + e.h));
            const totalSpace = (groupBottom - groupTop) - totalHeight;
            const gaps = sorted.length - 1;
            const gap = gaps > 0 ? totalSpace / gaps : 0;
            let currentY = groupTop;
            return sorted.map(e => {
                const result = { id: e.id, x: e.x, y: currentY };
                currentY += e.h + gap;
                return result;
            });
        }
        default:
            return [];
    }
}
