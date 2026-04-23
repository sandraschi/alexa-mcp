import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mic, MessageSquare, Bot, Activity, Volume2, Loader2 } from "lucide-react";
import { api, postTool, type BridgeStatus } from "@/common/api";

interface LogEntry {
    id: number;
    command: string;
    response: string;
    success: boolean;
    timestamp: number;
    recorded_at?: string;
}

export function Dashboard() {
    const [status, setStatus] = useState<BridgeStatus | null>(null);
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [speakBusy, setSpeakBusy] = useState(false);
    const [speakHint, setSpeakHint] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                console.debug('[alexa-mcp] Fetching /api/status and /api/logs...')
                const [statusRes, logsRes] = await Promise.all([
                    fetch(api.status),
                    fetch(api.logs)
                ]);
                if (!statusRes.ok) console.error('[alexa-mcp] /api/status', statusRes.status, statusRes.statusText)
                if (!logsRes.ok)   console.error('[alexa-mcp] /api/logs',   logsRes.status,   logsRes.statusText)
                const statusData = await statusRes.json();
                const logsData = await logsRes.json();
                setStatus(statusData);
                const rawLogs = logsData?.logs;
                setLogs(Array.isArray(rawLogs) ? rawLogs : []);
            } catch (error) {
                console.error("[alexa-mcp] Failed to fetch dashboard data:", error);
            }
        };

        fetchData();
        const interval = setInterval(fetchData, 3000);
        return () => clearInterval(interval);
    }, []);

    const stats = [
        { label: "Voice Status", value: status?.status || "Connecting...", change: status?.engines?.io || "Acoustic Bridge", icon: Mic, color: "text-blue-500" },
        { label: "STT Engine", value: status?.engines?.stt || "Whisper", change: "Base Model", icon: MessageSquare, color: "text-green-500" },
        { label: "TTS Engine", value: status?.engines?.tts || "Edge-TTS", change: "Neural Synthesis", icon: Bot, color: "text-purple-500" },
        { label: "Interactions", value: (status?.stats?.interactions ?? 0).toLocaleString(), change: status?.stats?.health || "Nominal", icon: Activity, color: "text-emerald-500" },
    ];

    const quickTestSpeak = async () => {
        setSpeakBusy(true);
        setSpeakHint(null);
        const out = await postTool("speak_command", { text: "Alexa, hello." });
        setSpeakHint(out.ok ? "Speak command finished (see Audio page for custom text)." : out.message);
        setSpeakBusy(false);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-white">Alexa Control</h2>
                    <p className="text-slate-400">Centralized control and monitoring for Alexa acoustic bridge</p>
                </div>
                <div className="flex flex-wrap gap-2 shrink-0">
                    <Button variant="outline" size="sm" className="border-slate-700 text-slate-200" asChild>
                        <Link to="/status">Status</Link>
                    </Button>
                    <Button variant="outline" size="sm" className="border-slate-700 text-slate-200" asChild>
                        <Link to="/audio">Audio</Link>
                    </Button>
                    <Button
                        type="button"
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700"
                        onClick={() => void quickTestSpeak()}
                        disabled={speakBusy}
                    >
                        {speakBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Volume2 className="h-4 w-4 mr-1" />}
                        Test speak
                    </Button>
                </div>
            </div>
            {speakHint && <p className="text-xs text-slate-500 font-mono">{speakHint}</p>}

            {/* KPI Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {stats.map((stat, idx) => (
                    <Card key={idx} className="border-slate-800 bg-slate-950/50">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-slate-200">
                                {stat.label}
                            </CardTitle>
                            <stat.icon className={`h-4 w-4 ${stat.color}`} />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-white tracking-tight">{stat.value}</div>
                            <p className="text-xs text-slate-400">
                                {stat.change}
                            </p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <Card className="col-span-4 border-slate-800 bg-slate-950/50">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0">
                        <CardTitle className="text-white">Acoustic Levels</CardTitle>
                        <Button variant="ghost" size="sm" className="h-8 text-xs text-slate-400 hover:text-white" asChild>
                            <Link to="/audio">Open audio lab</Link>
                        </Button>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[200px] flex flex-col items-center justify-center border border-dashed border-slate-800 rounded-md bg-slate-900/20 gap-2">
                            <span className="text-slate-500 text-sm">Spectrum placeholder</span>
                            <span className="text-slate-600 text-xs">Use the Audio page for TTS / STT tests</span>
                        </div>
                    </CardContent>
                </Card>
                <Card className="col-span-3 border-slate-800 bg-slate-950/50">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-white">Recent Responses</CardTitle>
                        <Button variant="ghost" size="sm" className="h-8 text-xs text-slate-400 hover:text-white" asChild>
                            <Link to="/logs">Open logger</Link>
                        </Button>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                            {logs.length > 0 ? (
                                logs.map((log) => (
                                    <div key={log.id} className="flex items-start">
                                        <span className="relative flex h-2 w-2 mr-2 mt-1.5">
                                            <span className={`relative inline-flex rounded-full h-2 w-2 ${log.success ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                                        </span>
                                        <div className="ml-2 space-y-1">
                                            <p className="text-sm font-medium leading-none text-white">"{log.command}"</p>
                                            <p className="text-xs text-slate-400 italic">
                                                {log.response || "[No response detected]"}
                                            </p>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center text-slate-500 text-sm py-8 italic">
                                    No interaction data available.
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
