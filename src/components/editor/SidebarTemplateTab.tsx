// ─────────────────────────────────────────────────
// SidebarTemplateTab — Browse + apply templates
// Refactored from TemplateGallery for sidebar context
// ─────────────────────────────────────────────────

import { useState, useMemo, useCallback } from 'react';
import { useTemplateStore, type TemplateCategory } from '@/stores/templateStore';
import type { CanvasEngineActions } from '@/hooks/canvasTypes';

const CATEGORIES = ['all', 'display', 'social', 'email', 'video'] as const;

interface Props {
    actions?: CanvasEngineActions | null;
}

export function SidebarTemplateTab({ actions }: Props) {
    const { templates, search, getByCategory, instantiate } = useTemplateStore();

    const [category, setCategory] = useState<string>('all');
    const [query, setQuery] = useState('');

    const filtered = useMemo(() => {
        if (query.trim()) return search(query);
        if (category !== 'all') return getByCategory(category as TemplateCategory);
        return templates;
    }, [templates, category, query, search, getByCategory]);

    // ★ FIX: Apply template elements to the Fabric canvas via actions
    const handleApply = useCallback((id: string) => {
        const variant = instantiate(id);
        if (!variant || !actions) return;

        // Place each element from the template onto the canvas
        const elements = variant.elements ?? [];
        for (const el of elements) {
            // DesignElement uses constraints for position/size
            const x = el.constraints?.horizontal?.offset ?? 0;
            const y = el.constraints?.vertical?.offset ?? 0;
            const w = el.constraints?.size?.width ?? 100;
            const h = el.constraints?.size?.height ?? 100;

            if (el.type === 'text') {
                actions.addText(x, y, el.content ?? 'Text', {
                    fontSize: el.fontSize,
                    fontFamily: el.fontFamily,
                    fontWeight: String(el.fontWeight),
                    color: el.color,
                    textAlign: el.textAlign,
                    lineHeight: el.lineHeight,
                    width: w,
                });
            } else if (el.type === 'image' && el.src) {
                actions.addImage(x, y, el.src, w, h);
            } else if (el.type === 'shape') {
                if (el.shapeType === 'ellipse') {
                    actions.addEllipse(x, y);
                } else {
                    actions.addRect(x, y);
                }
            }
        }
    }, [instantiate, actions]);

    return (
        <div className="sidebar-templates">
            {/* Search */}
            <input
                className="sidebar-search"
                type="text"
                placeholder="Search templates..."
                value={query}
                onChange={e => { setQuery(e.target.value); }}
            />

            {/* Category pills */}
            <div className="sidebar-pills">
                {CATEGORIES.map(cat => (
                    <button
                        key={cat}
                        className={`sidebar-pill ${category === cat ? 'active' : ''}`}
                        onClick={() => { setCategory(cat); setQuery(''); }}
                    >
                        {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </button>
                ))}
            </div>

            {/* Template grid */}
            <div className="sidebar-template-grid">
                {filtered.length === 0 && (
                    <div className="sidebar-empty">
                        No templates found. Create a design and save it as a template.
                    </div>
                )}
                {filtered.map(t => (
                    <div key={t.id} className="sidebar-template-card" onClick={() => handleApply(t.id)}>
                        {t.thumbnailSrc ? (
                            <img src={t.thumbnailSrc} alt={t.name} className="sidebar-template-thumb" />
                        ) : (
                            <div className="sidebar-template-placeholder">
                                {t.width} x {t.height}
                            </div>
                        )}
                        <div className="sidebar-template-info">
                            <span className="sidebar-template-name">{t.name}</span>
                            <span className="sidebar-template-meta">
                                {t.width}x{t.height}
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
