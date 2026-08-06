"""HTTP API for Alexa session archive (list / get / export / reaper)."""

from __future__ import annotations

from typing import Any, Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from .auth import authenticate
from .session_archive import (
    delete_session,
    export_to_depot,
    get_session,
    list_sessions,
    send_to_reaper,
)

router = APIRouter(prefix="/api/sessions", tags=["sessions"], dependencies=[Depends(authenticate)])


class ExportBody(BaseModel):
    tier: Literal["fast", "slow", "auto"] = "fast"
    depot_url: str | None = Field(default=None, description="Override ALEXA_DEPOT_URL")


class ReaperBody(BaseModel):
    reaper_url: str | None = Field(default=None, description="Override ALEXA_REAPER_URL")


@router.get("")
async def api_list_sessions(limit: int = 50) -> dict[str, Any]:
    return {"success": True, "sessions": list_sessions(limit=limit)}


@router.get("/{session_id}")
async def api_get_session(session_id: str) -> dict[str, Any]:
    session = get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail=f"session not found: {session_id}")
    return {"success": True, **session}


@router.delete("/{session_id}")
async def api_delete_session(session_id: str) -> dict[str, Any]:
    if not delete_session(session_id):
        raise HTTPException(status_code=404, detail=f"session not found: {session_id}")
    return {"success": True, "deleted": session_id}


@router.post("/{session_id}/export-depot")
async def api_export_depot(session_id: str, body: ExportBody | None = None) -> dict[str, Any]:
    body = body or ExportBody()
    result = await export_to_depot(session_id, base_url=body.depot_url, tier=body.tier)
    if not result.get("success") and result.get("error", "").startswith("session not found"):
        raise HTTPException(status_code=404, detail=result["error"])
    return result


@router.post("/{session_id}/send-reaper")
async def api_send_reaper(session_id: str, body: ReaperBody | None = None) -> dict[str, Any]:
    body = body or ReaperBody()
    result = await send_to_reaper(session_id, base_url=body.reaper_url)
    if not result.get("success") and str(result.get("error", "")).startswith("session not found"):
        raise HTTPException(status_code=404, detail=result["error"])
    return result
