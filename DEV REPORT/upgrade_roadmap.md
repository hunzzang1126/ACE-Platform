# ACE Upgrade Plan v2 — Deep Implementation

> User feedback: v1은 겉핥기. 이번엔 **실제 타입, 함수 시그니처, 기존 코드 연결 지점** 까지.

---

## Current Architecture (What We're Upgrading FROM)

```
useAutoDesign.ts (hook — UI 진입점)
  ├── readCanvasElements(engine) → CanvasElementInfo[]
  ├── callAutoDesign(prompt, config) → FromScratchResult | AssetContextResult
  │     └── autoDesignService.ts — Claude tool_use with 2 tools:
  │           ├── render_banner → RenderElement[]
  │           └── rearrange_banner → RearrangePatch[] + RenderElement[]
  ├── renderElement(engine, el) → canvas에 도형/텍스트 추가
  └── runVisionLoop(engine) → VisionLoopResult
        └── autoDesignLoop.ts — MAX_PASSES=3, PASS_SCORE=82
              └── visionService.ts — callVisionCheck(screenshot) → VisionResult
```

**Problem**: AI가 2개 tool만 쓸 수 있고, 디자인 구조를 모르고, 단일 LLM 호출.

---

## Phase 1: Tool Registry + Scene Graph (2 weeks)

### 1-1. Tool Interface Contract

#### [NEW] `src/services/tools/toolTypes.ts`

```typescript
// 모든 tool의 공통 인터페이스
export interface AceTool {
  name: string;
  category: ToolCategory;
  description: string;
  inputSchema: Record<string, unknown>;  // Claude tool_use schema
  execute: (params: unknown, ctx: ToolContext) => ToolResult;
}

export type ToolCategory =
  | 'read' | 'create' | 'modify' | 'structure'
  | 'analyze' | 'sizing' | 'export' | 'generate';
//                                       ↑ NEW: 이미지 생성 카테고리

export interface ToolContext {
  designStore: typeof useDesignStore;
  editorStore: typeof useEditorStore;
  canvasEngine: Engine | null;        // PixiJS 엔진 참조
  activeVariantId: string | null;
  brandKit: BrandKit | null;
}

export interface ToolResult {
  success: boolean;
  message: string;
  data?: unknown;    // tool별 반환 데이터
  sideEffects?: string[];  // "created element 'Hero BG'", "modified fill of 'CTA'"
}
```

> [!IMPORTANT]
> **모든 tool은 이 인터페이스를 구현**. `execute` 함수는 순수 함수로, designStore/editorStore를 직접 호출하여 상태 변경. 기존 `RenderElement`/`RearrangePatch`는 deprecated → `ToolResult`로 통합.

---

### 1-2. Read Tools (← OpenPencil `get_page_tree`)

#### [NEW] `src/services/tools/readTools.ts`

```typescript
// getPageTree: AI가 "지금 캔버스에 뭐가 있지?" 파악
export const getPageTree: AceTool = {
  name: 'get_page_tree',
  category: 'read',
  execute: (_, ctx) => {
    const variant = ctx.designStore.getState().getActiveVariant();
    if (!variant) return { success: false, message: 'No active variant' };

    // 기존 CanvasElementInfo(평면)가 아니라 계층 구조로 반환
    const tree = buildSceneGraph(variant);  // ← 1-3에서 구현
    return { success: true, message: 'Scene graph retrieved', data: tree };
  }
};

// getNode: 특정 요소의 상세 데이터
export const getNode: AceTool = {
  name: 'get_node',
  inputSchema: { properties: { id: { type: 'string' } }, required: ['id'] },
  execute: ({ id }, ctx) => {
    const el = ctx.designStore.getState().getElementById(id);
    if (!el) return { success: false, message: `Element ${id} not found` };
    const bounds = resolveConstraints(el.constraints, canvasW, canvasH);
    return { success: true, data: { ...el, bounds } };
  }
};

// findNodes: 이름/타입/역할 기반 검색
// getSelection: 현재 선택된 요소
// getCanvasBounds: 캔버스 크기 + safe zone
```

