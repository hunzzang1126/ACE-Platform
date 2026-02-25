// ─────────────────────────────────────────────────
// Pagination – Dashboard bottom bar
// ─────────────────────────────────────────────────
import { useProjectStore } from '@/stores/projectStore';

interface Props {
    totalItems: number;
}

const PAGE_SIZES = [10, 25, 50, 100];

export function Pagination({ totalItems }: Props) {
    const currentPage = useProjectStore((s) => s.currentPage);
    const itemsPerPage = useProjectStore((s) => s.itemsPerPage);
    const setCurrentPage = useProjectStore((s) => s.setCurrentPage);
    const setItemsPerPage = useProjectStore((s) => s.setItemsPerPage);

    const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));

    return (
        <div className="pagination">
            <div className="pagination-left">
                <span className="pagination-label">Show</span>
                <select
                    value={itemsPerPage}
                    onChange={(e) => setItemsPerPage(Number(e.target.value))}
                    className="pagination-select"
                >
                    {PAGE_SIZES.map((size) => (
                        <option key={size} value={size}>{size}</option>
                    ))}
                </select>
                <span className="pagination-count">
                    items out of {totalItems}
                </span>
            </div>

            <div className="pagination-right">
                <button
                    onClick={() => setCurrentPage(currentPage - 1)}
                    disabled={currentPage <= 1}
                    className="pagination-arrow"
                >
                    ‹
                </button>
                <span className="pagination-pages">
                    {currentPage} / {totalPages}
                </span>
                <button
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={currentPage >= totalPages}
                    className="pagination-arrow"
                >
                    ›
                </button>
            </div>
        </div>
    );
}
