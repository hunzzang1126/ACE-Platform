// ─────────────────────────────────────────────────
// Skill Registry — AI Skill-Based Architecture
// ─────────────────────────────────────────────────
// Organizes 45+ tools into named skills with self-discovery.
// Supports LEARNED SKILLS: dynamic actions that get thumbs-up
// are promoted to reusable skills stored in localStorage/Supabase.
//
// Flow:
//   1. User request → match to built-in skill
//   2. No match → check LEARNED skills
//   3. No match → Dynamic Action (catch-all)
//   4. Thumbs up on Dynamic Action → save as learned skill
// ─────────────────────────────────────────────────

import { getSupabase } from '@/services/supabaseClient';

// ═══════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════

export interface AiSkill {
    /** Unique identifier */
    id: string;
    /** Human-readable skill name */
    name: string;
    /** What this skill does */
    description: string;
    /** When to use this skill */
    trigger: string;
    /** Tool names this skill primarily uses */
    tools: string[];
    /** Example user prompts that activate this skill */
    examples: string[];
    /** Whether this is a built-in or learned skill */
    source: 'built-in' | 'learned';
    /** For learned skills: the JS code pattern that was thumbs-up'd */
    codePattern?: string;
    /** For learned skills: usage count */
    usageCount?: number;
    /** For learned skills: when it was created */
    createdAt?: number;
}

// ═══════════════════════════════════════════════════
// BUILT-IN SKILLS (8 core skills)
// ═══════════════════════════════════════════════════

export const BUILT_IN_SKILLS: AiSkill[] = [
    {
        id: 'full-design-pipeline',
        name: 'Full Design Pipeline',
        description: 'Create a complete design from scratch: background, typography, CTA, decorations, and animations in one shot.',
        trigger: 'Canvas is EMPTY and user wants a complete new design, or explicitly says "redesign" / "start over".',
        tools: ['generate_full_design'],
        examples: [
            'make an instagram post for our shoe sale',
            'design a banner for black friday',
            'create a YouTube thumbnail',
            'start over with a new design',
        ],
        source: 'built-in',
    },
    {
        id: 'element-surgery',
        name: 'Element Surgery',
        description: 'Precisely modify specific properties of existing elements: text, color, size, position, font.',
        trigger: 'Canvas has elements and user wants to change something specific about an existing element.',
        tools: ['set_position', 'set_size', 'set_text', 'set_fill_hex', 'set_font_size',
                'set_color', 'set_opacity', 'set_rotation', 'set_z_index',
                'update_element_text', 'update_element_property'],
        examples: [
            'make the headline bigger',
            'change CTA color to red',
            'move the logo to top-left',
            'change the text to "Shop Now"',
        ],
        source: 'built-in',
    },
    {
        id: 'visual-effects',
        name: 'Visual Effects',
        description: 'Apply premium CSS effects: neon glow, glassmorphism, drop shadows, gradient text, card elevation.',
        trigger: 'User wants visual effects, styling, or asks to make something "look premium/cool/fancy".',
        tools: ['set_custom_style', 'set_shadow'],
        examples: [
            'add neon glow to the headline',
            'make it look premium',
            'add glassmorphism effect',
            'give the CTA a shadow',
        ],
        source: 'built-in',
    },
    {
        id: 'animation-director',
        name: 'Animation Director',
        description: 'Add entrance animations with professional stagger timing. Presets: fade, slide, scale, ascend, descend.',
        trigger: 'User wants motion, animation, or dynamic feel.',
        tools: ['set_animation', 'clear_animations'],
        examples: [
            'animate everything',
            'add slide-in effects',
            'make it feel dynamic',
            'remove all animations',
        ],
        source: 'built-in',
    },
    {
        id: 'layout-rearrangement',
        name: 'Layout Rearrangement',
        description: 'Reposition, resize, and align multiple elements for better visual composition.',
        trigger: 'User wants layout changes, alignment, spacing, or reflow.',
        tools: ['set_position', 'set_size'],
        examples: [
            'center everything',
            'stack elements vertically',
            'spread them out more',
            'align all text to the left',
        ],
        source: 'built-in',
    },
    {
        id: 'background-specialist',
        name: 'Background Specialist',
        description: 'Generate, replace, or remove background images. Handles AI image generation and background removal.',
        trigger: 'User wants background changes, image replacement, or background removal.',
        tools: ['replace_background_image', 'remove_background'],
        examples: [
            'change the background',
            'remove background from the logo',
            'make the background darker',
            'try a different background image',
        ],
        source: 'built-in',
    },
    {
        id: 'campaign-builder',
        name: 'Campaign Builder',
        description: 'Manage size variants, add standard ad sizes, navigate between editor views.',
        trigger: 'User wants to manage sizes, add variants, or navigate to different views.',
        tools: ['add_size', 'remove_size', 'navigate_to', 'list_creative_sets',
                'create_creative_set', 'delete_creative_set', 'rename_creative_set'],
        examples: [
            'add all standard banner sizes',
            'create a new project',
            'go to the dashboard',
            'add a 728x90 size',
        ],
        source: 'built-in',
    },
    {
        id: 'dynamic-action',
        name: 'Dynamic Action',
        description: 'Execute custom JavaScript for complex batch operations not covered by other skills. This is your catch-all — if no other skill fits, write code.',
        trigger: 'No structured tool exists for the request. Complex batch operations, custom logic, or novel requests.',
        tools: ['execute_dynamic_action'],
        examples: [
            'translate all text to English',
            'swap all fonts to Montserrat',
            'make all elements the same width',
            'reverse the layer order',
        ],
        source: 'built-in',
    },
];

