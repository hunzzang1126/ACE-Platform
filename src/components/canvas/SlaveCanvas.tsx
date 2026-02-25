// ─────────────────────────────────────────────────
// SlaveCanvas – 슬레이브 배너 라벨 컴포넌트
// ─────────────────────────────────────────────────
import type { BannerVariant } from '@/schema/design.types';

interface Props {
    variant: BannerVariant;
    onDoubleClick?: (variantId: string) => void;
}

export function SlaveCanvas({ variant, onDoubleClick }: Props) {
    return (
        <div
            className="cursor-pointer hover:ring-2 hover:ring-indigo-500 rounded transition-all"
            onDoubleClick={() => onDoubleClick?.(variant.id)}
        >
            <div className="text-[10px] text-zinc-500 text-center mt-1 truncate max-w-[120px]">
                {variant.preset.name}
                <span className="text-zinc-600 ml-1">
                    {variant.preset.width}×{variant.preset.height}
                </span>
            </div>
        </div>
    );
}