**기존 코드 연결점**:
- `readCanvasElements()` in `useAutoDesign.ts:45-69` → `getPageTree`로 대체
- `CanvasElementInfo` → deprecated, `SceneGraph` 타입으로 교체

---

### 1-3. Scene Graph Builder

#### [NEW] `src/services/sceneGraphBuilder.ts`

```typescript
export interface SceneGraph {
  canvas: { width: number; height: number; category: SizeCategory };
  elements: SceneNode[];
  relationships: ElementRelationship[];
  tokens: DesignTokens;
}

export interface SceneNode {
  id: string;
  name: string;
  role: ElementRole;        // ← smartSizing.ts의 detectElementRole 재사용
  type: 'shape' | 'text' | 'image' | 'button';
  bounds: { x: number; y: number; w: number; h: number };
  style: NodeStyle;
  zIndex: number;
  visible: boolean;
  locked: boolean;
}

interface NodeStyle {
  fill?: string;
  stroke?: { color: string; width: number };
  font?: { family: string; size: number; weight: number; color: string };
  opacity: number;
}

interface ElementRelationship {
  elementId: string;
  overlaps: string[];        // 겹치는 요소 ID 목록
  containedBy: string | null; // 완전히 포함하는 요소
  nearestNeighbor: string;   // 가장 가까운 요소
  distanceToEdge: { top: number; right: number; bottom: number; left: number };
}

interface DesignTokens {
  colors: { hex: string; count: number; elements: string[] }[];
  fonts: { family: string; sizes: number[]; elements: string[] }[];
  spacingPatterns: number[];  // 반복되는 간격 값
}

export function buildSceneGraph(variant: BannerVariant): SceneGraph {
  // 1. variant.elements를 SceneNode[]로 변환 (resolveConstraints 사용)
  // 2. 모든 요소 쌍에 대해 overlap/containment 계산 (rectsOverlap 재사용)
  // 3. 색상/폰트/간격 토큰 추출
  // 4. SceneGraph 반환
}
```

**기존 코드 재사용**:
- `detectElementRole()` from `smartSizing.ts:44-78` → role 감지
- `resolveConstraints()` from `constraints.types.ts:50-130` → bounds 계산
- `rectsOverlap()` from `smartSizingQA.ts:202-214` → 겹침 감지

---

### 1-4. Create / Modify / Structure Tools

#### [NEW] `src/services/tools/createTools.ts`

```typescript
// 핵심: designStore.getState()를 직접 호출하여 요소 추가
export const createShape: AceTool = {
  name: 'create_shape',
  execute: ({ shapeType, fill, x, y, w, h, name }, ctx) => {
    const constraints = absoluteToConstraints(x, y, w, h, canvasW, canvasH);
    const element: ShapeElement = {
      id: `el-${Date.now()}`,
      name: name || `Shape ${Date.now()}`,
      type: 'shape', shapeType, fill,
      constraints, visible: true, locked: false, opacity: 1,
      zIndex: ctx.designStore.getState().getMaxZIndex() + 1,
    };
    ctx.designStore.getState().addElement(element);
    return { success: true, message: `Created ${shapeType} "${name}"`, data: { id: element.id } };
  }
};
// createText, createImage, duplicateNode 동일 패턴
```

**기존 코드 연결점**:
- `renderElement()` in `useAutoDesign.ts:91-149` → `createShape`/`createText`로 대체
- `absoluteToConstraints()` from `elementConverters.ts:14-70` → 재사용

#### [NEW] `src/services/tools/modifyTools.ts`

```typescript
export const setFill: AceTool = {
  name: 'set_fill',
  execute: ({ id, color }, ctx) => {
    ctx.designStore.getState().updateElement(id, { fill: color });
    return { success: true, message: `Set fill of "${id}" to ${color}` };
  }
};
// moveNode → updateElement(id, { constraints: newConstraints })
// resizeNode → absoluteToConstraints로 새 constraints 계산 → updateElement
// setFont, setText, setOpacity, setVisible, setZIndex 동일 패턴
```

**기존 코드 연결점**:
- `applyRearrangePatches()` in `useAutoDesign.ts:153-176` → `modifyTools`로 대체
- `RearrangePatch` 타입 → deprecated

---

