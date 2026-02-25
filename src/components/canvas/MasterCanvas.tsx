// ─────────────────────────────────────────────────
// MasterCanvas – 마스터 배너 캔버스 컴포넌트
// ─────────────────────────────────────────────────
import { useEffect } from 'react';
import type { MutableRefObject } from 'react';
import type { PixiRenderer } from '@/engine/PixiRenderer';
import { useDesignStore } from '@/stores/designStore';

interface Props {
    rendererRef: MutableRefObject<PixiRenderer | null>;
}

export function MasterCanvas({ rendererRef }: Props) {
    const creativeSet = useDesignStore((s) => s.creativeSet);
    const masterVariantId = creativeSet?.masterVariantId;

    useEffect(() => {
        const renderer = rendererRef.current;
        if (!renderer?.initialized || !creativeSet || !masterVariantId) return;

        const masterVariant = creativeSet.variants.find((v) => v.id === masterVariantId);
        if (!masterVariant) return;

        const viewport = renderer.getViewport(masterVariant.id);
        if (viewport) {
            viewport.setSelected(true);
        }
    }, [creativeSet, masterVariantId, rendererRef]);

    return (
        <div className="flex items-center justify-center">
            <div className="text-xs text-zinc-500 uppercase tracking-wider mb-2">
                Master Canvas
                {creativeSet && (
                    <span className="ml-2 text-indigo-400">
                        {creativeSet.variants.find((v) => v.id === masterVariantId)?.preset.name}
                    </span>
                )}
            </div>
        </div>
    );
}
