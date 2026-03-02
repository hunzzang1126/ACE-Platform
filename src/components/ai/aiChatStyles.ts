// ─────────────────────────────────────────────────
// AI Chat Panel — Styles
// ─────────────────────────────────────────────────

import type { CSSProperties } from 'react';

export const panelStyle: CSSProperties = {
    display: 'flex', flexDirection: 'column',
    height: '100%', width: '100%',
    background: '#0d1117',
    borderLeft: '1px solid rgba(255,255,255,0.06)',
    fontFamily: 'Inter, system-ui, sans-serif',
    color: '#e6edf3',
};

export const headerStyle: CSSProperties = {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '10px 14px',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    background: 'rgba(255,255,255,0.02)',
};

export const iconBtnStyle: CSSProperties = {
    background: 'none', border: 'none', cursor: 'pointer',
    fontSize: 16, padding: 4,
};

export const settingsStyle: CSSProperties = {
    padding: '12px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)',
    background: 'rgba(255,255,255,0.02)', display: 'flex', flexDirection: 'column', gap: 8,
};

export const labelStyle: CSSProperties = {
    fontSize: 11, color: '#8b949e', display: 'flex', flexDirection: 'column', gap: 3,
};

export const settingsInputStyle: CSSProperties = {
    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 6, padding: '5px 8px', color: '#e6edf3', fontSize: 12,
    fontFamily: 'monospace', outline: 'none',
};

export const saveBtnStyle: CSSProperties = {
    background: 'rgba(74,158,255,0.15)', border: '1px solid rgba(74,158,255,0.3)',
    borderRadius: 6, padding: '5px 12px', color: '#4a9eff', fontSize: 12,
    cursor: 'pointer', alignSelf: 'flex-end',
};

export const messagesStyle: CSSProperties = {
    flex: 1, overflowY: 'auto', padding: '12px',
    display: 'flex', flexDirection: 'column', gap: 8,
};

export const bubbleBase: CSSProperties = {
    padding: '10px 14px', borderRadius: 10,
    border: '1px solid rgba(255,255,255,0.06)',
};

export const progressCardStyle: CSSProperties = {
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: 10,
    alignSelf: 'flex-start',
    width: '100%',
    overflow: 'hidden',
};

export const progressHeaderStyle: CSSProperties = {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '8px 14px',
    borderBottom: '1px solid rgba(255,255,255,0.04)',
};

export const generatingStyle: CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '10px 14px',
    borderTop: '1px solid rgba(255,255,255,0.04)',
    fontSize: 12, color: '#8b949e',
    fontStyle: 'italic',
};

export const inputContainerStyle: CSSProperties = {
    display: 'flex', gap: 6, padding: '10px 12px',
    borderTop: '1px solid rgba(255,255,255,0.06)',
    background: 'rgba(255,255,255,0.02)',
};

export const inputFieldStyle: CSSProperties = {
    flex: 1, background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8,
    padding: '8px 12px', color: '#e6edf3', fontSize: 13,
    fontFamily: 'inherit', outline: 'none',
};

export const sendBtnStyle: CSSProperties = {
    width: 34, height: 34, borderRadius: 8,
    background: 'rgba(74,158,255,0.2)', border: '1px solid rgba(74,158,255,0.3)',
    color: '#4a9eff', fontSize: 18, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
};

// ── Natural language labels for tool names ──────
export const TOOL_LABELS: Record<string, string> = {
    add_rect: 'Creating a rectangle',
    add_ellipse: 'Creating a circle / ellipse',
    add_text: 'Adding text element',
    add_line: 'Drawing a line',
    add_path: 'Drawing a path',
    add_group: 'Creating a group',
    set_fill: 'Setting fill color',
    set_stroke: 'Setting stroke / border',
    set_opacity: 'Adjusting opacity',
    set_corner_radius: 'Rounding corners',
    set_shadow: 'Adding drop shadow',
    set_blur: 'Applying blur effect',
    set_gradient: 'Applying gradient',
    set_blend_mode: 'Changing blend mode',
    move_node: 'Moving element',
    resize_node: 'Resizing element',
    rotate_node: 'Rotating element',
    delete_node: 'Deleting element',
    duplicate_node: 'Duplicating element',
    rename_node: 'Renaming element',
    set_visible: 'Toggling visibility',
    set_locked: 'Toggling lock state',
    select_node: 'Selecting element',
    select_all: 'Selecting all elements',
    deselect_all: 'Clearing selection',
    group_selection: 'Grouping selected elements',
    ungroup_selection: 'Ungrouping elements',
    bring_to_front: 'Moving to front',
    send_to_back: 'Moving to back',
    undo: 'Undoing last action',
    redo: 'Redoing action',
    animate_node: 'Adding animation',
    set_animation: 'Configuring animation',
    create_layout: 'Creating a layout',
    animate_all: 'Animating all elements',
    analyze_scene: 'Analyzing current scene',
};
