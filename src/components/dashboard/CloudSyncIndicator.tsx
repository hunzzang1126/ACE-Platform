// ─────────────────────────────────────────────────
// CloudSyncIndicator — Cloud sync status badge
// ─────────────────────────────────────────────────
// Shows current sync state: synced / syncing / offline / error
// ─────────────────────────────────────────────────

import type { CloudSyncStatus } from '@/hooks/useCloudSync';

const STATUS_CONFIG: Record<CloudSyncStatus, { label: string; color: string; icon: string }> = {
    idle: { label: 'Ready', color: '#71717a', icon: '○' },
    syncing: { label: 'Syncing...', color: '#2DD4BF', icon: '↻' },
    synced: { label: 'Synced', color: '#22c55e', icon: '✓' },
    offline: { label: 'Offline', color: '#f59e0b', icon: '⊘' },
    error: { label: 'Sync Error', color: '#ef4444', icon: '!' },
};

interface CloudSyncIndicatorProps {
    status: CloudSyncStatus;
    className?: string;
}

export function CloudSyncIndicator({ status, className }: CloudSyncIndicatorProps) {
    const config = STATUS_CONFIG[status];

    return (
        <div
            className={className}
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '4px 10px',
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 500,
                color: config.color,
                backgroundColor: `${config.color}14`,
                border: `1px solid ${config.color}30`,
                transition: 'all 0.3s ease',
                userSelect: 'none',
            }}
            title={`Cloud sync: ${config.label}`}
        >
            <span
                style={{
                    display: 'inline-block',
                    fontSize: 14,
                    lineHeight: 1,
                    animation: status === 'syncing' ? 'spin 1s linear infinite' : undefined,
                }}
            >
                {config.icon}
            </span>
            <span>{config.label}</span>
            {/* Inject keyframe animation for spinning */}
            {status === 'syncing' && (
                <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
            )}
        </div>
    );
}
