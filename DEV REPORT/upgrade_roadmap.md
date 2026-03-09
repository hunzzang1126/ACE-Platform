# ACE Upgrade Plan v3 — Deep Implementation + Brand Kit Library Cloud

> "변태적일 정도로 디테일하게" — 함수 시그니처, 타입 계약, store 스키마, AI prompt 주입 지점, 데이터 흐름 전부.

---

## Current Architecture (What We Have)

```
userPrefs.ts (170L)
  ├── brandColors: { primary, secondary, background, text }  ← 4개 색상만
  ├── fonts: { heading, body }                                ← 2개 폰트만
  ├── frequentTexts: { text, role, count }[]                  ← 텍스트 패턴만
  └── learnBrandFromDesign() → 디자인 완료 후 자동 학습

autoDesignService.ts (543L)
  ├── detectPersonality(prompt) → 'financial' | 'sports' | ...
  ├── buildFromScratchPrompt() → 레이아웃 규칙 주입 (brand 연동 없음!)
  └── callFromScratch() → Claude tool_use with render_banner

⚠ 문제: 이미지/로고/에셋은 어디에도 저장되지 않음.
⚠ 문제: AI가 "이 브랜드의 로고를 넣어라"를 할 수 없음.
⚠ 문제: Vision Critic이 "브랜드 색상과 다르다"를 판단할 근거가 없음.
```

---

## NEW: Brand Kit Library Cloud

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                   BRAND KIT LIBRARY CLOUD                    │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │
│  │   ASSETS     │  │   PALETTE    │  │   TYPOGRAPHY │        │
│  │              │  │              │  │              │        │
│  │ · Logos (SVG) │  │ · Primary    │  │ · Heading    │        │
│  │ · Product IMG │  │ · Secondary  │  │ · Body       │        │
│  │ · Textures   │  │ · Background │  │ · CTA        │        │
│  │ · Icons      │  │ · Accent     │  │ · Caption    │        │
│  │ · Backgrounds│  │ · Gradient   │  │ · Brand Font │        │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘        │
│         │                  │                  │                │
│         ▼                  ▼                  ▼                │
│  ┌────────────────────────────────────────────────────┐      │
│  │              BRAND CONTEXT BUILDER                  │      │
│  │  → AI Planner에게 "이 회사의 에셋 목록" 전달         │      │
│  │  → AI Executor에게 "이 로고 URL·좌표" 전달           │      │
│  │  → AI Critic에게 "이 색상과 다르면 경고" 전달         │      │
│  └────────────────────────────────────────────────────┘      │
│                          │                                    │
│         ┌────────────────┼────────────────┐                  │
│         ▼                ▼                ▼                  │
│   [Planner Agent]  [Executor Agent]  [Critic Agent]          │
│   "Nike 로고 있음    "로고를 우측 상단   "로고가 빠졌다        │
│    1200x400 PNG,      에 배치, 크기      → generate 요청"     │
│    product shot 3장"   120x60"          "색상 #ff0000 ≠      │
│                                         brandKit #e60023     │
│                                         → fix patch"         │
└─────────────────────────────────────────────────────────────┘
```

### Competitor Learnings Applied

| Competitor | Feature | ACE Adaptation |
|---|---|---|
| **Penpot** | Component libraries with design tokens (colors, typography stored as reusable styles) | `BrandKit.palette` + `BrandKit.typography` = design tokens |
| **Penpot** | Asset buckets with deduplication + deferred deletion | `BrandAsset.hash` for dedup, soft delete |
| **OpenPencil** | `bind_variable` — design variables bound to elements | `BrandAsset.tag` + `BrandAsset.role` → AI binds assets to element roles |
| **OpenPencil** | `analyze_colors/typography` — design token extraction from existing designs | `brandKitStore.learnFromDesign()` — auto-tag brand assets from completed designs |
| **Jaaz** | ComfyUI local workflow for image processing | Asset preprocessing — auto-resize, background removal, format conversion |

---

### [NEW] `src/stores/brandKitStore.ts`

```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

