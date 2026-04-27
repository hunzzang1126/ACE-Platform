// ─────────────────────────────────────────────────
// Tool Parameter Validator — Pre-execution guard
// ─────────────────────────────────────────────────
// Validates AI-provided tool parameters BEFORE execution.
// Catches: invalid hex colors, out-of-range numbers, missing required fields.
// ─────────────────────────────────────────────────

export interface ValidationResult {
    valid: boolean;
    errors: string[];
    sanitized: Record<string, unknown>;
}

// ── Validators ───────────────────────────────────

const HEX_COLOR_RE = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/;

function isValidHex(value: unknown): boolean {
    return typeof value === 'string' && HEX_COLOR_RE.test(value);
}

function sanitizeHex(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    let v = value.trim();
    // Auto-fix missing #
    if (/^[0-9A-Fa-f]{3,8}$/.test(v)) v = '#' + v;
    return HEX_COLOR_RE.test(v) ? v : null;
}

function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
    const n = Number(value);
    if (!Number.isFinite(n)) return fallback;
    return Math.max(min, Math.min(max, n));
}

// ── Tool-specific Validators ─────────────────────

type ToolValidator = (params: Record<string, unknown>) => ValidationResult;

const validators: Record<string, ToolValidator> = {
    generate_full_design: (params) => {
        const errors: string[] = [];
        const sanitized = { ...params };
        if (!params.prompt || (typeof params.prompt === 'string' && params.prompt.trim().length < 3)) {
            errors.push('prompt must be at least 3 characters');
        }
        return { valid: errors.length === 0, errors, sanitized };
    },

    generate_image: (params) => {
        const errors: string[] = [];
        const sanitized = { ...params };
        if (!params.prompt || (typeof params.prompt === 'string' && params.prompt.trim().length < 3)) {
            errors.push('prompt must be at least 3 characters');
        }
        const validStyles = ['realistic', 'illustration', 'abstract', 'minimal', 'photography'];
        if (params.style && !validStyles.includes(params.style as string)) {
            sanitized.style = 'photography'; // safe default
        }
        return { valid: errors.length === 0, errors, sanitized };
    },

    replace_background_image: (params) => {
        const errors: string[] = [];
        const sanitized = { ...params };
        if (!params.prompt || (typeof params.prompt === 'string' && params.prompt.trim().length < 3)) {
            errors.push('prompt is required (at least 3 characters)');
        }
        return { valid: errors.length === 0, errors, sanitized };
    },

    update_element_text: (params) => {
        const errors: string[] = [];
        const sanitized = { ...params };
        if (!params.element_name || typeof params.element_name !== 'string') {
            errors.push('element_name is required');
        }
        if (params.new_text === undefined || params.new_text === null) {
            errors.push('new_text is required');
        }
        return { valid: errors.length === 0, errors, sanitized };
    },

    update_element_property: (params) => {
        const errors: string[] = [];
        const sanitized = { ...params };
        if (!params.element_name || typeof params.element_name !== 'string') {
            errors.push('element_name is required');
        }
        if (!params.property || typeof params.property !== 'string') {
            errors.push('property is required');
        }

        // Property-specific validation
        const prop = params.property as string;
        const value = params.value;

        if (['color', 'fill', 'backgroundColor'].includes(prop)) {
            const fixed = sanitizeHex(value);
            if (fixed) {
                sanitized.value = fixed;
            } else if (value !== undefined) {
                errors.push(`Invalid hex color for ${prop}: "${value}"`);
            }
        }
        if (['fontSize'].includes(prop)) {
            sanitized.value = String(clampNumber(value, 6, 999, 16));
        }
        if (['opacity'].includes(prop)) {
            sanitized.value = String(clampNumber(value, 0, 1, 1));
        }
        if (['x', 'y', 'width', 'height', 'w', 'h'].includes(prop)) {
            sanitized.value = String(clampNumber(value, -5000, 10000, 0));
        }
        if (['angle', 'rotation'].includes(prop)) {
            sanitized.value = String(clampNumber(value, -360, 360, 0));
        }

        return { valid: errors.length === 0, errors, sanitized };
    },

    execute_dynamic_action: (params) => {
        const errors: string[] = [];
        const sanitized = { ...params };
        if (!params.code || typeof params.code !== 'string' || (params.code as string).trim().length === 0) {
            errors.push('code is required and must be a non-empty string');
        }
        return { valid: errors.length === 0, errors, sanitized };
    },

    add_text: (params) => {
        const errors: string[] = [];
        const sanitized = { ...params };
        // Tool schema uses 'content', validate both for robustness
        if (!params.content && !params.text) {
            errors.push('content is required');
        }
        // Normalize: if 'text' given but not 'content', copy
        if (!params.content && params.text) {
            sanitized.content = params.text;
        }
        if (params.color) {
            const fixed = sanitizeHex(params.color);
            if (fixed) sanitized.color = fixed;
            else errors.push(`Invalid hex color: "${params.color}"`);
        }
        if (params.fontSize !== undefined) {
            sanitized.fontSize = clampNumber(params.fontSize, 6, 999, 24);
        }
        return { valid: errors.length === 0, errors, sanitized };
    },

    add_button: (params) => {
        const errors: string[] = [];
        const sanitized = { ...params };
        // Tool schema uses 'text', validate both for robustness
        if (!params.text && !params.label) {
            // Buttons can have default text, so this is a soft check
            sanitized.text = sanitized.text || 'Shop Now';
        }
        // Normalize: if 'label' given but not 'text', copy
        if (!params.text && params.label) {
            sanitized.text = params.label;
        }
        if (params.bgColor) {
            const fixed = sanitizeHex(params.bgColor);
            if (fixed) sanitized.bgColor = fixed;
            else errors.push(`Invalid hex color: "${params.bgColor}"`);
        }
        if (params.textColor) {
            const fixed = sanitizeHex(params.textColor);
            if (fixed) sanitized.textColor = fixed;
            else errors.push(`Invalid hex color: "${params.textColor}"`);
        }
        return { valid: errors.length === 0, errors, sanitized };
    },
};

// ── Public API ───────────────────────────────────

/**
 * Validate and sanitize tool parameters before execution.
 * Returns sanitized params if valid, or error details if not.
 */
export function validateToolParams(
    toolName: string,
    params: Record<string, unknown>,
): ValidationResult {
    const validator = validators[toolName];
    if (!validator) {
        // No validator = pass through (analyze_scene, fill_to_page, etc.)
        return { valid: true, errors: [], sanitized: params };
    }
    return validator(params);
}

/** Check if a string is a valid hex color */
export { isValidHex, sanitizeHex, clampNumber };
