// ─────────────────────────────────────────────────────────
// designMemoryStore.ts — Few-Shot Design Memory Bank
// Saves user-rated designs to localStorage for future AI learning
// ─────────────────────────────────────────────────────────
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { RenderElement } from '@/services/autoDesignService';

const MEMORY_KEY = 'ace_design_memory';
const MAX_MEMORY = 20; // keep top 20 rated designs

export interface DesignMemoryEntry {
    id: string;
    prompt: string;
    elements: RenderElement[];
    canvasW: number;
    canvasH: number;
    rating: number; // 1 (bad) to 5 (excellent), thumbs up = 5, thumbs down = 1
    personality: string;
    timestamp: number;
}

interface DesignMemoryState {
    entries: DesignMemoryEntry[];
    addEntry: (entry: Omit<DesignMemoryEntry, 'id' | 'timestamp'>) => void;
    rateEntry: (id: string, rating: number) => void;
    getTopExamples: (n?: number) => DesignMemoryEntry[];
    clearMemory: () => void;
}

export const useDesignMemoryStore = create<DesignMemoryState>()(
    persist(
        (set, get) => ({
            entries: [],

            addEntry: (entry) => {
                const newEntry: DesignMemoryEntry = {
                    ...entry,
                    id: `mem_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
                    timestamp: Date.now(),
                };
                set(state => ({
                    entries: [newEntry, ...state.entries]
                        .sort((a, b) => b.rating - a.rating)
                        .slice(0, MAX_MEMORY),
                }));
            },

            rateEntry: (id, rating) => {
                set(state => ({
                    entries: state.entries.map(e =>
                        e.id === id ? { ...e, rating } : e
                    ).sort((a, b) => b.rating - a.rating),
                }));
            },

            getTopExamples: (n = 3) => {
                return get().entries
                    .filter(e => e.rating >= 4) // only high-rated
                    .slice(0, n);
            },

            clearMemory: () => set({ entries: [] }),
        }),
        {
            name: MEMORY_KEY,
        }
    )
);

// ── Few-Shot Example Builder for AI Prompt ───────────────

export function buildFewShotExamples(entries: DesignMemoryEntry[]): string {
    if (entries.length === 0) return '';

    const examples = entries.slice(0, 3).map((entry, i) => {
        const elementSummary = entry.elements.map(el => {
            if (el.type === 'text') {
                return `  - ${el.name}: text "${el.content}", size ${el.font_size}, weight ${el.font_weight}, color ${el.color_hex}`;
            }
            if (el.gradient_start_hex) {
                return `  - ${el.name}: gradient ${el.gradient_start_hex}→${el.gradient_end_hex} at ${el.gradient_angle}°`;
            }
            return `  - ${el.name}: ${el.type} at (${el.x},${el.y}) size ${el.w}×${el.h}`;
        }).join('\n');

        return `Example ${i + 1} (rated ${entry.rating}/5, prompt: "${entry.prompt.slice(0, 60)}"):
${elementSummary}`;
    }).join('\n\n');

    return `
══════════════════════════════════════════════
HIGHLY-RATED DESIGN EXAMPLES (learn from these):
══════════════════════════════════════════════
${examples}

Apply similar quality principles: spacing, hierarchy, color harmony, typography.
══════════════════════════════════════════════
`;
}
