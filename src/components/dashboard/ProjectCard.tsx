// ─────────────────────────────────────────────────
// ProjectCard – 대시보드 프로젝트 카드
// ─────────────────────────────────────────────────
interface Props {
    name: string;
    description?: string;
    variantCount: number;
    updatedAt: string;
    onClick: () => void;
}

export function ProjectCard({ name, description, variantCount, updatedAt, onClick }: Props) {
    return (
        <button
            onClick={onClick}
            className="
        w-full text-left p-5 rounded-xl
        bg-gradient-to-br from-zinc-800/80 to-zinc-900/80
        border border-zinc-700/50 hover:border-indigo-500/50
        hover:shadow-lg hover:shadow-indigo-500/10
        transition-all duration-200 group
      "
        >
            <h3 className="text-lg font-semibold text-zinc-100 group-hover:text-indigo-300 transition-colors">
                {name}
            </h3>
            {description && (
                <p className="text-sm text-zinc-500 mt-1 line-clamp-2">{description}</p>
            )}
            <div className="flex items-center gap-4 mt-3 text-xs text-zinc-500">
                <span>{variantCount} variants</span>
                <span>Updated {new Date(updatedAt).toLocaleDateString()}</span>
            </div>
        </button>
    );
}
