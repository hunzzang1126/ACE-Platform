// ─────────────────────────────────────────────────
// Asset Analyzer — Vision API auto-analysis
// ─────────────────────────────────────────────────
// When a user uploads an image, this service calls the Vision API
// to automatically extract metadata: type, colors, suggested role,
// description, tags, transparency, aspect ratio, quality.
// This makes ACE's asset library "smart" -- upload only, no manual tagging.

import { getAnthropicKey } from '@/config/apiKeys';

// ── Types ──

export type AssetType = 'photo' | 'logo' | 'illustration' | 'icon' | 'pattern' | 'unknown';
export type AssetQuality = 'high' | 'medium' | 'low';
export type SuggestedRole = 'background' | 'logo' | 'hero_image' | 'accent' | 'badge' | 'none';

export interface AssetAnalysis {
    /** Detected content type */
    type: AssetType;
    /** Dominant colors extracted (hex) */
    dominantColors: string[];
    /** Suggested design role */
    suggestedRole: SuggestedRole;
    /** AI-generated description */
    description: string;
    /** Auto-generated tags for search */
    tags: string[];
    /** Whether the image has alpha transparency */
    hasTransparency: boolean;
    /** Detected aspect ratio label */
    aspectRatio: string;
    /** Quality assessment */
    quality: AssetQuality;
}

export interface AssetLibraryItem {
    id: string;
    /** Original filename */
    fileName: string;
    /** Data URL or blob URL */
    src: string;
    /** File size in bytes */
    fileSize: number;
    /** Width × Height */
    width: number;
    height: number;
    /** AI analysis result */
    analysis?: AssetAnalysis;
    /** Analysis status */
    status: 'pending' | 'analyzing' | 'done' | 'error';
    /** Timestamp */
    uploadedAt: string;
}

// ── Analysis Prompt ──

const ANALYSIS_PROMPT = `Analyze this image for a banner/social media design tool. Return a JSON object with:

{
  "type": "photo" | "logo" | "illustration" | "icon" | "pattern",
  "dominantColors": ["#hex1", "#hex2", "#hex3"],
  "suggestedRole": "background" | "logo" | "hero_image" | "accent" | "badge" | "none",
  "description": "Short description of image content",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"],
  "hasTransparency": false,
  "quality": "high" | "medium" | "low"
}

Rules:
- "type": logo if it's a brand logo, icon if small symbol, pattern if repeatable texture, illustration if vector-style art, photo otherwise
- "dominantColors": top 3 hex colors
- "suggestedRole": where this image fits best in a banner design
- "description": 1 sentence, factual, no opinions
- "tags": 5 keywords for search
- "quality": based on resolution, noise, blur
- Return ONLY valid JSON, no markdown`;

// ── Image Utilities ──

function detectAspectRatio(width: number, height: number): string {
    const ratio = width / height;
    if (Math.abs(ratio - 1) < 0.05) return '1:1';
    if (Math.abs(ratio - 16 / 9) < 0.05) return '16:9';
    if (Math.abs(ratio - 9 / 16) < 0.05) return '9:16';
    if (Math.abs(ratio - 4 / 3) < 0.05) return '4:3';
    if (Math.abs(ratio - 3 / 4) < 0.05) return '3:4';
    if (Math.abs(ratio - 4 / 5) < 0.05) return '4:5';
    return `${width}:${height}`;
}

function checkTransparency(dataUrl: string): boolean {
    // PNG format starts with iVBOR (base64 of PNG header)
    // Only PNG supports transparency
    return dataUrl.includes('data:image/png') || dataUrl.includes('data:image/webp');
}

// ── Public API ──

/**
 * Analyze an uploaded image using the Vision API.
 * Returns structured metadata for the asset library.
 *
 * @param dataUrl - Base64 data URL of the image
 * @param fileName - Original filename
 * @param width - Image width in pixels
 * @param height - Image height in pixels
 */
export async function analyzeAsset(
    dataUrl: string,
    fileName: string,
    width: number,
    height: number,
): Promise<AssetAnalysis> {
    const aspectRatio = detectAspectRatio(width, height);
    const hasTransparency = checkTransparency(dataUrl);

    // Try Vision API analysis
    try {
        const apiKey = getAnthropicKey();

        if (!apiKey) {
            // No API key -- return basic analysis from filename/dimensions
            return fallbackAnalysis(fileName, width, height, hasTransparency, aspectRatio);
        }

        const analysis = await analyzeWithClaude(dataUrl);

        return {
            ...analysis,
            hasTransparency,
            aspectRatio,
        };
    } catch (err) {
        console.warn('[AssetAnalyzer] Vision API failed, using fallback:', err);
        return fallbackAnalysis(fileName, width, height, hasTransparency, aspectRatio);
    }
}

