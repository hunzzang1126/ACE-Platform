// ─────────────────────────────────────────────────
// Circuit Breaker — API failure cost protection
// ─────────────────────────────────────────────────
// Prevents cost explosion from cascading API failures.
// After N consecutive failures, blocks requests for a
// cooldown period. Half-open state allows single probe.
// ─────────────────────────────────────────────────

export type CircuitState = 'closed' | 'open' | 'half-open';

export interface CircuitBreakerConfig {
    failureThreshold: number;
    cooldownMs: number;
}

const DEFAULT_CONFIG: CircuitBreakerConfig = {
    failureThreshold: 3,
    cooldownMs: 30_000, // 30 seconds
};

export class CircuitBreaker {
    private state: CircuitState = 'closed';
    private failureCount = 0;
    private lastFailureTime = 0;
    private config: CircuitBreakerConfig;

    constructor(config: Partial<CircuitBreakerConfig> = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
    }

    /** Check if a call is allowed */
    canCall(): boolean {
        if (this.state === 'closed') return true;
        if (this.state === 'open') {
            // Check if cooldown has passed → transition to half-open
            if (Date.now() - this.lastFailureTime >= this.config.cooldownMs) {
                this.state = 'half-open';
                console.info('[CircuitBreaker] Cooldown passed → half-open (allowing probe)');
                return true;
            }
            return false;
        }
        // half-open: allow one probe call
        return true;
    }

    /** Record a successful API call */
    recordSuccess(): void {
        if (this.state === 'half-open') {
            console.info('[CircuitBreaker] Probe succeeded → closed');
        }
        this.state = 'closed';
        this.failureCount = 0;
    }

    /** Record a failed API call */
    recordFailure(): void {
        this.failureCount++;
        this.lastFailureTime = Date.now();

        if (this.state === 'half-open') {
            // Probe failed → back to open
            this.state = 'open';
            console.warn('[CircuitBreaker] Probe failed → open');
            return;
        }

        if (this.failureCount >= this.config.failureThreshold) {
            this.state = 'open';
            console.warn(`[CircuitBreaker] ${this.failureCount} consecutive failures → OPEN (blocking for ${this.config.cooldownMs / 1000}s)`);
        }
    }

    /** Get current state info */
    getState(): { state: CircuitState; failureCount: number; cooldownRemaining: number } {
        const cooldownRemaining = this.state === 'open'
            ? Math.max(0, this.config.cooldownMs - (Date.now() - this.lastFailureTime))
            : 0;
        return { state: this.state, failureCount: this.failureCount, cooldownRemaining };
    }

    /** Reset to initial state */
    reset(): void {
        this.state = 'closed';
        this.failureCount = 0;
        this.lastFailureTime = 0;
    }
}

// ── Singleton for AI API calls ───────────────────

let _instance: CircuitBreaker | null = null;

export function getAiCircuitBreaker(): CircuitBreaker {
    if (!_instance) _instance = new CircuitBreaker();
    return _instance;
}

/** Get user-friendly message when circuit is open */
export function getCircuitOpenMessage(): string {
    const info = getAiCircuitBreaker().getState();
    const secs = Math.ceil(info.cooldownRemaining / 1000);
    return `AI is temporarily unavailable after ${info.failureCount} consecutive errors. Retrying in ${secs}s...`;
}
