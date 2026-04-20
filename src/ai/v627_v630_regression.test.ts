// ─────────────────────────────────────────────────
// v627-630 Regression Tests — AI Canvas Edit + Template Sync + Cloud Sync
// ─────────────────────────────────────────────────
// Covers all fixes from v627-v630:
// 1. fabricEngineShim: set_text_content
// 2. commandExecutor: update_element_text engine+store dual update
// 3. commandExecutor: update_element_property engine+store dual update
// 4. supabaseClient: pullBrandKitsCloud existence check
// 5. templateStore: syncOverridesFromCloud deletion sync
// 6. templateStore: updateTemplate correct upsert signature
// 7. cloudSyncProjects: pushProject skip trashed
// 8. cloudSyncProjects: pushCreativeSet skip trashed
// ─────────────────────────────────────────────────

import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// ═══════════════════════════════════════════════════
// 1. fabricEngineShim — set_text_content
// ═══════════════════════════════════════════════════

describe('★ REGRESSION (v627): fabricEngineShim — set_text_content', () => {
    const src = readFileSync(resolve(__dirname, '../hooks/fabricEngineShim.ts'), 'utf-8');

    it('should export set_text_content method', () => {
        expect(src).toContain('set_text_content');
    });

    it('set_text_content should check for text property before setting', () => {
        expect(src).toContain("'text' in obj");
    });

    it('set_text_content should call fc.renderAll and syncState', () => {
        // Ensure the method triggers visual update and state sync
        expect(src).toContain('fc.renderAll(); syncState();');
    });

    it('should set text via obj.set({ text })', () => {
        expect(src).toContain('obj.set({ text }');
    });
});

// ═══════════════════════════════════════════════════
// 2. commandExecutor — update_element_text engine+store dual update
// ═══════════════════════════════════════════════════

describe('★ REGRESSION (v627): commandExecutor — update_element_text dual update', () => {
    const src = readFileSync(resolve(__dirname, '../ai/commandExecutor.ts'), 'utf-8');

    it('should have explicit case for update_element_text (not fall through to default)', () => {
        expect(src).toContain("case 'update_element_text'");
    });

    it('should update engine FIRST via set_text_content', () => {
        expect(src).toContain('engine.set_text_content(node.id, newText)');
    });

    it('should ALSO update designStore for persistence', () => {
        expect(src).toContain("executeDesignCommand('update_element_text', params)");
    });

    it('should report engine update count in success message', () => {
        expect(src).toContain('canvas + store');
    });

    it('should match elements by name (case-insensitive)', () => {
        expect(src).toContain('nodeName.includes(elementName)');
    });
});

// ═══════════════════════════════════════════════════
// 3. commandExecutor — update_element_property engine+store dual update
// ═══════════════════════════════════════════════════

describe('★ REGRESSION (v627): commandExecutor — update_element_property dual update', () => {
    const src = readFileSync(resolve(__dirname, '../ai/commandExecutor.ts'), 'utf-8');

    it('should have explicit case for update_element_property', () => {
        expect(src).toContain("case 'update_element_property'");
    });

    it('should handle color property via engine.set_fill_hex', () => {
        expect(src).toContain('engine.set_fill_hex(node.id, rawValue)');
    });

    it('should handle fontSize property via engine.set_font_size', () => {
        expect(src).toContain('engine.set_font_size(node.id, Number(rawValue))');
    });

    it('should handle opacity property via engine.set_opacity', () => {
        expect(src).toContain('engine.set_opacity(node.id, Number(rawValue))');
    });

    it('should ALSO update designStore for persistence', () => {
        expect(src).toContain("executeDesignCommand('update_element_property', params)");
    });
});

// ═══════════════════════════════════════════════════
// 4. commandExecutor — analyze_scene routing
// ═══════════════════════════════════════════════════

describe('★ REGRESSION (v625): commandExecutor — analyze_scene routing', () => {
    const src = readFileSync(resolve(__dirname, '../ai/commandExecutor.ts'), 'utf-8');

    it('should have explicit case for analyze_scene (not fall through to default)', () => {
        expect(src).toContain("case 'analyze_scene'");
    });

    it('should import analyzeScene function', () => {
        expect(src).toContain('analyzeScene');
    });

    it('should call analyzeScene with trackedNodes', () => {
        expect(src).toContain('analyzeScene(trackedNodes)');
    });
});

// ═══════════════════════════════════════════════════
// 5. supabaseClient — pullBrandKitsCloud existence check
// ═══════════════════════════════════════════════════

