

# FUTURE PLAN: Dual Memory Architecture

> Status: PLANNED — Do not implement until explicitly requested.
> Priority: HIGH — Core differentiator ("AI that gets smarter the more you use it")

---

## 1. Problem

ACE's AI currently has a 50-message ring buffer (`agentContext.ts`) and a 10-action history (`smartContextBuilder.ts`).
When the session ends, ALL learning is lost. The AI cannot remember:
- That a client hates neon effects
- That a brand uses specific CTA wording
- The user's preferred layout style
- Past design decisions and their rationale

## 2. Architecture: Short-Term + Long-Term Memory

```
src/ai/memory/
  ├── shortTermMemory.ts     ← Current session (already exists as AgentContext)
  ├── longTermMemory.ts      ← Persistent knowledge base (Markdown files)
  ├── brandMemory.ts         ← Per-brand accumulated learning
  ├── stylePreferences.ts    ← User style pattern tracking
  └── memoryIndex.ts         ← Semantic search over stored memories
```

### Short-Term Memory (EXISTS)
- 50-message conversation buffer
- 10-action history ring buffer
- Last-touched element tracking (pronoun resolution)
- Design intent inference

### Long-Term Memory (TO BUILD)
- **Storage**: Local Markdown files in `~/.ace/memory/` (OpenClaw pattern)
- **Per-user**: Isolated by `userId` key
- **Auto-extraction**: After each design session, AI summarizes key learnings
- **Categories**:
  - `brands/{brandId}.md` — Brand-specific knowledge
  - `style-profile.md` — User's color/layout/typography preferences
  - `design-history.md` — Past design decisions + outcomes
  - `client-notes.md` — Client-specific preferences and constraints

### Memory Flow
```
User Session
  ↓
Short-Term Memory (conversation + actions)
  ↓ (session end)
Memory Extractor (LLM summarizes key learnings)
  ↓
Long-Term Memory (Markdown files, persisted)
  ↓ (next session start)
Memory Loader (retrieves relevant context)
  ↓
Injected into System Prompt (smartContextBuilder)
```

## 3. Key Implementation Details

### 3.1 Memory Extraction (Post-Session)
After a design session completes (user navigates away or closes):
- LLM call summarizes: "What did we learn about brand/style/preferences?"
- Delta appended to relevant Markdown file
- No full rewrite — append-only for safety

### 3.2 Memory Retrieval (Pre-Session)
When AI chat opens:
- Load `style-profile.md` (always)
- Load `brands/{activeBrandId}.md` (if brand kit is active)
- Load last 5 entries from `design-history.md`
- Inject as `## Long-Term Memory` section in system prompt

### 3.3 Memory Pruning
- Max 50 entries per category
- Oldest entries summarized + compressed when limit reached
- User can view/delete memories via Settings > AI Memory

## 4. Storage Key Convention

All memory files MUST use `userId` prefix to prevent cross-user contamination:
```
~/.ace/memory/{userId}/
  ├── style-profile.md
  ├── design-history.md
  ├── client-notes.md
  └── brands/
      ├── {brandId-1}.md
      └── {brandId-2}.md
```

## 5. Integration Points

| File | Change |
|------|--------|
| `smartContextBuilder.ts` | Add `loadLongTermContext()` → inject into prompt |
| `agentContext.ts` | Add `extractSessionLearnings()` on session end |
| `aiService.ts` | Call memory loader in `chat()` before building system prompt |
| `useUnifiedAgent.ts` | Trigger memory extraction after pipeline completion |
| Settings UI | Add "AI Memory" panel (view/clear/export) |

## 6. Privacy & Data Handling

- All memory stored LOCALLY only (no cloud sync for memory)
- User can export memory as ZIP
- User can wipe all memory with one click
- Memory never leaves the device (Tauri localStorage or filesystem)
- No PII in memory files — only design preferences and patterns

## 7. Success Metrics

- User returns after 7+ days → AI references past brand preferences correctly
- Repeat brand projects → 40% fewer manual corrections needed
- User satisfaction: "It remembers!" moments in first 3 sessions

