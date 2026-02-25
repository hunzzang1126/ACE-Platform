// ─────────────────────────────────────────────────
// ElementRenderer – DesignElement → Pixi Object
// ─────────────────────────────────────────────────
import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import type { DesignElement } from '@/schema/elements.types';
import type { BannerVariant } from '@/schema/design.types';
import { resolveConstraints } from '@/schema/constraints.types';

/**
 * 단일 디자인 요소를 Pixi 오브젝트로 변환
 */
export function renderElement(
    element: DesignElement,
    parentWidth: number,
    parentHeight: number,
): Container {
    const resolved = resolveConstraints(element.constraints, parentWidth, parentHeight);

    switch (element.type) {
        case 'text':
            return renderText(element, resolved);
        case 'shape':
            return renderShape(element, resolved);
        case 'button':
            return renderButton(element, resolved);
        case 'image':
            return renderImagePlaceholder(element, resolved);
        case 'group':
            return renderGroup(element, parentWidth, parentHeight, resolved);
        default:
            return new Container();
    }
}

interface Resolved {
    x: number;
    y: number;
    width: number;
    height: number;
}

function renderText(
    el: Extract<DesignElement, { type: 'text' }>,
    r: Resolved,
): Container {
    const style = new TextStyle({
        fontFamily: el.fontFamily,
        fontSize: el.fontSize,
        fontWeight: String(el.fontWeight) as TextStyle['fontWeight'],
        fontStyle: el.fontStyle,
        fill: el.color,
        align: el.textAlign,
        wordWrap: true,
        wordWrapWidth: r.width,
        lineHeight: el.fontSize * el.lineHeight,
        letterSpacing: el.letterSpacing,
    });

    const text = new Text({ text: el.content, style });
    text.x = r.x;
    text.y = r.y;
    text.alpha = el.opacity;
    text.visible = el.visible;
    text.rotation = (el.constraints.rotation * Math.PI) / 180;
    text.label = el.id;
    return text;
}

function renderShape(
    el: Extract<DesignElement, { type: 'shape' }>,
    r: Resolved,
): Container {
    const g = new Graphics();

    if (el.fill) {
        g.fill(el.fill);
    }
    if (el.stroke) {
        g.stroke({ color: el.stroke, width: el.strokeWidth ?? 1 });
    }

    switch (el.shapeType) {
        case 'rectangle':
            g.roundRect(0, 0, r.width, r.height, el.borderRadius ?? 0);
            break;
        case 'ellipse':
            g.ellipse(r.width / 2, r.height / 2, r.width / 2, r.height / 2);
            break;
        case 'line':
            g.moveTo(0, 0);
            g.lineTo(r.width, r.height);
            break;
        default:
            g.rect(0, 0, r.width, r.height);
    }

    g.fill();
    if (el.stroke) g.stroke();

    g.x = r.x;
    g.y = r.y;
    g.alpha = el.opacity;
    g.visible = el.visible;
    g.rotation = (el.constraints.rotation * Math.PI) / 180;
    g.label = el.id;
    return g;
}

function renderButton(
    el: Extract<DesignElement, { type: 'button' }>,
    r: Resolved,
): Container {
    const container = new Container();
    container.x = r.x;
    container.y = r.y;
    container.label = el.id;

    // 배경
    const bg = new Graphics();
    bg.fill(el.backgroundColor);
    bg.roundRect(0, 0, r.width, r.height, el.borderRadius);
    bg.fill();
    container.addChild(bg);

    // 텍스트
    const style = new TextStyle({
        fontFamily: el.fontFamily,
        fontSize: el.fontSize,
        fontWeight: String(el.fontWeight) as TextStyle['fontWeight'],
        fill: el.color,
        align: 'center',
    });
    const label = new Text({ text: el.label, style });
    label.x = (r.width - label.width) / 2;
    label.y = (r.height - label.height) / 2;
    container.addChild(label);

    container.alpha = el.opacity;
    container.visible = el.visible;
    return container;
}

function renderImagePlaceholder(
    el: Extract<DesignElement, { type: 'image' }>,
    r: Resolved,
): Container {
    // 이미지는 비동기 로딩이 필요하므로 우선 placeholder 표시
    const container = new Container();
    container.x = r.x;
    container.y = r.y;
    container.label = el.id;

    const placeholder = new Graphics();
    placeholder.fill('#333344');
    placeholder.rect(0, 0, r.width, r.height);
    placeholder.fill();

    // 대각선 (이미지 placeholder 시각화)
    placeholder.stroke({ color: '#555566', width: 1 });
    placeholder.moveTo(0, 0);
    placeholder.lineTo(r.width, r.height);
    placeholder.moveTo(r.width, 0);
    placeholder.lineTo(0, r.height);
    placeholder.stroke();

    container.addChild(placeholder);
    container.alpha = el.opacity;
    container.visible = el.visible;
    return container;
}

function renderGroup(
    el: Extract<DesignElement, { type: 'group' }>,
    parentWidth: number,
    parentHeight: number,
    r: Resolved,
): Container {
    const container = new Container();
    container.x = r.x;
    container.y = r.y;
    container.label = el.id;

    for (const child of el.children) {
        container.addChild(renderElement(child, r.width, r.height));
    }

    container.alpha = el.opacity;
    container.visible = el.visible;
    return container;
}

/**
 * 전체 배너 변형을 렌더링
 */
export function renderVariant(variant: BannerVariant): Container[] {
    const w = variant.preset.width;
    const h = variant.preset.height;
    return variant.elements
        .slice()
        .sort((a, b) => a.zIndex - b.zIndex)
        .map((el) => renderElement(el, w, h));
}
