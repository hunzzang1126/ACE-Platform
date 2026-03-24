// ─────────────────────────────────────────────────
// AI Memory Service — Persistent User Context
// ─────────────────────────────────────────────────
// Stores and retrieves per-user AI preferences,
// design history, and conversation summaries.
// Makes the AI smarter across sessions.
//
// Storage: Supabase `ai_memory` table (~5KB/user)
// Fallback: localStorage when offline
// ─────────────────────────────────────────────────

import { getSupabase } from '@/services/supabaseClient';

// ═══════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════

export interface AiMemory {
    /** User style/color/font preferences */
    preferences: AiPreferences;
    /** Recent design history (last 10) */
    designHistory: DesignEntry[];
    /** Compressed conversation summary */
    conversationSummary: string;
}

export interface AiPreferences {
    /** Preferred color tone: 'bright', 'dark', 'neutral', 'warm', 'cool' */
    colorTone?: string;
    /** Preferred visual style */
    preferredStyle?: 'realistic' | 'illustration' | 'abstract' | 'minimal' | 'photography';
    /** Preferred font families */
    preferredFonts?: string[];
    /** User's primary language for content */
    contentLanguage?: string;
    /** Industry/niche context */
    industry?: string;
    /** Custom preferences from user feedback */
    custom?: Record<string, string>;
}

export interface DesignEntry {
    /** When this design was created */
    timestamp: number;
    /** Original user prompt */
    prompt: string;
    /** Background image prompt used */
    bgPrompt?: string;
    /** Style used */
    style?: string;
    /** Color palette guide name */
    colorGuide?: string;
    /** User feedback (if any) */
    feedback?: 'liked' | 'disliked' | 'modified' | null;
    /** What was modified (if feedback is 'modified') */
    modification?: string;
}

const EMPTY_MEMORY: AiMemory = {
    preferences: {},
    designHistory: [],
    conversationSummary: '',
};

const LOCAL_KEY = 'ace-ai-memory';
const MAX_HISTORY = 10;

// ═══════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════

/**
 * Load AI memory for the current user.
 * Falls back to localStorage if Supabase is unavailable.
 */
export async function loadMemory(): Promise<AiMemory> {
    try {
        const sb = getSupabase();
        if (!sb) return loadLocalMemory();

        const { data: { user } } = await sb.auth.getUser();
        if (!user) return loadLocalMemory();

        const { data, error } = await sb
            .from('ai_memory')
            .select('preferences, design_history, conversation_summary')
            .eq('user_id', user.id)
            .single();

        if (error || !data) {
            console.info('[AiMemory] No cloud memory found, using local');
            return loadLocalMemory();
        }

        const memory: AiMemory = {
            preferences: (data.preferences as AiPreferences) ?? {},
            designHistory: (data.design_history as DesignEntry[]) ?? [],
            conversationSummary: (data.conversation_summary as string) ?? '',
        };

        // Sync to local for offline fallback
        saveLocalMemory(memory);

        console.info('[AiMemory] Loaded from cloud', {
            prefs: Object.keys(memory.preferences).length,
            history: memory.designHistory.length,
        });

        return memory;
    } catch (err) {
        console.warn('[AiMemory] Cloud load failed, using local:', err);
        return loadLocalMemory();
    }
}

/**
 * Save AI memory for the current user.
 * Writes to both Supabase and localStorage.
 */
export async function saveMemory(memory: AiMemory): Promise<void> {
    // Always save locally first (instant)
    saveLocalMemory(memory);

    try {
        const sb = getSupabase();
        if (!sb) return;

        const { data: { user } } = await sb.auth.getUser();
        if (!user) return;

        const payload = {
            user_id: user.id,
            preferences: memory.preferences,
            design_history: memory.designHistory.slice(-MAX_HISTORY),
            conversation_summary: memory.conversationSummary.slice(0, 2000),
        };

        const { error } = await sb
            .from('ai_memory')
            .upsert(payload, { onConflict: 'user_id' });

        if (error) {
            console.warn('[AiMemory] Cloud save failed:', error.message);
        } else {
            console.info('[AiMemory] Saved to cloud');
        }
    } catch (err) {
        console.warn('[AiMemory] Cloud save error:', err);
    }
}

