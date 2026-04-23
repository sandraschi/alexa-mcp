import { useCallback, useEffect, useMemo, useState } from "react";
import { api, loadLlmSettings, saveLlmSettings } from "@/common/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, RefreshCw, Loader2 } from "lucide-react";

interface StatusPayload {
    status?: string;
    server?: string;
    version?: string;
    standard?: string;
}

const DEFAULT_MODEL_FALLBACK = ["llama3.1:8b", "mistral:latest", "gemma2:2b"];

export function Settings() {
    const [provider, setProvider] = useState("ollama");
    const [model, setModel] = useState("llama3.1:8b");
    const [endpoint, setEndpoint] = useState("http://127.0.0.1:11434");
    const [serverInfo, setServerInfo] = useState<StatusPayload | null>(null);
    const [statusError, setStatusError] = useState<string | null>(null);
    const [modelOptions, setModelOptions] = useState<string[]>([]);
    const [modelsError, setModelsError] = useState<string | null>(null);
    const [modelsLoading, setModelsLoading] = useState(false);

    useEffect(() => {
        const saved = loadLlmSettings();
        if (saved) {
            setProvider(saved.provider);
            setModel(saved.model);
            setEndpoint(saved.endpoint);
        }
    }, []);

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

    const refreshModels = useCallback(async () => {
        setModelsLoading(true);
        setModelsError(null);
        try {
            const res = await fetch(api.aiModels(provider, endpoint));
            const data = (await res.json()) as { models?: unknown; error?: string };
            if (data.error) setModelsError(data.error);
            const raw = data.models;
            const names: string[] = [];
            if (Array.isArray(raw)) {
                for (const m of raw) {
                    if (m && typeof m === "object" && "name" in m && typeof (m as { name: string }).name === "string") {
                        names.push((m as { name: string }).name);
                    }
                }
            }
            setModelOptions(names);
            if (names.length && !names.includes(model)) {
                setModel(names[0]);
            }
        } catch (e) {
            setModelsError(e instanceof Error ? e.message : String(e));
        } finally {
            setModelsLoading(false);
        }
    }, [provider, endpoint, model]);

    const modelChoices = useMemo(() => {
        const s = new Set([...DEFAULT_MODEL_FALLBACK, ...modelOptions, model]);
        return [...s];
    }, [modelOptions, model]);

    const handleSave = () => {
        saveLlmSettings({ provider, model, endpoint });
    };

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
                            ). &quot;Refresh Models&quot; uses GET {api.aiModels("…", "…")} (Ollama <code className="text-slate-300">/api/tags</code>
                            ).
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid gap-2">
                            <Label className="text-slate-300">Provider</Label>
                            <Select value={provider} onValueChange={setProvider}>
                                <SelectTrigger className="bg-slate-900 border-slate-800 text-slate-100">
                                    <SelectValue placeholder="Select provider" />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-900 border-slate-800 text-slate-100">
                                    <SelectItem value="ollama">Ollama</SelectItem>
                                    <SelectItem value="lmstudio">LM Studio</SelectItem>
                                    <SelectItem value="openai_compatible">OpenAI Compatible</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid gap-2">
                            <Label className="text-slate-300">Endpoint URL</Label>
                            <Input
                                className="bg-slate-900 border-slate-800 text-slate-100 placeholder:text-slate-400"
                                value={endpoint}
                                onChange={(e) => setEndpoint(e.target.value)}
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label className="text-slate-300">Model Selection</Label>
                            <Select value={model} onValueChange={setModel}>
                                <SelectTrigger className="bg-slate-900 border-slate-800 text-slate-100">
                                    <SelectValue placeholder="Select model" />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-900 border-slate-800 text-slate-100">
                                    {modelChoices.map((m) => (
                                        <SelectItem key={m} value={m}>
                                            {m}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {modelsError && <p className="text-sm text-amber-400">{modelsError}</p>}

                        <div className="flex gap-2 pt-2 flex-wrap">
                            <Button type="button" className="bg-blue-600 hover:bg-blue-700" onClick={handleSave}>
                                <Save className="mr-2 h-4 w-4" /> Save Settings
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                className="border-slate-800 text-slate-300 hover:bg-slate-800"
                                onClick={() => void refreshModels()}
                                disabled={modelsLoading}
                            >
                                {modelsLoading ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                    <RefreshCw className="mr-2 h-4 w-4" />
                                )}
                                Refresh Models
                            </Button>
                        </div>
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
