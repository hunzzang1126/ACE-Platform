// ─────────────────────────────────────────────────
// smartContextHelpers — Ring buffers, element summarizer, brand detector
// ─────────────────────────────────────────────────

import type { DesignElement, TextElement, ShapeElement, ButtonElement } from '@/schema/elements.types';
import type { AiMemory } from '@/services/aiMemoryService';
import { loadMemory } from '@/services/aiMemoryService';
import { initActionTracker } from '@/ai/actionTracker';

export interface ElementSummary {
    name: string; type: string; role?: string;
    props: Record<string, string | number>;
}

export interface BrandProfile {
    primaryColor: string; secondaryColor: string;
    backgroundColor: string; fontFamily: string; textColor: string;
}

export interface AiChangeRecord {
    tool: string; elementName: string; summary: string; timestamp: number;
}

// ── Action History Ring Buffer ──

const ACTION_HISTORY_MAX = 10;
let actionHistory: string[] = [];

export function pushAction(action: string): void {
    actionHistory.push(action);
    if (actionHistory.length > ACTION_HISTORY_MAX) actionHistory = actionHistory.slice(-ACTION_HISTORY_MAX);
}
export function getActionHistory(): string[] { return [...actionHistory]; }
export function clearActionHistory(): void { actionHistory = []; }

// ── Last Touched Elements ──

const LAST_TOUCHED_MAX = 5;
let lastTouched: { name: string; id: number; action: string; timestamp: number }[] = [];

export function pushLastTouched(name: string, id: number, action: string): void {
    lastTouched = lastTouched.filter(t => !(t.id === id && t.action === action));
    lastTouched.push({ name, id, action, timestamp: Date.now() });
    if (lastTouched.length > LAST_TOUCHED_MAX) lastTouched = lastTouched.slice(-LAST_TOUCHED_MAX);
}
export function getLastTouched() { return [...lastTouched]; }
export function clearLastTouched(): void { lastTouched = []; }

// ── AI Change Log ──

const AI_CHANGE_LOG_MAX = 15;
let aiChangeLog: AiChangeRecord[] = [];

export function pushAiChange(record: AiChangeRecord): void {
    aiChangeLog.push(record);
    if (aiChangeLog.length > AI_CHANGE_LOG_MAX) aiChangeLog = aiChangeLog.slice(-AI_CHANGE_LOG_MAX);
}
export function getAiChangeLog(): AiChangeRecord[] { return [...aiChangeLog]; }
export function clearAiChangeLog(): void { aiChangeLog = []; }

// ── Cached AI Memory ──

let cachedMemory: AiMemory | null = null;

export async function refreshMemoryCache(): Promise<void> {
    try { cachedMemory = await loadMemory(); } catch { /* ok */ }
}
export function getCachedMemory(): AiMemory | null { return cachedMemory; }

// Kick off initial load
refreshMemoryCache();
initActionTracker();

// ── Element Summarizer ──

export function summarizeElement(el: DesignElement): ElementSummary {
    const base: ElementSummary = { name: el.name, type: el.type, role: el.role, props: {} };
    switch (el.type) {
        case 'text': { const t = el as TextElement; base.props = { content: t.content.length > 40 ? t.content.substring(0, 40) + '…' : t.content, fontSize: t.fontSize, color: t.color, fontFamily: t.fontFamily, align: t.textAlign }; break; }
        case 'shape': { const s = el as ShapeElement; base.props = { shape: s.shapeType, fill: s.fill, w: el.constraints.size.width, h: el.constraints.size.height }; break; }
        case 'button': { const b = el as ButtonElement; base.props = { label: b.label, bgColor: b.backgroundColor, textColor: b.color }; break; }
        case 'image': base.props = { src: 'image' }; break;
        case 'video': base.props = { src: 'video' }; break;
    }
    return base;
}

// ── Brand Detector ──

export function detectBrand(elements: DesignElement[]): BrandProfile | undefined {
    if (elements.length === 0) return undefined;
    let bgColor = '#0a0e1a';
    const bgEl = elements.find(el => el.role === 'background' && el.type === 'shape');
    if (bgEl && bgEl.type === 'shape') bgColor = (bgEl as ShapeElement).fill;
    let primaryColor = '#c9a84c';
    const accentEl = elements.find(el => el.role === 'accent' && el.type === 'shape');
    if (accentEl && accentEl.type === 'shape') primaryColor = (accentEl as ShapeElement).fill;
    const ctaEl = elements.find(el => el.role === 'cta' && el.type === 'button');
    if (ctaEl && ctaEl.type === 'button') primaryColor = (ctaEl as ButtonElement).backgroundColor;
    let textColor = '#ffffff';
    const headlineEl = elements.find(el => el.role === 'headline' && el.type === 'text');
    if (headlineEl && headlineEl.type === 'text') textColor = (headlineEl as TextElement).color;
    let fontFamily = 'Inter';
    const textEl = elements.find(el => el.type === 'text');
    if (textEl && textEl.type === 'text') fontFamily = (textEl as TextElement).fontFamily;
    const shapeFills = elements.filter(el => el.type === 'shape' && el.role !== 'background').map(el => (el as ShapeElement).fill).filter(f => f !== bgColor && f !== primaryColor);
    return { primaryColor, secondaryColor: shapeFills[0] || primaryColor, backgroundColor: bgColor, fontFamily, textColor };
}
