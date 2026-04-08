// TemplatePreviewCard — CSS-based template preview renderer
// Used by TemplatesPage for visual template cards

import { constraintsToAbsolute } from '@/engine/elementConverters';
import type { DesignTemplate } from '@/stores/templateStore';
import type { BannerVariant } from '@/schema/design.types';

export function TemplatePreview({ template }: { template: DesignTemplate }) {
    let variant: BannerVariant | null = null;
    try {
        variant = JSON.parse(template.variantSnapshot);
    } catch { /* noop */ }

    if (!variant) {
        return (
            <div style={{
                width: 220, height: 160,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#555', fontSize: 16, fontWeight: 600,
                background: 'rgba(255,255,255,0.02)', borderRadius: 8,
            }}>
                {template.width} x {template.height}
            </div>
        );
    }

    const tw = template.width;
    const th = template.height;
    const previewW = 220;
    const scale = previewW / tw;
    const previewH = th * scale;

    return (
        <div style={{ width: previewW, height: previewH, position: 'relative', overflow: 'hidden', borderRadius: 8 }}>
            <div style={{
                width: tw, height: th,
                position: 'absolute', left: 0, top: 0,
                transform: `scale(${scale})`,
                transformOrigin: 'top left',
                backgroundColor: variant.backgroundColor || '#f0f0f0',
            }}>
                {variant.elements.map((el) => {
                    const pos = el.constraints
                        ? constraintsToAbsolute(el.constraints, tw, th)
                        : { x: 0, y: 0, w: 0, h: 0 };

                    const baseStyle: React.CSSProperties = {
                        position: 'absolute', left: pos.x, top: pos.y, width: pos.w, height: pos.h,
                        opacity: el.opacity ?? 1, zIndex: el.zIndex ?? 0,
                        overflow: 'hidden', pointerEvents: 'none',
                    };

                    if (el.type === 'shape') {
                        const bg = el.gradientStart && el.gradientEnd
                            ? `linear-gradient(${el.gradientAngle ?? 0}deg, ${el.gradientStart}, ${el.gradientEnd})`
                            : el.fill;
                        return <div key={el.id} style={{ ...baseStyle, background: bg, borderRadius: el.borderRadius ?? 0 }} />;
                    }

                    if (el.type === 'text') {
                        return (
                            <div key={el.id} style={{
                                ...baseStyle,
                                color: el.color, fontSize: el.fontSize,
                                fontWeight: el.fontWeight,
                                fontFamily: el.fontFamily || 'Inter, sans-serif',
                                textAlign: (el.textAlign as React.CSSProperties['textAlign']) || 'left',
                                lineHeight: el.lineHeight || 1.2,
                                whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                            }}>
                                {el.content}
                            </div>
                        );
                    }

                    if (el.type === 'button') {
                        return (
                            <div key={el.id} style={{
                                ...baseStyle,
                                backgroundColor: el.backgroundColor, color: el.color,
                                fontSize: el.fontSize, fontWeight: 700,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                borderRadius: el.borderRadius ?? 6,
                            }}>
                                {el.label}
                            </div>
                        );
                    }

                    return null;
                })}
            </div>
        </div>
    );
}
