# Pencil.dev AI Design Agent — Full Design Log Reference

> Source: Live capture from Pencil.dev Sage agent building "Technical Dashboard for Utilities Company"
> This document is the blueprint for ACE's design quality improvement.

---

## Phase 1: System Prompt (Universal Design Principles)

Pencil injects a comprehensive WEBAPP SYSTEM PROMPT before any design work. Key principles:

### 16 Core Laws
1. **Purpose First** — Every screen has ONE dominant purpose, ONE primary action
2. **Dominant Region Rule** — One dominant visual region per screen. Visual weight = importance
3. **Understandability** — Interface must explain itself. If user must guess, redesign it
4. **Progressive Disclosure** — Reveal complexity gradually. Complexity allowed, confusion is not
5. **Recognition Over Recall** — Reduce cognitive load. Surface actions when needed
6. **System Status Visibility** — Loading, empty, error, success states. No silent failure
7. **Action Hierarchy** — One primary action per section. Honest emphasis only
8. **Structural Consistency** — Similar problems = similar solutions. Predictability builds trust
9. **Density Intentionality** — Compact / Medium / Airy — deliberate choice, never arbitrary
10. **Spatial Logic** — One dominant axis per screen. Structure over ornament
11. **Feedback & Response** — Every action produces clear feedback. Silence is unacceptable
12. **Responsiveness** — Hierarchy must survive all breakpoints
13. **Entity Integrity** — Name prominent, status clear, metadata visible, actions obvious
14. **Constraint Over Decoration** — If it doesn't support navigation/understanding/decision/action, remove it
15. **Scalability** — More data must not break structure
16. **Adaptation Logic** — Infer product type from prompt, then determine dominant region/density/disclosure

---

## Phase 2: Style Guide Selection

Pencil picks a specific style guide BEFORE designing. Example: "Terminal Industrial Crisp Light"

### Color System
```
Core Backgrounds:
  #000000 — Page Background (pure black canvas)
  #111111 — Surface/Card (elevated content)
  #1A1A1A — Border, Input, Highlight

Text Colors:
  #FFFFFF — Text Primary (headlines, values)
  #999999 — Text Secondary (body, dates)
  #6e6e6e — Text Tertiary (labels, descriptions)
  #404040 — Text Muted (icons, placeholders)

Accent Colors:
  #BFFF00 — Lime Primary (CTAs, active states, charts)
  #3B82F6 — Info (badges)
  #F59E0B — Warning (pending)
  #FF4444 — Error (negative)
```

### Typography (Dual-Font System)
```
Inter — Headlines, metric values, section titles, logo
JetBrains Mono — Navigation, buttons, labels, metadata, table content

Type Scale:
  32px — Page Title, Metric Value (Inter, 600)
  16-18px — Section Title (Inter, 600)
  15px — Card Title, Logo (Inter, 600; logo letterSpacing: 3)
  13px — Navigation (JetBrains Mono, 500/400)
  12-13px — Body, Table Cell (JetBrains Mono)
  10-12px — Meta, Chart Labels (JetBrains Mono)
  9px — Tag (JetBrains Mono, 700)
```

### Spacing System
```
Gap Scale:
  48px — Content side padding
  40px — Major sections gap
  24px — Internal section spacing
  16px — Card grid gap
  12px — Medium spacing
  8px — Standard spacing
  4px — Minimal
  2px — Micro (nav items vertical)

Padding:
  [32, 48] — Main content area
  [32, 24] — Sidebar
  [24, 24] — Cards, sections
  [14, 20] — Banner
  [10, 18] — Primary CTA buttons
  [10, 14] — Navigation items
```

### Corner Radius
```
0px — ALL elements (industrial aesthetic)
3px — Status dots only (small rounded squares 6x6)
```

---

## Phase 3: Component Composition (DSL Operations)

Pencil uses a structured DSL: `I()` = Insert, `R()` = Replace, `U()` = Update

### Build Order (Hierarchical)
1. **Screen shell** — outer frame with layout direction
2. **Sidebar** — navigation, brand, user info
3. **Main content area** — flexible width
4. **Page header** — title + actions
5. **Metric cards grid** — 4-column equal width
6. **Charts + panels** — data visualization
7. **Tables + lists** — data grids
8. **Footer / pagination** — bottom controls

### Example: Sidebar Navigation
```
sidebar = I(page, {type: "frame", width: 240, fill: "$--background",
                   stroke: {align: "inside", thickness: {right: 1}, fill: "$--border"}})

// Brand
logo = I(sidebar, {type: "text", content: "UTILITIES", fontFamily: "Inter",
                    fontSize: 15, fontWeight: "600", letterSpacing: 3})

// Active nav item (2px left border indicator)
navActive = I(sidebar, {type: "frame", width: "fill_container", height: 40,
                         stroke: {align: "inside", thickness: {left: 2}, fill: "$--accent"}})
navIcon = I(navActive, {type: "icon_font", iconFontFamily: "lucide",
                         iconFontName: "layout-dashboard", fill: "$--accent"})
navLabel = I(navActive, {type: "text", content: "Dashboard",
                          fontFamily: "JetBrains Mono", fill: "$--accent"})
```

### Example: Metric Card
```
metricCard = I(grid, {type: "frame", fill: "$--surface",
                       stroke: {thickness: 1, fill: "$--border"},
                       layout: "vertical", padding: 24})
label = I(metricCard, {type: "text", content: "Total Output",
                        fill: "$--text-tertiary", fontFamily: "JetBrains Mono", fontSize: 12})
value = I(metricCard, {type: "text", content: "847.2 MW",
                        fill: "#FFFFFF", fontFamily: "Inter", fontSize: 32, fontWeight: "600"})
change = I(metricCard, {type: "text", content: "↑ 12.4%",
                         fill: "$--accent", fontFamily: "JetBrains Mono", fontSize: 12})
```

### Example: Bar Chart
```
chartArea = I(panel, {type: "frame", layout: "horizontal", gap: 2, alignItems: "end"})
bar = I(chartArea, {type: "frame", width: "fill_container",
                     layout: "vertical", justifyContent: "end", alignItems: "center"})
barFill = I(bar, {type: "rectangle", fill: "$--accent", width: "fill_container", height: 130})
barLabel = I(bar, {type: "text", content: "08", fill: "$--text-muted",
                    fontFamily: "JetBrains Mono", fontSize: 9})
```

---

## Key Takeaways for ACE

1. **Style Guide FIRST** — Select/generate a complete color+typography+spacing system before placing any elements
2. **Design Tokens** — Use named variables ($--foreground, $--surface, etc.) not raw hex values
3. **Hierarchical Build** — Shell → Sections → Components → Details (never flat element list)
4. **Dual-Font Strategy** — Display font for headlines + monospace/utility font for data
5. **Spacing System** — Consistent scale (4/8/12/16/24/32/40/48) not arbitrary numbers
6. **Industrial Precision** — Every element has explicit width, height, gap, padding
7. **Component Reuse** — Button variants, card patterns, nav item active/inactive states
8. **Status Indicators** — Small rounded squares (6x6, 3px radius) not circles
9. **Batch Operations** — Multiple precise element insertions per step (max 25 ops per call)
10. **No Decoration** — "Constraint Over Decoration" — if it doesn't serve function, remove it
