# Pencil.dev Deep Analysis — Reverse Engineering Report

> Source: VSCode Extension v0.6.30 (94MB VSIX, 1.7MB main bundle, native MCP binaries)

## What Pencil.dev Is

A **vector design tool inside IDEs** (VSCode, Cursor, Windsurf, Antigravity). 
"Design on canvas. Land in code." — Figma-in-IDE with AI code generation.

**Not a direct competitor to ACE** (they do web/app UI, we do ad banners), but their **AI design architecture** is exactly what we want for our Smart Sizing + Scan Design.

---

## Architecture: MCP (Model Context Protocol)

Pencil runs a **native Go binary** (`mcp-server-darwin-arm64`, 7MB) as a local MCP server. AI agents (Claude, Codex, Gemini) connect to it via MCP protocol and manipulate `.pen` files through 8 tools:

### Tool Inventory

| Tool | Purpose | ACE Equivalent |
|------|---------|----------------|
| `get_editor_state` | Current file, selection, context | `useDesignStore.getState()` |
| `batch_get(patterns, nodeIds)` | Read components, search by pattern | `getVariantById()` |
| `batch_design(operations)` | Insert/Copy/Update/Replace/Move/Delete/Image — **max 25 ops per call** | `toolExecutor.ts` (our current approach) |
| `get_screenshot` | Render preview, verify visual output | **Our `captureCanvas()` + `analyzeDesign()`** |
| `snapshot_layout` | Computed layout rectangles, clipping detection | **Our `runStructuralCritic()`** |
| `get_variables` / `set_variables` | Read/write design tokens (colors, fonts, spacing) | `brandKitStore` |
| `spawn_agents` | Break task into **parallel designer agents** | **We don't have this yet** |

### batch_design Operation Types

```
I(parent, { ...props })      — Insert new node
U(nodeId, { ...props })      — Update existing node  
C(nodeId, { descendants })   — Copy with overrides
M(nodeId, newParent)          — Move to different parent
D(nodeId)                     — Delete
R(nodeId, { ...newProps })    — Replace entirely
G(nodeId, imageSpec)          — Generate/place image (Unsplash + AI)
```

### Workflow Pattern (Key Insight)

```
1. get_editor_state()        — understand context
2. batch_get(components)     — discover available parts
3. get_variables()           — read design tokens
4. batch_design(ops)         — create design (max 25 ops)
5. get_screenshot()          — VERIFY visually
6. If issues → batch_design() again → get_screenshot() again
7. Repeat until perfect
```

> This is EXACTLY our Vision QA Loop: design → screenshot → analyze → fix → verify.

---

## .pen Format (Design as JSON)

```json
{
  "version": "2.6",
  "children": [
    {
      "type": "frame",       // frame, rectangle, text, ellipse, path, image, instance
      "id": "bi8Au",
      "x": 0, "y": 0,
      "name": "Dashboard",
      "width": 1440,
      "fill": "#FFFFFF",
      "layout": "vertical",  // none, vertical, horizontal (flexbox-like)
      "justifyContent": "center",
      "alignItems": "stretch",
      "children": [...]
    }
  ]
}
```

### Comparison with ACE's DesignElement

| Feature | Pencil .pen | ACE DesignElement |
|---------|-------------|-------------------|
| Layout | Flexbox (layout, justifyContent, alignItems) | Constraint-based (anchor, offset) |
| Nesting | Tree (parent → children) | Flat array + zIndex |
| Components | Components + Instances + Overrides | Not yet |
| Fill | Solid, gradient, image, mesh_gradient | Solid only |
| Stroke | Multi-fill stroke | Not yet |
| Variables | Design tokens with themes | brandKitStore (simpler) |

---

## Design System Libraries (Bundled)

| Library | Size | Purpose |
|---------|------|---------|
| shadcn.lib.pen | 148KB | Shadcn/UI component library  |
| lunaris.lib.pen | 171KB | Lunaris design system |
| nitro.lib.pen | 140KB | Nitro components |
| halo.lib.pen | 127KB | Halo design kit |

The demo file (`pencil-demo.pen`, 1.2MB) contains **14 complete designs**:
- Dashboard (Industrial, Terminal, Swiss, Elegant, Warm)
- Habit Tracker (Swiss Expressive)
- Multiple landing page variants
- Mobile app screens

---

## Style Guides (AI-Embedded Knowledge)

Pencil embeds **style guides** directly into the MCP server binary:

| Guide | When It Activates |
|-------|------------------|
| Landing Page Guidelines | "Design a landing page" |
| Mobile App Guidelines | "Design a mobile app" |
| Dashboard/SaaS Guidelines | "Build a dashboard" |
| Presentation Guidelines | "Design slides" |
| Table Guidelines | "Insert a table" |
| Tailwind v4 Guidelines | Code generation |

> **ACE Takeaway**: We should embed **ad banner design guides** (IAB specs, typography rules, CTA placement, contrast requirements) into our AI agent's system prompt.

---

## Parallel Design Agents (`spawn_agents`)

Pencil can **break a design task into multiple parallel AI agents**:

```
"Create a dashboard" → spawns:
  Agent 1: Design sidebar navigation
  Agent 2: Design main content area  
  Agent 3: Design header bar
  All work simultaneously on the same .pen file
```

> **ACE Takeaway**: For Smart Sizing, we could spawn parallel agents — one per banner size — each optimizing their variant simultaneously.

---

## What ACE Should Steal (Next Steps)

### Priority 1: Batch Design Commands
Our `toolExecutor.ts` processes one element at a time. Pencil's `batch_design` does **up to 25 operations in one call**. This massively reduces AI round-trips.

**Action**: Add `batchDesign(ops: DesignOperation[])` tool that processes multiple create/update/delete/move operations atomically.

### Priority 2: Embedded Style Guides
Pencil knows HOW to design because it has domain-specific guides baked in. Our AI agent has generic knowledge.

**Action**: Create `bannerDesignGuide.ts` with IAB banner specs, typography best practices, CTA placement rules, contrast requirements, and inject into AI system prompt.

### Priority 3: Parallel Agent Spawning for Smart Sizing
Instead of sizing variants sequentially, spawn parallel AI agents per variant.

**Action**: Add `spawnSizingAgents(variants)` that runs Vision QA on all sizes concurrently.

### Priority 4: Component/Instance System
Pencil has reusable Components with Instance Overrides (like Figma). ACE has none.

**Action**: Add `DesignComponent` type with instance/override support for reusable ad elements (logos, CTAs, brand blocks).

### Priority 5: Design Token Variables
Pencil's `get_variables`/`set_variables` lets AI read and write design tokens. Our `brandKitStore` is simpler.

**Action**: Extend brand kit to support CSS-variable-level tokens (spacing grid, font scale, color palette with semantic names).

---

## Vibe Designing — Where Pencil Excels

The quality comes from their **iterative refinement loop**:

```
User: "Design a dashboard"
AI: [creates layout] → [screenshot] → [refines spacing] → [screenshot] → done

User: "Make it more bold"  
AI: [reads current state] → [increases font sizes, contrast] → [screenshot] → done

User: "Add a sidebar"
AI: [reads layout] → [inserts sidebar + adjusts main] → [screenshot] → done
```

Each step: design → verify → fix → verify. **This is exactly our Vision QA Loop.**

The key difference: Pencil's AI knows about design systems (Shadcn, etc.) and follows embedded style guides. Our AI doesn't yet have banner-specific design knowledge embedded.

---

## Clean Up

The `.pencil-analysis` folder can be deleted after review:
```bash
rm -rf /Users/younghoonan/Documents/ACE/.pencil-analysis
```
