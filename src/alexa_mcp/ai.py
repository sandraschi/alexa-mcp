"""AI Router for MCP Webapps.

Provides a standardized bridge to Local LLMs (Ollama, LM Studio).
"""

import logging
import os
from typing import Any

import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from .auth import authenticate

logger = logging.getLogger("alexa-mcp.ai")

router = APIRouter(prefix="/api/ai", tags=["ai"], dependencies=[Depends(authenticate)])

# Prefer IPv4 and bypass HTTP(S)_PROXY for local Ollama (common cause of "connection failed").
_DEFAULT_ENDPOINT = os.environ.get("ALEXA_OLLAMA_ENDPOINT", "http://127.0.0.1:11434")


def _llm_client() -> httpx.AsyncClient:
    return httpx.AsyncClient(
        trust_env=False,
        timeout=httpx.Timeout(120.0, connect=8.0),
    )


def _ollama_unreachable_hint(endpoint: str, err: str) -> str:
    return (
        f"Cannot reach Ollama at {endpoint!r} ({err}). "
        "Ensure `ollama serve` is running (or the Ollama app on Windows), and the API port matches. "
        "If you use a proxy, it is ignored for this client (trust_env=False). "
        "Override the base URL in Settings or set ALEXA_OLLAMA_ENDPOINT on the server."
    )


class ChatRequest(BaseModel):
    """Request model for AI chat processing."""

    message: str = Field(..., description="The user message to process")
    provider: str = Field("ollama", description="LLM provider: ollama, lmstudio")
    model: str = Field("llama3", description="Model name to use")
    endpoint: str = Field(_DEFAULT_ENDPOINT, description="Provider API endpoint")


class ChatResponse(BaseModel):
    """Standardized response from the AI bridge."""

    response: str
    tool_calls: list[str] = []
    status: str = "success"


@router.post("/chat", response_model=ChatResponse)
async def chat_with_llm(request: ChatRequest) -> ChatResponse:
    """Standardized chat endpoint for Local LLM integration.

    Supports Ollama and LM Studio (OpenAI-compatible).
    """
    base = request.endpoint.rstrip("/")
    logger.info(f"AI Request: {request.provider} / {request.model} @ {base}")
    try:
        if request.provider == "ollama":
            async with _llm_client() as client:
                resp = await client.post(
                    f"{base}/api/generate",
                    json={
                        "model": request.model,
                        "prompt": request.message,
                        "stream": False,
                    },
                )
                resp.raise_for_status()
                data = resp.json()
                return ChatResponse(response=data.get("response", "No response from Ollama"))

        if request.provider in ("lmstudio", "openai_compatible"):
            async with _llm_client() as client:
                resp = await client.post(
                    f"{base}/v1/chat/completions",
                    json={
                        "messages": [{"role": "user", "content": request.message}],
                        "model": request.model,
                        "temperature": 0.7,
                    },
                )
                resp.raise_for_status()
                data = resp.json()
                return ChatResponse(response=data["choices"][0]["message"]["content"])

        raise HTTPException(status_code=400, detail=f"Provider {request.provider} not supported")

    except httpx.ConnectError as e:
        if request.provider == "ollama":
            msg = _ollama_unreachable_hint(request.endpoint, str(e))
        else:
            msg = f"Connect error: {e!s}"
        logger.error("AI Bridge connect failure: %s", e)
        return ChatResponse(response=msg, status="error")
    except httpx.TimeoutException as e:
        logger.error("AI Bridge timeout: %s", e)
        return ChatResponse(response=f"Request timed out talking to {base}: {e!s}", status="error")
    except httpx.HTTPStatusError as e:
        detail = (e.response.text or str(e))[:800]
        logger.error("AI Bridge HTTP error: %s", detail)
        return ChatResponse(response=f"LLM HTTP {e.response.status_code}: {detail}", status="error")
    except Exception as e:
        logger.error(f"AI Bridge Failure: {e}")
        return ChatResponse(response=f"AI Bridge Error: {e!s}", status="error")


@router.get("/models")
async def list_models(
    provider: str = "ollama",
    endpoint: str = _DEFAULT_ENDPOINT,
) -> dict[str, Any]:
    """List available models for the given provider."""
    base = endpoint.rstrip("/")
    try:
        if provider == "ollama":
            async with _llm_client() as client:
                resp = await client.get(f"{base}/api/tags")
                resp.raise_for_status()
                return resp.json()
        return {"models": []}
    except httpx.ConnectError as e:
        msg = _ollama_unreachable_hint(endpoint, str(e)) if provider == "ollama" else str(e)
        logger.warning("Ollama model list connect error: %s", e)
        return {"error": msg, "models": []}
    except httpx.TimeoutException as e:
        logger.warning("Ollama model list timeout: %s", e)
        return {"error": f"Timed out reaching {base}: {e!s}", "models": []}
    except Exception as e:
        logger.warning("Failed to fetch models from %s: %s", provider, e)
        return {"error": str(e), "models": []}
