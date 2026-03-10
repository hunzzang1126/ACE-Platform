// ─────────────────────────────────────────────────
// BrandCompliancePanel — Brand guideline validation UI
// ─────────────────────────────────────────────────

import { useState, useMemo, useCallback } from 'react';
import { checkBrandCompliance, autoFixViolations, type ComplianceResult } from '@/engine/brandCompliance';
import { useBrandKitStore } from '@/stores/brandKitStore';
import type { EngineNode } from '@/hooks/canvasTypes';

interface Props {
    nodes?: EngineNode[];
    onAutoFix?: (patches: Array<{ elementId: number; property: string; value: any }>) => void;
    onClose?: () => void;
}

const GRADE_COLORS: Record<string, string> = {
    A: '#4ade80',
    B: '#86efac',
    C: '#fbbf24',
    D: '#fb923c',
    F: '#f87171',
};

export function BrandCompliancePanel({ nodes = [], onAutoFix, onClose }: Props) {
    const brandKit = useBrandKitStore(s => s.getActiveKit());
    const [expanded, setExpanded] = useState(true);

    const result: ComplianceResult | null = useMemo(() => {
        if (!brandKit) return null;
        return checkBrandCompliance(nodes, brandKit);
    }, [nodes, brandKit]);

    const handleAutoFix = useCallback(() => {
        if (!result) return;
        const patches = autoFixViolations(result.violations);
        onAutoFix?.(patches.map(p => ({ elementId: p.elementId, property: Object.keys(p.patch)[0] ?? '', value: Object.values(p.patch)[0] })));
    }, [result, onAutoFix]);

    if (!brandKit) {
        return (
            <div style={styles.root}>
                <div style={styles.header}>
                    <span style={styles.title}>Brand Compliance</span>
                    {onClose && <button style={styles.closeBtn} onClick={onClose}>x</button>}
                </div>
                <div style={styles.empty}>
                    No brand kit selected. Create or select a brand kit to enable compliance checking.
                </div>
            </div>
        );
    }

    if (!result) return null;

    const fixableCount = result.violations.filter(v => v.fix).length;

    return (
        <div style={styles.root}>
            <div style={styles.header}>
                <span style={styles.title}>Brand Compliance</span>
                {onClose && <button style={styles.closeBtn} onClick={onClose}>x</button>}
            </div>

            {/* Score card */}
            <div style={styles.scoreCard}>
                <div style={{
                    ...styles.grade,
                    color: GRADE_COLORS[result.grade] ?? '#888',
                }}>
                    {result.grade}
                </div>
                <div style={styles.scoreInfo}>
                    <div style={styles.scoreValue}>{result.score}/100</div>
                    <div style={styles.scoreMeta}>
                        {result.violations.length} violations · {result.suggestions.length} suggestions
                    </div>
                </div>
            </div>

            {/* Auto-fix button */}
            {fixableCount > 0 && (
                <button style={styles.fixBtn} onClick={handleAutoFix}>
                    Auto-fix {fixableCount} violation{fixableCount > 1 ? 's' : ''}
                </button>
            )}

            {/* Violations */}
            {result.violations.length > 0 && (
                <div style={styles.section}>
                    <button
                        style={styles.sectionHeader}
                        onClick={() => setExpanded(!expanded)}
                    >
                        Violations ({result.violations.length})
                        <span style={{ transform: expanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }}>
                            ›
                        </span>
                    </button>
                    {expanded && result.violations.map((v, i) => (
                        <div key={i} style={styles.violationRow}>
                            <div style={styles.violationBadge}>
                                <span style={{
                                    ...styles.catBadge,
                                    background: v.category === 'color' ? '#3b82f620'
                                        : v.category === 'typography' ? '#8b5cf620'
                                        : v.category === 'content' ? '#f59e0b20'
                                        : '#ef444420',
                                    color: v.category === 'color' ? '#60a5fa'
                                        : v.category === 'typography' ? '#a78bfa'
                                        : v.category === 'content' ? '#fbbf24'
                                        : '#f87171',
                                }}>
                                    {v.category}
                                </span>
                            </div>
                            <div style={styles.violationContent}>
                                <div style={styles.violationMsg}>{v.message}</div>
                                {v.autoFixable && (
                                    <div style={styles.violationFix}>
                                        Auto-fixable
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Suggestions */}
            {result.suggestions.length > 0 && (
                <div style={styles.section}>
                    <div style={styles.sectionHeader}>
                        Suggestions ({result.suggestions.length})
                    </div>
                    {result.suggestions.map((s, i) => (
                        <div key={i} style={styles.suggestion}>
                            {s}
                        </div>
                    ))}
                </div>
            )}

            {/* All clear */}
            {result.violations.length === 0 && result.suggestions.length === 0 && (
                <div style={styles.allClear}>
                    Design fully compliant with brand guidelines
                </div>
            )}
        </div>
    );
}

// ── Styles ──

const styles: Record<string, React.CSSProperties> = {
    root: {
        width: 280, background: '#1a1f2e', borderLeft: '1px solid #2a2f3e',
        padding: 14, display: 'flex', flexDirection: 'column', gap: 10, color: '#e0e0e0',
        fontFamily: 'Inter, system-ui, sans-serif', fontSize: 12, overflowY: 'auto',
    },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    title: { fontSize: 14, fontWeight: 600, letterSpacing: -0.3 },
    closeBtn: {
        background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: 14,
        padding: '2px 6px',
    },
    empty: {
        textAlign: 'center', color: '#666', padding: '30px 10px', fontSize: 11, lineHeight: 1.6,
    },
    scoreCard: {
        display: 'flex', alignItems: 'center', gap: 14,
        background: '#0f1218', borderRadius: 8, padding: '12px 16px',
    },
    grade: { fontSize: 36, fontWeight: 800, lineHeight: 1 },
    scoreInfo: { flex: 1 },
    scoreValue: { fontSize: 16, fontWeight: 600 },
    scoreMeta: { fontSize: 10, color: '#888', marginTop: 2 },
    fixBtn: {
        padding: '8px 0', background: '#2563eb', border: 'none', borderRadius: 6,
        color: '#fff', fontSize: 11, fontWeight: 600, cursor: 'pointer',
        transition: 'background 0.15s',
    },
    section: { display: 'flex', flexDirection: 'column', gap: 4 },
    sectionHeader: {
        background: 'none', border: 'none', color: '#888', cursor: 'pointer',
        fontSize: 10, textTransform: 'uppercase' as const, letterSpacing: 0.5,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '4px 0',
    },
    violationRow: {
        display: 'flex', gap: 8, padding: '6px 0', borderTop: '1px solid #1e232e',
    },
    violationBadge: { flexShrink: 0 },
    catBadge: {
        padding: '2px 6px', borderRadius: 3, fontSize: 8, fontWeight: 600,
        textTransform: 'uppercase' as const,
    },
    violationContent: { flex: 1 },
    violationMsg: { fontSize: 11, color: '#ccc', lineHeight: 1.4 },
    violationFix: { fontSize: 9, color: '#888', marginTop: 2 },
    suggestion: {
        padding: '4px 8px', fontSize: 10, color: '#999', borderLeft: '2px solid #2563eb40',
        lineHeight: 1.4,
    },
    allClear: {
        textAlign: 'center', color: '#4ade80', padding: '20px 0', fontSize: 12,
        fontWeight: 500,
    },
};