describe('★ REGRESSION (v628): pullBrandKitsCloud — existence check before download', () => {
    const src = readFileSync(resolve(__dirname, '../services/supabaseClient.ts'), 'utf-8');

    it('should list files before downloading to avoid 400 errors', () => {
        expect(src).toContain('.list(folder,');
    });

    it('should return empty array when file does not exist', () => {
        expect(src).toContain('files.length === 0) return []');
    });

    it('should only download after confirming file exists', () => {
        // The list call must come before download
        const listIdx = src.indexOf('.list(folder,');
        const downloadIdx = src.indexOf('.download(path)', listIdx);
        expect(listIdx).toBeGreaterThan(-1);
        expect(downloadIdx).toBeGreaterThan(listIdx);
    });
});

// ═══════════════════════════════════════════════════
// 6. templateStore — syncOverridesFromCloud deletion sync
// ═══════════════════════════════════════════════════

describe('★ REGRESSION (v629): templateStore — cloud deletion sync', () => {
    const src = readFileSync(resolve(__dirname, '../stores/templateStore.ts'), 'utf-8');

    it('should remove local templates NOT in cloud (deletion sync)', () => {
        expect(src).toContain('DELETION SYNC');
    });

    it('should protect user-saved templates (tmpl-* prefix) from deletion', () => {
        expect(src).toContain("t.id.startsWith('tmpl-')");
    });

    it('should keep templates that exist in cloud', () => {
        expect(src).toContain('cloudIds.has(t.id)');
    });

    it('should clean up local templateOverrides when deleting', () => {
        expect(src).toContain('delete state.templateOverrides[t.id]');
    });

    it('should log which templates are removed', () => {
        expect(src).toContain('Removing deleted template');
    });
});

// ═══════════════════════════════════════════════════
// 7. templateStore — updateTemplate correct upsert signature
// ═══════════════════════════════════════════════════

describe('★ REGRESSION (v629): templateStore — updateTemplate upsert signature', () => {
    const src = readFileSync(resolve(__dirname, '../stores/templateStore.ts'), 'utf-8');

    it('should call upsertTemplateOverride with correct string args, not object', () => {
        // Must pass (id, variantSnapshot, userId, width, height, name)
        expect(src).toContain('upsertTemplateOverride(\n                                    id, tmpl.variantSnapshot, userId,');
    });

    it('should pass name as last argument', () => {
        expect(src).toContain('tmpl.width, tmpl.height, tmpl.name,');
    });

    it('should get userId from authStore', () => {
        expect(src).toContain("useAuthStore.getState().user?.id");
    });

    it('should NOT pass an object as second argument (old broken pattern)', () => {
        // The old broken pattern was: upsertTemplateOverride(id, { name: ... })
        expect(src).not.toContain('upsertTemplateOverride(id, {\n');
    });
});

// ═══════════════════════════════════════════════════
// 8. cloudSyncProjects — pushProject skip trashed
// ═══════════════════════════════════════════════════

describe('★ REGRESSION (v630): cloudSyncProjects — pushProject guards against resurrection', () => {
    const src = readFileSync(resolve(__dirname, '../services/cloudSyncProjects.ts'), 'utf-8');

    it('pushProject should check deleted_at before upserting', () => {
        expect(src).toContain("select('deleted_at')");
    });

    it('pushProject should skip push when project is trashed', () => {
        expect(src).toContain('existing?.deleted_at) return');
    });

    it('pushCreativeSet should also check deleted_at before upserting to projects', () => {
        expect(src).toContain('existingProject?.deleted_at) return');
    });

    it('should comment the guard as anti-resurrection', () => {
        expect(src).toContain('avoid resurrection');
    });
});

// ═══════════════════════════════════════════════════
// 9. aiService — Tool execution logging
// ═══════════════════════════════════════════════════

describe('★ REGRESSION (v626): aiService — tool execution diagnostics', () => {
    const src = readFileSync(resolve(__dirname, '../ai/aiService.ts'), 'utf-8');

    it('should log tool call inputs with [AI Tool] prefix', () => {
        expect(src).toContain('[AI Tool]');
    });

    it('should log tool name and parameters', () => {
        expect(src).toContain('Calling:');
    });

    it('should log tool execution results', () => {
        expect(src).toContain('Result:');
    });
});

// ═══════════════════════════════════════════════════
// 10. designExecutor — Immer mutation safety
// ═══════════════════════════════════════════════════

describe('★ REGRESSION (v626): designExecutor — immer mutation safety', () => {
    const src = readFileSync(resolve(__dirname, '../ai/executors/designExecutor.ts'), 'utf-8');

    it('should use setState for mutations (not getState + mutate)', () => {
        expect(src).toContain('useDesignStore.setState');
    });

    it('should return available element names on match failure', () => {
        expect(src).toContain('Available:');
    });
});
