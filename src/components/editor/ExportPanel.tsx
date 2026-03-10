// ─────────────────────────────────────────────────
// ExportPanel — Export format selector + ad validation
// ─────────────────────────────────────────────────
// Side panel for exporting ad creatives.
// Shows format options, validation warnings, batch export.
// ─────────────────────────────────────────────────

import { useState, useCallback, useMemo } from 'react';
import type { BannerVariant } from '@/schema/design.types';
import {
    validateForNetwork, validateAllNetworks,
    type AdNetwork, type ValidationResult, type ValidateInput,
} from '@/engine/adNetworkValidator';

type ExportFormat = 'html5' | 'png' | 'jpg' | 'gif';

interface Props {
    variant: BannerVariant;
    onExportHTML5?: () => void;
    onExportPNG?: (quality: number) => void;
    onExportJPG?: (quality: number) => void;
    onExportGIF?: (fps: number, duration: number) => void;
    onBatchExport?: () => void;
    onClose?: () => void;
    fileSizeEstimate?: number;
    animDuration?: number;
}

export function ExportPanel({
    variant, onExportHTML5, onExportPNG, onExportJPG, onExportGIF,
    onBatchExport, onClose, fileSizeEstimate = 0, animDuration = 5,
}: Props) {
    const [format, setFormat] = useState<ExportFormat>('html5');
    const [network, setNetwork] = useState<AdNetwork>('google_ads');
    const [quality, setQuality] = useState(0.92);
    const [gifFps, setGifFps] = useState(15);
    const [showValidation, setShowValidation] = useState(true);

    const validationInput: ValidateInput = useMemo(() => ({
        width: variant.preset.width,
        height: variant.preset.height,
        fileSizeBytes: fileSizeEstimate,
        animDurationS: animDuration,
        loopCount: 1,
        hasClickTag: true,
        hasBackupImage: false,
    }), [variant, fileSizeEstimate, animDuration]);

    const validation = useMemo(() =>
        validateForNetwork(network, validationInput),
        [network, validationInput],
    );

    const allValidations = useMemo(() =>
        validateAllNetworks(validationInput),
        [validationInput],
    );

    const handleExport = useCallback(() => {
        switch (format) {
            case 'html5': onExportHTML5?.(); break;
            case 'png': onExportPNG?.(quality); break;
            case 'jpg': onExportJPG?.(quality); break;
            case 'gif': onExportGIF?.(gifFps, animDuration); break;
        }
    }, [format, quality, gifFps, animDuration, onExportHTML5, onExportPNG, onExportJPG, onExportGIF]);

    const sizeLabel = `${variant.preset.width} x ${variant.preset.height}`;

    return (
        <div style={styles.root}>
            {/* Header */}
            <div style={styles.header}>
                <span style={styles.title}>Export</span>
                {onClose && (
                    <button style={styles.closeBtn} onClick={onClose} title="Close">x</button>
                )}
            </div>

            {/* Size info */}
            <div style={styles.sizeRow}>
                <span style={styles.sizeLabel}>{sizeLabel}</span>
                <span style={styles.sizeName}>{variant.preset.name}</span>
            </div>

            {/* Format selector */}
            <div style={styles.section}>
                <label style={styles.label}>Format</label>
                <div style={styles.formatRow}>
                    {(['html5', 'png', 'jpg', 'gif'] as ExportFormat[]).map(f => (
                        <button
                            key={f}
                            style={{ ...styles.formatBtn, ...(format === f ? styles.formatBtnActive : {}) }}
                            onClick={() => setFormat(f)}
                        >
                            {f.toUpperCase()}
                        </button>
                    ))}
                </div>
            </div>

            {/* Quality slider (PNG/JPG) */}
            {(format === 'png' || format === 'jpg') && (
                <div style={styles.section}>
                    <label style={styles.label}>Quality: {Math.round(quality * 100)}%</label>
                    <input
                        type="range" min={0.1} max={1} step={0.01}
                        value={quality}
                        onChange={e => setQuality(parseFloat(e.target.value))}
                        style={styles.slider}
                    />
                </div>
            )}

            {/* GIF settings */}
            {format === 'gif' && (
                <div style={styles.section}>
                    <label style={styles.label}>FPS: {gifFps}</label>
                    <input
                        type="range" min={5} max={30} step={1}
                        value={gifFps}
                        onChange={e => setGifFps(parseInt(e.target.value))}
                        style={styles.slider}
                    />
                </div>
            )}

            {/* Ad Network Validation */}
            {format === 'html5' && (
                <div style={styles.section}>
                    <div style={styles.validationHeader}>
                        <label style={styles.label}>Ad Network Validation</label>
                        <button
                            style={styles.toggleBtn}
                            onClick={() => setShowValidation(!showValidation)}
                        >
                            {showValidation ? 'Hide' : 'Show'}
                        </button>
                    </div>

                    {/* Network selector */}
                    <div style={styles.networkRow}>
                        {(['google_ads', 'meta', 'iab', 'dv360'] as AdNetwork[]).map(n => (
                            <button
                                key={n}
                                style={{
                                    ...styles.networkBtn,
                                    ...(network === n ? styles.networkBtnActive : {}),
                                }}
                                onClick={() => setNetwork(n)}
                            >
                                {n === 'google_ads' ? 'Google' : n === 'dv360' ? 'DV360' : n.charAt(0).toUpperCase() + n.slice(1)}
                            </button>
                        ))}
                    </div>

                    {showValidation && (
                        <div style={styles.validationBox}>
                            {/* Score */}
                            <div style={{
                                ...styles.scoreRow,
                                color: validation.passed ? '#4ade80' : '#f87171',
                            }}>
                                <span style={styles.scoreLabel}>
                                    {validation.passed ? 'PASS' : 'FAIL'}
                                </span>
                                <span style={styles.scoreValue}>{validation.score}/100</span>
                            </div>

                            {/* Violations */}
                            {validation.violations.map((v, i) => (
                                <div key={i} style={styles.violation}>
                                    <span style={{ color: v.severity === 'error' ? '#f87171' : '#fbbf24' }}>
                                        {v.severity === 'error' ? 'ERR' : 'WRN'}
                                    </span>
                                    <span style={styles.violationMsg}>{v.message}</span>
                                    {v.fix && <div style={styles.violationFix}>{v.fix}</div>}
                                </div>
                            ))}

                            {/* Warnings */}
                            {validation.warnings.map((w, i) => (
                                <div key={`w-${i}`} style={styles.violation}>
                                    <span style={{ color: '#fbbf24' }}>WRN</span>
                                    <span style={styles.violationMsg}>{w.message}</span>
                                </div>
                            ))}

                            {validation.violations.length === 0 && validation.warnings.length === 0 && (
                                <div style={styles.allClear}>All checks passed</div>
                            )}
                        </div>
                    )}

                    {/* Quick validation summary for all networks */}
                    <div style={styles.allNetworksRow}>
                        {allValidations.map(v => (
                            <div key={v.network} style={{
                                ...styles.networkDot,
                                background: v.passed ? '#4ade80' : '#f87171',
                            }}>
                                {v.network === 'google_ads' ? 'G' : v.network === 'dv360' ? 'D' : v.network.charAt(0).toUpperCase()}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Export button */}
            <button style={styles.exportBtn} onClick={handleExport}>
                Export {format.toUpperCase()}
            </button>

            {/* Batch export */}
            {onBatchExport && (
                <button style={styles.batchBtn} onClick={onBatchExport}>
                    Export All Sizes
                </button>
            )}
        </div>
    );
}

// ── Styles ──

const styles: Record<string, React.CSSProperties> = {
    root: {
        width: 280, background: '#1a1f2e', borderLeft: '1px solid #2a2f3e',
        padding: 16, display: 'flex', flexDirection: 'column', gap: 12, color: '#e0e0e0',
        fontFamily: 'Inter, system-ui, sans-serif', fontSize: 12, overflowY: 'auto',
    },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    title: { fontSize: 14, fontWeight: 600, letterSpacing: -0.3 },
    closeBtn: {
        background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: 14,
        padding: '2px 6px',
    },
    sizeRow: {
        display: 'flex', justifyContent: 'space-between', padding: '8px 10px',
        background: '#0f1218', borderRadius: 6, fontSize: 11,
    },
    sizeLabel: { color: '#ccc', fontWeight: 500 },
    sizeName: { color: '#888' },
    section: { display: 'flex', flexDirection: 'column', gap: 6 },
    label: { fontSize: 10, color: '#888', textTransform: 'uppercase' as const, letterSpacing: 0.5 },
    formatRow: { display: 'flex', gap: 4 },
    formatBtn: {
        flex: 1, padding: '6px 0', background: '#0f1218', border: '1px solid #2a2f3e',
        borderRadius: 4, color: '#888', cursor: 'pointer', fontSize: 10, fontWeight: 500,
        transition: 'all 0.15s',
    },
    formatBtnActive: {
        background: '#2563eb20', borderColor: '#2563eb', color: '#60a5fa',
    },
    slider: { width: '100%', accentColor: '#2563eb' },
    validationHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    toggleBtn: {
        background: 'none', border: 'none', color: '#60a5fa', cursor: 'pointer', fontSize: 10,
    },
    networkRow: { display: 'flex', gap: 4 },
    networkBtn: {
        flex: 1, padding: '4px 0', background: '#0f1218', border: '1px solid #2a2f3e',
        borderRadius: 4, color: '#888', cursor: 'pointer', fontSize: 9,
        transition: 'all 0.15s',
    },
    networkBtnActive: {
        borderColor: '#2563eb', color: '#60a5fa',
    },
    validationBox: {
        background: '#0f1218', borderRadius: 6, padding: 8, display: 'flex', flexDirection: 'column', gap: 4,
    },
    scoreRow: { display: 'flex', justifyContent: 'space-between', fontWeight: 600, fontSize: 13 },
    scoreLabel: {},
    scoreValue: {},
    violation: {
        display: 'flex', gap: 6, fontSize: 10, padding: '3px 0', borderTop: '1px solid #1a1f2e',
        alignItems: 'flex-start',
    },
    violationMsg: { color: '#ccc', flex: 1 },
    violationFix: { color: '#888', fontSize: 9, marginTop: 2 },
    allClear: { color: '#4ade80', fontSize: 11, textAlign: 'center' as const, padding: 8 },
    allNetworksRow: {
        display: 'flex', gap: 6, justifyContent: 'center', marginTop: 4,
    },
    networkDot: {
        width: 20, height: 20, borderRadius: 10, display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        fontSize: 9, fontWeight: 700, color: '#000',
    },
    exportBtn: {
        padding: '10px 0', background: '#2563eb', border: 'none', borderRadius: 6,
        color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
        transition: 'background 0.15s',
    },
    batchBtn: {
        padding: '8px 0', background: 'transparent', border: '1px solid #2a2f3e',
        borderRadius: 6, color: '#888', fontSize: 11, cursor: 'pointer',
        transition: 'all 0.15s',
    },
};