/**
 * Update a specific preference.
 * Merges with existing preferences.
 */
export async function updatePreference(
    key: keyof AiPreferences,
    value: string | string[],
): Promise<void> {
    const memory = await loadMemory();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (memory.preferences as any)[key] = value;
    await saveMemory(memory);
}

/**
 * Add a design entry to history.
 * Keeps only the last MAX_HISTORY entries.
 */
export async function addDesignEntry(entry: Omit<DesignEntry, 'timestamp'>): Promise<void> {
    const memory = await loadMemory();
    memory.designHistory.push({
        ...entry,
        timestamp: Date.now(),
    });
    // Trim to max
    if (memory.designHistory.length > MAX_HISTORY) {
        memory.designHistory = memory.designHistory.slice(-MAX_HISTORY);
    }
    await saveMemory(memory);
}

/**
 * Record user feedback on the most recent design.
 */
export async function recordFeedback(
    feedback: 'liked' | 'disliked' | 'modified',
    modification?: string,
): Promise<void> {
    const memory = await loadMemory();
    const last = memory.designHistory[memory.designHistory.length - 1];
    if (last) {
        last.feedback = feedback;
        if (modification) last.modification = modification;
        await saveMemory(memory);
    }
}

/**
 * Update conversation summary.
 * Should be called at end of each chat session.
 */
export async function updateConversationSummary(summary: string): Promise<void> {
    const memory = await loadMemory();
    memory.conversationSummary = summary;
    await saveMemory(memory);
}

/**
 * Convert memory to a concise prompt section for the LLM.
 */
export function memoryToPromptSection(memory: AiMemory): string {
    const sections: string[] = [];

    // Preferences
    const prefs = memory.preferences;
    const prefParts: string[] = [];
    if (prefs.colorTone) prefParts.push(`Color tone: ${prefs.colorTone}`);
    if (prefs.preferredStyle) prefParts.push(`Style: ${prefs.preferredStyle}`);
    if (prefs.preferredFonts?.length) prefParts.push(`Fonts: ${prefs.preferredFonts.join(', ')}`);
    if (prefs.contentLanguage) prefParts.push(`Language: ${prefs.contentLanguage}`);
    if (prefs.industry) prefParts.push(`Industry: ${prefs.industry}`);

    if (prefParts.length > 0) {
        sections.push(`USER PREFERENCES: ${prefParts.join(' | ')}`);
    }

    // Recent design history (last 3 for brevity)
    const recentDesigns = memory.designHistory.slice(-3);
    if (recentDesigns.length > 0) {
        const historyLines = recentDesigns.map(d => {
            let line = `- "${d.prompt.slice(0, 60)}"`;
            if (d.style) line += ` (${d.style})`;
            if (d.feedback) line += ` → ${d.feedback}`;
            return line;
        });
        sections.push(`RECENT DESIGNS:\n${historyLines.join('\n')}`);
    }

    // Conversation summary
    if (memory.conversationSummary) {
        sections.push(`PREVIOUS SESSION: ${memory.conversationSummary.slice(0, 200)}`);
    }

    return sections.length > 0
        ? `\n## User Memory (Persistent)\n${sections.join('\n')}\n`
        : '';
}

// ═══════════════════════════════════════════════════
// LOCAL STORAGE FALLBACK
// ═══════════════════════════════════════════════════

function loadLocalMemory(): AiMemory {
    try {
        const raw = localStorage.getItem(LOCAL_KEY);
        if (raw) return JSON.parse(raw) as AiMemory;
    } catch { /* */ }
    return { ...EMPTY_MEMORY };
}

function saveLocalMemory(memory: AiMemory): void {
    try {
        localStorage.setItem(LOCAL_KEY, JSON.stringify(memory));
    } catch { /* quota exceeded — ok */ }
}
