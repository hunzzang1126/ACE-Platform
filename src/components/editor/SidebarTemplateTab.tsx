// ─────────────────────────────────────────────────
// SidebarTemplateTab — Browse + apply templates
// Refactored from TemplateGallery for sidebar context
// ─────────────────────────────────────────────────

import { useState, useMemo, useCallback } from 'react';
import { useTemplateStore, type TemplateCategory } from '@/stores/templateStore';

const CATEGORIES = ['all', 'display', 'social', 'email', 'video'] as const;

export function SidebarTemplateTab() {
    const { templates, search, getByCategory, instantiate } = useTemplateStore();

    const [category, setCategory] = useState<string>('all');
    const [query, setQuery] = useState('');

    const filtered = useMemo(() => {
        if (query.trim()) return search(query);
        if (category !== 'all') return getByCategory(category as TemplateCategory);
        return templates;
    }, [templates, category, query, search, getByCategory]);

    const handleApply = useCallback((id: string) => {
        instantiate(id);
    }, [instantiate]);

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