// ── Asset Types ──

export type AssetCategory = 'logo' | 'product' | 'texture' | 'icon' | 'background' | 'photo';
export type AssetFormat = 'png' | 'svg' | 'jpg' | 'webp';

export interface BrandAsset {
  id: string;                    // uuid
  name: string;                  // "Nike Swoosh White"
  category: AssetCategory;
  tags: string[];                // ["nike", "swoosh", "white", "primary"]
  role?: string;                 // "primary_logo" | "secondary_logo" | "product_hero"
  src: string;                   // data URL or blob URL
  thumbSrc: string;              // 150px thumbnail (generated on upload)
  width: number;                 // original pixel width
  height: number;                // original pixel height
  format: AssetFormat;
  sizeBytes: number;
  hash: string;                  // SHA-256 for dedup (Penpot pattern)
  uploadedAt: string;            // ISO date
  usageCount: number;            // how many times used in designs
  isFavorite: boolean;           // starred for quick access
  deletedAt: string | null;      // soft delete (Penpot pattern)
  metadata: {
    hasTransparency: boolean;    // does it have alpha channel?
    dominantColors: string[];    // top 3 colors extracted from image
    suggestedPlacement: 'top-left' | 'top-right' | 'center' | 'bottom-center' | null;
  };
}

export interface BrandPalette {
  primary: string;       // "#e60023"
  secondary: string;     // "#1a1f2e"
  accent: string;        // "#ff6b35"
  background: string;    // "#0a0e1a"
  text: string;          // "#ffffff"
  gradients: {           // ← NEW: gradient presets
    start: string;
    end: string;
    angle: number;
    name: string;        // "Hero Gradient", "CTA Gradient"
  }[];
}

export interface BrandTypography {
  heading: {
    family: string;      // "Montserrat"
    weights: number[];   // [700, 800]
    letterSpacing: number;  // -0.5
  };
  body: {
    family: string;      // "Inter"
    weights: number[];   // [400, 500]
    letterSpacing: number;  // 0
  };
  cta: {
    family: string;      // "Inter"
    weights: number[];   // [600, 700]
    transform: 'uppercase' | 'none' | 'capitalize';
  };
}

export interface BrandGuidelines {
  name: string;          // "Nike" — brand name for AI context
  industry: string;      // "sports" — maps to detectPersonality
  voiceTone: string;     // "Bold, empowering, action-driven"
  tagline?: string;      // "Just Do It"
  ctaPhrases: string[];  // ["Shop Now", "Get Started", "Explore"]
  forbiddenColors: string[];  // colors that should NEVER be used
  forbiddenWords: string[];   // words to avoid in copy
  logoPlacementRules: string; // "Logo always top-right, min 60px from edges"
}

export interface BrandKit {
  id: string;
  name: string;              // "Nike Brand Kit"
  createdAt: string;
  updatedAt: string;
  assets: BrandAsset[];
  palette: BrandPalette;
  typography: BrandTypography;
  guidelines: BrandGuidelines;
}

// ── Store ──

interface BrandKitState {
  kits: BrandKit[];
  activeKitId: string | null;

  // ── CRUD ──
  createKit: (name: string) => string;          // returns kit id
  deleteKit: (id: string) => void;
  setActiveKit: (id: string | null) => void;
  getActiveKit: () => BrandKit | null;

  // ── Asset Management ──
  addAsset: (kitId: string, asset: Omit<BrandAsset, 'id' | 'uploadedAt' | 'usageCount' | 'isFavorite' | 'deletedAt'>) => string;
  removeAsset: (kitId: string, assetId: string) => void;   // soft delete
  permanentDeleteAsset: (kitId: string, assetId: string) => void;
  updateAsset: (kitId: string, assetId: string, updates: Partial<BrandAsset>) => void;
  toggleFavorite: (kitId: string, assetId: string) => void;
  incrementUsage: (kitId: string, assetId: string) => void;

