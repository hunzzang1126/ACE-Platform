// ─────────────────────────────────────────────────
// AddSizeModal – Preset selector + custom size
// ─────────────────────────────────────────────────
import { useState, useMemo } from 'react';
import { BANNER_PRESETS } from '@/schema/presets';
import type { BannerPreset } from '@/schema/design.types';

interface Props {
    existingPresetIds: Set<string>;
    onAdd: (presets: BannerPreset[]) => void;
    onClose: () => void;
}

type TabType = 'add' | 'import';
type FilterCategory = 'all' | 'display' | 'social' | 'video';

const CATEGORY_LABELS: Record<FilterCategory, string> = {
    all: 'All Sizes',
    display: 'IAB Display',
    social: 'Social Media',
    video: 'Video',
};

// Tiny scaled thumbnail renderer
function SizeThumb({ w, h }: { w: number; h: number }) {
    const maxDim = 32;
    const scale = Math.min(maxDim / w, maxDim / h);
    const sw = Math.max(4, Math.round(w * scale));
    const sh = Math.max(4, Math.round(h * scale));
    return (
        <div className="size-thumb-container">
            <div
                className="size-thumb"
                style={{ width: sw, height: sh }}
            />
        </div>
    );
}

export function AddSizeModal({ existingPresetIds, onAdd, onClose }: Props) {
    const [activeTab, setActiveTab] = useState<TabType>('add');
    const [filterCategory, setFilterCategory] = useState<FilterCategory>('all');
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [customWidth, setCustomWidth] = useState('');
    const [customHeight, setCustomHeight] = useState('');

    const filteredPresets = useMemo(() => {
        if (filterCategory === 'all') return BANNER_PRESETS;
        return BANNER_PRESETS.filter((p) => p.category === filterCategory);
    }, [filterCategory]);

    const togglePreset = (id: string) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const selectAll = () => {
        if (selectedIds.size === filteredPresets.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filteredPresets.map((p) => p.id)));
        }
    };

    const handleAddCustom = () => {
        const w = parseInt(customWidth, 10);
        const h = parseInt(customHeight, 10);
        if (!w || !h || w < 1 || h < 1) return;
        const customPreset: BannerPreset = {
            id: `custom-${w}x${h}-${Date.now()}`,
            name: `Custom ${w}×${h}`,
            width: w,
            height: h,
            category: 'custom',
        };
        onAdd([customPreset]);
        setCustomWidth('');
        setCustomHeight('');
    };

    const handleAddSelected = () => {
        const presets = BANNER_PRESETS.filter((p) => selectedIds.has(p.id));
        if (presets.length > 0) onAdd(presets);
        onClose();
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-container size-modal" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="modal-header">
                    <h2 className="modal-title">ADD CREATIVE SIZES</h2>
                    <button className="modal-close" onClick={onClose}>x</button>
                </div>

                {/* Tabs */}
                <div className="modal-tabs">
                    <button
                        className={`modal-tab ${activeTab === 'add' ? 'active' : ''}`}
                        onClick={() => setActiveTab('add')}
                    >
                        ADD SIZES
                    </button>
                    <button
                        className={`modal-tab ${activeTab === 'import' ? 'active' : ''}`}
                        onClick={() => setActiveTab('import')}
                        disabled
                    >
                        IMPORT PSD
                    </button>
                </div>

                {activeTab === 'add' && (
                    <div className="modal-body">
                        {/* Left: Preset picker */}
                        <div className="modal-preset-panel">
                            {/* Custom size input */}
                            <div className="modal-custom-size">
                                <input
                                    type="number"
                                    value={customWidth}
                                    onChange={(e) => setCustomWidth(e.target.value)}
                                    placeholder="Width"
                                    className="modal-size-input"
                                    min={1}
                                />
                                <span className="modal-size-x">×</span>
                                <input
                                    type="number"
                                    value={customHeight}
                                    onChange={(e) => setCustomHeight(e.target.value)}
                                    placeholder="Height"
                                    className="modal-size-input"
                                    min={1}
                                />
                                <button
                                    className="modal-size-add-btn"
                                    onClick={handleAddCustom}
                                    disabled={!customWidth || !customHeight}
                                >
                                    + ADD
                                </button>
                            </div>

                            {/* Filter dropdown */}
                            <select
                                value={filterCategory}
                                onChange={(e) => setFilterCategory(e.target.value as FilterCategory)}
                                className="modal-filter-select"
                            >
                                {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                                    <option key={key} value={key}>{label}</option>
                                ))}
                            </select>

                            {/* Select all */}
                            <div className="modal-select-all">
                                <span className="modal-section-label">
                                    {filterCategory === 'all' ? 'All Sizes' : CATEGORY_LABELS[filterCategory]}
                                </span>
                                <button className="modal-select-all-btn" onClick={selectAll}>
                                    {selectedIds.size === filteredPresets.length ? 'Deselect all' : 'Select all'}
                                </button>
                            </div>

                            {/* Preset list */}
                            <div className="modal-preset-list">
                                {filteredPresets.map((preset) => {
                                    const isSelected = selectedIds.has(preset.id);
                                    const alreadyExists = existingPresetIds.has(preset.id);
                                    return (
                                        <button
                                            key={preset.id}
                                            className={`modal-preset-item ${isSelected ? 'selected' : ''} ${alreadyExists ? 'exists' : ''}`}
                                            onClick={() => !alreadyExists && togglePreset(preset.id)}
                                            disabled={alreadyExists}
                                        >
                                            <SizeThumb w={preset.width} h={preset.height} />
                                            <div className="modal-preset-info">
                                                <span className="modal-preset-dims">
                                                    {preset.width} × {preset.height}
                                                </span>
                                                {preset.name && (
                                                    <span className="modal-preset-name">{preset.name}</span>
                                                )}
                                            </div>
                                            {alreadyExists && <span className="modal-preset-badge">Added</span>}
                                            {!alreadyExists && (
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={() => togglePreset(preset.id)}
                                                    className="modal-preset-checkbox"
                                                    onClick={(e) => e.stopPropagation()}
                                                />
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Right: Preview (empty initially) */}
                        <div className="modal-preview-panel">
                            {selectedIds.size === 0 ? (
                                <div className="modal-preview-empty">
                                    <p>Select sizes to preview</p>
                                </div>
                            ) : (
                                <div className="modal-preview-grid">
                                    {BANNER_PRESETS.filter((p) => selectedIds.has(p.id)).map((p) => (
                                        <div key={p.id} className="modal-preview-card">
                                            <SizeThumb w={p.width} h={p.height} />
                                            <span className="modal-preview-label">{p.width}×{p.height}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Footer */}
                <div className="modal-footer">
                    <button className="modal-cancel-btn" onClick={onClose}>CANCEL</button>
                    <button
                        className="modal-add-btn"
                        onClick={handleAddSelected}
                        disabled={selectedIds.size === 0}
                    >
                        ADD SIZES ({selectedIds.size})
                    </button>
                </div>
            </div>
        </div>
    );
}
