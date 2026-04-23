/**
 * FastAPI routes served by `alexa_mcp.server:web_app` (Vite dev proxies `/api` to backend).
 */
export interface BridgeStatus {
    status: string;
    server: string;
    version: string;
    standard: string;
    engines: {
        stt: string;
        tts: string;
        io: string;
    };
    stats: {
        interactions: number;
        health: string;
    };
}

export const api = {
    status: "/api/status",
    logs: "/api/logs",
    fleetLaunch: "/api/fleet/launch",
    tools: "/api/tools",
    toolExecute: (toolName: string) => `/api/tools/${encodeURIComponent(toolName)}`,
    /** MCP `interact` bridge (voice loop). */
    chatBridge: "/api/chat",
    /** Local LLM (Ollama / OpenAI-compatible). */
    aiChat: "/api/ai/chat",
    aiModels: (provider: string, endpoint: string) => {
        const q = new URLSearchParams({ provider, endpoint });
        return `/api/ai/models?${q.toString()}`;
    },
    /** TTS output device + volume (persisted on server under ~/.alexa-mcp/playback.json). */
    playback: "/api/audio/playback",
    /** Chime or TTS "Hello" on the selected output (POST JSON `{ "kind": "chime" | "hello" }`). */
    playbackTest: "/api/audio/playback/test",
} as const;

/** POST /api/tools/{name} with MCP-style `{ arguments: { ... } }` body. */
export async function postTool(
    toolName: string,
    args: Record<string, unknown> = {},
): Promise<{ ok: true; result: unknown } | { ok: false; message: string }> {
    const res = await fetch(api.toolExecute(toolName), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ arguments: args }),
    });
    const data = (await res.json()) as { result?: unknown; error?: string };
    if (!res.ok) {
        return { ok: false, message: data.error ?? `HTTP ${res.status}` };
    }
    if (data.error) {
        return { ok: false, message: String(data.error) };
    }
    return { ok: true, result: data.result };
}

const SETTINGS_KEY = "alexa-mcp-llm-settings";

export interface LlmSettings {
    provider: string;
    model: string;
    endpoint: string;
}

export function loadLlmSettings(): LlmSettings | null {
    try {
        const raw = localStorage.getItem(SETTINGS_KEY);
        if (!raw) return null;
        const o = JSON.parse(raw) as Partial<LlmSettings>;
        if (typeof o.provider === "string" && typeof o.model === "string" && typeof o.endpoint === "string") {
            return { provider: o.provider, model: o.model, endpoint: o.endpoint };
        }
    } catch {
        /* ignore */
    }
    return null;
}

export function saveLlmSettings(s: LlmSettings): void {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
}
