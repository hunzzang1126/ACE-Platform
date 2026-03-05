// ─────────────────────────────────────────────────
// SmartSizingVisionPanel — AI Vision Check UI
// ─────────────────────────────────────────────────
// Provides a "Vision Check ⚡" button that:
//   1. Captures the current canvas screenshot
//   2. Sends to Claude Vision for quality evaluation
//   3. Shows score, issues, and applied patches
//   4. Auto-applies coordinate corrections
// ─────────────────────────────────────────────────

import { useCallback } from 'react';
import { useSmartSizingVision } from '@/hooks/useSmartSizingVision';
import type { VisionIssue } from '@/services/visionService';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FabricCanvas = any;

interface Props {
    fabricCanvas: FabricCanvas | null;
    canvasW: number;
    canvasH: number;
    elements?: Array<{ name: string; role?: string; type: string }>;
}

const SEVERITY_COLORS = {
    error: '#f85149',
    warning: '#e3b341',
};

const PROBLEM_LABELS: Record<string, string> = {
    text_overflow: 'Text Overflow',
    too_small: 'Too Small',
    overlap: 'Overlap',
    misaligned: 'Misaligned',
    off_center: 'Off-Center',
    low_contrast: 'Low Contrast',
    cta_not_prominent: 'CTA Not Visible',
    poor_hierarchy: 'Weak Hierarchy',
};

