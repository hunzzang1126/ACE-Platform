# Pencil Sage — Complete Agent Workflow Trace
# Captured from live session: "Design Technical dashboard web app for a utilities company"
# This shows EXACTLY how Sage builds designs step-by-step.
# Use this as the blueprint for ACE's AI agent workflow.

## Key Architecture Observations

### 1. Multi-Phase Build Process (NOT single-shot)
Sage doesn't generate all elements at once. It builds in **sequential batches**:
1. Set CSS variables/tokens (14 variables)
2. Build screen structure (screen → sidebar → main)
3. Populate sidebar (logo, nav items, footer)
4. Build page header (title, subtitle, action buttons)
5. Build KPI cards (4 cards with values + change indicators)
6. Build chart panel + alerts panel (side by side)
7. Build chart bars (12 individual bars)
8. Build incidents table (header row + 4 data rows)
9. Build system status panel (6 subsystems)
10. Remove placeholder → screenshot → verify → fix → re-screenshot

### 2. DSL Operations
- `I(parent, props)` — Insert node into parent
- `U(nodeId, props)` — Update node properties
- `R(nodeId, props)` — Replace node content
- Returns binding name + actual inserted node ID
- Parent-child nesting creates layout hierarchy

### 3. Layout Engine (Flexbox-like)
Properties our engine does NOT have but Pencil does:
- `layout: "horizontal" | "vertical"` (flexbox direction)
- `gap: number` (spacing between children)
- `padding: number | [vert, horiz]` (inner spacing)
- `alignItems: "center" | "start" | "end"`
- `justifyContent: "space_between" | "center" | "end"`
- `width: "fill_container" | "fit_content" | number`
- `height: "fill_container" | "fit_content(min)" | number`
- `stroke: { align, thickness, fill }` (borders)
- `enabled: false` (hide slots)
- `placeholder: true/false`

### 4. Design Token Variables
```json
{
  "--background": "#000000",
  "--surface": "#111111",
  "--border": "#1A1A1A",
  "--foreground": "#FFFFFF",
  "--text-secondary": "#999999",
  "--text-tertiary": "#6e6e6e",
  "--text-muted": "#404040",
  "--accent": "#BFFF00",
  "--error": "#FF4444",
  "--warning": "#F59E0B",
  "--info": "#3B82F6",
  "--font-primary": "Inter",
  "--font-mono": "JetBrains Mono"
}
```

### 5. Screenshot Verification + Fix Loop
After building, Sage:
1. Removes `placeholder: true`
2. Takes screenshot via `get_screenshot(nodeId)`
3. Reviews the screenshot for issues
4. Makes corrections (layout fixes, font fixes)
5. Takes another screenshot to verify

### 6. Live Narration Style
Each step has a human-readable explanation:
- "Now let me build the main dashboard structure with the sidebar and content area."
- "Now let me add the alerts panel to the right of the chart, then build the bottom row."
- "The dashboard looks excellent! Let me review it and make a few refinements..."

### 7. Narration Shows RESULTS
After each design operation batch, results are shown:
```
Successfully executed all operations.
Operation results:
Inserted node PJf2J: {"type":"frame","id":"PJf2J","x":0,"y":0,...}
Inserted node d7T1L: {"type":"frame","id":"d7T1L","name":"Sidebar",...}
```

---

## Complete Workflow Trace

### Phase 1: Style Guide Selection
```
Sage: "I'll design a technical dashboard for a utilities company.
Let me start by getting the design guidelines and style inspiration."

→ Checks WEBAPP SYSTEM PROMPT (15 design principles)
→ Checks Design System Composition Guidelines (sidebars, cards, tables, tabs)
→ Picks style guide: "webapp-01-terminalindustrialcrisp_light"
  - Terminal Industrial Crisp: black canvas, electric lime #BFFF00
  - Dual font: Inter (headlines) + JetBrains Mono (data/labels)
  - 2px left border for active states
  - 0px corner radius (sharp industrial edges)
```

### Phase 2: Set Variables
```json
Input: set_variables({
  "--background": "#000000",
  "--surface": "#111111",
  "--border": "#1A1A1A",
  "--foreground": "#FFFFFF",
  "--text-secondary": "#999999",
  "--text-tertiary": "#6e6e6e",
  "--text-muted": "#404040",
  "--accent": "#BFFF00",
  "--error": "#FF4444",
  "--warning": "#F59E0B",
  "--info": "#3B82F6",
  "--font-primary": "Inter",
  "--font-mono": "JetBrains Mono"
})
```

### Phase 3: Screen Structure (3 ops)
```
screen=I(document, {type: "frame", name: "Utilities Technical Dashboard", layout: "horizontal", width: 1440, height: 960, fill: "$--background", placeholder: true})
sidebar=I(screen, {type: "frame", name: "Sidebar", layout: "vertical", width: 240, height: "fill_container", fill: "$--background", stroke: {right: 1, fill: "$--border"}, padding: [32, 0], gap: 40})
main=I(screen, {type: "frame", name: "Main Content", layout: "vertical", width: "fill_container", height: "fill_container", fill: "$--background", padding: [32, 48], gap: 32})
```

