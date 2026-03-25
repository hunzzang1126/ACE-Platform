// ─────────────────────────────────────────────────
// DesignScorePanel — AI Creative Director UI
// ─────────────────────────────────────────────────
// "Grammarly for Design" — Real-time design quality
// score with categorized issues and auto-fix.
// ─────────────────────────────────────────────────

import { useState } from 'react';
import type { DesignScore, DesignIssue, IssueSeverity } from '@/engine/designScoreEngine';

interface Props {
    score: DesignScore;
    onFixAll?: () => void;
    onClose?: () => void;
}

// ── Score color mapping ──

function scoreColor(total: number): string {
    if (total >= 80) return '#4ade80';
    if (total >= 50) return '#fbbf24';
    return '#f87171';
}

function gradeColor(grade: string): string {
    switch (grade) {
        case 'A': return '#4ade80';
        case 'B': return '#86efac';
        case 'C': return '#fbbf24';
        case 'D': return '#fb923c';
        default: return '#f87171';
    }
}

function severityIcon(severity: IssueSeverity): string {
    switch (severity) {
        case 'error': return '!';
        case 'warning': return '~';
        case 'info': return 'i';
    }
}

function severityColor(severity: IssueSeverity): string {
    switch (severity) {
        case 'error': return '#f87171';
        case 'warning': return '#fbbf24';
        case 'info': return '#60a5fa';
    }
}

function categoryLabel(cat: string): string {
    switch (cat) {
        case 'safe-zone': return 'SAFE ZONE';
        case 'contrast': return 'CONTRAST';
        case 'overflow': return 'OVERFLOW';
        case 'hierarchy': return 'HIERARCHY';
        case 'color': return 'COLOR';
        case 'typography': return 'TYPOGRAPHY';
        case 'content': return 'CONTENT';
        case 'layout': return 'LAYOUT';
        case 'proportion': return 'PROPORTION';
        default: return cat.toUpperCase();
    }
}

// ── Component ──

