// ─────────────────────────────────────────────────
// ACE Backend API Service
// ─────────────────────────────────────────────────
const API_BASE = 'http://localhost:8000';

export interface VisionIssue {
    type: string;
    severity: 'high' | 'medium' | 'low';
    element: string;
    description: string;
    suggestion: string;
}

export interface VariantQAResult {
    variant_id: string;
    width: number;
    height: number;
    name: string;
    score: number;
    issues: VisionIssue[];
}

export interface VisionQAResponse {
    creative_set_id: string;
    overall_score: number;
    variants: VariantQAResult[];
}

interface VariantScreenshot {
    variant_id: string;
    width: number;
    height: number;
    name: string;
    screenshot_base64: string;
}

/** Health check */
export async function checkBackendHealth(): Promise<{ status: string; openai_configured: boolean }> {
    const res = await fetch(`${API_BASE}/health`);
    if (!res.ok) throw new Error('Backend not reachable');
    return res.json();
}

/** Run Vision QA on all variant screenshots */
export async function runVisionQA(payload: {
    creative_set_id: string;
    master_screenshot_base64: string;
    master_width: number;
    master_height: number;
    variants: VariantScreenshot[];
}): Promise<VisionQAResponse> {
    const res = await fetch(`${API_BASE}/api/vision-qa`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    if (!res.ok) {
        const err = await res.text();
        throw new Error(`Vision QA failed: ${err}`);
    }
    return res.json();
}

// ── Auto-Fix API ──

export interface ElementFix {
    element_id: string;
    new_constraints: Record<string, unknown>;
    explanation: string;
}

export interface VariantFixResult {
    variant_id: string;
    fixes: ElementFix[];
}

export interface AutoFixResponse {
    creative_set_id: string;
    variants: VariantFixResult[];
}

interface ElementFixData {
    id: string;
    name: string;
    type: string;
    constraints: Record<string, unknown>;
    content?: string;
    label?: string;
    fontSize?: number;
    fill?: string;
    color?: string;
    backgroundColor?: string;
    opacity?: number;
}

interface VariantFixPayload {
    variant_id: string;
    width: number;
    height: number;
    name: string;
    issues: VisionIssue[];
    elements: ElementFixData[];
}

/** Request AI to auto-fix layout issues */
export async function requestAutoFix(payload: {
    creative_set_id: string;
    master_width: number;
    master_height: number;
    variants: VariantFixPayload[];
}): Promise<AutoFixResponse> {
    const res = await fetch(`${API_BASE}/api/vision-fix`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    if (!res.ok) {
        const err = await res.text();
        throw new Error(`Auto-fix failed: ${err}`);
    }
    return res.json();
}