  // ── Query ──
  getAssetsByCategory: (kitId: string, category: AssetCategory) => BrandAsset[];
  getAssetsByTag: (kitId: string, tag: string) => BrandAsset[];
  getAssetsByRole: (kitId: string, role: string) => BrandAsset[];
  getFavorites: (kitId: string) => BrandAsset[];
  findDuplicate: (kitId: string, hash: string) => BrandAsset | null;  // dedup

  // ── Palette ──
  updatePalette: (kitId: string, palette: Partial<BrandPalette>) => void;
  updateTypography: (kitId: string, typo: Partial<BrandTypography>) => void;
  updateGuidelines: (kitId: string, guidelines: Partial<BrandGuidelines>) => void;

  // ── AI Integration ──
  learnFromDesign: (elements: DesignElement[]) => void;  // auto-extract brand tokens
}

export const useBrandKitStore = create<BrandKitState>()(
  persist(
    immer((set, get) => ({
      kits: [],
      activeKitId: null,

      createKit: (name) => {
        const id = `bk-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        set(state => {
          state.kits.push({
            id, name,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            assets: [],
            palette: { primary: '#c9a84c', secondary: '#1a1f2e', accent: '#ff6b35',
                       background: '#0a0e1a', text: '#ffffff', gradients: [] },
            typography: {
              heading: { family: 'Inter', weights: [700, 800], letterSpacing: -0.5 },
              body: { family: 'Inter', weights: [400, 500], letterSpacing: 0 },
              cta: { family: 'Inter', weights: [600, 700], transform: 'uppercase' },
            },
            guidelines: {
              name, industry: 'lifestyle', voiceTone: 'Professional',
              ctaPhrases: ['Learn More', 'Get Started', 'Shop Now'],
              forbiddenColors: [], forbiddenWords: [],
              logoPlacementRules: 'Logo top-right, minimum 20px from edges',
            },
          });
        });
        return id;
      },

      addAsset: (kitId, assetData) => {
        const id = `asset-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        // ★ DEDUP CHECK (Penpot pattern)
        const existing = get().findDuplicate(kitId, assetData.hash);
        if (existing) return existing.id; // don't add duplicate

        set(state => {
          const kit = state.kits.find(k => k.id === kitId);
          if (!kit) return;
          kit.assets.push({
            ...assetData, id,
            uploadedAt: new Date().toISOString(),
            usageCount: 0, isFavorite: false, deletedAt: null,
          });
          kit.updatedAt = new Date().toISOString();
        });
        return id;
      },

      removeAsset: (kitId, assetId) => {
        // ★ SOFT DELETE (Penpot pattern)
        set(state => {
          const kit = state.kits.find(k => k.id === kitId);
          if (!kit) return;
          const asset = kit.assets.find(a => a.id === assetId);
          if (asset) asset.deletedAt = new Date().toISOString();
        });
      },

      // ... 나머지 구현
    })),
    { name: 'ace-brand-kits' }
  )
);
```

---

### [NEW] `src/services/brandContextBuilder.ts`

**핵심**: Brand Kit 데이터 → AI 에이전트의 system prompt에 주입

```typescript
import type { BrandKit, BrandAsset } from '@/stores/brandKitStore';

// ── Planner에게 주입할 Brand Context ──