### Phase 4: Sidebar Content (17 ops)
```
- Logo: "GRID OPS" (Inter, 15px, semibold, letterSpacing: 3)
- Logo subtitle: "Utilities Control Center" (JetBrains Mono, 10px)
- Nav section with 7 items:
  - Dashboard (ACTIVE): lime 2px left border, lime icon, lime text
  - Power Grid, Water Systems, Gas Network, Alerts, Reports, Settings (inactive)
- System status: green dot + "System Nominal"
- User profile: avatar square + "J. Martinez" / "Grid Operator"
```

### Phase 5: Page Header (12 ops)
```
- Title: "System Overview" (Inter, 32px, semibold)
- Subtitle: "Live operational data · Updated 12 seconds ago" (JetBrains Mono, 12px)
- Date button: calendar icon + "Mar 10, 2026"
- Export button: download icon + "Export"
- Alert CTA: lime background + "3 Active Alerts" (bold, black text)
```

### Phase 6: KPI Cards (25 ops)
```
4 cards in horizontal row, each with:
- Label (JetBrains Mono, 12px, tertiary)
- Value (Inter, 32px, semibold, white)
- Change indicator (arrow + delta text)

Card 1: "Total Power Output" → "4,287 MW" ↑ +3.2%
Card 2: "Water Flow Rate" → "12,540 L/s" ↓ -1.8%
Card 3: "Gas Pressure" → "68.4 PSI" ↑ +0.6%
Card 4: "Active Substations" → "142/148" (warning dot)
```

### Phase 7: Power Chart (24 ops)
```
- Chart panel header: "Power Output — 24hr" + legend
- 12-column bar chart, each bar = vertical frame with:
  - Rectangle fill (variable height, lime color)
  - Time label below (00, 02, 04... 22)
- Last bar (#12) uses blue (#3B82F6) = current period
```

### Phase 8: Alerts Panel (16 ops)
```
- Panel header: "Active Alerts" + red badge "3"
- 3 alert items, each with:
  - Color-coded severity dot (red/amber/blue, 6x6, cornerRadius: 3)
  - Title + metadata (time, sector)
  
Alert 1: "Substation 7B Offline" — CRITICAL · 14 min ago
Alert 2: "Water Pressure Drop — Zone 3" — WARNING · 38 min ago
Alert 3: "Scheduled Maintenance — Line 12" — INFO · 2 hr ago
```

### Phase 9: Incidents Table (~40 ops across 2 batches)
```
- Table header: "Recent Incidents" + search box
- Column headers: INCIDENT ID, DESCRIPTION, SEVERITY, STATUS, TIMESTAMP
- 4 data rows with:
  - ID in lime text
  - Description
  - Severity badge (colored background with text)
  - Status badge
  - Timestamp
```

### Phase 10: System Status Panel (20 ops)
```
- Header: "System Health" + "Operational" status
- 6 subsystem rows (label + dot + percentage):
  Power Grid: 96.2% (lime)
  Water Network: 88.4% (warning)
  Gas Network: 99.1% (lime)
  SCADA Systems: 100% (lime)
  Substations: 95.9% (error)
  Fiber Control Net: 100% (lime)
```

### Phase 11: Verify + Fix
```
1. Remove placeholder flag
2. Take screenshot
3. Review: "The dashboard looks excellent!"
4. Fix: set layout: "horizontal" on nav items + fix font references
5. Take final screenshot
6. Confirm: "The dashboard is complete and looking sharp."
```

---

## Design Quality Breakdown: What Makes This Premium

### Typography System
| Role | Font | Size | Weight | Color |
|---|---|---|---|---|
| Page title | Inter | 32px | 600 | #FFFFFF |
| Section title | Inter | 15-16px | 600 | #FFFFFF |
| KPI value | Inter | 32px | 600 | #FFFFFF |
| Nav label (active) | JetBrains Mono | 13px | 500 | #BFFF00 |
| Nav label (inactive) | JetBrains Mono | 13px | 400 | #6e6e6e |
| Body text | JetBrains Mono | 12px | 400 | #999999 |
| Table header | JetBrains Mono | 10px | 500 | #6e6e6e |
| Badge | JetBrains Mono | 10px | 700 | semantic |
| Chart label | JetBrains Mono | 9px | 400 | #404040 |

### Spacing Consistency
| Context | Gap | Padding |
|---|---|---|
| Screen → sidebar | - | [32, 0] |
| Screen → content | - | [32, 48] |
| Major sections | 32-40 | - |
| Card internal | 12-16 | 24 |
| Nav items | 2 | [0, 24] |
| Table cells | 0 | [12, 24] |
| Buttons | 6 (icon gap) | [8, 14] |

### Color-Coded Status System
```
#BFFF00 (lime)    → Active, positive, operational, ↑
#FF4444 (red)     → Critical, error, failing
#F59E0B (amber)   → Warning, pending, caution
#3B82F6 (blue)    → Info, investigating, informational
#404040 (dark)    → Neutral, unchanged, disabled
```

### What We CANNOT Match (Architectural Limitation)
Our WASM engine has: rect, rounded_rect, ellipse, gradient_rect, text (absolute positioning)
Pencil has: frame-based flexbox layout engine with parent-child nesting, auto-sizing, icons, strokes, border-radius per-corner, variables system, component library

Until we add a layout engine, our designs will be flat compositions vs Pencil's nested, responsive layouts.