### 1-5. Tool Registry

#### [NEW] `src/services/toolRegistry.ts`

```typescript
import * as readTools from './tools/readTools';
import * as createTools from './tools/createTools';
import * as modifyTools from './tools/modifyTools';
// ... 나머지 import

// 전체 tool 목록 (Claude tool_use에 전달)
export const ALL_TOOLS: AceTool[] = [
  ...Object.values(readTools),
  ...Object.values(createTools),
  ...Object.values(modifyTools),
  ...Object.values(structureTools),
  ...Object.values(analyzeTools),
  ...Object.values(sizingTools),
  ...Object.values(exportTools),
  ...Object.values(generateTools),  // ← 이미지 AI 생성
];

// Claude API용 tool schema 자동 생성
export function getToolSchemas(): ClaudeToolSchema[] {
  return ALL_TOOLS.map(t => ({
    name: t.name,
    description: t.description,
    input_schema: t.inputSchema,
  }));
}

// tool name → execute 매핑
export function executeTool(name: string, params: unknown, ctx: ToolContext): ToolResult {
  const tool = ALL_TOOLS.find(t => t.name === name);
  if (!tool) return { success: false, message: `Unknown tool: ${name}` };
  return tool.execute(params, ctx);
}
```

**기존 코드 교체**:
- `autoDesignService.ts`의 `RENDER_BANNER_TOOL` + `REARRANGE_BANNER_TOOL` → `getToolSchemas()`
- `callAutoDesign()` 함수 내부의 tool 결과 파싱 → `executeTool()`

---

## Phase 2: 3-Agent Chain + Image Generation (3 weeks)

### 2-1. Image AI Generation (← Jaaz ComfyUI + 사용자 아이디어)

#### [NEW] `src/services/tools/generateTools.ts`

```typescript
// 사용자가 직접 쓰는 게 아니라, Critic Agent가 자동으로 호출
export const generateBackground: AceTool = {
  name: 'generate_background',
  category: 'generate',
  description: 'AI-generate a background image when solid color is insufficient',
  inputSchema: {
    properties: {
      prompt: { type: 'string', description: 'Image generation prompt' },
      style: { type: 'string', enum: ['photo', 'gradient', 'pattern', 'abstract'] },
      width: { type: 'number' },
      height: { type: 'number' },
    }
  },
  execute: async ({ prompt, style, width, height }, ctx) => {
    // 1. modelRouter로 최적 이미지 모델 선택
    const model = selectModel('image-gen');  // Flux > Midjourney > DALL-E
    
    // 2. 이미지 생성 API 호출
    const imageUrl = await callImageGeneration(model, {
      prompt: `${prompt}, ${style} style, banner background, ${width}x${height}`,
      width, height,
    });
    
    // 3. 생성된 이미지를 캔버스 배경으로 자동 삽입
    ctx.designStore.getState().addElement({
      type: 'image', src: imageUrl,
      constraints: absoluteToConstraints(0, 0, width, height, width, height),
      zIndex: 0, role: 'background', name: 'AI Background',
    });
    
    return { success: true, message: 'Background generated and applied' };
  }
};

export const generateProductImage: AceTool = {
  // 브랜드킷에 프로덕트 이미지 없을 때 Critic이 호출
  name: 'generate_product_image',
  execute: async ({ productDescription, style }, ctx) => { ... }
};

export const generateTexture: AceTool = {
  // 배경 패턴/텍스처 필요시
  name: 'generate_texture',
  execute: async ({ pattern, colors }, ctx) => { ... }
};
```

**통합 지점**:
- `criticAgent`가 "배경이 밋밋하다" 판단 → `generate_background` tool 호출 지시
- `executorAgent`가 plan에 "product image needed" → `generate_product_image` 호출
- 사용자 UI에 노출 안 됨 — 파이프라인 내부 단계

#### [NEW] `src/services/imageGenClient.ts`

```typescript
type ImageModel = 'flux-schnell' | 'dall-e-3' | 'midjourney' | 'stable-diffusion-3';

export async function callImageGeneration(
  model: ImageModel,
  params: { prompt: string; width: number; height: number; }
): Promise<string> {
  // OpenRouter 또는 직접 API 호출 → 이미지 URL 반환
  // 결과를 blob으로 받아 → data URL 또는 임시 URL로 변환
}
```

