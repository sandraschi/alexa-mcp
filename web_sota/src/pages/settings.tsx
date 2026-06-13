import { useEffect, useState } from "react";
import { api, loadLlmSettings, saveLlmSettings } from "@/common/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, RefreshCw, Loader2 } from "lucide-react";

interface StatusPayload {
    status?: string;
    server?: string;
    version?: string;
    standard?: string;
}

function LLMSettings() {
    const [providers, setProviders] = useState<Record<string, {name:string}[]>>({});
    const [selectedProvider, setSelectedProvider] = useState("ollama");
    const [selectedModel, setSelectedModel] = useState("");
    const [status, setStatus] = useState<"loading"|"ready"|"error">("loading");
    useEffect(() => {
        fetch("/api/llm/providers").then(r => r.json()).then(d => {
            setProviders(d);
            const savedP = localStorage.getItem("llm_provider") || "ollama";
            const savedM = localStorage.getItem("llm_model") || "";
            setSelectedProvider(savedP);
            const models = d[savedP === "ollama" ? "ollama" : "lm_studio"] || [];
            setSelectedModel(savedM && models.some((m:{name:string}) => m.name === savedM) ? savedM : (models[0]?.name || ""));
            setStatus(models.length > 0 ? "ready" : "error");
        }).catch(() => {
            setProviders({ ollama: [{name:"llama3.2:3b"}] });
            setSelectedModel(localStorage.getItem("llm_model") || "llama3.2:3b");
            setStatus("ready");
        });
    }, []);
    const save = (p:string, m:string) => { localStorage.setItem("llm_provider", p); localStorage.setItem("llm_model", m); };
    const models = providers[selectedProvider === "ollama" ? "ollama" : "lm_studio"] || [];
    return (
        <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-4 space-y-3">
            <h3 className="text-sm font-medium text-slate-200">Local LLM</h3>
            <Select value={selectedProvider} onValueChange={(v) => { setSelectedProvider(v); save(v, ""); }}>
                <SelectTrigger className="bg-slate-900 border-slate-800 text-slate-100">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800 text-slate-100">
                    <SelectItem value="ollama">Ollama</SelectItem>
                    <SelectItem value="lm_studio">LM Studio</SelectItem>
                </SelectContent>
            </Select>
            <Select value={selectedModel} onValueChange={(v) => { setSelectedModel(v); save(selectedProvider, v); }}>
                <SelectTrigger className="bg-slate-900 border-slate-800 text-slate-100">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800 text-slate-100">
                    {models.map((m) => <SelectItem key={m.name} value={m.name}>{m.name}</SelectItem>)}
                </SelectContent>
            </Select>
        </div>
    );
}

export function Settings() {
    const [serverInfo, setServerInfo] = useState<StatusPayload | null>(null);
    const [statusError, setStatusError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const res = await fetch(api.status);
                if (!res.ok) throw new Error(`${res.status}`);
                const data = (await res.json()) as StatusPayload;
                if (!cancelled) {
                    setServerInfo(data);
                    setStatusError(null);
                }
            } catch {
                if (!cancelled) setStatusError("Could not reach /api/status");
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold tracking-tight text-white">Settings</h2>
                <p className="text-slate-400">
                    Local LLM settings use <code className="text-slate-300">{api.aiModels("{provider}", "{endpoint}")}</code> and{" "}
                    <code className="text-slate-300">{api.aiChat}</code>
                </p>
            </div>

            <div className="grid gap-6">
                <Card className="border-slate-800 bg-slate-950/50">
                    <CardHeader>
                        <CardTitle className="text-white">Local LLM Configuration</CardTitle>
                        <CardDescription className="text-slate-400">
                            Persists in the browser. The server calls Ollama from the machine running the API (default base{" "}
                            <code className="text-slate-300">http://127.0.0.1:11434</code>
                            ).
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <LLMSettings />
                    </CardContent>
                </Card>

                <Card className="border-slate-800 bg-slate-950/50">
                    <CardHeader>
                        <CardTitle className="text-white">App Information</CardTitle>
                        <CardDescription className="text-slate-400">
                            Live data from <code className="text-slate-300">{api.status}</code>
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-1">
                        {statusError && <p className="text-sm text-amber-400 mb-2">{statusError}</p>}
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-400">Server Status</span>
                            <span className="text-green-500 font-medium">{serverInfo?.status ?? "—"}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-400">Server</span>
                            <span className="text-slate-200 font-mono text-xs">{serverInfo?.server ?? "—"}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-400">Version</span>
                            <span className="text-slate-200">{serverInfo?.version ?? "—"}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-400">Standard</span>
                            <span className="text-blue-400 font-medium">{serverInfo?.standard ?? "—"}</span>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
