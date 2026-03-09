// ─────────────────────────────────────────────────
// ErrorBoundary — Graceful error recovery for React
// ─────────────────────────────────────────────────
// Catches unhandled errors in child components and renders
// a professional recovery UI instead of a blank screen.
// ─────────────────────────────────────────────────

import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
    children: ReactNode;
    /** Optional fallback component */
    fallback?: ReactNode;
    /** Called when an error is caught */
    onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('[ErrorBoundary] Caught error:', error);
        console.error('[ErrorBoundary] Component stack:', errorInfo.componentStack);
        this.props.onError?.(error, errorInfo);
    }

    handleRetry = () => {
        this.setState({ hasError: false, error: null });
    };

    handleReload = () => {
        window.location.reload();
    };

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) return this.props.fallback;

            return (
                <div style={containerStyle}>
                    <div style={cardStyle}>
                        <div style={iconStyle}>
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ea4335" strokeWidth="1.5">
                                <circle cx="12" cy="12" r="10" />
                                <line x1="12" y1="8" x2="12" y2="12" />
                                <circle cx="12" cy="16" r="0.5" fill="#ea4335" />
                            </svg>
                        </div>
                        <h2 style={titleStyle}>Something went wrong</h2>
                        <p style={messageStyle}>
                            An unexpected error occurred. Your work has been auto-saved.
                        </p>
                        {this.state.error && (
                            <pre style={errorDetailStyle}>
                                {this.state.error.message}
                            </pre>
                        )}
                        <div style={buttonGroupStyle}>
                            <button style={primaryBtnStyle} onClick={this.handleRetry}>
                                Try Again
                            </button>
                            <button style={secondaryBtnStyle} onClick={this.handleReload}>
                                Reload Page
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

// ── Styles ──

const containerStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: '100%', height: '100vh',
    background: '#0d1117',
    fontFamily: 'Inter, system-ui, sans-serif',
};

const cardStyle: React.CSSProperties = {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    gap: 16, padding: 40,
    background: 'rgba(22, 27, 38, 0.95)',
    borderRadius: 16,
    border: '1px solid rgba(255,255,255,0.06)',
    maxWidth: 440, width: '90%',
    boxShadow: '0 16px 64px rgba(0,0,0,0.5)',
};

const iconStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: 72, height: 72, borderRadius: '50%',
    background: 'rgba(234, 67, 53, 0.08)',
};

const titleStyle: React.CSSProperties = {
    margin: 0, fontSize: 18, fontWeight: 600, color: '#e6edf3',
};

const messageStyle: React.CSSProperties = {
    margin: 0, fontSize: 14, color: '#8b949e', textAlign: 'center',
    lineHeight: 1.5,
};

const errorDetailStyle: React.CSSProperties = {
    fontSize: 11, color: '#f85149', background: 'rgba(248, 81, 73, 0.08)',
    padding: '8px 12px', borderRadius: 6, maxWidth: '100%',
    overflow: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
    border: '1px solid rgba(248, 81, 73, 0.15)',
};

const buttonGroupStyle: React.CSSProperties = {
    display: 'flex', gap: 8, marginTop: 8,
};

const primaryBtnStyle: React.CSSProperties = {
    padding: '10px 24px', borderRadius: 8, border: 'none',
    background: '#1f6feb', color: '#fff', fontSize: 14, fontWeight: 600,
    cursor: 'pointer', transition: 'background 0.2s',
};

const secondaryBtnStyle: React.CSSProperties = {
    padding: '10px 24px', borderRadius: 8,
    border: '1px solid rgba(255,255,255,0.12)',
    background: 'transparent', color: '#8b949e', fontSize: 14,
    cursor: 'pointer', transition: 'all 0.2s',
};