---

### 2-2. Agent Architecture

#### [NEW] `src/services/agents/agentTypes.ts`

```typescript
export interface AgentMessage {
  role: 'system' | 'user' | 'assistant' | 'tool_result';
  content: string | ContentBlock[];
}

export interface AgentStep {
  agent: 'planner' | 'executor' | 'critic';
  toolCalls: { name: string; params: unknown; result: ToolResult }[];
  thinking: string;
  durationMs: number;
}

export interface PipelineResult {
  steps: AgentStep[];
  finalScore: number;
  totalPasses: number;
  elementsCreated: number;
  imagesGenerated: number;    // ← AI 이미지 생성 횟수
}
```

#### [NEW] `src/services/agents/plannerAgent.ts`

```typescript
export async function runPlanner(
  userPrompt: string,
  sceneGraph: SceneGraph,    // ← Phase 1에서 만든 것
  brandKit: BrandKit | null,
  canvasW: number,
  canvasH: number,
): Promise<DesignPlan> {
  // system prompt에 포함되는 것:
  // 1. sceneGraph (현재 캔버스 상태 — AI가 "맥락" 이해)
  // 2. brandKit (색상, 폰트, 로고 URL)
  // 3. LAYOUT_ZONES (smartSizing.ts에서 가져옴)
  // 4. availableTools (toolRegistry에서 가져옴 — AI가 "뭘 할 수 있는지" 안다)
  
  const response = await callClaude({
    model: 'claude-sonnet-4-20250514',
    system: buildPlannerSystemPrompt(sceneGraph, brandKit, canvasW, canvasH),
    messages: [{ role: 'user', content: userPrompt }],
    // tool_use 아님 — 구조화된 JSON 출력
  });
  
  return parsePlan(response);  // DesignPlan 검증 (Zod)
}
```

#### [NEW] `src/services/agents/executorAgent.ts`

```typescript
export async function runExecutor(
  plan: DesignPlan,
  toolCtx: ToolContext,
  onStep: (step: AgentStep) => void,
): Promise<void> {
  // Claude에게 plan + 사용 가능한 tools 전달
  // Claude가 tool_use로 하나씩 호출 → executeTool()로 실행
  // 각 tool 결과를 다시 Claude에게 전달 → 다음 tool 결정
  // plan이 완료될 때까지 반복 (tool_use loop)
  
  const messages: AgentMessage[] = [
    { role: 'user', content: `Execute this design plan:\n${JSON.stringify(plan)}` }
  ];
  
  while (true) {
    const response = await callClaude({
      model: 'claude-sonnet-4-20250514',
      tools: getToolSchemas(),  // ← 40+ tools 전달
      messages,
    });
    
    if (response.stop_reason === 'end_turn') break;
    
    // tool_use 응답 → 실행
    for (const toolCall of response.tool_calls) {
      const result = executeTool(toolCall.name, toolCall.params, toolCtx);
      onStep({ agent: 'executor', toolCalls: [...], thinking: '...' });
      messages.push({ role: 'tool_result', content: JSON.stringify(result) });
    }
  }
}
```

#### [NEW] `src/services/agents/criticAgent.ts`

```typescript
export async function runCritic(
  screenshot: string,          // base64 PNG
  sceneGraph: SceneGraph,
  brandKit: BrandKit | null,
  canvasW: number,
  canvasH: number,
): Promise<CriticVerdict> {
  // 기존 visionService.ts의 callVisionCheck를 확장
  // + 브랜드 준수 체크 (색상이 brandKit과 일치?)
  // + 레이아웃 규칙 체크 (LAYOUT_ZONES와 일치?)
  // + 이미지 생성 제안 ("배경이 단색이라 밋밋함 → generate_background 호출 필요")
  
  const response = await callVisionModel('gpt-4o', screenshot, {
    sceneGraph,
    brandKit,
    checkList: ['overlap', 'clipping', 'contrast', 'hierarchy', 'brand_compliance',
                'background_quality',   // ← NEW: 배경 품질 평가
                'asset_completeness'],  // ← NEW: 필요한 에셋 있는지
  });
  
  return {
    score: response.score,
    pass: response.score >= 82,
    fixes: response.patches,           // 기존 VisionPatch 호환
    generateRequests: response.generateRequests,  // ← NEW: 이미지 생성 요청
    // 예: [{ tool: 'generate_background', prompt: 'gradient blue to purple' }]
  };
}
```

