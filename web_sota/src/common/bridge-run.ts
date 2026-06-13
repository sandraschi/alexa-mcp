import { api } from "@/common/api";

export type BridgeRunParams = {
    command: string;
    waitForResponse: boolean;
    timeout: number;
};

export async function runBridgeCommand(params: BridgeRunParams): Promise<string> {
    const clamped = Math.min(120, Math.max(1, Math.floor(params.timeout)));
    const res = await fetch(api.chatBridge, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            command: params.command,
            wait_for_response: params.waitForResponse,
            timeout: clamped,
        }),
    });
    const data = (await res.json()) as { response?: unknown };
    if (!res.ok) {
        return typeof data.response === "string"
            ? data.response
            : `Bridge error (HTTP ${res.status}).`;
    }
    if (typeof data.response === "string") {
        return data.response;
    }
    if (data.response != null) {
        return JSON.stringify(data.response);
    }
    return "No response from bridge.";
}
