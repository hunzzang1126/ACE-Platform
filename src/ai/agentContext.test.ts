// ─────────────────────────────────────────────────
// agentContext.test.ts — Tests for AgentMessage types
// ─────────────────────────────────────────────────
// Ensures new message roles (thinking, image_gallery)
// are properly typed and structured.
// ─────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import type { AgentMessage } from '@/ai/agentContext';

describe('agentContext', () => {
    describe('AgentMessage types', () => {
        it('supports thinking role', () => {
            const msg: AgentMessage = {
                role: 'thinking',
                content: 'Analyzing user request: "change the background"...\nThe user wants to replace the existing background image without modifying other elements.\nI should use replace_background_image, not generate_full_design.',
                timestamp: Date.now(),
            };
            expect(msg.role).toBe('thinking');
            expect(msg.content.length).toBeGreaterThan(100);
        });

        it('supports image_gallery role with gallery data', () => {
            const msg: AgentMessage = {
                role: 'image_gallery',
                content: 'Choose a background:',
                timestamp: Date.now(),
                imageGallery: {
                    images: [
                        { id: '1', url: 'data:image/png;base64,abc', prompt: 'sunset over ocean' },
                        { id: '2', url: 'data:image/png;base64,def', prompt: 'sunset over ocean' },
                        { id: '3', url: 'data:image/png;base64,ghi', prompt: 'sunset over ocean' },
                    ],
                    canvasW: 300,
                    canvasH: 250,
                },
            };
            expect(msg.role).toBe('image_gallery');
            expect(msg.imageGallery).toBeDefined();
            expect(msg.imageGallery!.images).toHaveLength(3);
            expect(msg.imageGallery!.canvasW).toBe(300);
            expect(msg.imageGallery!.canvasH).toBe(250);
        });

        it('image_gallery images have required fields', () => {
            const gallery: AgentMessage['imageGallery'] = {
                images: [
                    { id: 'img-1', url: 'data:image/png;base64,xyz', prompt: 'dark moody cityscape at night' },
                ],
                canvasW: 728,
                canvasH: 90,
            };
            const img = gallery!.images[0]!;
            expect(img.id).toBeTruthy();
            expect(img.url).toContain('data:image');
            expect(img.prompt).toBeTruthy();
        });

        it('supports action role with actionCard', () => {
            const msg: AgentMessage = {
                role: 'action',
                content: '',
                timestamp: Date.now(),
                actionCard: {
                    id: 'thinking',
                    label: 'Processing...',
                    status: 'running',
                },
            };
            expect(msg.role).toBe('action');
            expect(msg.actionCard?.status).toBe('running');
        });

        it('standard roles still work', () => {
            const user: AgentMessage = { role: 'user', content: 'hello', timestamp: 1 };
            const assistant: AgentMessage = { role: 'assistant', content: 'hi', timestamp: 2 };
            const system: AgentMessage = { role: 'system', content: 'init', timestamp: 3 };
            expect(user.role).toBe('user');
            expect(assistant.role).toBe('assistant');
            expect(system.role).toBe('system');
        });

        it('★ REGRESSION: thinking message has long content (100+ chars)', () => {
            // Extended thinking returns 100+ char reasoning
            // Short status messages (<100 chars) should go to action cards, not thinking
            const reasoning = 'The user asked for a background replacement. I need to analyze the existing design first, identify the current background element, then use replace_background_image tool to swap it out.';
            expect(reasoning.length).toBeGreaterThan(100);
            const msg: AgentMessage = {
                role: 'thinking',
                content: reasoning,
                timestamp: Date.now(),
            };
            expect(msg.role).toBe('thinking');
        });
    });
});