// ═══════════════════════════════════════════════════
// LEARNED SKILLS (user-promoted dynamic actions)
// ═══════════════════════════════════════════════════

const LOCAL_LEARNED_KEY = 'ace-ai-learned-skills';
const MAX_LEARNED_SKILLS = 20;

/**
 * Load learned skills from localStorage (instant) + Supabase (async merge).
 */
export function loadLearnedSkills(): AiSkill[] {
    try {
        const raw = localStorage.getItem(LOCAL_LEARNED_KEY);
        if (raw) return JSON.parse(raw) as AiSkill[];
    } catch { /* */ }
    return [];
}

/**
 * Save a learned skill locally and to Supabase.
 * Called when user gives thumbs-up to a dynamic action result.
 */
export async function promoteToSkill(
    name: string,
    description: string,
    trigger: string,
    examples: string[],
    codePattern: string,
): Promise<AiSkill> {
    const skill: AiSkill = {
        id: `learned-${Date.now()}`,
        name,
        description,
        trigger,
        tools: ['execute_dynamic_action'],
        examples,
        source: 'learned',
        codePattern,
        usageCount: 1,
        createdAt: Date.now(),
    };

    // Save locally
    const existing = loadLearnedSkills();
    existing.push(skill);
    // Trim to max
    const trimmed = existing.slice(-MAX_LEARNED_SKILLS);
    localStorage.setItem(LOCAL_LEARNED_KEY, JSON.stringify(trimmed));

    // Save to Supabase (fire-and-forget)
    _saveLearnedToCloud(trimmed).catch(() => {});

    console.info('[SkillRegistry] Promoted dynamic action to learned skill:', skill.name);
    return skill;
}

/**
 * Increment usage count for a learned skill.
 */
export function incrementSkillUsage(skillId: string): void {
    const skills = loadLearnedSkills();
    const skill = skills.find(s => s.id === skillId);
    if (skill) {
        skill.usageCount = (skill.usageCount ?? 0) + 1;
        localStorage.setItem(LOCAL_LEARNED_KEY, JSON.stringify(skills));
    }
}

/**
 * Remove a learned skill.
 */
export function removeLearnedSkill(skillId: string): void {
    const skills = loadLearnedSkills().filter(s => s.id !== skillId);
    localStorage.setItem(LOCAL_LEARNED_KEY, JSON.stringify(skills));
    _saveLearnedToCloud(skills).catch(() => {});
}

