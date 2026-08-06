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

export interface LogEntry {
    id: string;
    timestamp: string;
    level: string;
    kind: string;
    detail: string;
    meta?: Record<string, unknown>;
}

export interface LogsQueryResponse {
    entries: LogEntry[];
    total: number;
    limit: number;
    offset: number;
    max_entries: number;
    sort: string;
}

export interface LogStats {
    total: number;
    max_entries: number;
    rotation: string;
    env_max?: string;
    by_level: Record<string, number>;
    by_kind: Record<string, number>;
    oldest: string | null;
    newest: string | null;
}

export interface LogQueryParams {
    limit?: number;
    offset?: number;
    level?: string;
    kind?: string;
    search?: string;
    sort?: "asc" | "desc";
    after_id?: string;
}

export interface InteractionSummary {
    interaction_id?: number;
    command?: string;
    response?: string;
    success?: boolean;
}

export const api = {
    status: "/api/status",
    logs: "/api/logs",
    logsStats: "/api/logs/stats",
    logsExport: "/api/logs/export",
    activity: "/api/activity",
    fleetLaunch: "/api/fleet/launch",
    tools: "/api/tools",
    toolExecute: (toolName: string) => `/api/tools/${encodeURIComponent(toolName)}`,
    chatBridge: "/api/chat",
    aiChat: "/api/ai/chat",
    aiModels: (provider: string, endpoint: string) => {
        const q = new URLSearchParams({ provider, endpoint });
        return `/api/ai/models?${q.toString()}`;
    },
    playback: "/api/audio/playback",
    playbackTest: "/api/audio/playback/test",
    playbackLevel: "/api/audio/level",
    playbackLevelLoopback: "/api/audio/level/loopback",
} as const;

export interface PlaybackLevel {
    rms: number;
    peak: number;
    db: number;
    bars: number[];
    playing: boolean;
    source: string;
    loopback_active: boolean;
    loopback_device: number | null;
    updated_at: number;
}

function buildLogParams(params: LogQueryParams): string {
    const q = new URLSearchParams();
    if (params.limit != null) q.set("limit", String(params.limit));
    if (params.offset != null) q.set("offset", String(params.offset));
    if (params.level) q.set("level", params.level);
    if (params.kind) q.set("kind", params.kind);
    if (params.search) q.set("search", params.search);
    if (params.sort) q.set("sort", params.sort);
    if (params.after_id) q.set("after_id", params.after_id);
    return q.toString();
}

export async function queryLogs(params: LogQueryParams = {}): Promise<LogsQueryResponse> {
    const qs = buildLogParams(params);
    const res = await fetch(`${api.logs}${qs ? `?${qs}` : ""}`);
    if (!res.ok) throw new Error(`Logs query failed: ${res.status}`);
    return res.json() as Promise<LogsQueryResponse>;
}

export async function getLogStats(): Promise<LogStats> {
    const res = await fetch(`${api.logs}/stats`);
    if (!res.ok) throw new Error(`Log stats failed: ${res.status}`);
    return res.json() as Promise<LogStats>;
}

export async function clearLogs(): Promise<void> {
    const res = await fetch(api.logs, { method: "DELETE" });
    if (!res.ok) throw new Error(`Clear logs failed: ${res.status}`);
}

export async function downloadLogsExport(
    format: "json" | "csv",
    filters: Omit<LogQueryParams, "limit" | "offset" | "after_id"> = {},
): Promise<void> {
    const q = buildLogParams({ ...filters });
    const res = await fetch(`${api.logs}/export?format=${format}${q ? `&${q}` : ""}`);
    if (!res.ok) throw new Error(`Export failed: ${res.status}`);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `alexa-mcp-logs.${format}`;
    anchor.click();
    URL.revokeObjectURL(url);
}

export function interactionFromEntry(entry: LogEntry): {
    id: string;
    command: string;
    response: string;
    success: boolean;
    recorded_at: string;
} {
    const meta = (entry.meta ?? {}) as InteractionSummary;
    const cmd = String(meta.command ?? entry.detail.split(" → ")[0] ?? "");
    const resp = String(meta.response ?? entry.detail.split(" → ")[1] ?? "");
    return {
        id: String(meta.interaction_id ?? entry.id),
        command: cmd,
        response: resp,
        success: Boolean(meta.success ?? entry.level !== "ERROR"),
        recorded_at: entry.timestamp,
    };
}

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