#### [MODIFY] `src/services/autoDesignLoop.ts`

```typescript
// 현재: runVisionLoop (단일 루프, vision만)
// 목표: runAgentPipeline (3-agent 체인)

export async function runAgentPipeline(
  userPrompt: string,
  toolCtx: ToolContext,
  onProgress: (msg: string) => void,
  signal: AbortSignal,
): Promise<PipelineResult> {
  onProgress('Planning design...');
  const sceneGraph = buildSceneGraph(getCurrentVariant());
  const plan = await runPlanner(userPrompt, sceneGraph, brandKit, W, H);
  
  onProgress('Building banner...');
  await runExecutor(plan, toolCtx, (step) => onProgress(step.thinking));
  
  for (let pass = 0; pass < MAX_PASSES; pass++) {
    onProgress(`Quality check (pass ${pass + 1})...`);
    const screenshot = await captureScreenshot(toolCtx.canvasEngine);
    const verdict = await runCritic(screenshot, buildSceneGraph(...), brandKit, W, H);
    
    if (verdict.pass) break;
    
    // 이미지 생성 요청 처리 (← 핵심 차별점)
    for (const genReq of verdict.generateRequests) {
      onProgress(`Generating ${genReq.tool}...`);
      await executeTool(genReq.tool, genReq.params, toolCtx);
    }
    
    // 나머지 fix patches 적용
    onProgress('Applying fixes...');
    await runExecutor(fixPlan(verdict.fixes), toolCtx, noop);
  }
  
  return { steps, finalScore, ... };
}
```

**기존 코드 교체**:
- `useAutoDesign.ts`의 `generate()` 함수 → `runAgentPipeline()` 호출로 교체
- `autoDesignService.ts`의 `callAutoDesign()` → deprecated, `runPlanner()`+`runExecutor()`로 대체
- `autoDesignLoop.ts`의 `runVisionLoop()` → `runAgentPipeline()` 내부로 통합

---

## Phase 3: Model Router + Layout Intelligence (4 weeks)

### 3-1. Model Router (← Jaaz)

#### [NEW] `src/services/modelRouter.ts`

```typescript
const MODEL_MAP: Record<TaskType, ModelConfig> = {
  'design-planning':  { provider: 'anthropic', model: 'claude-sonnet-4-20250514' },
  'tool-execution':   { provider: 'anthropic', model: 'claude-sonnet-4-20250514' },
  'vision-qa':        { provider: 'openai', model: 'gpt-4o' },
  'image-gen':        { provider: 'together', model: 'flux-schnell' },
  'text-rewrite':     { provider: 'anthropic', model: 'claude-haiku' },
};

export function selectModel(task: TaskType): ModelConfig {
  return MODEL_MAP[task];
}

// 향후: 사용자가 설정에서 모델 교체 가능 (Jaaz처럼)
```

#### [NEW] `src/services/openRouterClient.ts`

```typescript
// OpenRouter API: 하나의 API key로 50+ LLM 접근
export async function callOpenRouter(config: ModelConfig, body: RequestBody) {
  // anthropicClient.ts와 동일 패턴이지만 엔드포인트만 다름
}
```

**기존 코드 교체**:
- `anthropicClient.ts` → 유지 (직접 호출 옵션)
- 새로운 호출은 `modelRouter`가 `anthropicClient` 또는 `openRouterClient` 중 결정

### 3-2. Layout Intelligence (← PosterMaker)

#### [MODIFY] `src/engine/smartSizing.ts` — LAYOUT_ZONES 확장

