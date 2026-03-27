// ─────────────────────────────────────────────────
// Design Executor — Element CRUD + Animation + Styling
// ─────────────────────────────────────────────────
// Element creators → designElementCreators.ts
// ─────────────────────────────────────────────────

import { useProjectStore } from '@/stores/projectStore';
import { useDesignStore } from '@/stores/designStore';
import { useAnimPresetStore } from '@/hooks/useAnimationPresets';
import { v4 as uuid } from 'uuid';
import type { DashboardExecResult } from '../dashboardExecutor';
import { handleAddText, handleAddShape, handleAddButton, handleSetAnimation } from './designElementCreators';

// ── Executor ──

export function executeDesignTool(
    toolName: string,
    params: Record<string, unknown>,
): DashboardExecResult | null {
    const designStore = useDesignStore.getState();

    switch (toolName) {
        case 'list_elements': {
            const cs = designStore.creativeSet;
            if (!cs) return { success: false, message: 'No creative set open.' };
            const master = cs.variants.find(v => v.id === cs.masterVariantId);
            if (!master || master.elements.length === 0) return { success: true, message: 'No elements in the master design.', data: [] };
            const elements = master.elements.map((el: any) => ({
                id: el.id, name: el.name, type: el.type,
                content: el.content ?? el.label ?? '', color: el.color ?? el.fill ?? '',
                fontSize: el.fontSize ?? null, fontFamily: el.fontFamily ?? null,
            }));
            const summary = elements.map((e: any) => `• ${e.name} (${e.type}): "${e.content}"`).join('\n');
            return { success: true, message: `Elements in master:\n${summary}`, data: elements };
        }

        case 'update_element_text': {
            const cs = designStore.creativeSet;
            if (!cs) return { success: false, message: 'No creative set open.' };
            const elementName = (params.element_name as string || '').toLowerCase();
            const newText = params.new_text as string;
            if (!elementName || newText === undefined) return { success: false, message: 'element_name and new_text are required.' };
            let updated = 0;
            for (const variant of cs.variants) {
                for (const el of variant.elements) {
                    if (el.name.toLowerCase().includes(elementName)) {
                        const raw = el as any;
                        if (el.type === 'text' && 'content' in raw) { raw.content = newText; updated++; }
                        else if (el.type === 'button' && 'label' in raw) { raw.label = newText; updated++; }
                        else if ('content' in raw) { raw.content = newText; updated++; }
                    }
                }
            }
            if (updated === 0) return { success: false, message: `No element matching "${params.element_name}" found.` };
            useDesignStore.setState((state) => { state.creativeSet = cs; });
            return { success: true, message: `Updated text to "${newText}" on ${updated} element(s) matching "${params.element_name}" across all sizes.` };
        }

        case 'update_element_property': {
            const cs = designStore.creativeSet;
            if (!cs) return { success: false, message: 'No creative set open.' };
            const elementName = (params.element_name as string || '').toLowerCase();
            const property = params.property as string;
            const rawValue = params.value as string;
            if (!elementName || !property) return { success: false, message: 'element_name and property are required.' };
            let value: unknown = rawValue;
            const numericProps = ['fontSize', 'opacity', 'borderRadius', 'lineHeight', 'letterSpacing', 'fontWeight', 'zIndex'];
            if (numericProps.includes(property)) { value = Number(rawValue); if (!Number.isFinite(value as number)) return { success: false, message: `Invalid numeric value "${rawValue}" for property "${property}".` }; }
            let updated = 0;
            for (const variant of cs.variants) { for (const el of variant.elements) { if (el.name.toLowerCase().includes(elementName)) { (el as any)[property] = value; updated++; } } }
            if (updated === 0) return { success: false, message: `No element matching "${params.element_name}" found.` };
            useDesignStore.setState((state) => { state.creativeSet = cs; });
            return { success: true, message: `Set "${property}" = "${rawValue}" on ${updated} element(s) matching "${params.element_name}".` };
        }

        case 'add_text': return handleAddText(params);
        case 'add_shape': return handleAddShape(params);
        case 'add_button': return handleAddButton(params);
        case 'set_animation': return handleSetAnimation(params);

        case 'set_custom_style': {
            const cs = designStore.creativeSet;
            if (!cs) return { success: false, message: 'No creative set open.' };
            const elementName = (params.element_name as string || '').toLowerCase();
            const styles = params.styles as Record<string, string>;
            if (!elementName || !styles || typeof styles !== 'object') return { success: false, message: 'element_name and styles object are required.' };
            let updated = 0;
            for (const variant of cs.variants) { for (const el of variant.elements) { if (el.name.toLowerCase().includes(elementName)) { const raw = el as any; raw.customStyles = { ...(raw.customStyles || {}), ...styles }; updated++; } } }
            if (updated === 0) return { success: false, message: `No element matching "${params.element_name}" found.` };
            useDesignStore.setState((state) => { state.creativeSet = cs; });
            const styleList = Object.entries(styles).map(([k, v]) => `${k}: ${v}`).join(', ');
            return { success: true, message: `Applied custom styles to ${updated} element(s) matching "${params.element_name}": ${styleList}` };
        }

        case 'execute_dynamic_action': {
            const description = params.description as string || 'Custom action';
            const code = params.code as string;
            if (!code) return { success: false, message: 'code is required.' };
            const stateSnapshot = JSON.stringify(useDesignStore.getState().creativeSet);
            const startTime = performance.now();
            try {
                const fn = new Function('designStore', 'useDesignStore', 'useProjectStore', 'useAnimPresetStore', 'uuid',
                    `"use strict"; try { ${code} } catch (e) { return "Error: " + e.message + (e.stack ? " | Stack: " + e.stack.split("\\n").slice(0,3).join(" ") : ""); }`
                );
                const result = fn(useDesignStore.getState(), useDesignStore, useProjectStore, useAnimPresetStore, uuid);
                const elapsed = (performance.now() - startTime).toFixed(1);
                const resultStr = typeof result === 'string' ? result : JSON.stringify(result ?? 'Done');
                if (typeof resultStr === 'string' && resultStr.startsWith('Error:')) {
                    try { useDesignStore.setState({ creativeSet: JSON.parse(stateSnapshot) }); } catch { /* */ }
                    return { success: false, message: `${description}: ${resultStr}` };
                }
                return { success: true, message: `${description}: ${resultStr}` };
            } catch (err) {
                try { useDesignStore.setState({ creativeSet: JSON.parse(stateSnapshot) }); } catch { /* */ }
                const errMsg = err instanceof Error ? `${err.message} (${err.stack?.split('\n').slice(0, 2).join(' | ')})` : String(err);
                return { success: false, message: `Failed: "${description}" — ${errMsg}` };
            }
        }

        default: return null;
    }
}

/** Alias for commandExecutor.ts compatibility */
export const executeDesignCommand = executeDesignTool;
