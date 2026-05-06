// ─────────────────────────────────────────────────
// BrandCloudSection — Google Drive-level asset library
// ─────────────────────────────────────────────────
// Tabbed navigation: Assets | Palette | Typography | Guidelines
// Grid/list views, drag-drop upload, visual file cards.
// ─────────────────────────────────────────────────

import { useState, useCallback, useRef } from 'react';
import { useBrandKitStore, type AssetCategory } from '@/stores/brandKitStore';
import { BrandTypographyTab } from './BrandTypographyTab';
import './BrandCloudSection.css';

type CloudTab = 'assets' | 'palette' | 'typography' | 'guidelines';
type ViewMode = 'grid' | 'list';
const ASSET_CATEGORIES: AssetCategory[] = ['logo', 'product', 'texture', 'icon', 'background', 'photo'];

export function BrandCloudSection() {
    const {
        kits, activeKitId, createKit, deleteKit, setActiveKit, getActiveKit,
        addAsset, removeAsset, updatePalette, updateTypography, updateGuidelines,
    } = useBrandKitStore();
    const kit = getActiveKit();
    const [newKitName, setNewKitName] = useState('');
    const [tab, setTab] = useState<CloudTab>('assets');
    const [viewMode, setViewMode] = useState<ViewMode>('grid');
    const [assetFilter, setAssetFilter] = useState<AssetCategory | 'all'>('all');
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleCreateKit = useCallback(() => {
        const name = newKitName.trim() || `Brand Kit ${kits.length + 1}`;
        const id = createKit(name);
        setActiveKit(id);
        setNewKitName('');
    }, [newKitName, kits.length, createKit, setActiveKit]);

    // ── Asset Upload ──
    const handleFileUpload = useCallback(async (files: FileList) => {
        if (!activeKitId) return;
        for (const file of Array.from(files)) {
            if (!file.type.startsWith('image/')) continue;
            const reader = new FileReader();
            reader.onload = async () => {
                const src = reader.result as string;
                const thumbnail = await generateThumbnail(src, 200);
                const hash = await hashString(src.slice(0, 2000));
                const img = new Image();
                img.src = src;
                await new Promise(r => { img.onload = r; });
                addAsset(activeKitId, {
                    name: file.name.replace(/\.[^.]+$/, ''),
                    category: guessCategory(file.name),
                    tags: [], role: null, src, thumbSrc: thumbnail,
                    width: img.naturalWidth, height: img.naturalHeight,
                    format: file.type.split('/')[1] as any,
                    sizeBytes: file.size, hash,
                    metadata: { hasTransparency: file.type === 'image/png', dominantColors: [], suggestedPlacement: null },
                });
            };
            reader.readAsDataURL(file);
        }
    }, [activeKitId, addAsset]);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault(); setIsDragging(false);
        if (e.dataTransfer.files.length) handleFileUpload(e.dataTransfer.files);
    }, [handleFileUpload]);

    const filteredAssets = kit
        ? kit.assets.filter(a => !a.deletedAt && (assetFilter === 'all' || a.category === assetFilter))
        : [];

    // ── No kits ──
    if (kits.length === 0) {
        return (
            <div className="brand-cloud__empty">
                <div className="brand-cloud__empty-icon">
                    <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="0.8" strokeLinecap="round" opacity="0.25">
                        <path d="M18 10h-1.26A8 8 0 109 20h9a5 5 0 000-10z" />
                    </svg>
                </div>
                <h3 className="brand-cloud__empty-title">Brand Cloud</h3>
                <p className="brand-cloud__empty-desc">Store your brand assets, colors, and guidelines for AI-powered design generation</p>
                <div className="brand-cloud__empty-create">
                    <input
                        className="brand-cloud__input"
                        placeholder="Brand kit name..."
                        value={newKitName}
                        onChange={e => setNewKitName(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleCreateKit()}
                    />
                    <button className="brand-cloud__primary-btn" onClick={handleCreateKit}>
                        Create Brand Kit
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="brand-cloud">
            {/* ── Kit Selector Bar ── */}
            <div className="brand-cloud__bar">
                <select
                    className="brand-cloud__kit-select"
                    value={activeKitId ?? ''}
                    onChange={e => setActiveKit(e.target.value || null)}
                >
                    {kits.map(k => <option key={k.id} value={k.id}>{k.name}</option>)}
                </select>
                <div className="brand-cloud__bar-actions">
                    <input
                        className="brand-cloud__input brand-cloud__input--sm"
                        placeholder="New kit..."
                        value={newKitName}
                        onChange={e => setNewKitName(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleCreateKit()}
                    />
                    <button className="brand-cloud__ghost-btn" onClick={handleCreateKit}>+ New Kit</button>
                    {activeKitId && (
                        <button
                            className="brand-cloud__ghost-btn brand-cloud__ghost-btn--danger"
                            onClick={() => { deleteKit(activeKitId); setActiveKit(kits[0]?.id ?? null); }}
                        >Delete Kit</button>
                    )}
                </div>
            </div>

            {/* ── Tab Navigation ── */}
            <div className="brand-cloud__tabs">
                {(['assets', 'palette', 'typography', 'guidelines'] as CloudTab[]).map(t => (
                    <button
                        key={t}
                        className={`brand-cloud__tab ${tab === t ? 'brand-cloud__tab--active' : ''}`}
                        onClick={() => setTab(t)}
                    >
                        {t === 'assets' ? 'Assets' : t === 'palette' ? 'Colors' : t === 'typography' ? 'Typography' : 'Guidelines'}
                        {t === 'assets' && kit && <span className="brand-cloud__tab-count">{kit.assets.filter(a => !a.deletedAt).length}</span>}
                    </button>
                ))}
            </div>

            {kit && (
                <>
                    {/* ═══ ASSETS TAB ═══ */}
                    {tab === 'assets' && (
                        <div className="brand-cloud__assets">
                            {/* Upload Zone */}
                            <div
                                className={`brand-cloud__dropzone ${isDragging ? 'brand-cloud__dropzone--active' : ''}`}
                                onDrop={handleDrop}
                                onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                                onDragLeave={() => setIsDragging(false)}
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={isDragging ? '#818cf8' : '#555'} strokeWidth="1.5" strokeLinecap="round">
                                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
                                </svg>
                                <span className="brand-cloud__dropzone-text">
                                    {isDragging ? 'Drop files here' : 'Drag and drop files, or click to browse'}
                                </span>
                                <span className="brand-cloud__dropzone-hint">PNG, JPG, SVG, WebP</span>
                            </div>
                            <input ref={fileInputRef} type="file" accept="image/*" multiple style={{ display: 'none' }}
                                onChange={e => e.target.files && handleFileUpload(e.target.files)} />

                            {/* Filter + View Toggle */}
                            <div className="brand-cloud__asset-controls">
                                <div className="brand-cloud__filters">
                                    <button className={`brand-cloud__filter ${assetFilter === 'all' ? 'brand-cloud__filter--active' : ''}`}
                                        onClick={() => setAssetFilter('all')}>All</button>
                                    {ASSET_CATEGORIES.map(cat => (
                                        <button key={cat}
                                            className={`brand-cloud__filter ${assetFilter === cat ? 'brand-cloud__filter--active' : ''}`}
                                            onClick={() => setAssetFilter(cat)}>{cat}</button>
                                    ))}
                                </div>
                                <div className="brand-cloud__view-toggle">
                                    <button className={`brand-cloud__view-btn ${viewMode === 'grid' ? 'brand-cloud__view-btn--active' : ''}`}
                                        onClick={() => setViewMode('grid')} title="Grid view">
                                        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><rect x="1" y="1" width="6" height="6" rx="1"/><rect x="9" y="1" width="6" height="6" rx="1"/><rect x="1" y="9" width="6" height="6" rx="1"/><rect x="9" y="9" width="6" height="6" rx="1"/></svg>
                                    </button>
                                    <button className={`brand-cloud__view-btn ${viewMode === 'list' ? 'brand-cloud__view-btn--active' : ''}`}
                                        onClick={() => setViewMode('list')} title="List view">
                                        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><rect x="1" y="2" width="14" height="2" rx="0.5"/><rect x="1" y="7" width="14" height="2" rx="0.5"/><rect x="1" y="12" width="14" height="2" rx="0.5"/></svg>
                                    </button>
                                </div>
                            </div>

                            {/* Asset Grid/List */}
                            {filteredAssets.length === 0 ? (
                                <div className="brand-cloud__no-assets">
                                    <p>No assets yet — upload logos, product shots, or textures</p>
                                </div>
                            ) : (
                                <div className={viewMode === 'grid' ? 'brand-cloud__asset-grid' : 'brand-cloud__asset-list'}>
                                    {filteredAssets.map(a => viewMode === 'grid' ? (
                                        <div key={a.id} className="brand-cloud__acard">
                                            <div className="brand-cloud__acard-img-wrap">
                                                <img src={a.thumbSrc || a.src} alt={a.name} className="brand-cloud__acard-img" />
                                                <div className="brand-cloud__acard-overlay">
                                                    <button className="brand-cloud__acard-del"
                                                        onClick={() => removeAsset(kit.id, a.id)}>Remove</button>
                                                </div>
                                            </div>
                                            <div className="brand-cloud__acard-info">
                                                <span className="brand-cloud__acard-name">{a.name}</span>
                                                <span className="brand-cloud__acard-meta">{a.category} · {a.width}x{a.height}</span>
                                            </div>
                                        </div>
                                    ) : (
                                        <div key={a.id} className="brand-cloud__alist-row">
                                            <img src={a.thumbSrc || a.src} alt={a.name} className="brand-cloud__alist-thumb" />
                                            <div className="brand-cloud__alist-info">
                                                <span className="brand-cloud__alist-name">{a.name}</span>
                                                <span className="brand-cloud__alist-meta">{a.category} · {a.width}x{a.height} · {formatBytes(a.sizeBytes)}</span>
                                            </div>
                                            <button className="brand-cloud__alist-del" onClick={() => removeAsset(kit.id, a.id)}>x</button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ═══ PALETTE TAB ═══ */}
                    {tab === 'palette' && (
                        <div className="brand-cloud__palette">
                            <p className="brand-cloud__section-desc">Define your brand color palette. These colors will be preferred by the AI when generating designs.</p>
                            <div className="brand-cloud__color-grid">
                                {(['primary', 'secondary', 'accent', 'background', 'text'] as const).map(key => (
                                    <div key={key} className="brand-cloud__color-card">
                                        <div className="brand-cloud__color-swatch" style={{ backgroundColor: kit.palette[key] }}>
                                            <input type="color" value={kit.palette[key]}
                                                onChange={e => updatePalette(kit.id, { [key]: e.target.value })}
                                                className="brand-cloud__color-picker" />
                                        </div>
                                        <div className="brand-cloud__color-info">
                                            <span className="brand-cloud__color-label">{key}</span>
                                            <span className="brand-cloud__color-hex">{kit.palette[key]}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ═══ TYPOGRAPHY TAB ═══ */}
                    {tab === 'typography' && kit && (
                        <BrandTypographyTab kit={kit} onUpdateTypography={updateTypography} />
                    )}

                    {/* ═══ GUIDELINES TAB ═══ */}
                    {tab === 'guidelines' && (
                        <div className="brand-cloud__guidelines">
                            <p className="brand-cloud__section-desc">Brand guidelines inform the AI about your brand voice and preferred messaging.</p>
                            <div className="brand-cloud__guide-fields">
                                <label className="brand-cloud__guide-label">
                                    <span>Brand Name</span>
                                    <input className="brand-cloud__input brand-cloud__input--wide"
                                        value={kit.guidelines.name} placeholder="Your brand name..."
                                        onChange={e => updateGuidelines(kit.id, { name: e.target.value })} />
                                </label>
                                <label className="brand-cloud__guide-label">
                                    <span>Tagline</span>
                                    <input className="brand-cloud__input brand-cloud__input--wide"
                                        value={kit.guidelines.tagline} placeholder="Your tagline..."
                                        onChange={e => updateGuidelines(kit.id, { tagline: e.target.value })} />
                                </label>
                                <label className="brand-cloud__guide-label">
                                    <span>Voice Tone</span>
                                    <select className="brand-cloud__select" value={kit.guidelines.voiceTone}
                                        onChange={e => updateGuidelines(kit.id, { voiceTone: e.target.value })}>
                                        {['Professional', 'Friendly', 'Bold', 'Luxury', 'Playful', 'Technical'].map(t => (
                                            <option key={t} value={t}>{t}</option>
                                        ))}
                                    </select>
                                </label>
                                <label className="brand-cloud__guide-label">
                                    <span>CTA Phrases</span>
                                    <input className="brand-cloud__input brand-cloud__input--wide"
                                        value={kit.guidelines.ctaPhrases.join(', ')} placeholder="Learn More, Get Started, Shop Now..."
                                        onChange={e => updateGuidelines(kit.id, {
                                            ctaPhrases: e.target.value.split(',').map(s => s.trim()).filter(Boolean),
                                        })} />
                                </label>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

// ── Helpers ──

function guessCategory(filename: string): AssetCategory {
    const l = filename.toLowerCase();
    if (l.includes('logo')) return 'logo';
    if (l.includes('icon')) return 'icon';
    if (l.includes('bg') || l.includes('background')) return 'background';
    if (l.includes('texture') || l.includes('pattern')) return 'texture';
    if (l.includes('product')) return 'product';
    return 'photo';
}

function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function generateThumbnail(dataUrl: string, maxSize: number): Promise<string> {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const scale = Math.min(maxSize / img.width, maxSize / img.height, 1);
            canvas.width = img.width * scale;
            canvas.height = img.height * scale;
            const ctx = canvas.getContext('2d')!;
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            resolve(canvas.toDataURL('image/jpeg', 0.7));
        };
        img.src = dataUrl;
    });
}

async function hashString(str: string): Promise<string> {
    const buffer = new TextEncoder().encode(str);
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}
