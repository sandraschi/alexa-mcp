import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { api, type BridgeStatus } from "@/common/api";
import { Activity, Loader2, Mic, RefreshCw, Server, Tag, Wrench } from "lucide-react";

export function Status() {
    const [data, setData] = useState<BridgeStatus | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

    const load = useCallback(async () => {
        try {
            const res = await fetch(api.status);
            if (!res.ok) {
                setError(`${res.status} ${res.statusText}`);
                return;
            }
            setError(null);
            setData((await res.json()) as BridgeStatus);
            setLastUpdate(new Date());
        } catch (e) {
            setError(e instanceof Error ? e.message : "Request failed");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void load();
        const t = setInterval(() => void load(), 4000);
        return () => clearInterval(t);
    }, [load]);

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-white">Bridge status</h2>
                    <p className="text-slate-400">Live payload from {api.status}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    {lastUpdate && (
                        <span className="text-xs text-slate-500 tabular-nums">
                            Updated {lastUpdate.toLocaleTimeString()}
                        </span>
                    )}
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="border-slate-700 bg-slate-900/50 text-slate-200"
                        onClick={() => {
                            setLoading(true);
                            void load();
                        }}
                        disabled={loading}
                    >
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                        <span className="ml-2">Refresh</span>
                    </Button>
                    <Button variant="secondary" size="sm" className="bg-slate-800" asChild>
                        <Link to="/audio">Audio lab</Link>
                    </Button>
                    <Button variant="secondary" size="sm" className="bg-slate-800" asChild>
                        <Link to="/logs">Logger</Link>
                    </Button>
                </div>
            </div>

            {error && (
                <p className="text-sm text-amber-400">
                    {error} — check that the web bridge is up and Basic Auth is satisfied.
                </p>
            )}

            {loading && !data && <p className="text-slate-500 text-sm">Loading…</p>}

            {data && (
                <div className="grid gap-4 md:grid-cols-2">
                    <Card className="border-slate-800 bg-slate-950/50">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-white">
                                <Server className="h-4 w-4 text-blue-400" />
                                Process
                            </CardTitle>
                            <CardDescription className="text-slate-500">Server identity and build</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3 text-sm">
                            <Row label="State" value={data.status} accent="text-emerald-400" />
                            <Row label="Name" value={data.server} mono />
                            <Row label="Version" value={data.version} mono />
                            <Row label="Standard" value={data.standard} mono accent="text-blue-300" />
                        </CardContent>
                    </Card>

                    <Card className="border-slate-800 bg-slate-950/50">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-white">
                                <Wrench className="h-4 w-4 text-amber-400" />
                                Engines
                            </CardTitle>
                            <CardDescription className="text-slate-500">STT / TTS / I/O stack</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3 text-sm">
                            <Row label="STT" value={data.engines.stt} mono />
                            <Row label="TTS" value={data.engines.tts} mono />
                            <Row label="I/O" value={data.engines.io} mono />
                        </CardContent>
                    </Card>

                    <Card className="border-slate-800 bg-slate-950/50 md:col-span-2">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-white">
                                <Activity className="h-4 w-4 text-emerald-400" />
                                Activity
                            </CardTitle>
                            <CardDescription className="text-slate-500">Runtime counters from the bridge</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-4">
                                    <div className="text-xs text-slate-500 uppercase tracking-wider">Interactions</div>
                                    <div className="mt-1 text-2xl font-semibold text-white tabular-nums">
                                        {data.stats.interactions.toLocaleString()}
                                    </div>
                                </div>
                                <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-4">
                                    <div className="text-xs text-slate-500 uppercase tracking-wider">Health</div>
                                    <div className="mt-1 flex items-center gap-2 text-2xl font-semibold text-emerald-400">
                                        <Tag className="h-5 w-5" />
                                        {data.stats.health}
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            <Card className="border-slate-800 bg-slate-950/30 border-dashed">
                <CardContent className="py-4 text-sm text-slate-500 flex flex-wrap items-center gap-2">
                    <Mic className="h-4 w-4 text-slate-600" />
                    Acoustic tests and TTS checks live on the{" "}
                    <Link to="/audio" className="text-blue-400 hover:underline">
                        Audio
                    </Link>{" "}
                    page.
                </CardContent>
            </Card>
        </div>
    );
}

function Row({
    label,
    value,
    mono,
    accent,
}: {
    label: string;
    value: string;
    mono?: boolean;
    accent?: string;
}) {
    return (
        <div className="flex justify-between gap-4 border-b border-slate-800/60 pb-2 last:border-0 last:pb-0">
            <span className="text-slate-500">{label}</span>
            <span className={`text-right text-slate-100 ${mono ? "font-mono text-xs" : ""} ${accent ?? ""}`}>
                {value}
            </span>
        </div>
    );
}
