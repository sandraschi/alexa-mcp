"""Fleet-standard /api/logs routes (WEBAPP_LOGS_PAGE.md)."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from fastapi.responses import Response

from .activity_log import SortOrder, clear_logs, export_logs, log_activity, log_stats, query_logs
from .auth import authenticate

router = APIRouter(prefix="/api", dependencies=[Depends(authenticate)])


@router.get("/logs")
async def logs_query(
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    level: str | None = Query(None),
    kind: str | None = Query(None),
    search: str | None = Query(None),
    sort: str = Query("desc"),
    after_id: str | None = Query(None),
) -> dict:
    order: SortOrder = "asc" if sort == "asc" else "desc"
    return query_logs(
        limit=limit,
        offset=offset,
        level=level,
        kind=kind,
        search=search,
        sort=order,
        after_id=after_id,
    )


@router.get("/logs/stats")
async def logs_stats() -> dict:
    return log_stats()


@router.get("/logs/export")
async def logs_export(
    format: str = Query("json"),
    level: str | None = Query(None),
    kind: str | None = Query(None),
    search: str | None = Query(None),
    sort: str = Query("desc"),
) -> Response:
    order: SortOrder = "asc" if sort == "asc" else "desc"
    if format not in ("json", "csv"):
        format = "json"
    body, media_type, filename = export_logs(
        format=format,
        level=level,
        kind=kind,
        search=search,
        sort=order,
    )
    return Response(
        content=body,
        media_type=media_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.delete("/logs")
async def logs_clear() -> dict[str, bool]:
    clear_logs()
    log_activity("system", "Log buffer cleared", level="WARNING")
    return {"success": True}


@router.get("/activity")
async def activity_feed(limit: int = Query(50, ge=1, le=200)) -> dict:
    """Legacy dashboard widget — interaction entries only."""
    return query_logs(limit=limit, offset=0, kind="interaction", sort="desc")
