// ─────────────────────────────────────────────────
// CanvasViewport – Individual Banner Viewport
// ─────────────────────────────────────────────────
import { Container, Graphics } from 'pixi.js';
import type { BannerVariant } from '@/schema/design.types';
import { renderVariant, renderElement } from './ElementRenderer';

export class CanvasViewport {
    public container: Container;
    public variant: BannerVariant;
    private background: Graphics;
    private contentContainer: Container;
    private border: Graphics;

    constructor(variant: BannerVariant) {
        this.variant = variant;
        this.container = new Container();
        this.container.label = `viewport-${variant.id}`;

        // 배경
        this.background = new Graphics();
        this.drawBackground();
        this.container.addChild(this.background);

        // 컨텐츠 컨테이너 (클리핑 대상)
        this.contentContainer = new Container();
        this.container.addChild(this.contentContainer);

        // 테두리
        this.border = new Graphics();
        this.drawBorder(false);
        this.container.addChild(this.border);

        // 초기 렌더
        this.syncFromDesign(variant);
    }

    /** 디자인 JSON → Pixi 오브젝트 전체 재렌더 */
    syncFromDesign(variant: BannerVariant): void {
        this.variant = variant;

        // 기존 컨텐츠 제거
        this.contentContainer.removeChildren();

        // 배경 업데이트
        this.drawBackground();

        // 요소 렌더링
        const children = renderVariant(variant);
        for (const child of children) {
            this.contentContainer.addChild(child);
        }
    }

    /** 특정 요소만 업데이트 (최적화) */
    updateElement(elementId: string, variant: BannerVariant): void {
        this.variant = variant;

        // 기존 요소 찾아서 교체
        const existing = this.contentContainer.children.find((c) => c.label === elementId);
        if (existing) {
            const idx = this.contentContainer.getChildIndex(existing);
            this.contentContainer.removeChildAt(idx);

            const el = variant.elements.find((e) => e.id === elementId);
            if (el) {
                const newObj = renderElement(el, variant.preset.width, variant.preset.height);
                this.contentContainer.addChildAt(newObj, idx);
            }
        }
    }

    /** 선택 상태 시각화 */
    setSelected(selected: boolean): void {
        this.drawBorder(selected);
    }

    private drawBackground(): void {
        this.background.clear();
        this.background.fill(this.variant.backgroundColor);
        this.background.rect(0, 0, this.variant.preset.width, this.variant.preset.height);
        this.background.fill();
    }

    private drawBorder(selected: boolean): void {
        this.border.clear();
        this.border.stroke({
            color: selected ? '#6C63FF' : '#333344',
            width: selected ? 3 : 1,
        });
        this.border.rect(0, 0, this.variant.preset.width, this.variant.preset.height);
        this.border.stroke();
    }

    destroy(): void {
        this.container.destroy({ children: true });
    }
}