// ── Claude Vision ──

async function analyzeWithClaude(dataUrl: string): Promise<AssetAnalysis> {
    const base64 = dataUrl.split(',')[1] || '';
    const mediaType = dataUrl.split(';')[0]?.split(':')[1] || 'image/png';

    const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': getAnthropicKey(),
            'anthropic-version': '2023-06-01',
            'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
            model: 'anthropic/claude-sonnet-4',
            max_tokens: 500,
            messages: [{
                role: 'user',
                content: [
                    {
                        type: 'image',
                        source: { type: 'base64', media_type: mediaType, data: base64 },
                    },
                    { type: 'text', text: ANALYSIS_PROMPT },
                ],
            }],
        }),
    });

    if (!response.ok) throw new Error(`Claude API error: ${response.status}`);

    const data = await response.json();
    const text = data.content?.[0]?.text || '{}';
    return parseAnalysisResponse(text);
}

// ── OpenAI Vision ──

async function analyzeWithOpenAI(dataUrl: string, apiKey: string): Promise<AssetAnalysis> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            model: 'gpt-4o-mini',
            max_tokens: 500,
            messages: [{
                role: 'user',
                content: [
                    { type: 'image_url', image_url: { url: dataUrl, detail: 'low' } },
                    { type: 'text', text: ANALYSIS_PROMPT },
                ],
            }],
        }),
    });

    if (!response.ok) throw new Error(`OpenAI API error: ${response.status}`);

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || '{}';
    return parseAnalysisResponse(text);
}

// ── Response Parser ──

function parseAnalysisResponse(text: string): AssetAnalysis {
    try {
        // Extract JSON from response (may have markdown wrapper)
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error('No JSON found');
        const parsed = JSON.parse(jsonMatch[0]);

        return {
            type: parsed.type || 'unknown',
            dominantColors: Array.isArray(parsed.dominantColors) ? parsed.dominantColors : [],
            suggestedRole: parsed.suggestedRole || 'none',
            description: parsed.description || 'No description available',
            tags: Array.isArray(parsed.tags) ? parsed.tags : [],
            hasTransparency: Boolean(parsed.hasTransparency),
            aspectRatio: parsed.aspectRatio || '1:1',
            quality: parsed.quality || 'medium',
        };
    } catch {
        return {
            type: 'unknown',
            dominantColors: [],
            suggestedRole: 'none',
            description: 'Analysis failed',
            tags: [],
            hasTransparency: false,
            aspectRatio: '1:1',
            quality: 'medium',
        };
    }
}

// ── Fallback Analysis (no API key) ──

function fallbackAnalysis(
    fileName: string,
    width: number,
    height: number,
    hasTransparency: boolean,
    aspectRatio: string,
): AssetAnalysis {
    const name = fileName.toLowerCase();

    // Guess type from filename
    let type: AssetType = 'photo';
    let suggestedRole: SuggestedRole = 'hero_image';

    if (name.includes('logo')) {
        type = 'logo';
        suggestedRole = 'logo';
    } else if (name.includes('icon') || name.includes('badge')) {
        type = 'icon';
        suggestedRole = 'badge';
    } else if (name.includes('bg') || name.includes('background')) {
        type = 'photo';
        suggestedRole = 'background';
    } else if (name.includes('pattern') || name.includes('texture')) {
        type = 'pattern';
        suggestedRole = 'background';
    }

    // Small images are likely icons/logos
    if (width < 200 && height < 200) {
        type = hasTransparency ? 'logo' : 'icon';
        suggestedRole = hasTransparency ? 'logo' : 'badge';
    }

    return {
        type,
        dominantColors: [],
        suggestedRole,
        description: `Uploaded image: ${fileName}`,
        tags: [type, suggestedRole, aspectRatio.replace(':', 'x')],
        hasTransparency,
        aspectRatio,
        quality: width >= 1000 ? 'high' : width >= 500 ? 'medium' : 'low',
    };
}
