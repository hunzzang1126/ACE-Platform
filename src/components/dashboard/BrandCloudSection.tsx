// ─────────────────────────────────────────────────
// BrandCloudSection — Dashboard Brand Kit Manager
// ─────────────────────────────────────────────────
// Manages brand kits: assets, palette, typography, guidelines.
// Accessible from dashboard "Brand Cloud" tab (Pro+ only).
// ─────────────────────────────────────────────────

import { useState, useCallback, useRef } from 'react';
import { useBrandKitStore, type AssetCategory, type BrandKit } from '@/stores/brandKitStore';

const ASSET_CATEGORIES: AssetCategory[] = ['logo', 'product', 'texture', 'icon', 'background', 'photo'];

export function BrandCloudSection() {
    const {
        kits, activeKitId, createKit, deleteKit, setActiveKit, getActiveKit,
        addAsset, removeAsset, updatePalette, updateTypography, updateGuidelines,
        getAssetsByCategory,
    } = useBrandKitStore();
    const kit = getActiveKit();
    const [newKitName, setNewKitName] = useState('');
    const [assetFilter, setAssetFilter] = useState<AssetCategory | 'all'>('all');
    const fileInputRef = useRef<HTMLInputElement>(null);

    // ── Kit Management ──

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
                // Generate thumbnail (resize to 150px)
                const thumbnail = await generateThumbnail(src, 150);
                const hash = await hashString(src.slice(0, 2000));
                const img = new Image();
                img.src = src;
                await new Promise(r => { img.onload = r; });
                addAsset(activeKitId, {
                    name: file.name.replace(/\.[^.]+$/, ''),
                    category: guessCategory(file.name),
                    tags: [],
                    role: null,
                    src,
                    thumbSrc: thumbnail,
                    width: img.naturalWidth,
                    height: img.naturalHeight,
                    format: file.type.split('/')[1] as any,
                    sizeBytes: file.size,
                    hash,
                    metadata: {
                        hasTransparency: file.type === 'image/png',
                        dominantColors: [],
                        suggestedPlacement: null,
                    },
                });
            };
            reader.readAsDataURL(file);
        }
    }, [activeKitId, addAsset]);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        if (e.dataTransfer.files.length) handleFileUpload(e.dataTransfer.files);
    }, [handleFileUpload]);

    const filteredAssets = kit
        ? (assetFilter === 'all'
            ? kit.assets.filter(a => !a.deletedAt)
            : getAssetsByCategory(kit.id, assetFilter))
        : [];

    // ── No kits yet ──

    if (kits.length === 0) {
        return (
            <div style={S.emptyState}>
                <div style={S.emptyIcon}>
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.3">
                        <circle cx="12" cy="12" r="10" /><path d="M8 14s1.5 2 4 2 4-2 4-2" /><line x1="9" y1="9" x2="9.01" y2="9" /><line x1="15" y1="9" x2="15.01" y2="9" />
                    </svg>
                </div>
                <p style={{ color: '#94a3b8', fontSize: 14, margin: '12px 0 20px' }}>
                    Create a brand kit to manage your assets, colors, and guidelines
                </p>
                <div style={{ display: 'flex', gap: 8 }}>
                    <input
                        style={S.input}
                        placeholder="Brand kit name..."
                        value={newKitName}
                        onChange={e => setNewKitName(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleCreateKit()}
                    />
                    <button style={S.primaryBtn} onClick={handleCreateKit}>
                        Create Kit
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div style={{ padding: '0 24px' }}>
            {/* Kit Selector */}
            <div style={S.kitSelector}>
                <select
                    style={S.select}
                    value={activeKitId ?? ''}
                    onChange={e => setActiveKit(e.target.value || null)}
                >
                    {kits.map(k => (
                        <option key={k.id} value={k.id}>{k.name}</option>
                    ))}
                </select>
                <input
                    style={{ ...S.input, width: 160 }}
                    placeholder="New kit name..."
                    value={newKitName}
                    onChange={e => setNewKitName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleCreateKit()}
                />
                <button style={S.smallBtn} onClick={handleCreateKit}>+ New</button>
                {activeKitId && (
                    <button
                        style={{ ...S.smallBtn, borderColor: 'rgba(239,68,68,0.3)', color: '#ef4444' }}
                        onClick={() => { deleteKit(activeKitId); setActiveKit(kits[0]?.id ?? null); }}
                    >
                        Delete
                    </button>
                )}
            </div>

            {kit && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                    {/* Left Column: Assets */}
                    <div>
                        <h3 style={S.sectionTitle}>Assets</h3>
                        {/* Upload Zone */}
                        <div
                            style={S.dropZone}
                            onDrop={handleDrop}
                            onDragOver={e => e.preventDefault()}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="1.5" strokeLinecap="round">
                                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
                            </svg>
                            <span style={{ color: '#64748b', fontSize: 12 }}>Drop images or click to upload</span>
                        </div>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            multiple
                            style={{ display: 'none' }}
                            onChange={e => e.target.files && handleFileUpload(e.target.files)}
                        />

                        {/* Category Filter */}
                        <div style={{ display: 'flex', gap: 4, margin: '10px 0', flexWrap: 'wrap' }}>
                            <FilterTab label="All" active={assetFilter === 'all'} onClick={() => setAssetFilter('all')} />
                            {ASSET_CATEGORIES.map(cat => (
                                <FilterTab key={cat} label={cat} active={assetFilter === cat} onClick={() => setAssetFilter(cat)} />
                            ))}
                        </div>

                        {/* Asset Grid */}
                        <div style={S.assetGrid}>
                            {filteredAssets.length === 0 ? (
                                <p style={{ color: '#555', fontSize: 11, gridColumn: '1 / -1', textAlign: 'center', padding: 20 }}>
                                    No assets yet — upload logos, product images, or textures
                                </p>
                            ) : filteredAssets.map(a => (
                                <div key={a.id} style={S.assetCard}>
                                    <img src={a.thumbSrc || a.src} alt={a.name} style={S.assetImg} />
                                    <span style={S.assetName}>{a.name}</span>
                                    <span style={S.assetMeta}>{a.category} · {a.width}x{a.height}</span>
                                    <button
                                        style={S.deleteAssetBtn}
                                        onClick={() => removeAsset(kit.id, a.id)}
                                        title="Remove asset"
                                    >x</button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Right Column: Palette + Typography + Guidelines */}
                    <div>
                        {/* Palette */}
                        <h3 style={S.sectionTitle}>Palette</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 20 }}>
                            {(['primary', 'secondary', 'accent', 'background', 'text'] as const).map(key => (
                                <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <input
                                        type="color"
                                        value={kit.palette[key]}
                                        onChange={e => updatePalette(kit.id, { [key]: e.target.value })}
                                        style={S.colorInput}
                                    />
                                    <div>
                                        <div style={{ fontSize: 11, color: '#ccc', textTransform: 'capitalize' }}>{key}</div>
                                        <div style={{ fontSize: 9, color: '#555', fontFamily: 'monospace' }}>{kit.palette[key]}</div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Typography */}
                        <h3 style={S.sectionTitle}>Typography</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
                            {(['heading', 'body', 'cta'] as const).map(role => (
                                <div key={role} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <span style={{ fontSize: 11, color: '#888', width: 60, textTransform: 'capitalize' }}>{role}</span>
                                    <input
                                        style={{ ...S.input, flex: 1 }}
                                        value={kit.typography[role].family}
                                        onChange={e => updateTypography(kit.id, { [role]: { ...kit.typography[role], family: e.target.value } })}
                                        placeholder="Font family..."
                                    />
                                </div>
                            ))}
                        </div>

                        {/* Guidelines */}
                        <h3 style={S.sectionTitle}>Guidelines</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <input
                                style={S.input}
                                placeholder="Brand name..."
                                value={kit.guidelines.name}
                                onChange={e => updateGuidelines(kit.id, { name: e.target.value })}
                            />
                            <input
                                style={S.input}
                                placeholder="Tagline..."
                                value={kit.guidelines.tagline}
                                onChange={e => updateGuidelines(kit.id, { tagline: e.target.value })}
                            />
                            <select
                                style={S.select}
                                value={kit.guidelines.voiceTone}
                                onChange={e => updateGuidelines(kit.id, { voiceTone: e.target.value })}
                            >
                                {['Professional', 'Friendly', 'Bold', 'Luxury', 'Playful', 'Technical'].map(t => (
                                    <option key={t} value={t}>{t}</option>
                                ))}
                            </select>
                            <input
                                style={S.input}
                                placeholder="CTA phrases (comma separated)..."
                                value={kit.guidelines.ctaPhrases.join(', ')}
                                onChange={e => updateGuidelines(kit.id, {
                                    ctaPhrases: e.target.value.split(',').map(s => s.trim()).filter(Boolean),
                                })}
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ── Sub-components ──

function FilterTab({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            style={{
                padding: '3px 10px', borderRadius: 4, fontSize: 10, fontWeight: 500,
                cursor: 'pointer', textTransform: 'capitalize', transition: 'all 0.15s',
                background: active ? 'rgba(129,140,248,0.15)' : 'transparent',
                border: `1px solid ${active ? 'rgba(129,140,248,0.4)' : 'rgba(255,255,255,0.06)'}`,
                color: active ? '#818cf8' : '#888',
            }}
        >
            {label}
        </button>
    );
}

// ── Helpers ──

function guessCategory(filename: string): AssetCategory {
    const lower = filename.toLowerCase();
    if (lower.includes('logo')) return 'logo';
    if (lower.includes('icon')) return 'icon';
    if (lower.includes('bg') || lower.includes('background')) return 'background';
    if (lower.includes('texture') || lower.includes('pattern')) return 'texture';
    if (lower.includes('product')) return 'product';
    return 'photo';
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

// ── Styles ──

const S = {
    emptyState: {
        display: 'flex', flexDirection: 'column' as const, alignItems: 'center',
        justifyContent: 'center', padding: '60px 20px', textAlign: 'center' as const,
    },
    emptyIcon: { opacity: 0.5 },
    primaryBtn: {
        padding: '8px 20px', borderRadius: 8, border: 'none', fontSize: 13, fontWeight: 600,
        cursor: 'pointer', background: 'linear-gradient(135deg, #818cf8, #6366f1)', color: '#fff',
        transition: 'all 0.2s',
    },
    input: {
        padding: '8px 12px', borderRadius: 8, fontSize: 12, color: '#e5e5e7',
        background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
        outline: 'none', fontFamily: 'inherit',
    } as React.CSSProperties,
    kitSelector: {
        display: 'flex', gap: 8, alignItems: 'center', marginBottom: 20, flexWrap: 'wrap' as const,
    },
    select: {
        padding: '8px 12px', borderRadius: 8, fontSize: 12, color: '#e5e5e7',
        background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
        outline: 'none', cursor: 'pointer', fontFamily: 'inherit',
    } as React.CSSProperties,
    smallBtn: {
        padding: '6px 14px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.1)',
        background: 'none', color: '#ccc', fontSize: 11, fontWeight: 600,
        cursor: 'pointer', transition: 'all 0.15s',
    } as React.CSSProperties,
    sectionTitle: {
        fontSize: 11, fontWeight: 600, color: '#86868b', letterSpacing: '0.08em',
        textTransform: 'uppercase' as const, margin: '0 0 10px',
    },
    dropZone: {
        display: 'flex', flexDirection: 'column' as const, alignItems: 'center', justifyContent: 'center',
        gap: 8, padding: '24px 16px', borderRadius: 10,
        border: '2px dashed rgba(255,255,255,0.08)', cursor: 'pointer',
        transition: 'border-color 0.2s',
    },
    assetGrid: {
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8,
    },
    assetCard: {
        position: 'relative' as const, borderRadius: 8, overflow: 'hidden',
        background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
    },
    assetImg: {
        width: '100%', height: 80, objectFit: 'cover' as const, display: 'block',
    },
    assetName: {
        display: 'block', padding: '4px 6px 0', fontSize: 10, fontWeight: 500,
        color: '#ccc', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const,
    },
    assetMeta: {
        display: 'block', padding: '0 6px 4px', fontSize: 8, color: '#666',
    },
    deleteAssetBtn: {
        position: 'absolute' as const, top: 4, right: 4,
        background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
        border: 'none', color: '#ef4444', fontSize: 10, borderRadius: 4,
        cursor: 'pointer', padding: '1px 5px', opacity: 0.7,
    },
    colorInput: {
        width: 28, height: 28, padding: 0, border: 'none',
        borderRadius: 6, cursor: 'pointer', background: 'none',
    } as React.CSSProperties,
};
