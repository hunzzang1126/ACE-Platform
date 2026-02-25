// ─────────────────────────────────────────────────
// CanvasGrid – 슬레이브 배너 그리드 레이아웃
// ─────────────────────────────────────────────────
import { useDesignStore } from '@/stores/designStore';
import { SlaveCanvas } from './SlaveCanvas';

interface Props {
    onVariantDoubleClick?: (variantId: string) => void;
}

export function CanvasGrid({ onVariantDoubleClick }: Props) {
    const creativeSet = useDesignStore((s) => s.creativeSet);
    if (!creativeSet) return null;

    const slaves = creativeSet.variants.filter(
        (v) => v.id !== creativeSet.masterVariantId,
    );

    return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 p-4">
            {slaves.map((variant) => (
                <SlaveCanvas
                    key={variant.id}
                    variant={variant}
                    onDoubleClick={onVariantDoubleClick}
                />
            ))}
        </div>
    );
}