export function buildBrandContextForPlanner(kit: BrandKit): string {
  const logos = kit.assets.filter(a => a.category === 'logo' && !a.deletedAt);
  const products = kit.assets.filter(a => a.category === 'product' && !a.deletedAt);
  const favorites = kit.assets.filter(a => a.isFavorite && !a.deletedAt);

  return `
═══════════════════════════════════════════
BRAND KIT: "${kit.guidelines.name}" (${kit.guidelines.industry})
═══════════════════════════════════════════

PALETTE:
  Primary: ${kit.palette.primary}
  Secondary: ${kit.palette.secondary}
  Accent: ${kit.palette.accent}
  Background: ${kit.palette.background}
  Text: ${kit.palette.text}
${kit.palette.gradients.map(g => `  Gradient "${g.name}": ${g.start} → ${g.end} (${g.angle}°)`).join('\n')}

TYPOGRAPHY:
  Heading: "${kit.typography.heading.family}" weight ${kit.typography.heading.weights.join('/')}
  Body: "${kit.typography.body.family}" weight ${kit.typography.body.weights.join('/')}
  CTA: "${kit.typography.cta.family}" ${kit.typography.cta.transform}

AVAILABLE LOGOS (${logos.length}):
${logos.map(l => `  · "${l.name}" — ${l.width}×${l.height} ${l.format} ${l.role ? `[${l.role}]` : ''} ${l.isFavorite ? '★' : ''}`).join('\n') || '  (none uploaded)'}

PRODUCT IMAGES (${products.length}):
${products.map(p => `  · "${p.name}" — ${p.width}×${p.height} ${p.tags.join(', ')}`).join('\n') || '  (none uploaded)'}

FAVORITE ASSETS (${favorites.length}):
${favorites.map(f => `  · "${f.name}" [${f.category}] — used ${f.usageCount} times`).join('\n') || '  (none starred)'}

BRAND VOICE: ${kit.guidelines.voiceTone}
${kit.guidelines.tagline ? `TAGLINE: "${kit.guidelines.tagline}"` : ''}
CTA PHRASES: ${kit.guidelines.ctaPhrases.join(', ')}
LOGO RULES: ${kit.guidelines.logoPlacementRules}
${kit.guidelines.forbiddenColors.length ? `FORBIDDEN COLORS: ${kit.guidelines.forbiddenColors.join(', ')}` : ''}
${kit.guidelines.forbiddenWords.length ? `FORBIDDEN WORDS: ${kit.guidelines.forbiddenWords.join(', ')}` : ''}

INSTRUCTIONS FOR PLANNER:
- ALWAYS use brand palette colors. Do NOT invent new colors.
- If logos are available, INCLUDE the primary logo in the layout plan.
- Product images should be placed in hero zones (LAYOUT_ZONES.image).
- CTA text must come from ctaPhrases list unless user specifies otherwise.
- Respect logoPlacementRules for logo positioning.
`;
}

// ── Executor에게 주입할 Asset References ──

export function buildAssetReferencesForExecutor(kit: BrandKit): AssetReference[] {
  return kit.assets
    .filter(a => !a.deletedAt)
    .map(a => ({
      id: a.id,
      name: a.name,
      category: a.category,
      role: a.role ?? null,
      src: a.src,              // ← Executor가 createImage로 삽입할 때 사용
      width: a.width,
      height: a.height,
      suggestedPlacement: a.metadata.suggestedPlacement,
    }));
}

// ── Critic에게 주입할 Brand Compliance Rules ──

export function buildBrandComplianceForCritic(kit: BrandKit): BrandComplianceRules {
  return {
    allowedColors: [
      kit.palette.primary, kit.palette.secondary,
      kit.palette.accent, kit.palette.background,
      kit.palette.text,
      ...kit.palette.gradients.flatMap(g => [g.start, g.end]),
    ],
    forbiddenColors: kit.guidelines.forbiddenColors,
    requiredAssets: kit.assets
      .filter(a => a.role === 'primary_logo' && !a.deletedAt)
      .map(a => a.name),  // "primary logo must be present"
    fontFamilies: [
      kit.typography.heading.family,
      kit.typography.body.family,
      kit.typography.cta.family,
    ],
    logoPlacementRules: kit.guidelines.logoPlacementRules,
  };
}

