# ─────────────────────────────────────────────────
# ACE Backend — FastAPI Entry Point
# ─────────────────────────────────────────────────
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

from app.routes import health, vision_qa, vision_fix  # noqa: E402


@asynccontextmanager
async def lifespan(application: FastAPI):
    """Startup / shutdown events."""
    print("🚀 ACE Backend starting...")
    api_key = os.getenv("OPENAI_API_KEY", "")
    if not api_key or api_key.startswith("sk-your"):
        print("⚠️  OPENAI_API_KEY not set — Vision QA will return mock data")
    else:
        print("✅ OpenAI API key configured")
    yield
    print("🛑 ACE Backend shutting down...")


app = FastAPI(
    title="ACE Creative Engine API",
    version="0.1.0",
    description="Backend API for ACE — AI-powered banner creative platform",
    lifespan=lifespan,
)

# ── CORS ──
frontend_url = os.getenv("ACE_FRONTEND_URL", "http://localhost:5173")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[frontend_url, "http://localhost:5173", "http://localhost:1420"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routes ──
app.include_router(health.router, tags=["Health"])
app.include_router(vision_qa.router, prefix="/api", tags=["Vision QA"])
app.include_router(vision_fix.router, prefix="/api", tags=["Vision Auto-Fix"])
