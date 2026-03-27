// ─────────────────────────────────────────────────
// shimTypes — Shared types for Fabric engine shim modules
// ─────────────────────────────────────────────────
// ShimContext provides common dependencies for all shim sub-modules.
// ─────────────────────────────────────────────────

import type { Canvas, FabricObject } from 'fabric';

/** Shared context injected into each shim sub-module */
export interface ShimContext {
    /** The Fabric.js Canvas instance */
    fc: Canvas;
    /** Sync state callback — triggers React re-render */
    syncState: () => void;
    /** Find a Fabric object by its __glidId */
    findById: (id: number) => FabricObject | undefined;
    /** Get all user objects (excludes artboard) */
    userObjects: () => FabricObject[];
    /** Artboard width in pixels */
    artboardW: number;
    /** Artboard height in pixels */
    artboardH: number;
}
