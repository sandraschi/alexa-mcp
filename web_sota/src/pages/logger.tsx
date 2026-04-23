import { useCallback, useEffect, useRef, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { api } from "@/common/api";
import { cn } from "@/common/utils";
import { Loader2, RefreshCw } from "lucide-react";

export interface InteractionLogEntry {
    id: number;
    command: string;
    response: string;
    success: boolean;
    timestamp: number;
    recorded_at?: string;
}

function formatRecorded(iso: string | undefined): string {
    if (!iso) return "—";
    try {
        return new Date(iso).toLocaleString();
    } catch {
        return iso;
    }
}

export function Logger() {
    const [interactions, setInteractions] = useState<InteractionLogEntry[]>([]);
    const [appLines, setAppLines] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [lastFetch, setLastFetch] = useState<Date | null>(null);
    const [pinTail, setPinTail] = useState(true);
    const serverLogEndRef = useRef<HTMLDivElement>(null);

    const load = useCallback(async () => {
        try {
            const res = await fetch(api.logs);
            if (!res.ok) {
                setError(`${res.status} ${res.statusText}`);
                return;
            }
            setError(null);
            const data = (await res.json()) as { logs?: unknown; app_lines?: string[] };
            const raw = data.logs;
            setInteractions(Array.isArray(raw) ? (raw as InteractionLogEntry[]) : []);
            setAppLines(Array.isArray(data.app_lines) ? data.app_lines : []);
            setLastFetch(new Date());
        } catch (e) {
            setError(e instanceof Error ? e.message : "Request failed");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
        const t = setInterval(load, 2500);
        return () => clearInterval(t);
    }, [load]);

    useEffect(() => {
        if (!pinTail) return;
        serverLogEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [appLines, pinTail]);

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-white">Logger</h2>
                    <p className="text-slate-400">Interaction history and server log stream (polls every 2.5s).</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    {lastFetch && (
                        <span className="text-xs text-slate-500 tabular-nums">
                            Updated {lastFetch.toLocaleTimeString()}
                        </span>
                    )}
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="border-slate-700 bg-slate-900/50 text-slate-200 hover:bg-slate-800"
                        onClick={() => {
                            setLoading(true);
                            void load();
                        }}
                    >
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                        <span className="ml-2">Refresh</span>
                    </Button>
                </div>
            </div>

            {error && (
                <div className="rounded-lg border border-red-500/30 bg-red-950/40 px-4 py-3 text-sm text-red-200">
                    {error}
                </div>
            )}

            <Tabs defaultValue="interactions" className="w-full">
                <TabsList className="h-auto w-full flex-wrap justify-start border border-slate-800 bg-slate-900/60 p-1.5 sm:w-auto">
                    <TabsTrigger
                        value="interactions"
                        className="data-[state=active]:bg-slate-800 data-[state=active]:text-white text-slate-400"
                    >
                        Interactions
                    </TabsTrigger>
                    <TabsTrigger
                        value="server"
                        className="data-[state=active]:bg-slate-800 data-[state=active]:text-white text-slate-400"
                    >
                        Server log
                    </TabsTrigger>
                </TabsList>
                <TabsContent value="interactions" className="mt-4">
                    <Card className="border-slate-800 bg-slate-950/50">
                        <CardHeader>
                            <CardTitle className="text-white">Alexa interactions</CardTitle>
                            <CardDescription className="text-slate-500">
                                Latest acoustic bridge command/response pairs (newest first).
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ScrollArea className="h-[min(60vh,560px)] rounded-md border border-slate-800/80 bg-slate-900/30">
                                <div className="p-3 space-y-3">
                                    {interactions.length === 0 ? (
                                        <p className="text-center text-sm text-slate-500 py-12">
                                            No interactions recorded yet. Use AI Command to run a bridge session.
                                        </p>
                                    ) : (
                                        interactions.map((log) => (
                                            <div
                                                key={log.id}
                                                className={cn(
                                                    "rounded-lg border p-3 text-sm",
                                                    log.success
                                                        ? "border-emerald-500/20 bg-emerald-500/5"
                                                        : "border-red-500/20 bg-red-500/5"
                                                )}
                                            >
                                                <div className="mb-1 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                                                    <span className="font-mono">#{log.id}</span>
                                                    <span className="tabular-nums">{formatRecorded(log.recorded_at)}</span>
                                                </div>
                                                <p className="font-medium text-slate-100">“{log.command}”</p>
                                                <p className="mt-1.5 text-slate-400 text-xs sm:text-sm leading-relaxed break-words">
                                                    {log.response || "[No response detected]"}
                                                </p>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </ScrollArea>
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="server" className="mt-4">
                    <Card className="border-slate-800 bg-slate-950/50">
                        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-4 space-y-0">
                            <div>
                                <CardTitle className="text-white">Process log</CardTitle>
                                <CardDescription className="text-slate-500">
                                    Recent lines from the server process (in-memory, capped).
                                </CardDescription>
                            </div>
                            <div className="flex items-center gap-2">
                                <Switch id="pin-tail" checked={pinTail} onCheckedChange={setPinTail} />
                                <Label htmlFor="pin-tail" className="text-xs text-slate-400">
                                    Auto-scroll
                                </Label>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <ScrollArea className="h-[min(60vh,560px)] rounded-md border border-slate-800/80 bg-black/40">
                                <div className="p-3">
                                    <pre className="text-[11px] leading-relaxed text-slate-300 font-mono whitespace-pre-wrap break-words">
                                        {appLines.length === 0 ? (
                                            <span className="text-slate-600">No log lines yet.</span>
                                        ) : (
                                            appLines.join("\n")
                                        )}
                                    </pre>
                                    <div ref={serverLogEndRef} className="h-px" aria-hidden />
                                </div>
                            </ScrollArea>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
