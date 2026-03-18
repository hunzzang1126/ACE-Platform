// ─────────────────────────────────────────────────
// SidebarBrandTab — Compact brand kit panel for editor sidebar
// ─────────────────────────────────────────────────
// Accordion layout: Assets | Colors | Typography | Guidelines
// Click asset → add to canvas. Drag-drop upload supported.
// Reuses brandKitStore (same data as dashboard BrandCloudSection).
// ─────────────────────────────────────────────────

import { useState, useCallback, useRef } from 'react';
import { useBrandKitStore, type AssetCategory, type AssetFormat } from '@/stores/brandKitStore';
import type { CanvasEngineActions } from '@/hooks/canvasTypes';

interface Props {
    actions?: CanvasEngineActions | null;
}

const CATEGORIES: AssetCategory[] = ['logo', 'product', 'texture', 'icon', 'background', 'photo'];

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
    const [openSection, setOpenSection] = useState<'assets' | 'colors' | 'type' | 'guide'>('assets');
    const [filter, setFilter] = useState<AssetCategory | 'all'>('all');
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // ── Asset Upload (any file type/size) ──
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

    // ── Click asset → add to canvas ──
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

    const filteredAssets = kit
        ? kit.assets.filter(a => !a.deletedAt && (filter === 'all' || a.category === filter))
        : [];

    const toggle = (s: typeof openSection) => setOpenSection(prev => prev === s ? s : s);

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

    return (
        <div style={S.root}>
            {/* Kit selector (if multiple) */}
            {kits.length > 1 && (
                <select style={S.kitSelect} value={activeKitId ?? ''} onChange={e => setActiveKit(e.target.value || null)}>
                    {kits.map(k => <option key={k.id} value={k.id}>{k.name}</option>)}
                </select>
            )}

            {/* ═══ ASSETS SECTION ═══ */}
            <button style={S.sectionBtn} onClick={() => toggle('assets')}>
                <span>Assets</span>
                <span style={S.badge}>{filteredAssets.length}</span>
            </button>
            {openSection === 'assets' && (
                <div style={S.sectionBody}>
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

                    {/* Category filter */}
                    <div style={S.filters}>
                        <button style={filter === 'all' ? S.filterActive : S.filterBtn} onClick={() => setFilter('all')}>All</button>
                        {CATEGORIES.map(c => (
                            <button key={c} style={filter === c ? S.filterActive : S.filterBtn}
                                onClick={() => setFilter(c)}>{c}</button>
                        ))}
                    </div>

                    {/* Asset grid */}
                    {filteredAssets.length === 0 ? (
                        <p style={S.noAssets}>No assets yet</p>
                    ) : (
                        <div style={S.assetGrid}>
                            {filteredAssets.map(a => (
                                <div key={a.id} style={S.assetCard} onClick={() => handleAssetClick(a)} title={`${a.name} (${a.width}x${a.height}) — Click to add to canvas`}>
                                    <img src={a.thumbSrc || a.src} alt={a.name} style={S.assetImg} />
                                    <div style={S.assetInfo}>
                                        <span style={S.assetName}>{a.name}</span>
                                        <span style={S.assetMeta}>{a.category} · {formatBytes(a.sizeBytes)}</span>
                                    </div>
                                    <button style={S.assetDel} onClick={e => { e.stopPropagation(); removeAsset(kit!.id, a.id); }} title="Remove">x</button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ═══ COLORS SECTION ═══ */}
            <button style={S.sectionBtn} onClick={() => toggle('colors')}>Colors</button>
            {openSection === 'colors' && kit && (
                <div style={S.sectionBody}>
                    <div style={S.colorGrid}>
                        {(['primary', 'secondary', 'accent', 'background', 'text'] as const).map(key => (
                            <label key={key} style={S.colorRow}>
                                <div style={{ ...S.swatch, backgroundColor: kit.palette[key] }}>
                                    <input type="color" value={kit.palette[key]}
                                        onChange={e => updatePalette(kit.id, { [key]: e.target.value })}
                                        style={S.colorInput} />
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

            {/* ═══ TYPOGRAPHY SECTION ═══ */}
            <button style={S.sectionBtn} onClick={() => toggle('type')}>Typography</button>
            {openSection === 'type' && kit && (
                <div style={S.sectionBody}>
                    {(['heading', 'body', 'cta'] as const).map(role => (
                        <div key={role} style={S.typeRow}>
                            <span style={S.typeLabel}>{role}</span>
                            <input
                                style={S.typeInput}
                                value={kit.typography[role].family}
                                onChange={e => updateTypography(kit.id, { [role]: { ...kit.typography[role], family: e.target.value } })}
                                placeholder="Font family..."
                            />
                        </div>
                    ))}
                </div>
            )}

            {/* ═══ GUIDELINES SECTION ═══ */}
            <button style={S.sectionBtn} onClick={() => toggle('guide')}>Guidelines</button>
            {openSection === 'guide' && kit && (
                <div style={S.sectionBody}>
                    <input style={S.guideInput} value={kit.guidelines.name} placeholder="Brand name..."
                        onChange={e => updateGuidelines(kit.id, { name: e.target.value })} />
                    <input style={S.guideInput} value={kit.guidelines.tagline} placeholder="Tagline..."
                        onChange={e => updateGuidelines(kit.id, { tagline: e.target.value })} />
                    <select style={S.guideSelect} value={kit.guidelines.voiceTone}
                        onChange={e => updateGuidelines(kit.id, { voiceTone: e.target.value })}>
                        {['Professional', 'Friendly', 'Bold', 'Luxury', 'Playful', 'Technical'].map(t => (
                            <option key={t} value={t}>{t}</option>
                        ))}
                    </select>
                    <input style={S.guideInput} value={kit.guidelines.ctaPhrases.join(', ')} placeholder="CTA phrases (comma separated)..."
                        onChange={e => updateGuidelines(kit.id, { ctaPhrases: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })} />
                </div>
            )}
        </div>
    );
}

// ── Inline Styles (compact sidebar layout) ──

const S: Record<string, React.CSSProperties> = {
    root: { display: 'flex', flexDirection: 'column', gap: 0 },
    empty: { padding: 24, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 },
    emptyTitle: { fontSize: 14, fontWeight: 600, color: 'var(--text-primary, #e4e4e7)', margin: 0 },
    emptyDesc: { fontSize: 11, color: 'var(--text-muted, #71717a)', margin: 0, lineHeight: 1.4 },
    createBtn: { marginTop: 8, padding: '8px 20px', background: 'var(--accent, #818cf8)', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' },
    kitSelect: { margin: '8px 12px', padding: '5px 8px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 4, color: '#ccc', fontSize: 11 },
    sectionBtn: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '8px 12px', background: 'none', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.06)', color: 'var(--text-secondary, #a1a1aa)', fontSize: 11, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' as const, cursor: 'pointer' },
    badge: { background: 'rgba(255,255,255,0.08)', padding: '1px 6px', borderRadius: 8, fontSize: 10, color: 'var(--text-muted, #71717a)' },
    sectionBody: { padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 8 },
    dropZone: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '14px 8px', border: '1px dashed rgba(255,255,255,0.12)', borderRadius: 6, cursor: 'pointer', transition: 'border-color 0.2s' },
    dropZoneActive: { borderColor: '#818cf8', background: 'rgba(129,140,248,0.05)' },
    dropText: { fontSize: 11, color: 'var(--text-secondary, #a1a1aa)' },
    dropHint: { fontSize: 10, color: 'var(--text-muted, #71717a)' },
    filters: { display: 'flex', flexWrap: 'wrap' as const, gap: 4 },
    filterBtn: { padding: '2px 8px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 4, color: 'var(--text-muted, #71717a)', fontSize: 10, cursor: 'pointer' },
    filterActive: { padding: '2px 8px', background: 'rgba(129,140,248,0.15)', border: '1px solid rgba(129,140,248,0.3)', borderRadius: 4, color: '#818cf8', fontSize: 10, cursor: 'pointer' },
    noAssets: { fontSize: 11, color: 'var(--text-muted, #71717a)', textAlign: 'center', padding: 12 },
    assetGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 },
    assetCard: { position: 'relative' as const, borderRadius: 6, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.06)', cursor: 'pointer', transition: 'border-color 0.15s' },
    assetImg: { width: '100%', height: 70, objectFit: 'cover' as const, display: 'block' },
    assetInfo: { padding: '4px 6px', display: 'flex', flexDirection: 'column' },
    assetName: { fontSize: 10, color: 'var(--text-primary, #e4e4e7)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const },
    assetMeta: { fontSize: 9, color: 'var(--text-muted, #71717a)' },
    assetDel: { position: 'absolute' as const, top: 4, right: 4, width: 18, height: 18, borderRadius: 9, background: 'rgba(0,0,0,0.6)', border: 'none', color: '#999', fontSize: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.6 },
    colorGrid: { display: 'flex', flexDirection: 'column', gap: 6 },
    colorRow: { display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' },
    swatch: { width: 28, height: 28, borderRadius: 6, border: '1px solid rgba(255,255,255,0.1)', position: 'relative' as const, overflow: 'hidden', flexShrink: 0 },
    colorInput: { position: 'absolute' as const, opacity: 0, width: '100%', height: '100%', cursor: 'pointer' },
    colorInfo: { display: 'flex', flexDirection: 'column' },
    colorLabel: { fontSize: 11, color: 'var(--text-primary, #e4e4e7)', textTransform: 'capitalize' as const },
    colorHex: { fontSize: 10, color: 'var(--text-muted, #71717a)', fontFamily: 'monospace' },
    typeRow: { display: 'flex', alignItems: 'center', gap: 8 },
    typeLabel: { fontSize: 11, color: 'var(--text-secondary, #a1a1aa)', width: 58, textTransform: 'capitalize' as const, flexShrink: 0 },
    typeInput: { flex: 1, padding: '4px 8px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 4, color: '#ccc', fontSize: 11 },
    guideInput: { padding: '5px 8px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 4, color: '#ccc', fontSize: 11, width: '100%' },
    guideSelect: { padding: '5px 8px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 4, color: '#ccc', fontSize: 11, width: '100%' },
};