```typescript
// 현재: 5 categories × 8 roles (고정)
// 추가: 업종별 modifier

export const INDUSTRY_MODIFIERS: Record<string, Partial<LayoutMap>> = {
  finance: {
    headline: { maxFontScale: 0.7 },  // 보수적, 작은 글씨
    cta: { h: 0.08 },                  // 작은 CTA
  },
  fashion: {
    image: { w: 0.7, h: 0.8 },        // 이미지 크게
    headline: { maxFontScale: 1.2 },   // 대담한 타이틀
  },
  food: {
    image: { w: 0.6 },                // 제품 사진 강조
    decoration: { maxFontScale: 0.8 }, // 따뜻한 장식
  },
};
```

---

## File Change Summary

### New Files (18)
```
src/services/tools/toolTypes.ts      ← 공통 인터페이스
src/services/tools/readTools.ts      ← 5 tools (getPageTree, getNode, findNodes, getSelection, getCanvasBounds)
src/services/tools/createTools.ts    ← 5 tools (createShape, createText, createImage, createGroup, duplicateNode)
src/services/tools/modifyTools.ts    ← 8 tools (setFill, setStroke, setFont, setText, moveNode, resizeNode, setOpacity, setZIndex)
src/services/tools/structureTools.ts ← 4 tools (deleteNode, renameNode, groupNodes, reparentNode)
src/services/tools/analyzeTools.ts   ← 4 tools (analyzeColors, analyzeTypography, analyzeSpacing, analyzeBrandCompliance)
src/services/tools/sizingTools.ts    ← 4 tools (addVariant, propagateToAll, smartResize, getVariantList)
src/services/tools/exportTools.ts    ← 3 tools (exportPNG, exportSVG, exportAllVariants)
src/services/tools/generateTools.ts  ← 3 tools (generateBackground, generateProductImage, generateTexture)
src/services/toolRegistry.ts        ← 통합 registry (getToolSchemas, executeTool)
src/services/sceneGraphBuilder.ts   ← buildSceneGraph (계층 구조 + 관계 + 토큰)
src/services/agents/agentTypes.ts   ← AgentMessage, AgentStep, PipelineResult
src/services/agents/plannerAgent.ts ← runPlanner (brandKit + sceneGraph → DesignPlan)
src/services/agents/executorAgent.ts← runExecutor (DesignPlan + 40 tools → 배너 생성)
src/services/agents/criticAgent.ts  ← runCritic (Vision + 이미지생성 제안)
src/services/imageGenClient.ts      ← callImageGeneration (Flux/DALL-E/Midjourney)
src/services/modelRouter.ts         ← selectModel (용도별 최적 모델)
src/services/openRouterClient.ts    ← OpenRouter API 클라이언트
```

### Modified Files (4)
```
src/services/autoDesignLoop.ts      ← runVisionLoop → runAgentPipeline
src/services/autoDesignService.ts   ← 2 tools → toolRegistry 연결 (점진적 deprecation)
src/hooks/useAutoDesign.ts          ← callAutoDesign → runAgentPipeline
src/engine/smartSizing.ts           ← INDUSTRY_MODIFIERS 추가
```

### Deprecated (not deleted, backward compat)
```
RenderElement type          → createTools로 대체
RearrangePatch type         → modifyTools로 대체
CanvasElementInfo type      → SceneGraph로 대체
callAutoDesign()            → runPlanner+runExecutor로 대체
```

---

## Verification Plan

### Phase 1 완료 후
```bash
npm test                     # 기존 114 unit 통과
# + toolRegistry.test.ts     → tool schema 검증 (15+ tests)
# + sceneGraphBuilder.test.ts → 계층 구조 빌드 검증 (10+ tests)
# + readTools.test.ts         → getPageTree 반환 구조 (5+ tests)
npx tsc --noEmit             # 0 errors
```

### Phase 2 완료 후
```bash
npm test                     # 160+ tests
# + plannerAgent.test.ts      → plan 구조 검증 (5+ tests)
# + criticAgent.test.ts       → verdict/score 검증 (5+ tests)
# + generateTools.test.ts     → 이미지 생성 mock 테스트 (5+ tests)
npm run test:e2e             # AI chat flow E2E
```

### Phase 3 완료 후
```bash
npm test                     # 200+ tests
npm run test:coverage        # 목표: 50%+ statement coverage
```
