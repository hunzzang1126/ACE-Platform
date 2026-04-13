// ─────────────────────────────────────────────────
// DesignScorePanel — AI Creative Director UI
// ─────────────────────────────────────────────────
// "Grammarly for Design" — Real-time design quality
// score with categorized issues and auto-fix.
// ─────────────────────────────────────────────────

import { useState } from 'react';
import type { DesignScore, DesignIssue, IssueSeverity } from '@/engine/designScoreEngine';
import { designScorePanelStyles as styles } from './designScorePanelStyles';

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



