// ─────────────────────────────────────────────────
// shimTextEffects — Canva-style text effects for Fabric.js
// ─────────────────────────────────────────────────
// Maps effect types (drop, glow, outline, neon, glitch, etc.)
// to Fabric-native Shadow / stroke / paintFirst properties.
// ─────────────────────────────────────────────────

import { Canvas, Shadow, Textbox, type FabricObject } from 'fabric';
import type { ShimContext } from './shimTypes';

// ── Text Effect CSS Application ──────────────────
// Uses ONLY Fabric-native APIs that serialize correctly.
// ★ Exported so fabricHeadlessRenderer can reuse the SAME logic.
export function applyTextEffectCSS(
    obj: FabricObject,
    effectType: string,
    intensity: number,
    color: string,
    _fc: Canvas,
): void {
    const scale = intensity / 50; // 1.0 at intensity=50

    // ★ Store original fill BEFORE any effect modifies it.
    if (obj instanceof Textbox) {
        const curFill = obj.fill;
        if (!(obj as any).__glidOriginalFill && typeof curFill === 'string' && curFill !== 'transparent') {
            (obj as any).__glidOriginalFill = curFill;
        }
    }

    // Clear ALL previous effect styles
    obj.set({ shadow: undefined, stroke: undefined, strokeWidth: 0 } as any);
    delete (obj as any).__glidCustomStyles;
    obj.dirty = true;
    if (obj instanceof Textbox) {
        obj.set({ paintFirst: 'fill' } as any);
        if ((obj as any).__glidOriginalFill) {
            obj.set({ fill: (obj as any).__glidOriginalFill });
            if (effectType === 'none') {
                delete (obj as any).__glidOriginalFill;
            }
        }
    }

    switch (effectType) {
        case 'drop':
            obj.set({
                shadow: new Shadow({
                    color: color + 'cc',
                    blur: 8 * scale,
                    offsetX: 4 * scale,
                    offsetY: 4 * scale,
                }),
            });
            break;

        case 'glow':
            obj.set({
                shadow: new Shadow({
                    color: color + '80',
                    blur: 20 * scale,
                    offsetX: 0,
                    offsetY: 0,
                }),
            });
            break;

        case 'echo':
            obj.set({
                shadow: new Shadow({
                    color: color + '40',
                    blur: 0,
                    offsetX: 6 * scale,
                    offsetY: 6 * scale,
                }),
            });
            break;

        case 'outline':
            if (obj instanceof Textbox) {
                obj.set({
                    stroke: color,
                    strokeWidth: Math.max(1, 2 * scale),
                    paintFirst: 'stroke',
                } as any);
            }
            break;

        case 'splice':
            if (obj instanceof Textbox) {
                obj.set({
                    stroke: color,
                    strokeWidth: Math.max(2, 3 * scale),
                    paintFirst: 'stroke',
                } as any);
            }
            break;

        case 'neon': {
            const layers = [
                `0 0 ${Math.round(8 * scale)}px ${color}`,
                `0 0 ${Math.round(20 * scale)}px ${color}80`,
                `0 0 ${Math.round(40 * scale)}px ${color}40`,
            ];
            obj.set({
                shadow: new Shadow({
                    color: color,
                    blur: 12 * scale,
                    offsetX: 0,
                    offsetY: 0,
                }),
            });
            (obj as any).__glidCustomStyles = {
                textShadow: layers.join(', '),
            };
            break;
        }

        case 'glitch': {
            obj.set({
                shadow: new Shadow({
                    color: '#ff0000',
                    blur: 0,
                    offsetX: 3 * scale,
                    offsetY: 0,
                }),
            });
            (obj as any).__glidCustomStyles = {
                textShadow: `${Math.round(-3 * scale)}px 0 0 #00ffff, ${Math.round(3 * scale)}px 0 0 #ff0000`,
            };
            break;
        }

        case 'curve':
            obj.set({
                shadow: new Shadow({
                    color: color + '30',
                    blur: 4 * scale,
                    offsetX: 0,
                    offsetY: 2 * scale,
                }),
            });
            break;

        case '70s': {
            if (obj instanceof Textbox) {
                obj.set({
                    stroke: color,
                    strokeWidth: Math.max(3, 5 * scale),
                    paintFirst: 'stroke',
                    shadow: new Shadow({
                        color: '#ff8c0060',
                        blur: 0,
                        offsetX: 4 * scale,
                        offsetY: 4 * scale,
                    }),
                } as any);
            }
            break;
        }

        case 'none':
        default:
            break;
    }
}

/** Create text effect methods for the Fabric engine shim */
export function createTextEffectMethods(ctx: ShimContext) {
    const { fc, syncState, findById } = ctx;

    return {
        set_text_effect: (id: number, effectType: string, intensity: number, color: string) => {
            const obj = findById(id);
            if (!obj) {
                console.warn(`[set_text_effect] findById(${id}) returned null`);
                return;
            }
            (obj as any).__glidTextEffectType = effectType;
            (obj as any).__glidTextEffectIntensity = intensity;
            (obj as any).__glidTextEffectColor = color;
            applyTextEffectCSS(obj, effectType, intensity, color, fc);
            fc.renderAll();
            syncState();
        },

        remove_text_effect: (id: number) => {
            const obj = findById(id);
            if (!obj) return;

            (obj as any).__glidTextEffectType = 'none';
            (obj as any).__glidTextEffectIntensity = 0;
            (obj as any).__glidTextEffectColor = '';

            if ((obj as any).__glidOriginalFill && obj instanceof Textbox) {
                obj.set({ fill: (obj as any).__glidOriginalFill });
                delete (obj as any).__glidOriginalFill;
            }
            obj.set({ shadow: undefined, stroke: undefined, strokeWidth: 0 } as any);
            delete (obj as any).__glidCustomStyles;
            obj.dirty = true;
            if (obj instanceof Textbox) {
                obj.set({ paintFirst: 'fill' } as any);
            }
            fc.renderAll();
            syncState();
        },
    };
}
