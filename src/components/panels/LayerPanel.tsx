// ─────────────────────────────────────────────────
// LayerPanel – 레이어 목록 패널
// ─────────────────────────────────────────────────
import { useDesignStore } from '@/stores/designStore';
import { useEditorStore } from '@/stores/editorStore';
import { elementTypeIcon } from '@/components/ui/Icons';

export function LayerPanel() {
    const creativeSet = useDesignStore((s) => s.creativeSet);
    const selectedIds = useEditorStore((s) => s.selectedElementIds);
    const selectElements = useEditorStore((s) => s.selectElements);

    if (!creativeSet) return null;

    const master = creativeSet.variants.find(
        (v) => v.id === creativeSet.masterVariantId,
    );
    if (!master) return null;

    const elements = [...master.elements].sort((a, b) => b.zIndex - a.zIndex);

    return (
        <div className="p-4">
            <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">
                Layers
            </h3>
            <div className="space-y-1">
                {elements.map((el) => (
                    <button
                        key={el.id}
                        onClick={() => selectElements([el.id])}
                        className={`
              w-full text-left px-3 py-2 rounded text-sm transition-colors
              ${selectedIds.includes(el.id)
                                ? 'bg-indigo-600/30 text-indigo-300'
                                : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
                            }
            `}
                    >
                        <span className="inline-block w-4 text-xs text-zinc-600 mr-2">
                            {elementTypeIcon(el.type, 12)}
                        </span>
                        <span>{el.name}</span>
                        {!el.visible && <span className="ml-2 text-zinc-600">(hidden)</span>}
                        {el.locked && <span className="ml-1 text-zinc-600">(locked)</span>}
                    </button>
                ))}
                {elements.length === 0 && (
                    <div className="text-zinc-600 text-sm">No elements yet</div>
                )}
            </div>
        </div>
    );
}