// ═══════════════════════════════════════════════════
// UNIFIED SKILL CATALOG
// ═══════════════════════════════════════════════════

/**
 * Get ALL skills — built-in + learned.
 * Learned skills appear after built-in skills.
 */
export function getAllSkills(): AiSkill[] {
    return [...BUILT_IN_SKILLS, ...loadLearnedSkills()];
}

/**
 * Convert skill catalog to a prompt section for the LLM.
 * The AI uses this to understand what it can do and pick the right skill.
 */
export function skillsToPromptSection(): string {
    const allSkills = getAllSkills();
    const lines: string[] = [];

    lines.push(`## YOUR SKILLS (${allSkills.length} available — ${BUILT_IN_SKILLS.length} built-in + ${allSkills.length - BUILT_IN_SKILLS.length} learned)`);
    lines.push('');
    lines.push('Pick the right skill for each user request:');
    lines.push('');

    for (const skill of allSkills) {
        const badge = skill.source === 'learned' ? ' [LEARNED]' : '';
        const usage = skill.usageCount ? ` (used ${skill.usageCount}x)` : '';
        lines.push(`### ${skill.name}${badge}${usage}`);
        lines.push(skill.description);
        lines.push(`Trigger: ${skill.trigger}`);
        lines.push(`Examples: ${skill.examples.slice(0, 3).map(e => `"${e}"`).join(', ')}`);
        if (skill.codePattern) {
            lines.push(`Code pattern: \`${skill.codePattern.slice(0, 100)}...\``);
        }
        lines.push('');
    }

    lines.push('## SKILL RULES');
    lines.push('1. ALWAYS pick a specific skill over Dynamic Action when possible.');
    lines.push('2. You CAN combine skills in sequence (e.g., Full Design + Animation + Visual Effects).');
    lines.push('3. Check LEARNED skills before falling back to Dynamic Action — a similar pattern may already exist.');
    lines.push('4. If you use Dynamic Action and it succeeds, the user may promote it to a learned skill with thumbs-up.');

    return lines.join('\n');
}

// ═══════════════════════════════════════════════════
// SUPABASE SYNC (for learned skills)
// ═══════════════════════════════════════════════════

async function _saveLearnedToCloud(skills: AiSkill[]): Promise<void> {
    try {
        const sb = getSupabase();
        if (!sb) return;
        const { data: { user } } = await sb.auth.getUser();
        if (!user) return;

        // Store learned skills in the existing ai_memory table's preferences
        // (avoids needing a new table)
        const { error } = await sb
            .from('ai_memory')
            .upsert({
                user_id: user.id,
                learned_skills: skills.slice(-MAX_LEARNED_SKILLS),
            }, { onConflict: 'user_id' });

        if (error) console.warn('[SkillRegistry] Cloud save failed:', error.message);
    } catch { /* ok */ }
}

/**
 * Load learned skills from Supabase and merge with local.
 * Call once at session start.
 */
export async function syncLearnedSkillsFromCloud(): Promise<void> {
    try {
        const sb = getSupabase();
        if (!sb) return;
        const { data: { user } } = await sb.auth.getUser();
        if (!user) return;

        const { data } = await sb
            .from('ai_memory')
            .select('learned_skills')
            .eq('user_id', user.id)
            .maybeSingle();

        if (data?.learned_skills) {
            const cloudSkills = data.learned_skills as AiSkill[];
            const localSkills = loadLearnedSkills();

            // Merge: union by id, prefer cloud version if conflict
            const merged = new Map<string, AiSkill>();
            for (const s of localSkills) merged.set(s.id, s);
            for (const s of cloudSkills) merged.set(s.id, s); // cloud wins
            const finalSkills = [...merged.values()].slice(-MAX_LEARNED_SKILLS);

            localStorage.setItem(LOCAL_LEARNED_KEY, JSON.stringify(finalSkills));
            console.info(`[SkillRegistry] Synced ${finalSkills.length} learned skills from cloud`);
        }
    } catch { /* ok */ }
}