export function DesignScorePanel({ score, onFixAll, onClose }: Props) {
    const [issuesExpanded, setIssuesExpanded] = useState(true);
    const [tipsExpanded, setTipsExpanded] = useState(false);

    const errors = score.issues.filter(i => i.severity === 'error');
    const warnings = score.issues.filter(i => i.severity === 'warning');

    return (
        <div style={styles.root}>
            {/* Header */}
            <div style={styles.header}>
                <span style={styles.title}>Design Score</span>
                {onClose && <button style={styles.closeBtn} onClick={onClose}>x</button>}
            </div>

            {/* Score Ring */}
            <div style={styles.scoreCard}>
                <div style={{
                    ...styles.scoreRing,
                    borderColor: scoreColor(score.total),
                    color: scoreColor(score.total),
                }}>
                    {score.total}
                </div>
                <div style={styles.scoreInfo}>
                    <div style={{
                        ...styles.gradeLabel,
                        color: gradeColor(score.grade),
                    }}>
                        Grade {score.grade}
                    </div>
                    <div style={styles.scoreMeta}>
                        {errors.length > 0 && <span style={{ color: '#f87171' }}>{errors.length} error{errors.length > 1 ? 's' : ''}</span>}
                        {errors.length > 0 && warnings.length > 0 && ' · '}
                        {warnings.length > 0 && <span style={{ color: '#fbbf24' }}>{warnings.length} warning{warnings.length > 1 ? 's' : ''}</span>}
                        {errors.length === 0 && warnings.length === 0 && (
                            <span style={{ color: '#4ade80' }}>No issues</span>
                        )}
                    </div>
                </div>
            </div>

            {/* Fix All Button */}
            {score.fixableCount > 0 && onFixAll && (
                <button style={styles.fixAllBtn} onClick={onFixAll}>
                    Auto-fix {score.fixableCount} issue{score.fixableCount > 1 ? 's' : ''}
                </button>
            )}

            {/* Issues List */}
            {score.issues.length > 0 && (
                <div style={styles.section}>
                    <button
                        style={styles.sectionToggle}
                        onClick={() => setIssuesExpanded(!issuesExpanded)}
                    >
                        <span>Issues ({score.issues.length})</span>
                        <span style={{
                            transform: issuesExpanded ? 'rotate(90deg)' : 'none',
                            transition: 'transform 0.15s',
                            display: 'inline-block',
                        }}>
                            ›
                        </span>
                    </button>
                    {issuesExpanded && score.issues.map((issue: DesignIssue) => (
                        <div key={issue.id} style={styles.issueRow}>
                            <div style={{
                                ...styles.severityDot,
                                background: severityColor(issue.severity),
                            }}>
                                {severityIcon(issue.severity)}
                            </div>
                            <div style={styles.issueContent}>
                                <div style={styles.issueCatRow}>
                                    <span style={{
                                        ...styles.catBadge,
                                        background: `${severityColor(issue.severity)}15`,
                                        color: severityColor(issue.severity),
                                    }}>
                                        {categoryLabel(issue.category)}
                                    </span>
                                    {issue.autoFixable && (
                                        <span style={styles.fixableBadge}>Fixable</span>
                                    )}
                                </div>
                                <div style={styles.issueMsg}>{issue.message}</div>
                                {issue.elementName && (
                                    <div style={styles.issueElement}>
                                        {issue.elementName}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Suggestions */}
            {score.suggestions.length > 0 && (
                <div style={styles.section}>
                    <button
                        style={styles.sectionToggle}
                        onClick={() => setTipsExpanded(!tipsExpanded)}
                    >
                        <span>Tips ({score.suggestions.length})</span>
                        <span style={{
                            transform: tipsExpanded ? 'rotate(90deg)' : 'none',
                            transition: 'transform 0.15s',
                            display: 'inline-block',
                        }}>
                            ›
                        </span>
                    </button>
                    {tipsExpanded && score.suggestions.map((tip, i) => (
                        <div key={i} style={styles.tip}>
                            {tip}
                        </div>
                    ))}
                </div>
            )}

            {/* All Clear */}
            {score.issues.length === 0 && score.suggestions.length === 0 && (
                <div style={styles.allClear}>
                    Design looks great — no issues detected
                </div>
            )}
        </div>
    );
}

// ── Score Badge (compact, for toolbar) ──

export function DesignScoreBadge({ total, onClick }: { total: number; onClick?: () => void }) {
    return (
        <button
            style={{
                ...styles.badge,
                borderColor: scoreColor(total),
                color: scoreColor(total),
            }}
            onClick={onClick}
            title={`Design Score: ${total}/100`}
        >
            {total}
        </button>
    );
}

// ── Styles (Dark Theme) ──

const styles: Record<string, React.CSSProperties> = {
    root: {
        width: 260,
        background: '#13161b',
        borderLeft: '1px solid #1e232e',
        padding: 14,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        color: '#e0e0e0',
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: 12,
        overflowY: 'auto',
    },
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    title: {
        fontSize: 13,
        fontWeight: 600,
        letterSpacing: -0.3,
        color: '#f0f0f0',
    },
    closeBtn: {
        background: 'none',
        border: 'none',
        color: '#666',
        cursor: 'pointer',
        fontSize: 14,
        padding: '2px 6px',
        borderRadius: 4,
    },
    scoreCard: {
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        background: '#1a1d24',
        borderRadius: 10,
        padding: '14px 16px',
    },
    scoreRing: {
        width: 52,
        height: 52,
        borderRadius: '50%',
        border: '3px solid',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 20,
        fontWeight: 800,
        flexShrink: 0,
    },
    scoreInfo: {
        flex: 1,
    },
    gradeLabel: {
        fontSize: 16,
        fontWeight: 700,
    },
    scoreMeta: {
        fontSize: 10,
        color: '#888',
        marginTop: 3,
    },
    fixAllBtn: {
        padding: '9px 0',
        background: '#2563eb',
        border: 'none',
        borderRadius: 6,
        color: '#fff',
        fontSize: 11,
        fontWeight: 600,
        cursor: 'pointer',
        transition: 'background 0.15s',
        letterSpacing: 0.2,
    },
    section: {
        display: 'flex',
        flexDirection: 'column',
        gap: 0,
    },
    sectionToggle: {
        background: 'none',
        border: 'none',
        color: '#888',
        cursor: 'pointer',
        fontSize: 10,
        textTransform: 'uppercase' as const,
        letterSpacing: 0.8,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '6px 0',
    },
    issueRow: {
        display: 'flex',
        gap: 8,
        padding: '8px 0',
        borderTop: '1px solid #1e232e',
    },
    severityDot: {
        width: 18,
        height: 18,
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 9,
        fontWeight: 800,
        color: '#13161b',
        flexShrink: 0,
        marginTop: 1,
    },
    issueContent: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        gap: 3,
    },
    issueCatRow: {
        display: 'flex',
        gap: 6,
        alignItems: 'center',
    },
    catBadge: {
        padding: '1px 5px',
        borderRadius: 3,
        fontSize: 8,
        fontWeight: 700,
        letterSpacing: 0.5,
    },
    fixableBadge: {
        padding: '1px 5px',
        borderRadius: 3,
        fontSize: 8,
        fontWeight: 600,
        background: '#2563eb20',
        color: '#60a5fa',
    },
    issueMsg: {
        fontSize: 11,
        color: '#bbb',
        lineHeight: 1.4,
    },
    issueElement: {
        fontSize: 9,
        color: '#666',
    },
    tip: {
        padding: '6px 8px',
        fontSize: 10,
        color: '#999',
        borderLeft: '2px solid #2563eb40',
        lineHeight: 1.5,
        marginTop: 4,
    },
    allClear: {
        textAlign: 'center',
        color: '#4ade80',
        padding: '24px 0',
        fontSize: 12,
        fontWeight: 500,
    },
    // Badge for toolbar
    badge: {
        width: 32,
        height: 32,
        borderRadius: '50%',
        border: '2px solid',
        background: '#13161b',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 11,
        fontWeight: 800,
        cursor: 'pointer',
        padding: 0,
        transition: 'transform 0.15s',
    },
};