export function SmartSizingVisionPanel({ fabricCanvas, canvasW, canvasH, elements = [] }: Props) {
    const { state, runVisionCheck, cancel } = useSmartSizingVision({
        fabricCanvas, canvasW, canvasH, elements,
    });

    const handleRun = useCallback(async () => {
        await runVisionCheck();
    }, [runVisionCheck]);

    const scoreColor = state.result
        ? state.result.score >= 80 ? '#3fb950'
            : state.result.score >= 60 ? '#e3b341'
                : '#f85149'
        : '#8b949e';

    const errors = state.result?.issues.filter((i: VisionIssue) => i.severity === 'error') ?? [];
    const warnings = state.result?.issues.filter((i: VisionIssue) => i.severity === 'warning') ?? [];

    return (
        <div style={styles.panel}>
            {/* Header */}
            <div style={styles.header}>
                <span style={styles.title}>🤖 Vision Check</span>
                <span style={styles.subtitle}>AI reviews your layout visually</span>
            </div>

            {/* Score */}
            {state.result && (
                <div style={styles.scoreRow}>
                    <div style={{ ...styles.scoreCircle, borderColor: scoreColor }}>
                        <span style={{ ...styles.scoreNum, color: scoreColor }}>
                            {state.result.score}
                        </span>
                        <span style={styles.scoreLabel}>/100</span>
                    </div>
                    <div style={styles.scoreInfo}>
                        <div style={styles.scoreStatus}>
                            {state.result.score >= 80 ? '✅ Good quality' :
                                state.result.score >= 60 ? '⚠️ Needs work' : '❌ Issues found'}
                        </div>
                        <div style={styles.reasoning}>{state.result.reasoning}</div>
                    </div>
                </div>
            )}

            {/* Issues */}
            {state.result && state.result.issues.length > 0 && (
                <div style={styles.issuesBlock}>
                    {errors.length > 0 && (
                        <div style={styles.issueSection}>
                            <div style={styles.issueSectionTitle}>
                                <span style={{ color: SEVERITY_COLORS.error }}>● Errors ({errors.length})</span>
                            </div>
                            {errors.map((issue: VisionIssue, i: number) => (
                                <div key={i} style={styles.issueRow}>
                                    <span style={styles.issueElement}>{issue.element}</span>
                                    <span style={{ ...styles.issueBadge, background: '#3d1a1a', color: SEVERITY_COLORS.error }}>
                                        {PROBLEM_LABELS[issue.problem] ?? issue.problem}
                                    </span>
                                    {issue.detail && <span style={styles.issueDetail}>{issue.detail}</span>}
                                </div>
                            ))}
                        </div>
                    )}
                    {warnings.length > 0 && (
                        <div style={styles.issueSection}>
                            <div style={styles.issueSectionTitle}>
                                <span style={{ color: SEVERITY_COLORS.warning }}>● Warnings ({warnings.length})</span>
                            </div>
                            {warnings.map((issue: VisionIssue, i: number) => (
                                <div key={i} style={styles.issueRow}>
                                    <span style={styles.issueElement}>{issue.element}</span>
                                    <span style={{ ...styles.issueBadge, background: '#2d2106', color: SEVERITY_COLORS.warning }}>
                                        {PROBLEM_LABELS[issue.problem] ?? issue.problem}
                                    </span>
                                    {issue.detail && <span style={styles.issueDetail}>{issue.detail}</span>}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Patches applied */}
            {state.result && state.result.patches.length > 0 && (
                <div style={styles.patchBlock}>
                    <span style={styles.patchTitle}>⚡ {state.result.patches.length} fix{state.result.patches.length !== 1 ? 'es' : ''} applied automatically</span>
                </div>
            )}

            {/* Error */}
            {state.error && (
                <div style={styles.errorBlock}>{state.error}</div>
            )}

            {/* CTA Button */}
            <button
                id="vision-check-btn"
                style={{
                    ...styles.btn,
                    ...(state.isChecking ? styles.btnRunning : {}),
                }}
                onClick={state.isChecking ? cancel : handleRun}
                disabled={!fabricCanvas}
            >
                {state.isChecking ? (
                    <>
                        <span style={styles.spinner} />
                        {`Checking... (pass ${state.iteration})`}
                    </>
                ) : state.result ? (
                    'Re-check'
                ) : (
                    'Run Vision Check'
                )}
            </button>
        </div>
    );
}

// ── Styles ─────────────────────────────────────────
const styles: Record<string, React.CSSProperties> = {
    panel: {
        background: '#161b22',
        border: '1px solid #30363d',
        borderRadius: 8,
        padding: '12px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        fontSize: 12,
        color: '#c9d1d9',
        fontFamily: 'Inter, system-ui, sans-serif',
    },
    header: { display: 'flex', flexDirection: 'column', gap: 2 },
    title: { fontWeight: 600, fontSize: 13, color: '#f0f6fc' },
    subtitle: { color: '#8b949e', fontSize: 11 },
    scoreRow: { display: 'flex', alignItems: 'center', gap: 12 },
    scoreCircle: {
        width: 52, height: 52, borderRadius: '50%',
        border: '2px solid', display: 'flex',
        flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
    },
    scoreNum: { fontSize: 18, fontWeight: 700, lineHeight: 1 },
    scoreLabel: { fontSize: 9, color: '#8b949e' },
    scoreInfo: { display: 'flex', flexDirection: 'column', gap: 4, flex: 1 },
    scoreStatus: { fontWeight: 600, fontSize: 12, color: '#f0f6fc' },
    reasoning: { color: '#8b949e', fontSize: 11, lineHeight: 1.4 },
    issuesBlock: { display: 'flex', flexDirection: 'column', gap: 8 },
    issueSection: { display: 'flex', flexDirection: 'column', gap: 4 },
    issueSectionTitle: { fontSize: 11, fontWeight: 600, marginBottom: 2 },
    issueRow: { display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6, paddingLeft: 8 },
    issueElement: { fontWeight: 600, color: '#f0f6fc', fontSize: 11 },
    issueBadge: { borderRadius: 4, padding: '1px 6px', fontSize: 10, fontWeight: 600 },
    issueDetail: { color: '#8b949e', fontSize: 10, flex: '1 1 100%' },
    patchBlock: {
        background: '#0d1117', border: '1px solid #238636',
        borderRadius: 6, padding: '6px 10px', color: '#3fb950',
        fontSize: 11, fontWeight: 600,
    },
    errorBlock: {
        background: '#2d0f0f', border: '1px solid #f85149',
        borderRadius: 6, padding: '6px 10px', color: '#f85149', fontSize: 11,
    },
    btn: {
        background: 'linear-gradient(135deg, #238636 0%, #2ea043 100%)',
        color: '#fff', border: 'none', borderRadius: 6,
        padding: '8px 14px', fontSize: 12, fontWeight: 600,
        cursor: 'pointer', display: 'flex', alignItems: 'center',
        gap: 6, justifyContent: 'center', width: '100%',
        transition: 'opacity 0.15s ease',
    },
    btnRunning: {
        background: '#21262d',
        color: '#8b949e', cursor: 'pointer',
    },
    spinner: {
        width: 12, height: 12, borderRadius: '50%',
        border: '2px solid #8b949e', borderTopColor: '#c9d1d9',
        animation: 'spin 0.8s linear infinite', display: 'inline-block',
    },
    noKeyHint: { color: '#8b949e', fontSize: 10, textAlign: 'center' },
};
