# ─────────────────────────────────────────────────
# Vision QA Route — GPT-4o Vision for banner QA
# ─────────────────────────────────────────────────
import os
import json
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter()


# ── Request / Response Schemas ──

class VariantScreenshot(BaseModel):
    variant_id: str
    width: int
    height: int
    name: str
    screenshot_base64: str  # base64 encoded PNG


class VisionQARequest(BaseModel):
    creative_set_id: str
    master_screenshot_base64: str
    master_width: int
    master_height: int
    variants: list[VariantScreenshot]


class Issue(BaseModel):
    type: str       # TEXT_CLIPPING, ELEMENT_OVERLAP, EMPTY_SPACE, etc.
    severity: str   # high, medium, low
    element: str    # which element has the issue
    description: str
    suggestion: str


class VariantQAResult(BaseModel):
    variant_id: str
    width: int
    height: int
    name: str
    score: int      # 0-100
    issues: list[Issue]


class VisionQAResponse(BaseModel):
    creative_set_id: str
    overall_score: int
    variants: list[VariantQAResult]


# ── Vision QA Prompt ──

VISION_QA_PROMPT = """You are an expert banner ad QA inspector. You will receive two images:
1. The MASTER banner design (the original)
2. A RESIZED variant

The variant has been auto-resized from {master_w}×{master_h} to {variant_w}×{variant_h}.

Carefully compare both images and check for these issues:

1. TEXT_CLIPPING: Any text cut off, truncated, or extending beyond the canvas boundary
2. ELEMENT_OVERLAP: Design elements overlapping each other in unintended ways
3. EMPTY_SPACE: More than 30% of the canvas is empty/unused (wasted space)
4. FONT_READABILITY: Any text that appears too small to read (below ~10px equivalent)
5. ELEMENT_MISSING: Elements visible in the master but not shown in the variant
6. VISUAL_BALANCE: Visual weight is heavily skewed to one side/corner
7. CTA_VISIBILITY: Call-to-action button is too small, hidden, or not prominent
8. BRAND_CONSISTENCY: Colors, fonts, or style noticeably differ from the master

For each issue found, rate severity as:
- "high": Breaks the ad's effectiveness — must fix
- "medium": Noticeable quality issue — should fix
- "low": Minor polish — nice to fix

Give an overall score from 0-100 where:
- 90-100: Production ready
- 70-89: Minor issues
- 50-69: Needs attention
- 0-49: Major problems

Respond with ONLY valid JSON (no markdown, no explanation):
{{
  "score": <number>,
  "issues": [
    {{
      "type": "<ISSUE_TYPE>",
      "severity": "<high|medium|low>",
      "element": "<element name or description>",
      "description": "<what's wrong>",
      "suggestion": "<how to fix it>"
    }}
  ]
}}

If the variant looks perfect, return: {{"score": 100, "issues": []}}"""


# ── Mock response for development without API key ──

def mock_qa_result(variant: VariantScreenshot) -> VariantQAResult:
    """Return a realistic mock QA result for development."""
    # Simulate common issues based on aspect ratio difference
    issues: list[Issue] = []
    aspect = variant.width / variant.height

    if aspect > 3:  # Very wide (e.g., 728×90)
        issues.append(Issue(
            type="FONT_READABILITY",
            severity="medium",
            element="headline",
            description="Headline text may be too small for the narrow height",
            suggestion="Reduce font size or use shorter copy",
        ))
    elif aspect < 0.5:  # Very tall (e.g., 160×600)
        issues.append(Issue(
            type="EMPTY_SPACE",
            severity="low",
            element="canvas",
            description="Large vertical empty space detected",
            suggestion="Redistribute elements vertically or add background imagery",
        ))

    score = max(0, 100 - len(issues) * 15)
    return VariantQAResult(
        variant_id=variant.variant_id,
        width=variant.width,
        height=variant.height,
        name=variant.name,
        score=score,
        issues=issues,
    )


# ── Endpoint ──

@router.post("/vision-qa", response_model=VisionQAResponse)
async def run_vision_qa(request: VisionQARequest):
    """
    Run Vision AI QA on all variant screenshots.
    Compares each variant against the master design.
    """
    api_key = os.getenv("OPENAI_API_KEY", "")
    use_real_api = bool(api_key and not api_key.startswith("sk-your"))

    results: list[VariantQAResult] = []

    for variant in request.variants:
        if use_real_api:
            result = await _call_vision_api(
                api_key=api_key,
                master_b64=request.master_screenshot_base64,
                master_w=request.master_width,
                master_h=request.master_height,
                variant=variant,
            )
        else:
            result = mock_qa_result(variant)
        results.append(result)

    # Overall score = average of all variants
    overall = int(sum(r.score for r in results) / max(len(results), 1))

    return VisionQAResponse(
        creative_set_id=request.creative_set_id,
        overall_score=overall,
        variants=results,
    )


async def _call_vision_api(
    api_key: str,
    master_b64: str,
    master_w: int,
    master_h: int,
    variant: VariantScreenshot,
) -> VariantQAResult:
    """Call GPT-4o Vision API to analyze a variant against the master."""
    try:
        from openai import AsyncOpenAI

        client = AsyncOpenAI(api_key=api_key)

        prompt = VISION_QA_PROMPT.format(
            master_w=master_w,
            master_h=master_h,
            variant_w=variant.width,
            variant_h=variant.height,
        )

        response = await client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/png;base64,{master_b64}",
                                "detail": "high",
                            },
                        },
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/png;base64,{variant.screenshot_base64}",
                                "detail": "high",
                            },
                        },
                    ],
                }
            ],
            max_tokens=1000,
            temperature=0.1,
        )

        # Parse JSON response
        raw = response.choices[0].message.content or "{}"
        # Strip markdown code blocks if present
        raw = raw.strip()
        if raw.startswith("```"):
            raw = raw.split("\n", 1)[1]
            raw = raw.rsplit("```", 1)[0]

        data = json.loads(raw)

        issues = [
            Issue(
                type=i.get("type", "UNKNOWN"),
                severity=i.get("severity", "medium"),
                element=i.get("element", "unknown"),
                description=i.get("description", ""),
                suggestion=i.get("suggestion", ""),
            )
            for i in data.get("issues", [])
        ]

        return VariantQAResult(
            variant_id=variant.variant_id,
            width=variant.width,
            height=variant.height,
            name=variant.name,
            score=data.get("score", 50),
            issues=issues,
        )

    except json.JSONDecodeError:
        return VariantQAResult(
            variant_id=variant.variant_id,
            width=variant.width,
            height=variant.height,
            name=variant.name,
            score=50,
            issues=[Issue(
                type="PARSE_ERROR",
                severity="medium",
                element="system",
                description="Could not parse Vision API response",
                suggestion="Retry the QA check",
            )],
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Vision API error: {str(e)}")
