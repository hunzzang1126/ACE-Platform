# ─────────────────────────────────────────────────
# Health Check Route
# ─────────────────────────────────────────────────
import os
from fastapi import APIRouter

router = APIRouter()


@router.get("/health")
async def health_check():
    """Server health check."""
    api_key = os.getenv("OPENAI_API_KEY", "")
    has_key = bool(api_key and not api_key.startswith("sk-your"))
    return {
        "status": "ok",
        "service": "ace-backend",
        "version": "0.1.0",
        "openai_configured": has_key,
    }
