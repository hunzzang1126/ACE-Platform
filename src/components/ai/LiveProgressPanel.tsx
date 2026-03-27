// ─────────────────────────────────────────────────
// LiveProgressPanel — Gemini-style status indicators
// ─────────────────────────────────────────────────
// Shows: Scanning... Thinking... Making... Done
// With animated orb, gradient accents, and typewriter details.
// ─────────────────────────────────────────────────

import { useState } from 'react';
import type { ExecutionResult } from '../../ai/commandExecutor';
import { TypewriterText, Spinner } from './MessageBubble';
import { TOOL_LABELS } from './aiChatStyles';

// ── Types ──

export interface LiveState {
    phase: 'idle' | 'scanning' | 'thinking' | 'planning' | 'executing' | 'reflecting' | 'done' | 'error';
    canvasScan: string;
    thinking: string;
    plan: string[];
    steps: { name: string; params: Record<string, unknown>; result?: ExecutionResult; status: 'pending' | 'running' | 'done' | 'error' }[];
    reflection: string;
    streamedText: string;
    error: string;
}

// ── Helpers ──

function humanizeToolCall(rawName: string): string {
    return TOOL_LABELS[rawName] ?? rawName.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function humanizePlanStep(raw: string): string {
    const match = raw.match(/^(\w+)\((.*)?\)$/);
    if (!match) return raw;
    const [, toolName] = match;
    return TOOL_LABELS[toolName ?? ''] ?? (toolName ?? raw).replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function buildRichDetail(
    step: { name: string; params: Record<string, unknown>; result?: { success: boolean; message: string }; status: string }
): string {
    const parts: string[] = [];
    const p = step.params;
    if (p.x !== undefined && p.y !== undefined) parts.push(`Position: (${p.x}, ${p.y})`);
    if (p.width !== undefined && p.height !== undefined) parts.push(`Size: ${p.width} x ${p.height}`);
    if (p.color) parts.push(`Color: ${p.color}`);
    if (p.fill) parts.push(`Fill: ${p.fill}`);
    if (p.text) {
        const txt = String(p.text);
        parts.push(`"${txt.length > 40 ? txt.slice(0, 40) + '...' : txt}"`);
    }
    if (step.result) {
        parts.push(step.result.success ? 'Done' : `Error: ${step.result.message}`);
    }
    return parts.length > 0 ? parts.join(' · ') : (step.status === 'running' ? 'Working...' : '');
}

// ── Phase display label + icon ──

function phaseLabel(phase: LiveState['phase']): string {
    switch (phase) {
        case 'scanning': return 'Reading workspace...';
        case 'thinking': return 'Thinking...';
        case 'planning': return 'Planning changes...';
        case 'executing': return 'Working...';
        case 'reflecting': return 'Reviewing result...';
        case 'done': return 'Complete';
        default: return '';
    }
}

// ── Component ──

export function LiveProgressPanel({ live }: { live: LiveState }) {
    const [collapsed, setCollapsed] = useState(false);

    const entries: { label: string; detail: string; status: 'active' | 'done' | 'error' }[] = [];

    // Scanning
    if (live.canvasScan || live.phase !== 'idle') {
        entries.push({
            label: 'Scanning canvas',
            detail: live.canvasScan || 'Reading current canvas state...',
            status: live.phase === 'scanning' ? 'active' : 'done',
        });
    }

    // Thinking
    if (live.phase === 'thinking' || live.plan.length > 0 || live.steps.length > 0 || live.reflection) {
        entries.push({
            label: 'Analyzing your request',
            detail: live.thinking || 'Understanding what you need...',
            status: live.phase === 'thinking' ? 'active' : 'done',
        });
    }

    // Planning
    if (live.plan.length > 0) {
        entries.push({
            label: `Planning ${live.plan.length} step${live.plan.length > 1 ? 's' : ''}`,
            detail: live.plan.map((s, i) => `${i + 1}. ${humanizePlanStep(s)}`).join('\n'),
            status: live.phase === 'planning' ? 'active' : 'done',
        });
    }

    // Steps
    for (const step of live.steps) {
        if (step.status !== 'pending') {
            entries.push({
                label: humanizeToolCall(step.name),
                detail: buildRichDetail(step),
                status: step.status === 'running' ? 'active' : step.status === 'done' ? 'done' : 'error',
            });
        }
    }

    const isActive = live.phase !== 'done' && live.phase !== 'idle' && live.phase !== 'error';

    return (
        <div className="ai-progress-card">
            {/* Phase indicator bar */}
            <div className="ai-progress-phase">
                {isActive && <Spinner />}
                {!isActive && live.phase === 'done' && (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5">
                        <path d="M20 6L9 17l-5-5" />
                    </svg>
                )}
                <span className={`ai-phase-text ${isActive ? 'animating' : ''}`}>
                    {phaseLabel(live.phase)}
                </span>
                <button
                    className="ai-progress-toggle"
                    onClick={() => setCollapsed(c => !c)}
                >
                    {collapsed ? 'Show' : 'Hide'}
                </button>
            </div>

            {/* Steps */}
            {!collapsed && (
                <div className="ai-progress-entries">
                    {isActive && <div className="ai-shimmer-bar" />}
                    {entries.map((entry, i) => (
                        <ProgressEntry key={i} entry={entry} />
                    ))}
                </div>
            )}
        </div>
    );
}

// ── Progress Entry ──

function ProgressEntry({ entry }: {
    entry: { label: string; detail: string; status: 'active' | 'done' | 'error' };
}) {
    return (
        <div className={`ai-progress-entry ${entry.status}`}>
            <div className="ai-progress-status-dot">
                {entry.status === 'done' && (
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="3">
                        <path d="M20 6L9 17l-5-5" />
                    </svg>
                )}
                {entry.status === 'active' && <span className="ai-entry-pulse" />}
                {entry.status === 'error' && (
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="3">
                        <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                )}
            </div>
            <div className="ai-progress-entry-body">
                <span className="ai-progress-entry-label">{entry.label}</span>
                {entry.detail && (
                    entry.status === 'active'
                        ? <TypewriterText text={entry.detail} speed={8} showCursor={false} style={{ fontSize: 11, color: '#64748b', marginTop: 2 }} />
                        : <span className="ai-progress-entry-detail">{entry.detail}</span>
                )}
            </div>
        </div>
    );
}
