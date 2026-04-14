// ─────────────────────────────────────────────────
// aiPanelStyles — CSS-in-JS styles for GlobalAiPanel
// ─────────────────────────────────────────────────

import type { CSSProperties } from 'react';

export const PANEL_WIDTH = 400;

export const wrapperStyle: CSSProperties = {
    flexShrink: 0, height: '100%', display: 'flex',
    transition: 'width 0.3s cubic-bezier(0.4,0,0.2,1)', overflow: 'hidden',
};

export const toggleBtnStyle: CSSProperties = {
    width: 32, flexShrink: 0, height: '100%',
    background: '#f0f2f5', border: 'none',
    borderLeft: '1px solid rgba(0,0,0,0.06)',
    color: '#475569', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
};

export const panelInnerStyle: CSSProperties = {
    width: PANEL_WIDTH - 32, flexShrink: 0, height: '100%',
    background: '#f0f2f5', borderLeft: '1px solid rgba(0,0,0,0.06)',
    display: 'flex', flexDirection: 'column',
    fontFamily: 'Inter, system-ui, sans-serif', color: '#1e293b',
};

export const headerStyle: CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px',
    borderBottom: '1px solid rgba(0,0,0,0.06)',
};

export const headerBtnStyle: CSSProperties = {
    background: 'none', border: 'none', cursor: 'pointer', padding: 4, borderRadius: 4,
    display: 'flex', alignItems: 'center',
};

export const msgAreaStyle: CSSProperties = {
    flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2, padding: '4px 0',
    position: 'relative',
};

export const emptyStyle: CSSProperties = {
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    color: '#1e293b', padding: '40px 20px', textAlign: 'center',
};

export const quickActionsStyle: CSSProperties = {
    display: 'flex', flexDirection: 'column', gap: 6, width: '100%', marginTop: 20,
};

export const quickActionBtnStyle: CSSProperties = {
    display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
    background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(0,0,0,0.06)',
    borderRadius: 8, padding: '10px 14px', cursor: 'pointer',
    transition: 'all 0.15s ease', textAlign: 'left', width: '100%',
};

export const dropOverlayStyle: CSSProperties = {
    position: 'absolute', inset: 0, zIndex: 10,
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    background: 'rgba(255,255,255,0.92)',
    border: '2px dashed #6366F1', borderRadius: 8, margin: 8,
};

export const userBubbleStyle: CSSProperties = {
    padding: '8px 14px', margin: '4px 14px', alignSelf: 'flex-end',
    background: 'linear-gradient(135deg, #6366F1, #2DD4BF)', borderRadius: '12px 12px 4px 12px',
    maxWidth: '85%', fontSize: 13, lineHeight: '1.6', color: '#ffffff',
};

export const assistantStyle: CSSProperties = {
    padding: '8px 14px', margin: '4px 14px', fontSize: 13, lineHeight: '1.7',
    color: '#334155', whiteSpace: 'pre-wrap',
};

export const actionCardStyle: CSSProperties = {
    margin: '3px 10px', padding: '6px 10px',
    background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(0,0,0,0.06)',
    borderRadius: 8, display: 'flex', flexDirection: 'column', gap: 4,
    transition: 'border-color 0.3s ease, box-shadow 0.3s ease',
};

export const errorStyle: CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 6,
    margin: '4px 14px', padding: '8px 12px',
    background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.15)',
    borderRadius: 8, fontSize: 12, color: '#dc2626',
};

export const modelBarStyle: CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 6,
    padding: '6px 12px', borderBottom: '1px solid rgba(0,0,0,0.04)',
};

export const modelSelectorBtnStyle: CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 4,
    background: 'none', border: 'none', cursor: 'pointer',
    padding: '3px 6px', borderRadius: 4,
};

export const modelDropdownStyle: CSSProperties = {
    background: '#ffffff', border: '1px solid rgba(0,0,0,0.08)',
    borderRadius: 8, margin: '0 8px 4px', padding: '6px 0',
    boxShadow: '0 8px 24px rgba(0,0,0,0.12)', maxHeight: 280, overflowY: 'auto',
};

export const modelOptionStyle: CSSProperties = {
    display: 'flex', flexDirection: 'column', width: '100%', textAlign: 'left',
    background: 'none', border: 'none', padding: '6px 12px', cursor: 'pointer',
    transition: 'background 0.1s',
};

export const inputAreaStyle: CSSProperties = {
    display: 'flex', gap: 6, padding: '10px 12px',
    borderTop: '1px solid rgba(0,0,0,0.06)', alignItems: 'center',
};

export const inputFieldStyle: CSSProperties = {
    flex: 1, background: '#ffffff', border: '1px solid rgba(0,0,0,0.1)',
    borderRadius: 8, padding: '9px 12px', color: '#1e293b', fontSize: 13, outline: 'none',
};

export const sendBtnStyle: CSSProperties = {
    width: 34, height: 34, borderRadius: 8,
    background: 'linear-gradient(135deg, #6366F1, #2DD4BF)', border: 'none', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'opacity 0.15s ease',
};

export const glidLogoStyle: CSSProperties = {
    fontSize: 16, fontWeight: 800, letterSpacing: -0.5,
    background: 'linear-gradient(135deg, #2DD4BF, #818cf8, #c084fc)',
    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', lineHeight: 1,
};

export const glidLogoLargeStyle: CSSProperties = {
    fontSize: 36, fontWeight: 900, letterSpacing: -1.5,
    background: 'linear-gradient(135deg, #2DD4BF, #818cf8, #c084fc)',
    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', lineHeight: 1,
};