interface BrandComplianceRules {
  allowedColors: string[];
  forbiddenColors: string[];
  requiredAssets: string[];       // assets that MUST be in the final design
  fontFamilies: string[];
  logoPlacementRules: string;
}
```

---

### [NEW] `src/services/assetProcessor.ts`

**Asset Upload Pipeline** — 업로드 시 자동 처리

```typescript
export async function processUploadedAsset(
  file: File
): Promise<ProcessedAsset> {
  // 1. Read file → base64 / blob URL
  const dataUrl = await readFileAsDataUrl(file);

  // 2. Get dimensions
  const { width, height } = await getImageDimensions(dataUrl);

  // 3. Generate thumbnail (150px wide)
  const thumbSrc = await generateThumbnail(dataUrl, 150);

  // 4. Compute SHA-256 hash (Penpot dedup pattern)
  const hash = await computeHash(file);

  // 5. Extract dominant colors (for AI context)
  const dominantColors = await extractDominantColors(dataUrl, 3);

  // 6. Detect transparency
  const hasTransparency = await detectAlphaChannel(dataUrl);

  // 7. Auto-suggest placement based on aspect ratio
  const ratio = width / height;
  let suggestedPlacement: BrandAsset['metadata']['suggestedPlacement'] = null;
  if (ratio > 3) suggestedPlacement = 'top-center';     // wide banner/logo
  else if (ratio < 0.5) suggestedPlacement = 'center';  // tall product shot
  else if (width < 200 && height < 200) suggestedPlacement = 'top-right'; // icon/small logo

  // 8. Auto-categorize
  const category = autoDetectCategory(file.name, width, height, hasTransparency);

  return {
    src: dataUrl,
    thumbSrc,
    width, height,
    format: file.type.split('/')[1] as AssetFormat,
    sizeBytes: file.size,
    hash,
    metadata: { hasTransparency, dominantColors, suggestedPlacement },
    category,
  };
}

function autoDetectCategory(name: string, w: number, h: number, hasAlpha: boolean): AssetCategory {
  const n = name.toLowerCase();
  if (n.includes('logo') || (hasAlpha && w < 500 && h < 500)) return 'logo';
  if (n.includes('product') || n.includes('item')) return 'product';
  if (n.includes('icon') || (w < 128 && h < 128)) return 'icon';
  if (n.includes('texture') || n.includes('pattern')) return 'texture';
  if (n.includes('bg') || n.includes('background')) return 'background';
  return 'photo';
}

// ── Image utility functions ──

async function readFileAsDataUrl(file: File): Promise<string> { ... }
async function getImageDimensions(src: string): Promise<{width: number; height: number}> { ... }
async function generateThumbnail(src: string, maxWidth: number): Promise<string> { ... }
async function computeHash(file: File): Promise<string> { ... }
async function extractDominantColors(src: string, count: number): Promise<string[]> { ... }
async function detectAlphaChannel(src: string): Promise<boolean> { ... }
```

---

### Integration Points (기존 코드 수정)

#### [MODIFY] `src/services/autoDesignService.ts` — Brand Kit 주입

```typescript
// 현재 (line 244-348): buildFromScratchPrompt에 personality만 주입
// 수정: brandContextBuilder로 Brand Kit Context도 주입

