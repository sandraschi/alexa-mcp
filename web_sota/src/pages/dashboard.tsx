import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mic, MessageSquare, Bot, Zap } from "lucide-react";

interface ServerStatus {
    status: string;
    server: string;
    version: string;
}

export function Dashboard() {
    const [serverStatus, setServerStatus] = useState<ServerStatus | null>(null);
    const [statusError, setStatusError] = useState(false);

    useEffect(() => {
        const poll = async () => {
            try {
                const res = await fetch("/api/status");
                if (!res.ok) throw new Error("not ok");
                const data: ServerStatus = await res.json();
                setServerStatus(data);
                setStatusError(false);
            } catch {
                setStatusError(true);
            }
        };

        poll();
        const interval = setInterval(poll, 10000);
        return () => clearInterval(interval);
    }, []);

    const isOnline = !statusError && serverStatus?.status === "online";

    const stats = [
        {
            label: "Bridge Status",
            value: statusError ? "Offline" : (serverStatus ? "Online" : "Connecting…"),
            sub: serverStatus ? `v${serverStatus.version}` : "alexa-mcp",
            icon: Zap,
            color: isOnline ? "text-green-500" : "text-red-500",
        },
        {
            label: "STT Engine",
            value: "Whisper",
            sub: "faster-whisper · local",
            icon: MessageSquare,
            color: "text-blue-500",
        },
        {
            label: "TTS Engine",
            value: "Edge-TTS",
            sub: "neural quality · online",
            icon: Bot,
            color: "text-purple-500",
        },
        {
            label: "Acoustic Bridge",
            value: "Ready",
            sub: "speaker + microphone",
            icon: Mic,
            color: "text-yellow-500",
        },
    ];

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-white">Alexa Control</h2>
                    <p className="text-slate-400">
                        Centralized control and monitoring for Alexa acoustic bridge
                    </p>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span
                        className={`inline-flex h-2 w-2 rounded-full ${
                            isOnline ? "bg-green-500 animate-pulse" : "bg-red-500"
                        }`}
                    />
                    {isOnline ? "Server online" : "Server unreachable"}
                </div>
            </div>

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
                            <div className="text-2xl font-bold text-white">{stat.value}</div>
                            <p className="text-xs text-slate-400">{stat.sub}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <Card className="col-span-4 border-slate-800 bg-slate-950/50">
                    <CardHeader>
                        <CardTitle className="text-white">Quick Start</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm text-slate-400">
                        <p>
                            Use the <span className="text-blue-400 font-medium">Chat</span> tab to send
                            natural language commands to Alexa via the acoustic bridge.
                        </p>
                        <p>
                            Use the <span className="text-blue-400 font-medium">Tools</span> tab to invoke
                            individual MCP tools directly — with real argument inputs.
                        </p>
                        <p>
                            The <span className="text-purple-400 font-medium">get_weather</span> tool asks
                            Alexa for the weather, transcribes the response, and stores it as a
                            FastMCP resource at{" "}
                            <code className="text-slate-300 bg-slate-900 px-1 rounded">
                                alexa://weather/latest
                            </code>.
                        </p>
                    </CardContent>
                </Card>
                <Card className="col-span-3 border-slate-800 bg-slate-950/50">
                    <CardHeader>
                        <CardTitle className="text-white">Server Info</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span className="text-slate-400">Status</span>
                            <span className={isOnline ? "text-green-400" : "text-red-400"}>
                                {statusError ? "Offline" : (serverStatus?.status ?? "—")}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-400">Server</span>
                            <span className="text-slate-200">{serverStatus?.server ?? "—"}</span>
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
