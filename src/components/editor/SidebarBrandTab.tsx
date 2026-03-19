// ─────────────────────────────────────────────────
// SidebarBrandTab — Canva-style brand kit panel
// ─────────────────────────────────────────────────
// Left nav list + right content area within sidebar panel.
// Sections: All Assets | Logos | Colors | Fonts | Guidelines | Photos
// Click asset → add to canvas. Drag-drop upload supported.
// Reuses brandKitStore (same data as dashboard BrandCloudSection).
// ─────────────────────────────────────────────────

import { useState, useCallback, useRef } from 'react';
import { useBrandKitStore, type AssetCategory, type AssetFormat } from '@/stores/brandKitStore';
import type { CanvasEngineActions } from '@/hooks/canvasTypes';

interface Props {
    actions?: CanvasEngineActions | null;
}

type NavSection = 'all' | 'logo' | 'colors' | 'fonts' | 'guidelines' | 'photos';

const NAV_ITEMS: { id: NavSection; label: string }[] = [
    { id: 'all', label: 'All Assets' },
    { id: 'logo', label: 'Logos' },
    { id: 'colors', label: 'Colors' },
    { id: 'fonts', label: 'Fonts' },
    { id: 'guidelines', label: 'Guidelines' },
    { id: 'photos', label: 'Photos' },
];

function guessCategory(filename: string): AssetCategory {
    const l = filename.toLowerCase();
    if (l.includes('logo')) return 'logo';
    if (l.includes('icon')) return 'icon';
    if (l.includes('bg') || l.includes('background')) return 'background';
    if (l.includes('texture') || l.includes('pattern')) return 'texture';
    if (l.includes('product')) return 'product';
    return 'photo';
}

