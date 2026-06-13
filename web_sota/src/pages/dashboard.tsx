import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Wifi, WifiOff, Activity, Shield, Zap } from "lucide-react";

export function Dashboard() {
    const [health, setHealth] = useState<{ status: string; service: string } | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [logCount, setLogCount] = useState(0);

    useEffect(() => {
        fetch("/api/health").then(r => r.json()).then(d => { setHealth(d); setError(null); }).catch(e => setError(String(e)));
        fetch("/api/logs/stats").then(r => r.json()).then(d => setLogCount(d.total || 0)).catch(() => {});
    }, []);

    const connected = health?.status === "ok";

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-white">Alexa Control</h2>
                    <p className="text-slate-400">Centralized control and monitoring for Alexa acoustic bridge</p>
                </div>
                <div className={[
                    "flex items-center gap-2 px-4 py-2 rounded-xl border text-sm",
                    connected ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-red-500/10 border-red-500/20 text-red-400",
                ].join(" ")}>
                    {connected ? <Wifi size={14} /> : <WifiOff size={14} />}
                    {connected ? "Connected" : "Offline"}
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="border-slate-800 bg-slate-950/50">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-slate-200">Backend Status</CardTitle>
                        <Wifi className={connected ? "h-4 w-4 text-emerald-500" : "h-4 w-4 text-red-500"} />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-white tracking-tight">{connected ? "Online" : "Offline"}</div>
                        <p className="text-xs text-slate-400">API health check</p>
                    </CardContent>
                </Card>

                <Card className="border-slate-800 bg-slate-950/50">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-slate-200">Service</CardTitle>
                        <Shield className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-white tracking-tight">{health?.service || "alexa-mcp"}</div>
                        <p className="text-xs text-slate-400">MCP server</p>
                    </CardContent>
                </Card>

                <Card className="border-slate-800 bg-slate-950/50">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-slate-200">Log Entries</CardTitle>
                        <Activity className="h-4 w-4 text-purple-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-white tracking-tight">{logCount}</div>
                        <p className="text-xs text-slate-400">total recorded</p>
                    </CardContent>
                </Card>

                <Card className="border-slate-800 bg-slate-950/50">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-slate-200">Health</CardTitle>
                        <Zap className="h-4 w-4 text-orange-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-white tracking-tight">{connected ? "OK" : "Error"}</div>
                        <p className="text-xs text-slate-400">{health?.status || error || "unknown"}</p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
