// ─────────────────────────────────────────────────
// Smart Suggestions — Proactive Design Recommendations
// ─────────────────────────────────────────────────

import type { SceneNodeInfo } from './agentContext';

export interface Suggestion {
    id: string;
    type: 'improvement' | 'warning' | 'tip';
    title: string;
    description: string;
    action?: {
        label: string;
        prompt: string; // prompt to send to AI when user clicks
    };
}

/**
 * Generate proactive suggestions based on the current scene state.
 */
export function generateSuggestions(nodes: SceneNodeInfo[]): Suggestion[] {
    const suggestions: Suggestion[] = [];

    if (nodes.length === 0) {
        suggestions.push({
            id: 'empty-canvas',
            type: 'tip',
            title: 'Canvas is empty',
            description: 'Try asking: "파란 원 5개를 일렬로 배치해줘"',
            action: { label: 'Create demo layout', prompt: '파란 원 5개를 일렬로 배치해줘' },
        });
        return suggestions;
    }

    // Check for elements without shadows
    const noShadow = nodes.filter(n => !n.effects.hasShadow);
    if (noShadow.length > 0 && noShadow.length === nodes.length) {
        suggestions.push({
            id: 'add-shadows',
            type: 'improvement',
            title: 'Add depth with shadows',
            description: `${noShadow.length} elements have no shadow. Shadows add visual hierarchy.`,
            action: { label: 'Add shadows', prompt: '모든 요소에 그림자를 추가해줘' },
        });
    }

    // Check for overlapping elements
    for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
            const a = nodes[i]!;
            const b = nodes[j]!;
            if (a.x < b.x + b.width && a.x + a.width > b.x &&
                a.y < b.y + b.height && a.y + a.height > b.y) {
                suggestions.push({
                    id: `overlap-${a.id}-${b.id}`,
                    type: 'warning',
                    title: 'Elements overlapping',
                    description: `${a.label} and ${b.label} are overlapping.`,
                    action: { label: 'Fix spacing', prompt: `${a.label}과 ${b.label}이 겹치지 않게 간격을 조정해줘` },
                });
                break; // Only report first overlap
            }
        }
    }

    // Check for no animations
    const hasAnim = nodes.some(n => n.animations.length > 0);
    if (!hasAnim && nodes.length >= 2) {
        suggestions.push({
            id: 'add-animation',
            type: 'tip',
            title: 'Animate your design',
            description: 'Add animations to make your design dynamic.',
            action: { label: 'Add animations', prompt: '모든 요소에 스태거 페이드인 애니메이션을 추가해줘' },
        });
    }

    // Check for alignment opportunities
    if (nodes.length >= 3) {
        const ys = nodes.map(n => n.y);
        const allSameY = ys.every(y => Math.abs(y - ys[0]!) < 10);
        if (!allSameY) {
            suggestions.push({
                id: 'align-elements',
                type: 'improvement',
                title: 'Align elements',
                description: 'Elements appear misaligned. Aligning them would improve the layout.',
                action: { label: 'Auto-align', prompt: '모든 요소를 수평으로 정렬해줘' },
            });
        }
    }

    return suggestions.slice(0, 3); // Max 3 suggestions
}
