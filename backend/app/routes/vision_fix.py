# ─────────────────────────────────────────────────
# Vision Auto-Fix Route — GPT-4o generates constraint fixes
# ─────────────────────────────────────────────────
import os
import json
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter()


# ── Request / Response Schemas ──

class ElementData(BaseModel):
    id: str
    name: str
    type: str  # text, shape, button, image
    constraints: dict  # Full ElementConstraints JSON
    # Optional visual props for context
    content: str | None = None
    label: str | None = None
    fontSize: int | None = None
    fill: str | None = None
    color: str | None = None
    backgroundColor: str | None = None
    opacity: float | None = None


class IssueData(BaseModel):
    type: str
    severity: str
    element: str
    description: str
    suggestion: str


class VariantFixRequest(BaseModel):
    variant_id: str
    width: int
    height: int
    name: str
    issues: list[IssueData]
    elements: list[ElementData]


class AutoFixRequest(BaseModel):
    creative_set_id: str
    master_width: int
    master_height: int
    variants: list[VariantFixRequest]


class ElementFix(BaseModel):
    element_id: str
    new_constraints: dict  # Adjusted ElementConstraints
    explanation: str


class VariantFixResult(BaseModel):
    variant_id: str
    fixes: list[ElementFix]


class AutoFixResponse(BaseModel):
    creative_set_id: str
    variants: list[VariantFixResult]


# ── GPT-4o Fix Prompt ──

FIX_PROMPT = """You are an expert banner ad designer. A resized banner variant has design issues.

## Canvas Info
- Master size: {master_w}×{master_h}
- Target variant: {variant_w}×{variant_h} ({variant_name})

## Constraint System
Elements use anchor-based positioning (NOT absolute pixels):
- horizontal.anchor: "left" | "center" | "right" | "stretch"
- horizontal.offset: px offset from anchor
- vertical.anchor: "top" | "center" | "bottom" | "stretch"  
- vertical.offset: px offset from anchor
- size.widthMode / heightMode: "fixed" (px) | "relative" (0-1 ratio) | "auto"
- stretch: fills parent with margins (marginLeft, marginRight, marginTop, marginBottom)

## Current Elements
{elements_json}

## Issues Found
{issues_json}

## Your Task
Adjust the constraints to FIX the issues while maintaining design intent.

Rules:
1. For EMPTY_SPACE: Redistribute elements to fill the canvas better. Consider changing vertical offsets or using "stretch" anchors.
2. For VISUAL_BALANCE: Spread elements equally across the canvas. Use "center" anchor with adjusted offsets.
3. For TEXT_CLIPPING: Reduce font size (via fontSize field) or make the element wider.
4. For ELEMENT_OVERLAP: Increase offsets between overlapping elements.
5. For FONT_READABILITY: Increase fontSize to at least 10px.
6. Keep background/shape elements with "stretch" anchor - they should fill the canvas.
7. Maintain relative sizing (widthMode "relative") when possible for responsive behavior.
8. Only modify elements that need fixing. Don't change elements that are fine.

Return ONLY valid JSON (no markdown):
{{
  "fixes": [
    {{
      "element_id": "<id>",
      "new_constraints": {{ <full constraints object> }},
      "explanation": "<what you changed and why>"
    }}
  ]
}}

If no fixes needed, return: {{"fixes": []}}"""


# ── Endpoint ──

@router.post("/vision-fix", response_model=AutoFixResponse)
async def run_auto_fix(request: AutoFixRequest):
    """
    Generate constraint adjustments to fix Vision QA issues.
    Uses GPT-4o to reason about layout and produce fixes.
    """
    api_key = os.getenv("OPENAI_API_KEY", "")
    use_real_api = bool(api_key and not api_key.startswith("sk-your"))

    results: list[VariantFixResult] = []

    for variant in request.variants:
        if not variant.issues:
            results.append(VariantFixResult(variant_id=variant.variant_id, fixes=[]))
            continue

        if use_real_api:
            fixes = await _call_fix_api(
                api_key=api_key,
                master_w=request.master_width,
                master_h=request.master_height,
                variant=variant,
            )
        else:
            fixes = _mock_fix(variant)

        results.append(VariantFixResult(variant_id=variant.variant_id, fixes=fixes))

    return AutoFixResponse(
        creative_set_id=request.creative_set_id,
        variants=results,
    )


def _mock_fix(variant: VariantFixRequest) -> list[ElementFix]:
    """Mock fix for dev mode."""
    fixes = []
    for issue in variant.issues:
        if issue.type == "EMPTY_SPACE":
            # Find non-background elements and redistribute vertically
            for el in variant.elements:
                if el.type in ("text", "button"):
                    new_c = dict(el.constraints)
                    vert = dict(new_c.get("vertical", {}))
                    vert["anchor"] = "center"
                    vert["offset"] = 0
                    new_c["vertical"] = vert
                    fixes.append(ElementFix(
                        element_id=el.id,
                        new_constraints=new_c,
                        explanation=f"Centered {el.name} vertically to reduce empty space",
                    ))
                    break
        elif issue.type == "VISUAL_BALANCE":
            for el in variant.elements:
                if el.type == "text":
                    new_c = dict(el.constraints)
                    vert = dict(new_c.get("vertical", {}))
                    vert["anchor"] = "center"
                    vert["offset"] = -20
                    new_c["vertical"] = vert
                    fixes.append(ElementFix(
                        element_id=el.id,
                        new_constraints=new_c,
                        explanation=f"Adjusted {el.name} position for better visual balance",
                    ))
                    break
    return fixes


async def _call_fix_api(
    api_key: str,
    master_w: int,
    master_h: int,
    variant: VariantFixRequest,
) -> list[ElementFix]:
    """Use GPT-4o to generate constraint fixes."""
    try:
        from openai import AsyncOpenAI

        client = AsyncOpenAI(api_key=api_key)

        elements_json = json.dumps(
            [el.model_dump() for el in variant.elements],
            indent=2,
        )
        issues_json = json.dumps(
            [iss.model_dump() for iss in variant.issues],
            indent=2,
        )

        prompt = FIX_PROMPT.format(
            master_w=master_w,
            master_h=master_h,
            variant_w=variant.width,
            variant_h=variant.height,
            variant_name=variant.name,
            elements_json=elements_json,
            issues_json=issues_json,
        )

        response = await client.chat.completions.create(
            model="gpt-4o",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=2000,
            temperature=0.2,
        )

        raw = response.choices[0].message.content or "{}"
        raw = raw.strip()
        if raw.startswith("```"):
            raw = raw.split("\n", 1)[1]
            raw = raw.rsplit("```", 1)[0]

        data = json.loads(raw)

        return [
            ElementFix(
                element_id=f.get("element_id", ""),
                new_constraints=f.get("new_constraints", {}),
                explanation=f.get("explanation", ""),
            )
            for f in data.get("fixes", [])
        ]

    except json.JSONDecodeError:
        return []
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Fix API error: {str(e)}")
