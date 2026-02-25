// ─────────────────────────────────────────────────
// PixiRenderer – WebGPU/WebGL Application Manager
// ─────────────────────────────────────────────────
import { Application } from 'pixi.js';
import { CanvasViewport } from './CanvasViewport';
import type { BannerVariant } from '@/schema/design.types';

export class PixiRenderer {
    private app: Application;
    private viewports: Map<string, CanvasViewport> = new Map();
    private _initialized = false;

    constructor() {
        this.app = new Application();
    }

    /** GPU 초기화 + DOM 마운트 */
    async init(container: HTMLElement): Promise<void> {
        if (this._initialized) return;

        await this.app.init({
            background: '#1a1a2e',
            resizeTo: container,
            antialias: true,
            // WebGPU 우선, WebGL2 폴백
            preference: 'webgpu',
        });

        container.appendChild(this.app.canvas as HTMLCanvasElement);
        this._initialized = true;
    }

    get initialized(): boolean {
        return this._initialized;
    }

    get stage() {
        return this.app.stage;
    }

    get screen() {
        return this.app.screen;
    }

    /** 배너 변형에 대한 뷰포트 생성 */
    createViewport(variant: BannerVariant): CanvasViewport {
        if (this.viewports.has(variant.id)) {
            return this.viewports.get(variant.id)!;
        }

        const viewport = new CanvasViewport(variant);
        this.viewports.set(variant.id, viewport);
        this.app.stage.addChild(viewport.container);
        return viewport;
    }

    /** 뷰포트 제거 */
    removeViewport(variantId: string): void {
        const viewport = this.viewports.get(variantId);
        if (viewport) {
            this.app.stage.removeChild(viewport.container);
            viewport.destroy();
            this.viewports.delete(variantId);
        }
    }

    /** ID로 뷰포트 조회 */
    getViewport(variantId: string): CanvasViewport | undefined {
        return this.viewports.get(variantId);
    }

    /** 모든 뷰포트 조회 */
    getAllViewports(): CanvasViewport[] {
        return Array.from(this.viewports.values());
    }

    /** 모든 뷰포트를 그리드 레이아웃으로 배치 */
    layoutViewportsAsGrid(gap = 20, maxCols = 4): void {
        const viewports = this.getAllViewports();
        let col = 0;
        let row = 0;
        let rowHeight = 0;
        let x = gap;
        let y = gap;

        for (const vp of viewports) {
            const scale = Math.min(
                250 / vp.variant.preset.width,
                250 / vp.variant.preset.height,
                1,
            );
            vp.container.scale.set(scale);
            vp.container.x = x;
            vp.container.y = y;

            const scaledW = vp.variant.preset.width * scale;
            const scaledH = vp.variant.preset.height * scale;

            x += scaledW + gap;
            rowHeight = Math.max(rowHeight, scaledH);
            col++;

            if (col >= maxCols) {
                col = 0;
                x = gap;
                y += rowHeight + gap;
                rowHeight = 0;
                row++;
            }
        }
    }

    /** 리소스 정리 */
    destroy(): void {
        for (const vp of this.viewports.values()) {
            vp.destroy();
        }
        this.viewports.clear();
        if (this._initialized) {
            try {
                this.app.destroy(true, { children: true });
            } catch {
                // PixiJS cleanup may fail if init was incomplete
            }
        }
        this._initialized = false;
    }
}