function guessFormat(mimeType: string): AssetFormat {
    const sub = mimeType.split('/')[1] ?? 'png';
    if (sub === 'jpeg') return 'jpg';
    if (['png', 'svg', 'jpg', 'webp', 'gif', 'avif', 'mp4', 'webm', 'mov'].includes(sub)) return sub as AssetFormat;
    return 'png';
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

export function SidebarBrandTab({ actions }: Props) {
    const {
        kits, activeKitId, createKit, setActiveKit, getActiveKit,
        addAsset, removeAsset, updatePalette, updateTypography, updateGuidelines,
    } = useBrandKitStore();
    const kit = getActiveKit();
    const [activeNav, setActiveNav] = useState<NavSection>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // ── Asset Upload ──
    const handleFileUpload = useCallback(async (files: FileList) => {
        let kitId = activeKitId;
        if (!kitId) {
            kitId = createKit('My Brand');
            setActiveKit(kitId);
        }
        for (const file of Array.from(files)) {
            const isImage = file.type.startsWith('image/');
            const isVideo = file.type.startsWith('video/');
            if (!isImage && !isVideo) continue;
            const reader = new FileReader();
            reader.onload = async () => {
                const src = reader.result as string;
                let width = 0, height = 0, thumbnail = src;
                if (isImage) {
                    thumbnail = await generateThumbnail(src, 150);
                    const img = new Image();
                    img.src = src;
                    await new Promise(r => { img.onload = r; });
                    width = img.naturalWidth;
                    height = img.naturalHeight;
                }
                const hash = await hashString(src.slice(0, 2000));
                addAsset(kitId!, {
                    name: file.name.replace(/\.[^.]+$/, ''),
                    category: guessCategory(file.name),
                    tags: [], role: null, src, thumbSrc: thumbnail,
                    width, height,
                    format: guessFormat(file.type),
                    sizeBytes: file.size, hash,
                    metadata: { hasTransparency: file.type === 'image/png', dominantColors: [], suggestedPlacement: null },
                });
            };
            reader.readAsDataURL(file);
        }
    }, [activeKitId, createKit, setActiveKit, addAsset]);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault(); setIsDragging(false);
        if (e.dataTransfer.files.length) handleFileUpload(e.dataTransfer.files);
    }, [handleFileUpload]);

    const handleAssetClick = useCallback(async (asset: { src: string; width: number; height: number }) => {
        if (!actions?.addImage) return;
        const maxW = (actions.canvasWidth ?? 300) * 0.5;
        const scale = Math.min(maxW / Math.max(asset.width, 1), 1);
        const w = Math.round(asset.width * scale);
        const h = Math.round(asset.height * scale);
        const x = Math.round(((actions.canvasWidth ?? 300) - w) / 2);
        const y = Math.round(((actions.canvasHeight ?? 250) - h) / 2);
        await actions.addImage(x, y, asset.src, w, h);
    }, [actions]);

    const getFilteredAssets = () => {
        if (!kit) return [];
        let assets = kit.assets.filter(a => !a.deletedAt);
        if (activeNav === 'logo') assets = assets.filter(a => a.category === 'logo');
        else if (activeNav === 'photos') assets = assets.filter(a => a.category === 'photo' || a.category === 'product' || a.category === 'background');
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            assets = assets.filter(a => a.name.toLowerCase().includes(q) || a.category.includes(q));
        }
        return assets;
    };

    // ── No brand kit — create one ──
    if (kits.length === 0) {
        return (
            <div style={S.empty}>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="0.8" strokeLinecap="round" opacity="0.3">
                    <path d="M18 10h-1.26A8 8 0 109 20h9a5 5 0 000-10z" />
                </svg>
                <p style={S.emptyTitle}>Brand Kit</p>
                <p style={S.emptyDesc}>Upload logos, set colors, and define your brand for AI-powered designs.</p>
                <button style={S.createBtn} onClick={() => { const id = createKit('My Brand'); setActiveKit(id); }}>
                    Create Brand Kit
                </button>
            </div>
        );
    }

    const filteredAssets = getFilteredAssets();

    return (
        <div style={S.root}>
            {/* Search */}
            <div style={S.searchWrap}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" style={{ flexShrink: 0 }}>
                    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                    style={S.searchInput}
                    type="text"
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                />
            </div>

            {/* Kit selector */}
            {kits.length > 1 && (
                <select style={S.kitSelect} value={activeKitId ?? ''} onChange={e => setActiveKit(e.target.value || null)}>
                    {kits.map(k => <option key={k.id} value={k.id}>{k.name}</option>)}
                </select>
            )}

            {/* Nav list */}
            <nav style={S.navList}>
                {NAV_ITEMS.map(item => (
                    <button
                        key={item.id}
                        style={{
                            ...S.navItem,
                            ...(activeNav === item.id ? S.navItemActive : {}),
                        }}
                        onClick={() => setActiveNav(item.id)}
                    >
                        {item.label}
                    </button>
                ))}
            </nav>

            <div style={S.divider} />

            {/* Content area based on active nav */}
            <div style={S.content}>
                {/* Assets (all, logo, photos) */}
                {(activeNav === 'all' || activeNav === 'logo' || activeNav === 'photos') && (
                    <>
                        {/* Upload zone */}
                        <div
                            style={{ ...S.dropZone, ...(isDragging ? S.dropZoneActive : {}) }}
                            onDrop={handleDrop}
                            onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                            onDragLeave={() => setIsDragging(false)}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <span style={S.dropText}>{isDragging ? 'Drop files' : 'Upload or drop files'}</span>
                            <span style={S.dropHint}>Any image, GIF, or video</span>
                        </div>
                        <input ref={fileInputRef} type="file" accept="image/*,video/*" multiple style={{ display: 'none' }}
                            onChange={e => e.target.files && handleFileUpload(e.target.files)} />

                        {/* Asset grid */}
                        {filteredAssets.length === 0 ? (
                            <p style={S.noItems}>No assets yet</p>
                        ) : (
                            <div style={S.assetGrid}>
                                {filteredAssets.map(a => (
                                    <div key={a.id} style={S.assetCard} onClick={() => handleAssetClick(a)} title={`${a.name} (${a.width}x${a.height})`}>
                                        <img src={a.thumbSrc || a.src} alt={a.name} style={S.assetImg} />
                                        <div style={S.assetInfo}>
                                            <span style={S.assetName}>{a.name}</span>
                                            <span style={S.assetMeta}>{formatBytes(a.sizeBytes)}</span>
                                        </div>
                                        <button style={S.assetDel} onClick={e => { e.stopPropagation(); removeAsset(kit!.id, a.id); }} title="Remove">
                                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M18 6L6 18M6 6l12 12" />
                                            </svg>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                )}

                {/* Colors */}
                {activeNav === 'colors' && kit && (
                    <div style={S.colorSection}>
                        <p style={S.sectionTitle}>Brand Colors</p>
                        <div style={S.colorGrid}>
                            {(['primary', 'secondary', 'accent', 'background', 'text'] as const).map(key => (
                                <label key={key} style={S.colorRow}>
                                    <div style={{ ...S.swatch, backgroundColor: kit.palette[key] }}>
                                        <input type="color" value={kit.palette[key]}
                                            onChange={e => updatePalette(kit.id, { [key]: e.target.value })}
                                            style={S.hiddenInput} />
                                    </div>
                                    <div style={S.colorInfo}>
                                        <span style={S.colorLabel}>{key}</span>
                                        <span style={S.colorHex}>{kit.palette[key]}</span>
                                    </div>
                                </label>
                            ))}
                        </div>
                    </div>
                )}

                {/* Fonts */}
                {activeNav === 'fonts' && kit && (
                    <div style={S.fontSection}>
                        <p style={S.sectionTitle}>Typography</p>
                        {(['heading', 'body', 'cta'] as const).map(role => (
                            <div key={role} style={S.fontRow}>
                                <span style={S.fontLabel}>{role}</span>
                                <input
                                    style={S.fontInput}
                                    value={kit.typography[role].family}
                                    onChange={e => updateTypography(kit.id, { [role]: { ...kit.typography[role], family: e.target.value } })}
                                    placeholder="Font family..."
                                />
                                <div style={{ ...S.fontPreview, fontFamily: kit.typography[role].family }}>
                                    The quick brown fox
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Guidelines */}
                {activeNav === 'guidelines' && kit && (
                    <div style={S.guideSection}>
                        <p style={S.sectionTitle}>Brand Guidelines</p>
                        <label style={S.guideRow}>
                            <span style={S.guideLabel}>Brand Name</span>
                            <input style={S.guideInput} value={kit.guidelines.name} placeholder="Brand name..."
                                onChange={e => updateGuidelines(kit.id, { name: e.target.value })} />
                        </label>
                        <label style={S.guideRow}>
                            <span style={S.guideLabel}>Tagline</span>
                            <input style={S.guideInput} value={kit.guidelines.tagline} placeholder="Tagline..."
                                onChange={e => updateGuidelines(kit.id, { tagline: e.target.value })} />
                        </label>
                        <label style={S.guideRow}>
                            <span style={S.guideLabel}>Voice Tone</span>
                            <select style={S.guideSelect} value={kit.guidelines.voiceTone}
                                onChange={e => updateGuidelines(kit.id, { voiceTone: e.target.value })}>
                                {['Professional', 'Friendly', 'Bold', 'Luxury', 'Playful', 'Technical'].map(t => (
                                    <option key={t} value={t}>{t}</option>
                                ))}
                            </select>
                        </label>
                        <label style={S.guideRow}>
                            <span style={S.guideLabel}>CTA Phrases</span>
                            <input style={S.guideInput} value={kit.guidelines.ctaPhrases.join(', ')} placeholder="CTA phrases..."
                                onChange={e => updateGuidelines(kit.id, { ctaPhrases: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })} />
                        </label>
                    </div>
                )}
            </div>
        </div>
    );
}

// ── Inline Styles ──
const S: Record<string, React.CSSProperties> = {
    root: { display: 'flex', flexDirection: 'column', gap: 0, height: '100%' },
    searchWrap: {
        display: 'flex', alignItems: 'center', gap: 8,
        margin: '8px 12px', padding: '6px 10px',
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 6,
    },
    searchInput: {
        flex: 1, background: 'none', border: 'none', outline: 'none',
        color: 'var(--text-primary, #e4e4e7)', fontSize: 12,
    },
    kitSelect: { margin: '0 12px', padding: '5px 8px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 4, color: '#ccc', fontSize: 11 },
    navList: { display: 'flex', flexDirection: 'column', gap: 1, padding: '4px 8px' },
    navItem: {
        display: 'flex', alignItems: 'center', padding: '7px 12px',
        background: 'none', border: 'none', borderRadius: 6,
        color: 'var(--text-secondary, #a1a1aa)', fontSize: 12, cursor: 'pointer',
        textAlign: 'left' as const, transition: 'all 0.15s',
    },
    navItemActive: {
        background: 'rgba(129,140,248,0.12)', color: 'var(--text-primary, #e4e4e7)', fontWeight: 500,
    },
    divider: { height: 1, background: 'rgba(255,255,255,0.06)', margin: '4px 12px' },
    content: { flex: 1, padding: '8px 12px', overflowY: 'auto' as const, display: 'flex', flexDirection: 'column', gap: 8 },
    // Assets
    dropZone: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '14px 8px', border: '1px dashed rgba(255,255,255,0.12)', borderRadius: 6, cursor: 'pointer', transition: 'border-color 0.2s' },
    dropZoneActive: { borderColor: '#818cf8', background: 'rgba(129,140,248,0.05)' },
    dropText: { fontSize: 11, color: 'var(--text-secondary, #a1a1aa)' },
    dropHint: { fontSize: 10, color: 'var(--text-muted, #71717a)' },
    noItems: { fontSize: 11, color: 'var(--text-muted, #71717a)', textAlign: 'center', padding: 12 },
    assetGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 },
    assetCard: { position: 'relative' as const, borderRadius: 6, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.06)', cursor: 'pointer', transition: 'border-color 0.15s' },
    assetImg: { width: '100%', height: 70, objectFit: 'cover' as const, display: 'block' },
    assetInfo: { padding: '4px 6px', display: 'flex', flexDirection: 'column' },
    assetName: { fontSize: 10, color: 'var(--text-primary, #e4e4e7)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const },
    assetMeta: { fontSize: 9, color: 'var(--text-muted, #71717a)' },
    assetDel: { position: 'absolute' as const, top: 4, right: 4, width: 18, height: 18, borderRadius: 9, background: 'rgba(0,0,0,0.6)', border: 'none', color: '#999', fontSize: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.6 },
    // Common
    sectionTitle: { fontSize: 12, fontWeight: 600, color: 'var(--text-primary, #e4e4e7)', margin: '0 0 8px 0' },
    empty: { padding: 24, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 },
    emptyTitle: { fontSize: 14, fontWeight: 600, color: 'var(--text-primary, #e4e4e7)', margin: 0 },
    emptyDesc: { fontSize: 11, color: 'var(--text-muted, #71717a)', margin: 0, lineHeight: 1.4 },
    createBtn: { marginTop: 8, padding: '8px 20px', background: 'var(--accent, #818cf8)', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' },
    // Colors
    colorSection: { display: 'flex', flexDirection: 'column' },
    colorGrid: { display: 'flex', flexDirection: 'column', gap: 8 },
    colorRow: { display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' },
    swatch: { width: 32, height: 32, borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', position: 'relative' as const, overflow: 'hidden', flexShrink: 0 },
    hiddenInput: { position: 'absolute' as const, opacity: 0, width: '100%', height: '100%', cursor: 'pointer' },
    colorInfo: { display: 'flex', flexDirection: 'column' },
    colorLabel: { fontSize: 12, color: 'var(--text-primary, #e4e4e7)', textTransform: 'capitalize' as const },
    colorHex: { fontSize: 10, color: 'var(--text-muted, #71717a)', fontFamily: 'monospace' },
    // Fonts
    fontSection: { display: 'flex', flexDirection: 'column', gap: 12 },
    fontRow: { display: 'flex', flexDirection: 'column', gap: 4 },
    fontLabel: { fontSize: 11, color: 'var(--text-secondary, #a1a1aa)', textTransform: 'capitalize' as const, fontWeight: 500 },
    fontInput: { padding: '5px 8px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 4, color: '#ccc', fontSize: 12 },
    fontPreview: { fontSize: 11, color: 'var(--text-muted, #71717a)', padding: '4px 0', fontStyle: 'italic' as const },
    // Guidelines
    guideSection: { display: 'flex', flexDirection: 'column', gap: 10 },
    guideRow: { display: 'flex', flexDirection: 'column', gap: 3 },
    guideLabel: { fontSize: 11, color: 'var(--text-secondary, #a1a1aa)', fontWeight: 500 },
    guideInput: { padding: '6px 8px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 4, color: '#ccc', fontSize: 12, width: '100%' },
    guideSelect: { padding: '6px 8px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 4, color: '#ccc', fontSize: 12, width: '100%' },
};
