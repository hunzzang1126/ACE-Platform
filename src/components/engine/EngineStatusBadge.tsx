// ─────────────────────────────────────────────────
// EngineStatusBadge — shows live Rust engine status
// ─────────────────────────────────────────────────

import { useEffect, useState } from 'react';
import { isTauri, ping, getEngineStatus, type EngineStatus } from '../../engine/tauriBridge';

export function EngineStatusBadge() {
    const [status, setStatus] = useState<EngineStatus | null>(null);
    const [pingResult, setPingResult] = useState<string>('...');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            try {
                const [p, s] = await Promise.all([ping(), getEngineStatus()]);
                setPingResult(p);
                setStatus(s);
            } catch (err) {
                setPingResult(`Error: ${err}`);
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const dotColor = status?.initialized ? '#00e676' : '#ff5252';
    const runtime = isTauri() ? 'Tauri (Native)' : 'Browser (Web)';

    return (
        <div style={{
            position: 'fixed', bottom: 12, right: 12,
            background: '#1e2128', border: '1px solid #2d3139',
            borderRadius: 10, padding: '10px 16px',
            fontFamily: 'Inter, system-ui, sans-serif',
            fontSize: 12, color: '#adb5bd',
            zIndex: 9999, minWidth: 220,
            boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <div style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: loading ? '#ffc107' : dotColor,
                    boxShadow: loading ? '0 0 6px #ffc107' : `0 0 6px ${dotColor}`,
                }} />
                <strong style={{ color: '#e9ecef', fontSize: 13 }}>ACE Engine</strong>
                <span style={{ marginLeft: 'auto', fontSize: 11, opacity: 0.6 }}>{runtime}</span>
            </div>
            <div style={{ fontSize: 11, lineHeight: 1.6 }}>
                {loading ? (
                    <div>Connecting to engine...</div>
                ) : (
                    <>
                        <div>Ping: {pingResult}</div>
                        <div>Backend: {status?.renderer_backend}</div>
                        <div>Nodes: {status?.scene_node_count}</div>
                    </>
                )}
            </div>
        </div>
    );
}
