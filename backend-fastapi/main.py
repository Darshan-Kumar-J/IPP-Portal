"""
IPP (Internal Platforms Portal) — Modular FastAPI Reference Service
Provides Python REST APIs, Pydantic v2 validation, JWT verification middleware,
Redis caching abstraction, and LangGraph / DeepAgents / A2A workflow hooks.
"""

import os
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import Depends, FastAPI, HTTPException, Header
from pydantic import BaseModel, Field

app = FastAPI(
    title="IPP Internal Platforms Portal API",
    version="1.0.0",
    description="Enterprise developer portal backend for platforms, APIs, docs, and AI workflows.",
)


class TokenClaims(BaseModel):
    sub: str
    email: str
    role: str


async def verify_jwt(authorization: Optional[str] = Header(default=None)) -> TokenClaims:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing Bearer JWT token")
    # In production, verify signature using PyJWT / JWKS public key
    return TokenClaims(sub="demo-user", email="architect@enterprise-ipp.example", role="Administrator")


class PlatformCreate(BaseModel):
    name: str = Field(min_length=2)
    description: str = Field(min_length=10)
    category: str
    domain: str
    tier: str = "Tier 2"


class WorkflowExecuteRequest(BaseModel):
    name: str
    intent: str
    prompt: str


@app.get("/health")
async def health_check():
    return {
        "status": "ok",
        "service": "ipp-fastapi",
        "redis_configured": bool(os.getenv("REDIS_URL")),
        "database_configured": bool(os.getenv("DATABASE_URL")),
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@app.post("/api/platforms", status_code=201)
async def create_platform(payload: PlatformCreate, claims: TokenClaims = Depends(verify_jwt)):
    if claims.role not in ("Administrator", "Platform Producer"):
        raise HTTPException(status_code=403, detail="Insufficient RBAC permissions")
    return {"created": True, "platform": payload.model_dump(), "actor": claims.email}


@app.post("/api/ai/workflows/execute")
async def execute_langgraph_workflow(req: WorkflowExecuteRequest, claims: TokenClaims = Depends(verify_jwt)):
    return {
        "workflow_id": f"wf-{int(datetime.now(timezone.utc).timestamp())}",
        "intent": req.intent,
        "orchestrator": "langgraph-deepagents-a2a",
        "actor": claims.email,
        "status": "Completed",
    }
