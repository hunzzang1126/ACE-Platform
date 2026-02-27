// ─────────────────────────────────────────────────
// VisionQAReport — Modal showing AI QA results
// ─────────────────────────────────────────────────
import type { VisionQAResponse } from '@/api/backendService';
import '@/styles/visionqa.css';

interface Props {
    report: VisionQAResponse;
    onClose: () => void;
}

function scoreColor(score: number): string {
    if (score >= 90) return '#34a853';
    if (score >= 70) return '#fbbc04';
    if (score >= 50) return '#ff9800';
    return '#ea4335';
}

function severityIcon(severity: string): string {
    if (severity === 'high') return '🔴';
    if (severity === 'medium') return '🟡';
    return '🟢';
}

export function VisionQAReport({ report, onClose }: Props) {
    const totalIssues = report.variants.reduce((sum, v) => sum + v.issues.length, 0);

    return (
        <div className="vqa-overlay" onClick={onClose}>
            <div className="vqa-modal" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="vqa-header">
                    <div className="vqa-header-left">
                        <h2 className="vqa-title">🤖 AI Design QA Report</h2>
                        <span className="vqa-subtitle">
                            Powered by GPT-4o Vision
                        </span>
                    </div>
                    <button className="vqa-close" onClick={onClose}>✕</button>
                </div>

                {/* Overall Score */}
                <div className="vqa-overall">
                    <div
                        className="vqa-score-circle"
                        style={{ borderColor: scoreColor(report.overall_score) }}
                    >
                        <span className="vqa-score-num" style={{ color: scoreColor(report.overall_score) }}>
                            {report.overall_score}
                        </span>
                        <span className="vqa-score-label">Overall</span>
                    </div>
                    <div className="vqa-summary">
                        <p className="vqa-summary-text">
                            {report.variants.length} sizes analyzed •{' '}
                            {totalIssues === 0 ? (
                                <span className="vqa-pass">All clear! ✨</span>
                            ) : (
                                <span className="vqa-warn">{totalIssues} issue{totalIssues !== 1 ? 's' : ''} found</span>
                            )}
                        </p>
                        {report.overall_score >= 90 && (
                            <p className="vqa-verdict vqa-verdict--pass">Production ready 🚀</p>
                        )}
                        {report.overall_score >= 70 && report.overall_score < 90 && (
                            <p className="vqa-verdict vqa-verdict--warn">Minor adjustments recommended</p>
                        )}
                        {report.overall_score < 70 && (
                            <p className="vqa-verdict vqa-verdict--fail">Needs attention before export</p>
                        )}
                    </div>
                </div>

                {/* Per-Variant Results */}
                <div className="vqa-variants">
                    {report.variants.map(v => (
                        <div key={v.variant_id} className="vqa-variant">
                            <div className="vqa-variant-header">
                                <span className="vqa-variant-name">
                                    {v.name} ({v.width}×{v.height})
                                </span>
                                <span
                                    className="vqa-variant-score"
                                    style={{ color: scoreColor(v.score) }}
                                >
                                    {v.score}/100
                                </span>
                            </div>

                            {v.issues.length === 0 ? (
                                <div className="vqa-no-issues">✅ No issues detected</div>
                            ) : (
                                <div className="vqa-issues">
                                    {v.issues.map((issue, i) => (
                                        <div key={i} className={`vqa-issue vqa-issue--${issue.severity}`}>
                                            <div className="vqa-issue-header">
                                                <span className="vqa-issue-icon">{severityIcon(issue.severity)}</span>
                                                <span className="vqa-issue-type">{issue.type.replace(/_/g, ' ')}</span>
                                                <span className="vqa-issue-element">{issue.element}</span>
                                            </div>
                                            <p className="vqa-issue-desc">{issue.description}</p>
                                            <p className="vqa-issue-fix">💡 {issue.suggestion}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