function buildFromScratchPrompt(
  canvasW: number, canvasH: number, userPrompt: string,
  brandKit: BrandKit | null,  // ← NEW parameter
): string {
  const ratio = classifyRatio(canvasW, canvasH);
  const zones = LAYOUT_ZONES[ratio];
  const personality = brandKit
    ? brandKit.guidelines.industry as DesignPersonality  // brand kit이 personality 대체
    : detectPersonality(userPrompt);
  const personalityRule = PERSONALITY_RULES[personality];

  // ★ NEW: Brand Kit context 주입
  const brandContext = brandKit
    ? buildBrandContextForPlanner(brandKit)
    : '';

  return `You are a senior banner ad designer...
${personalityRule}
${brandContext}
...rest of prompt`;
}
```

#### [MODIFY] `src/services/agents/criticAgent.ts` — Brand Compliance Check

```typescript
// Critic의 checklist에 brand compliance 추가
const checkList = [
  'overlap', 'clipping', 'contrast', 'hierarchy',
  'brand_color_compliance',    // ← NEW: 사용된 색상이 brandKit.palette와 일치?
  'logo_presence',             // ← NEW: primary logo가 포함되었는가?
  'logo_placement',            // ← NEW: logoPlacementRules 준수?
  'font_compliance',           // ← NEW: 허용된 폰트만 사용?
  'forbidden_color_violation', // ← NEW: 금지 색상 사용했는가?
  'background_quality',
  'asset_completeness',
];
```

#### [MODIFY] `src/services/tools/createTools.ts` — Brand Asset 삽입

```typescript
// createImage tool이 Brand Kit asset을 직접 참조
export const createImageFromBrandKit: AceTool = {
  name: 'create_image_from_brand_kit',
  category: 'create',
  description: 'Place a brand kit asset (logo, product image) on canvas',
  inputSchema: {
    properties: {
      assetId: { type: 'string', description: 'ID from brand kit assets list' },
      x: { type: 'number' }, y: { type: 'number' },
      w: { type: 'number' }, h: { type: 'number' },
    },
    required: ['assetId'],
  },
  execute: ({ assetId, x, y, w, h }, ctx) => {
    const kit = useBrandKitStore.getState().getActiveKit();
    if (!kit) return { success: false, message: 'No active brand kit' };

    const asset = kit.assets.find(a => a.id === assetId);
    if (!asset) return { success: false, message: `Asset ${assetId} not found` };

    // Place on canvas using asset's actual data
    ctx.designStore.getState().addElement({
      type: 'image',
      src: asset.src,
      name: asset.name,
      constraints: absoluteToConstraints(
        x ?? 0, y ?? 0,
        w ?? asset.width, h ?? asset.height,
        ctx.canvasW, ctx.canvasH
      ),
      zIndex: ctx.designStore.getState().getMaxZIndex() + 1,
    });

    // ★ Track usage (for AI learning)
    useBrandKitStore.getState().incrementUsage(kit.id, assetId);

    return {
      success: true,
      message: `Placed "${asset.name}" (${asset.category}) at (${x},${y})`,
      data: { assetId, assetName: asset.name },
    };
  }
};
```

#### [MODIFY] `src/services/tools/generateTools.ts` — Brand-Constrained Generation

```typescript
// AI 이미지 생성 시 brand palette를 constraint로 전달
export const generateBackground: AceTool = {
  execute: async ({ prompt, style, width, height }, ctx) => {
    const kit = useBrandKitStore.getState().getActiveKit();

    // ★ Brand Kit이 있으면 색상 제약 조건 추가
    const brandConstraint = kit
      ? `Color palette constraint: use only ${kit.palette.primary}, ${kit.palette.secondary}, ${kit.palette.background}. Style: ${kit.guidelines.voiceTone}`
      : '';

    const fullPrompt = `${prompt}, ${style} style, ${brandConstraint}, banner background, ${width}x${height}`;

    const imageUrl = await callImageGeneration(selectModel('image-gen'), {
      prompt: fullPrompt, width, height,
    });

    // ... rest of execution
  }
};
```

#### [MODIFY] `src/hooks/useAutoDesign.ts` — Brand Kit 전달

```typescript
// generate() 함수에서 Brand Kit을 전체 파이프라인에 전달
const generate = async (prompt: string) => {
  const brandKit = useBrandKitStore.getState().getActiveKit();  // ← NEW

  // Phase 1이 완성되면:
  await runAgentPipeline(prompt, {
    ...toolCtx,
    brandKit,  // ← Planner/Executor/Critic 모두에게 전달
  }, onProgress, signal);
};
```

---

## Complete Phase Architecture (Updated)

### Phase 0: Brand Kit Foundation (1 week) — NEW!

| File | Type | What |
|---|---|---|
| `src/stores/brandKitStore.ts` | NEW | Zustand store: assets, palette, typography, guidelines |
| `src/services/brandContextBuilder.ts` | NEW | Kit → AI prompt context (planner/executor/critic) |
| `src/services/assetProcessor.ts` | NEW | Upload pipeline (hash, thumbnail, dominant colors, auto-categorize) |
| `src/components/panels/BrandKitPanel.tsx` | NEW | UI: asset grid, upload, palette editor, tag editor |
| `src/stores/brandKitStore.test.ts` | NEW | 25+ tests: CRUD, dedup, soft delete, query |

### Phase 1: Tool Registry + Scene Graph (2 weeks)

| File | Type | What |
|---|---|---|
| `src/services/tools/toolTypes.ts` | NEW | `AceTool`, `ToolContext` (now includes `brandKit`) |
| `src/services/tools/readTools.ts` | NEW | 5 tools: getPageTree, getNode, findNodes, getSelection, getBounds |
| `src/services/tools/createTools.ts` | NEW | 6 tools: createShape, createText, createImage, **createImageFromBrandKit**, createGroup, duplicateNode |
| `src/services/tools/modifyTools.ts` | NEW | 8 tools: setFill, setStroke, setFont, setText, moveNode, resizeNode, setOpacity, setZIndex |
| `src/services/tools/structureTools.ts` | NEW | 4 tools: deleteNode, renameNode, groupNodes, reparentNode |
| `src/services/tools/analyzeTools.ts` | NEW | 5 tools: analyzeColors, analyzeTypography, analyzeSpacing, **analyzeBrandCompliance**, analyzeClusters |
| `src/services/tools/sizingTools.ts` | NEW | 4 tools: addVariant, propagateToAll, smartResize, getVariantList |
| `src/services/tools/exportTools.ts` | NEW | 3 tools: exportPNG, exportSVG, exportAllVariants |
| `src/services/toolRegistry.ts` | NEW | ALL_TOOLS registry, getToolSchemas(), executeTool() |
| `src/services/sceneGraphBuilder.ts` | NEW | buildSceneGraph(): hierarchy + relationships + tokens |
| `src/services/designTokenAnalyzer.ts` | NEW | analyzeColors/Typography/Spacing from elements |
| `src/services/autoDesignService.ts` | MODIFY | Brand Kit context injection into prompts |

### Phase 2: 3-Agent Chain + Image Generation (3 weeks)

| File | Type | What |
|---|---|---|
| `src/services/agents/agentTypes.ts` | NEW | AgentMessage, AgentStep, PipelineResult |
| `src/services/agents/plannerAgent.ts` | NEW | runPlanner (brand kit + scene graph → DesignPlan) |
| `src/services/agents/executorAgent.ts` | NEW | runExecutor (40+ tools, createImageFromBrandKit) |
| `src/services/agents/criticAgent.ts` | NEW | runCritic (vision + **brand compliance** check) |
| `src/services/tools/generateTools.ts` | NEW | 3 tools: generateBackground (brand-constrained), generateProductImage, generateTexture |
| `src/services/imageGenClient.ts` | NEW | callImageGeneration (Flux/DALL-E/Midjourney) |
| `src/services/llmContextBuilder.ts` | NEW | JSON elements → natural language (PenAI pattern) |
| `src/schema/designPlan.types.ts` | NEW | DesignPlan, PlannedElement |
| `src/services/autoDesignLoop.ts` | MODIFY | runVisionLoop → runAgentPipeline |
| `src/hooks/useAutoDesign.ts` | MODIFY | Pass brandKit to entire pipeline |

### Phase 3: Model Router + Layout Intelligence (4 weeks)

| File | Type | What |
|---|---|---|
| `src/services/modelRouter.ts` | NEW | selectModel by task type |
| `src/services/openRouterClient.ts` | NEW | OpenRouter API (50+ LLMs) |
| `src/engine/layoutIntelligence.ts` | NEW | Industry-specific layout rules |
| `src/engine/smartSizing.ts` | MODIFY | INDUSTRY_MODIFIERS |
| `src/hooks/useAutoDesign.ts` | MODIFY | Semantic auto-naming |

---

## Data Flow (End-to-End)

```
User uploads logo.png
  → assetProcessor.processUploadedAsset(file)
    → hash, thumbnail, dominantColors, autoCategory='logo'
  → brandKitStore.addAsset(kitId, processed)
    → dedup check (hash exists?) → skip or add
    → persist to localStorage

