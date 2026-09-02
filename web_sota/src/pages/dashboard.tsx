import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mic, MessageSquare, Bot, Zap } from "lucide-react";

interface ServerStatus { status: string; server: string; version: string; }

export function Dashboard() {
    const [serverStatus, setServerStatus] = useState<ServerStatus | null>(null);
    const [statusError, setStatusError] = useState(false);

    useEffect(() => {
        const poll = async () => {
            try {
                const res = await fetch("/api/status");
                if (!res.ok) throw new Error();
                setServerStatus(await res.json());
                setStatusError(false);
            } catch { setStatusError(true); }
        };
        poll();
        const t = setInterval(poll, 10000);
        return () => clearInterval(t);
    }, []);

    const isOnline = !statusError && serverStatus?.status === "online";

    const stats = [
        { label: "Bridge Status", value: statusError ? "Offline" : (serverStatus ? "Online" : "..."), sub: serverStatus ? `v${serverStatus.version}` : "alexa-mcp", icon: Zap, color: isOnline ? "text-green-500" : "text-red-500" },
        { label: "STT Engine", value: "Whisper", sub: "faster-whisper · local", icon: MessageSquare, color: "text-blue-500" },
        { label: "TTS Engine", value: "Edge-TTS", sub: "neural · online", icon: Bot, color: "text-purple-500" },
        { label: "Acoustic Bridge", value: "Ready", sub: "speaker + mic · VAD", icon: Mic, color: "text-yellow-500" },
    ];

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-white">Alexa Control</h2>
                    <p className="text-slate-400">Centralized control and monitoring for Alexa acoustic bridge</p>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span className={`inline-flex h-2 w-2 rounded-full ${isOnline ? "bg-green-500 animate-pulse" : "bg-red-500"}`} />
                    {isOnline ? "Server online" : "Server unreachable"}
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {stats.map((stat, idx) => (
                    <Card key={idx} className="border-slate-800 bg-slate-950/50">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-slate-200">{stat.label}</CardTitle>
                            <stat.icon className={`h-4 w-4 ${stat.color}`} />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-white">{stat.value}</div>
                            <p className="text-xs text-slate-400">{stat.sub}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <Card className="col-span-4 border-slate-800 bg-slate-950/50">
                    <CardHeader><CardTitle className="text-white">Quick Start</CardTitle></CardHeader>
                    <CardContent className="space-y-3 text-sm text-slate-400">
                        <p>Use the <span className="text-blue-400 font-medium">Chat</span> tab for natural language commands. History persists across reloads.</p>
                        <p>Use the <span className="text-blue-400 font-medium">Tools</span> tab to invoke MCP tools directly with real argument inputs.</p>
                        <p><span className="text-purple-400 font-medium">get_weather</span> asks Alexa for the weather and stores the result at <code className="text-slate-300 bg-slate-900 px-1 rounded">alexa://weather/latest</code>.</p>
                        <p>Set <code className="text-slate-300 bg-slate-900 px-1 rounded">TTS_PROVIDER=speech-mcp</code> to route synthesis through your speech-mcp server.</p>
                    </CardContent>
                </Card>
                <Card className="col-span-3 border-slate-800 bg-slate-950/50">
                    <CardHeader><CardTitle className="text-white">Server Info</CardTitle></CardHeader>
                    <CardContent className="space-y-2 text-sm">
                        {([
                            ["Status", serverStatus?.status ?? "—", isOnline ? "text-green-400" : "text-red-400"],
                            ["Server", serverStatus?.server ?? "—", "text-slate-200"],
                            ["Version", serverStatus?.version ?? "—", "text-slate-200"],
                            ["Transport", "HTTP / STDIO", "text-blue-400"],
                        ] as [string, string, string][]).map(([k, v, cls]) => (
                            <div key={k} className="flex justify-between">
                                <span className="text-slate-400">{k}</span>
                                <span className={cls}>{v}</span>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
