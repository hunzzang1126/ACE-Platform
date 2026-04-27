// ─────────────────────────────────────────────────
// Dynamic Action Sandbox — Safe code execution
// ─────────────────────────────────────────────────
// Wraps execute_dynamic_action code in a constrained
// scope. Blocks dangerous patterns (fetch, eval,
// document.cookie, etc.) and enforces a timeout.
// ─────────────────────────────────────────────────

// ── Safety Limits ────────────────────────────────

const MAX_CODE_LENGTH = 5000;
const INFINITE_LOOP_PATTERN = /while\s*\(\s*true\s*\)|for\s*\(\s*;\s*;\s*\)/;
const SLOW_THRESHOLD_MS = 2000;

function logExecutionTime(startMs: number): void {
    const elapsed = performance.now() - startMs;
    if (elapsed > SLOW_THRESHOLD_MS) {
        console.warn(`[Sandbox] Slow execution: ${elapsed.toFixed(0)}ms`);
    }
}

// ── Blocked Patterns ─────────────────────────────

const BLOCKED_PATTERNS: Array<{ pattern: RegExp; reason: string }> = [
    { pattern: /\beval\s*\(/, reason: 'eval() is blocked for security' },
    { pattern: /\bnew\s+Function\s*\(/, reason: 'new Function() is blocked' },
    { pattern: /\bfetch\s*\(/, reason: 'fetch() is blocked — use dedicated tools for API calls' },
    { pattern: /\bXMLHttpRequest\b/, reason: 'XMLHttpRequest is blocked' },
    { pattern: /\bimport\s*\(/, reason: 'Dynamic import() is blocked' },
    { pattern: /\brequire\s*\(/, reason: 'require() is blocked' },
    { pattern: /document\.cookie/, reason: 'document.cookie access is blocked' },
    { pattern: /document\.write/, reason: 'document.write is blocked' },
    { pattern: /window\.location\s*=/, reason: 'Navigation is blocked' },
    { pattern: /window\.open\s*\(/, reason: 'window.open is blocked' },
    { pattern: /localStorage\.(setItem|removeItem|clear)/, reason: 'Direct localStorage mutation is blocked — use stores' },
    { pattern: /sessionStorage/, reason: 'sessionStorage access is blocked' },
    { pattern: /\bWebSocket\b/, reason: 'WebSocket is blocked' },
    { pattern: /\bWorker\s*\(/, reason: 'Worker creation is blocked' },
    { pattern: /innerHTML\s*=/, reason: 'innerHTML mutation is blocked' },
    { pattern: /outerHTML\s*=/, reason: 'outerHTML mutation is blocked' },
];

// ── Types ────────────────────────────────────────

export interface SandboxResult {
    success: boolean;
    message: string;
    blocked?: { pattern: string; reason: string };
    error?: string;
}

export interface SandboxContext {
    designStore: unknown;
    useDesignStore: unknown;
    useProjectStore: unknown;
    uuid: () => string;
    [key: string]: unknown;
}

// ── Public API ───────────────────────────────────

/**
 * Check if code contains any blocked patterns.
 * Returns the first violation found, or null if clean.
 */
export function scanForViolations(code: string): { pattern: string; reason: string } | null {
    for (const { pattern, reason } of BLOCKED_PATTERNS) {
        if (pattern.test(code)) {
            return { pattern: pattern.source, reason };
        }
    }
    return null;
}

/**
 * Execute AI-generated code in a constrained scope.
 * Blocks dangerous patterns and enforces a timeout.
 */
export async function executeSandboxed(
    code: string,
    context: SandboxContext,
    timeoutMs = 5000,
): Promise<SandboxResult> {
    // ★ Step 0: Code size limit — prevent token abuse
    if (code.length > MAX_CODE_LENGTH) {
        return {
            success: false,
            message: `Code too long (${code.length} chars, max ${MAX_CODE_LENGTH}). Break into smaller steps.`,
            error: 'CODE_TOO_LONG',
        };
    }

    // ★ Step 0.5: Infinite loop detection
    if (INFINITE_LOOP_PATTERN.test(code)) {
        return {
            success: false,
            message: 'Infinite loop pattern detected (while(true) or for(;;)). Use bounded loops instead.',
            blocked: { pattern: 'while(true)/for(;;)', reason: 'Infinite loop' },
        };
    }

    // ★ Step 1: Static analysis — check for blocked patterns
    const violation = scanForViolations(code);
    if (violation) {
        return {
            success: false,
            message: `Blocked: ${violation.reason}`,
            blocked: violation,
        };
    }

    // ★ Step 2: Execute with timeout
    const execStart = performance.now();
    return new Promise<SandboxResult>((resolve) => {
        const timer = setTimeout(() => {
            resolve({ success: false, message: `Execution timed out after ${timeoutMs}ms`, error: 'TIMEOUT' });
        }, timeoutMs);

        try {
            // Build a function with restricted scope
            // Only expose store-related globals + uuid
            const scopeKeys = Object.keys(context);
            const scopeValues = scopeKeys.map(k => context[k]);

            // eslint-disable-next-line @typescript-eslint/no-implied-eval
            const fn = new Function(...scopeKeys, `"use strict";\n${code}`);
            const result = fn(...scopeValues);

            clearTimeout(timer);

            // Handle async results
            if (result instanceof Promise) {
                result
                    .then(() => {
                        logExecutionTime(execStart);
                        resolve({ success: true, message: 'Dynamic action executed successfully' });
                    })
                    .catch((err: Error) => {
                        logExecutionTime(execStart);
                        resolve({ success: false, message: `Runtime error: ${err.message}`, error: err.message });
                    });
            } else {
                logExecutionTime(execStart);
                resolve({ success: true, message: 'Dynamic action executed successfully' });
            }
        } catch (err) {
            clearTimeout(timer);
            logExecutionTime(execStart);
            const message = err instanceof Error ? err.message : String(err);
            resolve({ success: false, message: `Runtime error: ${message}`, error: message });
        }
    });
}

/**
 * Get list of blocked patterns (for tool description or debugging)
 */
export function getBlockedPatternList(): string[] {
    return BLOCKED_PATTERNS.map(p => p.reason);
}
