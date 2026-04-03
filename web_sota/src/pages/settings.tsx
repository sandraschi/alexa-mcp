import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Save, RefreshCw, CheckCircle, XCircle } from "lucide-react";

const STORAGE_KEY = "alexa_mcp_settings";

interface Settings {
    provider: string;
    model: string;
    endpoint: string;
}

const DEFAULTS: Settings = {
    provider: "ollama",
    model: "llama3",
    endpoint: "http://localhost:11434",
};

function loadSettings(): Settings {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) return { ...DEFAULTS, ...JSON.parse(raw) };
    } catch { /* ignore */ }
    return { ...DEFAULTS };
}

export function Settings() {
    const [settings, setSettings] = useState<Settings>(DEFAULTS);
    const [savedOk, setSavedOk] = useState(false);
    const [models, setModels] = useState<string[]>([]);
    const [loadingModels, setLoadingModels] = useState(false);
    const [modelsError, setModelsError] = useState<string | null>(null);
    const [serverStatus, setServerStatus] = useState<{ status: string; version: string } | null>(null);

    // Load from localStorage on mount
    useEffect(() => {
        setSettings(loadSettings());
    }, []);

    // Poll /api/status
    useEffect(() => {
        const poll = async () => {
            try {
                const res = await fetch("/api/status");
                if (res.ok) setServerStatus(await res.json());
            } catch { /* offline */ }
        };
        poll();
    }, []);

    const handleSave = () => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
        setSavedOk(true);
        setTimeout(() => setSavedOk(false), 2500);
    };

    const handleRefreshModels = async () => {
        setLoadingModels(true);
        setModelsError(null);
        try {
            const url = `/api/ai/models?provider=${encodeURIComponent(settings.provider)}&endpoint=${encodeURIComponent(settings.endpoint)}`;
            const res = await fetch(url);
            const data = await res.json();
            if (data.error) throw new Error(data.error);
            // Ollama returns { models: [{ name }] }, LM Studio returns { data: [{ id }] }
            const list: string[] =
                (data.models ?? data.data ?? []).map(
                    (m: { name?: string; id?: string }) => m.name ?? m.id ?? String(m)
                );
            setModels(list);
            if (list.length === 0) setModelsError("No models found. Is the server running?");
        } catch (err) {
            setModelsError(String(err));
        } finally {
            setLoadingModels(false);
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold tracking-tight text-white">Settings</h2>
                <p className="text-slate-400">Configure Local LLM and app preferences</p>
            </div>

            <div className="grid gap-6">
                <Card className="border-slate-800 bg-slate-950/50">
                    <CardHeader>
                        <CardTitle className="text-white">Local LLM Configuration</CardTitle>
                        <CardDescription className="text-slate-400">
                            Settings are persisted to localStorage.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid gap-2">
                            <Label className="text-slate-300">Provider</Label>
                            <Select
                                value={settings.provider}
                                onValueChange={(v) => setSettings((s) => ({ ...s, provider: v }))}
                            >
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
                                className="bg-slate-900 border-slate-800 text-slate-100 placeholder:text-slate-500"
                                value={settings.endpoint}
                                onChange={(e) => setSettings((s) => ({ ...s, endpoint: e.target.value }))}
                                placeholder="http://localhost:11434"
                            />
                        </div>

                        <div className="grid gap-2">
                            <div className="flex items-center justify-between">
                                <Label className="text-slate-300">Model</Label>
                                <button
                                    onClick={handleRefreshModels}
                                    disabled={loadingModels}
                                    className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 disabled:opacity-50"
                                >
                                    <RefreshCw className={`h-3 w-3 ${loadingModels ? "animate-spin" : ""}`} />
                                    Fetch from server
                                </button>
                            </div>
                            {models.length > 0 ? (
                                <Select
                                    value={settings.model}
                                    onValueChange={(v) => setSettings((s) => ({ ...s, model: v }))}
                                >
                                    <SelectTrigger className="bg-slate-900 border-slate-800 text-slate-100">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-slate-900 border-slate-800 text-slate-100">
                                        {models.map((m) => (
                                            <SelectItem key={m} value={m}>{m}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            ) : (
                                <Input
                                    className="bg-slate-900 border-slate-800 text-slate-100 placeholder:text-slate-500"
                                    value={settings.model}
                                    onChange={(e) => setSettings((s) => ({ ...s, model: e.target.value }))}
                                    placeholder="llama3"
                                />
                            )}
                            {modelsError && (
                                <p className="text-xs text-red-400">{modelsError}</p>
                            )}
                        </div>

                        <div className="flex gap-2 pt-2">
                            <Button
                                onClick={handleSave}
                                className="bg-blue-600 hover:bg-blue-700"
                            >
                                {savedOk ? (
                                    <>
                                        <CheckCircle className="mr-2 h-4 w-4" /> Saved!
                                    </>
                                ) : (
                                    <>
                                        <Save className="mr-2 h-4 w-4" /> Save Settings
                                    </>
                                )}
                            </Button>
                            <Button
                                variant="outline"
                                onClick={handleRefreshModels}
                                disabled={loadingModels}
                                className="border-slate-700 text-slate-300 hover:bg-slate-800"
                            >
                                <RefreshCw className={`mr-2 h-4 w-4 ${loadingModels ? "animate-spin" : ""}`} />
                                Refresh Models
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-slate-800 bg-slate-950/50">
                    <CardHeader>
                        <CardTitle className="text-white">Server Info</CardTitle>
                        <CardDescription className="text-slate-400">Live data from /api/status</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span className="text-slate-400">Status</span>
                            {serverStatus ? (
                                <Badge className="bg-green-900/40 text-green-400 border-green-800">
                                    {serverStatus.status}
                                </Badge>
                            ) : (
                                <Badge className="bg-red-900/40 text-red-400 border-red-800">
                                    unreachable
                                </Badge>
                            )}
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-400">Version</span>
                            <span className="text-slate-200">{serverStatus?.version ?? "—"}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-400">Transport</span>
                            <span className="text-blue-400">HTTP / STDIO</span>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
