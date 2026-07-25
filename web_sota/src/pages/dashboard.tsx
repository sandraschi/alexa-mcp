import { useCallback, useEffect, useState } from "react";
import { API_BASE } from "../lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Wifi, WifiOff, Activity, Shield, Zap, Clock, ListOrdered, BarChart3, CheckCircle, XCircle } from "lucide-react";

async function checkHealth(): Promise<{ ok: boolean; error?: string; data?: any }> {
  try {
    const r = await fetch(`${API_BASE}/api/health`);
    if (!r.ok) return { ok: false, error: `HTTP ${r.status}` };
    const data = await r.json();
    return { ok: true, data };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Network error" };
  }
}

const BACKOFF_INTERVALS = [1000, 2000, 4000, 8000, 16000];

export function Dashboard() {
    const [health, setHealth] = useState<{ status: string; service: string } | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [logCount, setLogCount] = useState(0);
    const [backendOk, setBackendOk] = useState<boolean | null>(null);
    const [analytics, setAnalytics] = useState<any>({});

    const refresh = useCallback(async () => {
        const h = await checkHealth();
        setBackendOk(h.ok);
        if (h.ok) { setHealth(h.data); setError(null); }
        else { setError(h.error || "unknown"); }
    }, []);

    useEffect(() => {
        let cancelled = false;
        let retryIndex = 0;
        const poll = async () => {
            const h = await checkHealth();
            if (cancelled) return;
            setBackendOk(h.ok);
            if (h.ok) { setHealth(h.data); setError(null); retryIndex = 0; }
            else { setError(h.error || "unknown"); }
            fetch(`${API_BASE}/api/logs/stats`).then(r => r.json()).then(d => { if (!cancelled) setLogCount(d.total || 0); }).catch(() => {});
            fetch(`${API_BASE}/api/analytics/stats`).then(r => r.json()).then(d => { if (!cancelled) setAnalytics(d); }).catch(() => {});
            if (!h.ok && retryIndex < BACKOFF_INTERVALS.length) {
                setTimeout(poll, BACKOFF_INTERVALS[retryIndex]);
                retryIndex++;
            } else {
                setTimeout(poll, 10000);
            }
        };
        poll();

        let unlisten: (() => void) | undefined;
        (async () => {
            try {
                const { listen } = await import("@tauri-apps/api/event");
                unlisten = await listen<string>("backend-status", (event) => {
                    if (event.payload === "ready") refresh();
                    else if (typeof event.payload === "string" && event.payload.startsWith("error:")) setBackendOk(false);
                });
            } catch { /* not in Tauri */ }
        })();

        return () => { cancelled = true; if (unlisten) unlisten(); };
    }, [refresh]);

    const connected = health?.status === "ok";

    return (
        <div data-testid="dashboard" className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-white">Alexa Acoustic Bridge</h2>
                    <p className="text-slate-400 mt-1">Voice control for your smart home — speak to Alexa through AI</p>
                </div>
                <div className="flex items-center gap-3">
                    <div data-testid="backend-dot" className={[
                        "flex items-center gap-2 px-4 py-2 rounded-xl border text-sm",
                        backendOk === null ? "bg-gray-500/10 border-gray-500/20 text-gray-400" :
                        connected ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-red-500/10 border-red-500/20 text-red-400",
                    ].join(" ")}>
                        <div className={`w-2 h-2 rounded-full ${backendOk === null ? "bg-gray-500" : connected ? "bg-green-500" : "bg-red-500"} animate-pulse`} />
                        {backendOk === null ? "Connecting..." : connected ? "Connected" : "Offline"}
                    </div>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card data-testid="kpi-server" className="border-slate-800 bg-slate-950/50">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-slate-200">Backend Status</CardTitle>
                        <Wifi className={connected ? "h-4 w-4 text-emerald-500" : "h-4 w-4 text-red-500"} />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-white tracking-tight">{connected ? "Online" : "Offline"}</div>
                        <p className="text-sm text-slate-400">API health check</p>
                    </CardContent>
                </Card>

                <Card data-testid="kpi-tools" className="border-slate-800 bg-slate-950/50">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-slate-200">Interactions</CardTitle>
                        <BarChart3 className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-white tracking-tight">{analytics.total_interactions ?? "-"}</div>
                        {analytics.success_rate !== undefined && (
                          <p className="text-sm text-slate-400">
                            <CheckCircle className="h-3 w-3 inline text-emerald-500 mr-1" />
                            {analytics.success_rate}% success
                          </p>
                        )}
                    </CardContent>
                </Card>

                <Card className="border-slate-800 bg-slate-950/50">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-slate-200">Scheduled</CardTitle>
                        <Clock className="h-4 w-4 text-purple-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-white tracking-tight">{analytics.active_schedules ?? 0}</div>
                        <p className="text-sm text-slate-400">{analytics.scheduled_commands ?? 0} total rules</p>
                    </CardContent>
                </Card>

                <Card className="border-slate-800 bg-slate-950/50">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-slate-200">Presets</CardTitle>
                        <ListOrdered className="h-4 w-4 text-orange-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-white tracking-tight">{analytics.command_presets ?? 0}</div>
                        <p className="text-sm text-slate-400">{analytics.scheduler_runs ?? 0} auto-runs</p>
                    </CardContent>
                </Card>
            </div>

            {connected && (
              <Card className="border-emerald-800/30 bg-emerald-950/10">
                <CardContent className="py-4">
                  <div className="flex items-center gap-3">
                    <Shield className="h-5 w-5 text-emerald-500 shrink-0" />
                    <div>
                      <p className="text-sm text-emerald-300 font-medium">Voice Bridge Active</p>
                      <p className="text-xs text-emerald-500/70 mt-0.5">
                        Speak to Alexa via Chat, Schedule automated commands, or trigger from fleet MCPs via <code className="text-emerald-400 bg-emerald-950/30 px-1 rounded">POST /api/announce</code>
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="grid gap-4 lg:grid-cols-2">
              <Card className="border-slate-800 bg-slate-950/50">
                <CardHeader>
                  <CardTitle className="text-sm font-medium text-slate-200">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-3">
                  <a href="/chat" className="flex items-center gap-2 p-3 rounded-lg bg-slate-900/50 border border-slate-800 hover:border-emerald-700/50 transition-colors">
                    <Zap className="h-4 w-4 text-emerald-500" />
                    <span className="text-sm text-slate-300">Voice Chat</span>
                  </a>
                  <a href="/schedule" className="flex items-center gap-2 p-3 rounded-lg bg-slate-900/50 border border-slate-800 hover:border-purple-700/50 transition-colors">
                    <Clock className="h-4 w-4 text-purple-500" />
                    <span className="text-sm text-slate-300">Scheduler</span>
                  </a>
                  <a href="/presets" className="flex items-center gap-2 p-3 rounded-lg bg-slate-900/50 border border-slate-800 hover:border-orange-700/50 transition-colors">
                    <ListOrdered className="h-4 w-4 text-orange-500" />
                    <span className="text-sm text-slate-300">Presets</span>
                  </a>
                  <a href="/audio" className="flex items-center gap-2 p-3 rounded-lg bg-slate-900/50 border border-slate-800 hover:border-blue-700/50 transition-colors">
                    <Activity className="h-4 w-4 text-blue-500" />
                    <span className="text-sm text-slate-300">Audio</span>
                  </a>
                </CardContent>
              </Card>

              <Card className="border-slate-800 bg-slate-950/50">
                <CardHeader>
                  <CardTitle className="text-sm font-medium text-slate-200">Integration</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-slate-900/50 border border-slate-800">
                    <div>
                      <p className="text-sm text-slate-300">Fleet Announce API</p>
                      <p className="text-xs text-slate-500 mt-0.5">POST /api/announce</p>
                    </div>
                    <code className="text-xs text-emerald-400 bg-emerald-950/30 px-2 py-1 rounded">Available</code>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-slate-900/50 border border-slate-800">
                    <div>
                      <p className="text-sm text-slate-300">Skills</p>
                      <p className="text-xs text-slate-500 mt-0.5">GET /api/skills</p>
                    </div>
                    <code className="text-xs text-emerald-400 bg-emerald-950/30 px-2 py-1 rounded">Available</code>
                  </div>
                </CardContent>
              </Card>
            </div>
        </div>
    );
}
