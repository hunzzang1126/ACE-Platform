// ─────────────────────────────────────────────────
// agentFlowTypes — Shared types for AI agent flows
// ─────────────────────────────────────────────────

import type { ProgressCard } from './useUnifiedAgent';

/** Callbacks shared by all agent flow functions */
export interface AgentFlowCallbacks {
    narrate: (text: string) => void;
    addCard: (id: string, label: string, status?: ProgressCard['status'], opts?: { reasoning?: string; expandedDetail?: string }) => void;
    updateCard: (id: string, status: ProgressCard['status'], detail?: string, opts?: { reasoning?: string; expandedDetail?: string }) => void;
    moveCursor: (x: number, y: number, label?: string) => void;
    hideCursor: () => void;
    /** Drive the stepper UI through phases: thinking → planning → executing → reflecting */
    setPhase?: (phase: 'thinking' | 'planning' | 'executing' | 'reflecting') => void;
}

/** Minimal engine interface used by flow functions */
export interface FlowEngine {
    get_all_nodes: () => string;
    get_canvas_size?: () => { width: number; height: number };
    clear_scene?: () => void;
    add_rect: (x: number, y: number, w: number, h: number, r: number, g: number, b: number, a: number, name?: string) => number | null;
    add_rounded_rect: (x: number, y: number, w: number, h: number, r: number, g: number, b: number, a: number, radius: number, name?: string) => number | null;
    add_ellipse?: (cx: number, cy: number, rx: number, ry: number, r: number, g: number, b: number, a: number) => number | null;
    add_gradient_rect: (x: number, y: number, w: number, h: number, c1: string, c2: string, angle?: number, radius?: number, name?: string) => number | null;
    add_text: (x: number, y: number, content: string, fontSize: number, fontFamily: string, fontWeight: string, r: number, g: number, b: number, a: number, w: number, textAlign?: string, name?: string, lineHeight?: number, letterSpacing?: number) => number | null;
    add_image: (x: number, y: number, src: string, w: number, h: number, name?: string) => Promise<number | null>;
    set_shadow?: (id: number, ox: number, oy: number, blur: number, r: number, g: number, b: number, a: number) => void;
    send_to_back?: (id: number) => void;
    delete_node?: (id: number) => void;
    reorder_by_z_index?: () => void;
    render_all?: () => void;
}
