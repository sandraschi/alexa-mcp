import { useCallback, useEffect, useState } from "react";
import { API_BASE } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Clock, Play, ToggleLeft, ToggleRight, Loader2 } from "lucide-react";

interface ScheduledCommand {
  id: number;
  command: string;
  cron_expr: string;
  label: string;
  enabled: number;
  last_run_at: string | null;
  last_status: string | null;
  run_count: number;
  created_at: string;
}

export function Schedule() {
  const [commands, setCommands] = useState<ScheduledCommand[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newCmd, setNewCmd] = useState({ command: "", cron_expr: "0 8", label: "" });
  const [saving, setSaving] = useState(false);

  const fetchCommands = useCallback(async () => {
    try {
      const r = await fetch(`${API_BASE}/api/scheduler/commands`);
      const data = await r.json();
      setCommands(Array.isArray(data) ? data : []);
    } catch { setCommands([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchCommands(); }, [fetchCommands]);

  const handleCreate = async () => {
    if (!newCmd.command.trim()) return;
    setSaving(true);
    try {
      await fetch(`${API_BASE}/api/scheduler/commands`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newCmd),
      });
      setNewCmd({ command: "", cron_expr: "0 8", label: "" });
      setShowForm(false);
      await fetchCommands();
    } catch { }
    finally { setSaving(false); }
  };

  const handleToggle = async (cmd: ScheduledCommand) => {
    await fetch(`${API_BASE}/api/scheduler/commands/${cmd.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: cmd.enabled ? 0 : 1 }),
    });
    await fetchCommands();
  };

  const handleDelete = async (id: number) => {
    await fetch(`${API_BASE}/api/scheduler/commands/${id}`, { method: "DELETE" });
    await fetchCommands();
  };

  const cronSummary = (expr: string) => {
    const parts = expr.split(" ");
    if (parts.length >= 2) return `Daily at ${parts[1]}:${parts[0].padStart(2, "0")}`;
    return expr;
  };

  return (
    <div data-testid="schedule-page" className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">Voice Scheduler</h2>
          <p className="text-slate-400 mt-1">Schedule Alexa commands to run on a cron timetable</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} className="bg-emerald-600 hover:bg-emerald-700">
          <Plus className="h-4 w-4 mr-2" /> {showForm ? "Cancel" : "New Schedule"}
        </Button>
      </div>

      {showForm && (
        <Card className="border-emerald-800 bg-slate-950/50">
          <CardContent className="pt-6 space-y-4">
            <div>
              <label className="text-sm text-slate-300 block mb-1">Command</label>
              <input
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100"
                placeholder='e.g. "Alexa, turn on the lights"'
                value={newCmd.command}
                onChange={(e) => setNewCmd({ ...newCmd, command: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-slate-300 block mb-1">Cron (min hour)</label>
                <input
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 font-mono"
                  placeholder="0 8"
                  value={newCmd.cron_expr}
                  onChange={(e) => setNewCmd({ ...newCmd, cron_expr: e.target.value })}
                />
                <p className="text-xs text-slate-500 mt-1">Format: MM HH (e.g. 0 8 = 08:00 daily)</p>
              </div>
              <div>
                <label className="text-sm text-slate-300 block mb-1">Label</label>
                <input
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100"
                  placeholder="Morning lights"
                  value={newCmd.label}
                  onChange={(e) => setNewCmd({ ...newCmd, label: e.target.value })}
                />
              </div>
            </div>
            <Button onClick={handleCreate} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Clock className="h-4 w-4 mr-2" />}
              Schedule Command
            </Button>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-slate-500" />
        </div>
      ) : commands.length === 0 ? (
        <Card className="border-dashed border-slate-700 bg-slate-950/30">
          <CardContent className="py-12 text-center">
            <Clock className="h-12 w-12 mx-auto text-slate-600 mb-4" />
            <p className="text-slate-400">No scheduled commands yet.</p>
            <p className="text-sm text-slate-500 mt-1">Create a schedule to automate your voice commands.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {commands.map((cmd) => (
            <Card key={cmd.id} className={`border-slate-800 bg-slate-950/50 ${cmd.enabled ? "" : "opacity-60"}`}>
              <CardContent className="flex items-center justify-between py-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-200">{cmd.label || cmd.command}</span>
                    {cmd.enabled ? (
                      <span className="text-xs bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full">Active</span>
                    ) : (
                      <span className="text-xs bg-slate-500/10 text-slate-400 px-2 py-0.5 rounded-full">Paused</span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-xs text-slate-500">
                    <span>{cronSummary(cmd.cron_expr)}</span>
                    <span>{cmd.run_count} runs</span>
                    {cmd.last_run_at && <span>Last: {new Date(cmd.last_run_at).toLocaleDateString()}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => handleToggle(cmd)} className="p-2 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors" title={cmd.enabled ? "Pause" : "Activate"}>
                    {cmd.enabled ? <ToggleRight className="h-5 w-5 text-emerald-500" /> : <ToggleLeft className="h-5 w-5" />}
                  </button>
                  <button onClick={() => handleDelete(cmd.id)} className="p-2 rounded hover:bg-red-900/30 text-slate-400 hover:text-red-400 transition-colors" title="Delete">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
