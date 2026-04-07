// ─────────────────────────────────────────────────
// AI Chat Styles — Premium gradient + glow design
// ─────────────────────────────────────────────────
// All styles use CSS custom properties for theme compat.
// ─────────────────────────────────────────────────

import type { CSSProperties } from 'react';

// ── No longer exporting panelStyle etc as inline objects.
// We use CSS classes in ai-chat.css instead.
// These remain for backward compat — components that haven't migrated yet.

export const panelStyle: CSSProperties = {};
export const headerStyle: CSSProperties = {};
export const iconBtnStyle: CSSProperties = {};
export const settingsStyle: CSSProperties = {};
export const labelStyle: CSSProperties = {};
export const settingsInputStyle: CSSProperties = {};
export const saveBtnStyle: CSSProperties = {};
export const messagesStyle: CSSProperties = {};
export const bubbleBase: CSSProperties = {};
export const progressCardStyle: CSSProperties = {};
export const progressHeaderStyle: CSSProperties = {};
export const generatingStyle: CSSProperties = {};
export const inputContainerStyle: CSSProperties = {};
export const inputFieldStyle: CSSProperties = {};
export const sendBtnStyle: CSSProperties = {};

// ── Natural language labels for tool names ──────
export const TOOL_LABELS: Record<string, string> = {
    add_rect: 'Creating a rectangle',
    add_ellipse: 'Creating a circle / ellipse',
    add_text: 'Adding text element',
    add_line: 'Drawing a line',
    add_path: 'Drawing a path',

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

    bring_to_front: 'Moving to front',
    send_to_back: 'Moving to back',
    undo: 'Undoing last action',
    redo: 'Redoing action',
    animate_node: 'Adding animation',
    set_animation: 'Configuring animation',
    create_layout: 'Creating a layout',
    animate_all: 'Animating all elements',
    analyze_scene: 'Analyzing current scene',
    generate_full_design: 'Generating full design',
};