User types "Make a Nike Black Friday banner"
  → useAutoDesign.generate(prompt)
    → brandKit = useBrandKitStore.getActiveKit()
    → sceneGraph = buildSceneGraph(currentVariant)
    → brandContext = buildBrandContextForPlanner(brandKit)

  → runPlanner(prompt, sceneGraph, brandKit)
    → system prompt includes:
      · LAYOUT_ZONES for 300x250
      · Brand palette (#e60023, #1a1f2e, ...)
      · Available logos ("Nike Swoosh White — 400x200 PNG [primary_logo]")
      · Product images ("Air Max 90 — 800x600 [product_hero]")
      · CTA phrases ["Shop Now", "Get Started"]
      · Logo placement rules
    → outputs: DesignPlan {
        elements: [
          { role: 'background', type: 'gradient', colors: ['#0a0e1a', '#1a2e4a'] },
          { role: 'logo', type: 'brand_asset', assetId: 'asset-xxx', placement: 'top-right' },
          { role: 'product', type: 'brand_asset', assetId: 'asset-yyy', placement: 'center' },
          { role: 'headline', type: 'text', content: 'BLACK FRIDAY', ... },
          { role: 'cta', type: 'button', text: 'SHOP NOW', ... },
        ]
      }

  → runExecutor(plan, toolCtx)
    → tool calls:
      1. createShape('rect', { gradient: ['#0a0e1a', '#1a2e4a'] })  // background
      2. createImageFromBrandKit('asset-xxx', { x: 220, y: 10 })    // Nike logo
      3. createImageFromBrandKit('asset-yyy', { x: 50, y: 40 })     // product
      4. createText('BLACK FRIDAY', { font: 'Montserrat', size: 30 }) // headline
      5. createShape('rounded_rect', { fill: '#e60023', ... })        // CTA button
      6. createText('SHOP NOW', { font: 'Inter', transform: 'uppercase' }) // CTA label

  → runCritic(screenshot, sceneGraph, brandKit)
    → checks:
      · ✅ Colors match palette (#e60023, #0a0e1a, #1a2e4a)
      · ✅ Logo present and in top-right
      · ✅ Product image visible
      · ❌ Headline overlaps product image → fix patch
      · ❌ Background too plain → generateRequests: [generate_background]
    → if not pass:
      → Executor applies fix patches
      → generateBackground called with brand palette constraint
      → Critic re-checks until pass

  → Final: branded banner with Nike assets, correct colors, proper layout
```

---

## Verification Plan

```bash
# Phase 0 (Brand Kit)
npm test                    # brandKitStore.test.ts (25+ tests)
                            # - createKit, addAsset, removeAsset (soft), permanentDelete
                            # - dedup (same hash rejected)
                            # - getByCategory, getByTag, getByRole
                            # - toggleFavorite, incrementUsage
                            # - palette/typography/guidelines CRUD
                            # - learnFromDesign auto-extraction

# Phase 1 (Tools + Scene Graph)
npm test                    # 170+ tests total
npx tsc --noEmit            # 0 type errors

# Phase 2 (Agents + Image Gen)
npm test                    # 200+ tests total
npm run test:e2e            # AI chat flow with brand kit

# Phase 3 (Router + Layout)
npm run test:coverage       # 50%+ statement coverage
```
