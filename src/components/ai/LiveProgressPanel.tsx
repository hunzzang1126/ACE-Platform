// ─────────────────────────────────────────────────
// LiveProgressPanel — AI execution progress display
// ─────────────────────────────────────────────────

import { useState } from 'react';
import type { ExecutionResult } from '../../ai/commandExecutor';
import { TypewriterText, Spinner } from './MessageBubble';
import { TOOL_LABELS, progressCardStyle, progressHeaderStyle, generatingStyle } from './aiChatStyles';

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

function humanizeToolCall(rawName: string, _params: Record<string, unknown>): string {
    const base = TOOL_LABELS[rawName];
    if (base) return base;
    return rawName.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function humanizePlanStep(raw: string): string {
    const match = raw.match(/^(\w+)\((.*)\)$/);
    if (!match) return raw;
    const [, toolName] = match;
    const label = TOOL_LABELS[toolName ?? ''];
    if (label) return label;
    return (toolName ?? raw).replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function buildRichStepDetail(
    step: { name: string; params: Record<string, unknown>; result?: { success: boolean; message: string; nodeId?: number }; status: string }
): string {
    const parts: string[] = [];
    const p = step.params;

    if (p.x !== undefined && p.y !== undefined) parts.push(`📍 Position: (${p.x}, ${p.y})`);
    if (p.width !== undefined && p.height !== undefined) parts.push(`📐 Size: ${p.width}×${p.height}`);
    if (p.color) parts.push(`🎨 Color: ${p.color}`);
    if (p.fill) parts.push(`🎨 Fill: ${p.fill}`);
    if (p.radius !== undefined) parts.push(`⬜ Corner radius: ${p.radius}px`);
    if (p.blur !== undefined || p.offset_x !== undefined) {
        const blur = p.blur ?? 0;
        const ox = p.offset_x ?? 0;
        const oy = p.offset_y ?? 0;
        parts.push(`🌑 Shadow: blur ${blur}, offset (${ox}, ${oy})`);
    }
    if (p.opacity !== undefined) parts.push(`👁 Opacity: ${Number(p.opacity) * 100}%`);
    if (p.text) {
        const txt = String(p.text);
        parts.push(`📝 Text: "${txt.length > 40 ? txt.slice(0, 40) + '...' : txt}"`);
    }
    if (p.font_size !== undefined) parts.push(`🔤 Font size: ${p.font_size}px`);
    if (p.node_id !== undefined) parts.push(`🎯 Target: node #${p.node_id}`);

    if (step.status === 'running') {
        parts.push(parts.length > 0 ? '\n⏳ Executing...' : '⏳ Working on it...');
    }

    if (step.result) {
        const icon = step.result.success ? '✅' : '❌';
        parts.push(`${icon} ${step.result.message}`);
    }

    return parts.length > 0 ? parts.join('\n') : (step.status === 'running' ? 'Working on it...' : 'Waiting...');
}

// ── Component ──

export function LiveProgressPanel({ live }: { live: LiveState }) {
    const [collapsed, setCollapsed] = useState(false);

    const entries: { label: string; detail: string; status: 'active' | 'done' | 'error' }[] = [];

    if (live.canvasScan || live.phase !== 'idle') {
        entries.push({
            label: 'Scanned canvas',
            detail: live.canvasScan || 'Reading current canvas state...',
            status: live.phase === 'scanning' ? 'active' : 'done',
        });
    }

    if (live.phase === 'thinking' || live.plan.length > 0 || live.steps.length > 0 || live.reflection) {
        entries.push({
            label: 'Analyzing your request',
            detail: live.thinking || 'Understanding what you want...',
            status: live.phase === 'thinking' ? 'active' : 'done',
        });
    }

    if (live.plan.length > 0) {
        entries.push({
            label: `Planning ${live.plan.length} step${live.plan.length > 1 ? 's' : ''}`,
            detail: live.plan.map((s, i) => `${i + 1}. ${humanizePlanStep(s)}`).join('\n'),
            status: live.phase === 'planning' ? 'active' : 'done',
        });
    }

    for (const step of live.steps) {
        if (step.status !== 'pending') {
            const richDetail = buildRichStepDetail(step);
            entries.push({
                label: humanizeToolCall(step.name, step.params),
                detail: richDetail,
                status: step.status === 'running' ? 'active' : step.status === 'done' ? 'done' : 'error',
            });
        }
    }

    const isActive = live.phase !== 'done' && live.phase !== 'idle' && live.phase !== 'error';

    return (
        <div style={progressCardStyle}>
            <div style={progressHeaderStyle}>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#8b949e', letterSpacing: 0.3, textTransform: 'uppercase' }}>
                    Progress Updates
                </span>
                <button
                    onClick={() => setCollapsed(c => !c)}
                    style={{ background: 'none', border: 'none', color: '#4a9eff', fontSize: 11, cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}
                >
                    {collapsed ? 'Expand all' : 'Collapse all'}
                </button>
            </div>

            {!collapsed && (
                <div style={{ padding: '8px 14px 4px' }}>
                    {entries.map((entry, i) => (
                        <ProgressEntry key={i} index={i + 1} entry={entry} />
                    ))}
                </div>
            )}

            {isActive && (
                <div style={generatingStyle}>
                    <Spinner />
                    <span>Generating.</span>
                </div>
            )}
        </div>
    );
}

// ── Progress Entry ──

function ProgressEntry({ index, entry }: {
    index: number;
    entry: { label: string; detail: string; status: 'active' | 'done' | 'error' };
}) {
    const [expanded, setExpanded] = useState(true);

    return (
        <div style={{ marginBottom: 14 }}>
            <div
                onClick={() => setExpanded(e => !e)}
                style={{
                    display: 'flex', alignItems: 'flex-start', gap: 10,
                    cursor: 'pointer', userSelect: 'none',
                }}
            >
                <span style={{
                    fontSize: 13, fontWeight: 600, color: '#484f58',
                    minWidth: 16, textAlign: 'right', lineHeight: '20px',
                    flexShrink: 0,
                }}>
                    {index}
                </span>

                <span style={{
                    flex: 1, fontSize: 14, fontWeight: 600, color: '#e6edf3',
                    lineHeight: '20px',
                }}>
                    {entry.label}
                </span>

                <svg
                    width={12} height={12} viewBox="0 0 12 12"
                    style={{
                        marginTop: 4, flexShrink: 0, color: '#484f58',
                        transform: expanded ? 'rotate(0deg)' : 'rotate(-90deg)',
                        transition: 'transform 0.15s ease',
                    }}
                >
                    <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth={1.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            </div>

            {expanded && (
                entry.status === 'active'
                    ? <TypewriterText
                        text={entry.detail}
                        speed={10}
                        showCursor={false}
                        style={{
                            marginLeft: 26, marginTop: 6,
                            fontSize: 12.5, lineHeight: 1.65, color: '#8b949e',
                        }}
                    />
                    : <div style={{
                        marginLeft: 26, marginTop: 6,
                        fontSize: 12.5, lineHeight: 1.65, color: '#8b949e',
                        whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                    }}>
                        {entry.detail}
                    </div>
            )}
        </div>
    );
}
