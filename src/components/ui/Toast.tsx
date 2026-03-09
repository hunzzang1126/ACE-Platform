// ─────────────────────────────────────────────────
// Toast — Notification system
// ─────────────────────────────────────────────────
// Lightweight, auto-dismissing toast notifications.
// Zustand store for state, React component for rendering.
// ─────────────────────────────────────────────────

import { create } from 'zustand';
import { useEffect, type CSSProperties } from 'react';
import { colors, radius, shadows, motion, zIndex, spacing, typography } from '@/styles/designTokens';

// ── Types ────────────────────────────────────────

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastItem {
    id: string;
    type: ToastType;
    message: string;
    /** Auto-dismiss duration in ms (0 = manual dismiss) */
    duration: number;
    /** Optional action button */
    action?: {
        label: string;
        onClick: () => void;
    };
}

interface ToastStore {
    toasts: ToastItem[];
    show: (type: ToastType, message: string, opts?: { duration?: number; action?: ToastItem['action'] }) => string;
    dismiss: (id: string) => void;
    clear: () => void;
}

// ── Store ────────────────────────────────────────

let nextId = 0;

export const useToastStore = create<ToastStore>()((set) => ({
    toasts: [],

    show: (type, message, opts) => {
        const id = `toast-${++nextId}`;
        const duration = opts?.duration ?? (type === 'error' ? 6000 : 3000);

        set((s) => ({
            toasts: [...s.toasts.slice(-4), { id, type, message, duration, action: opts?.action }],
        }));

        if (duration > 0) {
            setTimeout(() => {
                set((s) => ({ toasts: s.toasts.filter(t => t.id !== id) }));
            }, duration);
        }

        return id;
    },

    dismiss: (id) => set((s) => ({ toasts: s.toasts.filter(t => t.id !== id) })),
    clear: () => set({ toasts: [] }),
}));

// ── Convenience functions ────────────────────────

export const toast = {
    success: (msg: string, opts?: { duration?: number; action?: ToastItem['action'] }) =>
        useToastStore.getState().show('success', msg, opts),
    error: (msg: string, opts?: { duration?: number; action?: ToastItem['action'] }) =>
        useToastStore.getState().show('error', msg, opts),
    info: (msg: string, opts?: { duration?: number; action?: ToastItem['action'] }) =>
        useToastStore.getState().show('info', msg, opts),
    warning: (msg: string, opts?: { duration?: number; action?: ToastItem['action'] }) =>
        useToastStore.getState().show('warning', msg, opts),
};

// ── Component ────────────────────────────────────

const TYPE_COLORS: Record<ToastType, { bg: string; border: string; icon: string }> = {
    success: { bg: colors.success.subtle, border: colors.success.default, icon: colors.success.text },
    error: { bg: colors.danger.subtle, border: colors.danger.default, icon: colors.danger.text },
    info: { bg: colors.accent.blueSubtle, border: colors.accent.blue, icon: colors.text.link },
    warning: { bg: colors.warning.subtle, border: colors.warning.default, icon: colors.warning.text },
};

const ICONS: Record<ToastType, string> = {
    success: 'M9 12l2 2 4-4',    // check
    error: 'M6 18L18 6M6 6l12 12', // x
    info: 'M12 16v-4M12 8h0',     // info
    warning: 'M12 9v4M12 17h0',   // alert
};

function ToastIcon({ type }: { type: ToastType }) {
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke={TYPE_COLORS[type].icon} strokeWidth="2" strokeLinecap="round">
            <path d={ICONS[type]} />
        </svg>
    );
}

function ToastMessage({ item, onDismiss }: { item: ToastItem; onDismiss: () => void }) {
    const c = TYPE_COLORS[item.type];

    useEffect(() => {
        // Keyboard dismiss
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onDismiss();
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [onDismiss]);

    return (
        <div style={{
            ...toastItemStyle,
            background: c.bg,
            borderLeft: `3px solid ${c.border}`,
        }}>
            <ToastIcon type={item.type} />
            <span style={toastTextStyle}>{item.message}</span>
            {item.action && (
                <button
                    style={toastActionStyle}
                    onClick={() => { item.action!.onClick(); onDismiss(); }}
                >
                    {item.action.label}
                </button>
            )}
            <button style={toastCloseStyle} onClick={onDismiss} aria-label="Dismiss">
                x
            </button>
        </div>
    );
}

/**
 * Render this at the root of your app to display toasts.
 * Usage: <ToastContainer />
 */
export function ToastContainer() {
    const toasts = useToastStore((s) => s.toasts);
    const dismiss = useToastStore((s) => s.dismiss);

    if (toasts.length === 0) return null;

    return (
        <div style={containerStyle}>
            {toasts.map((t) => (
                <ToastMessage key={t.id} item={t} onDismiss={() => dismiss(t.id)} />
            ))}
        </div>
    );
}

// ── Styles ──

const containerStyle: CSSProperties = {
    position: 'fixed',
    bottom: spacing.lg,
    right: spacing.lg,
    zIndex: zIndex.toast,
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.sm,
    maxWidth: 380,
    pointerEvents: 'none',
};

const toastItemStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.sm,
    padding: `${spacing.md}px ${spacing.lg}px`,
    borderRadius: radius.lg,
    boxShadow: shadows.dropdown,
    backdropFilter: 'blur(12px)',
    pointerEvents: 'auto',
    animation: `toast-slide-in ${motion.duration.slow} ${motion.easing.spring}`,
    fontFamily: typography.fontFamily.ui,
};

const toastTextStyle: CSSProperties = {
    flex: 1,
    fontSize: typography.fontSize.md,
    color: colors.text.primary,
    lineHeight: typography.lineHeight.normal,
};

const toastActionStyle: CSSProperties = {
    padding: `${spacing.xs}px ${spacing.sm}px`,
    borderRadius: radius.sm,
    border: 'none',
    background: 'rgba(255,255,255,0.1)',
    color: colors.text.link,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    cursor: 'pointer',
};

const toastCloseStyle: CSSProperties = {
    width: 20, height: 20,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    border: 'none', background: 'none',
    color: colors.text.muted,
    fontSize: typography.fontSize.sm,
    cursor: 'pointer',
    borderRadius: radius.sm,
};
