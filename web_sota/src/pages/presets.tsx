import { useCallback, useEffect, useState } from "react";
import { API_BASE } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Play, Trash2, Edit3, Loader2, ListOrdered } from "lucide-react";

interface PresetStep {
  id?: number;
  command: string;
  delay_seconds: number;
}

interface Preset {
  id: number;
  name: string;
  description: string;
  steps: PresetStep[];
  created_at: string;
  run_count: number;
}

export function Presets() {
  const [presets, setPresets] = useState<Preset[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<number | null>(null);
  const [form, setForm] = useState({ name: "", description: "", steps: [{ command: "", delay_seconds: 2 }] });
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState<number | null>(null);

  const fetchPresets = useCallback(async () => {
    try {
      const r = await fetch(`${API_BASE}/api/presets`);
      const data = await r.json();
      setPresets(Array.isArray(data) ? data : []);
    } catch { setPresets([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchPresets(); }, [fetchPresets]);

  const resetForm = () => {
    setForm({ name: "", description: "", steps: [{ command: "", delay_seconds: 2 }] });
    setEditing(null);
    setShowForm(false);
  };

  const handleEdit = (preset: Preset) => {
    setForm({ name: preset.name, description: preset.description, steps: preset.steps.length > 0 ? preset.steps : [{ command: "", delay_seconds: 2 }] });
    setEditing(preset.id);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const url = editing
        ? `${API_BASE}/api/presets/${editing}`
        : `${API_BASE}/api/presets`;
      await fetch(url, {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      resetForm();
      await fetchPresets();
    } catch { }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    await fetch(`${API_BASE}/api/presets/${id}`, { method: "DELETE" });
    await fetchPresets();
  };

  const handleRun = async (id: number) => {
    setRunning(id);
    try {
      await fetch(`${API_BASE}/api/presets/${id}/run`, { method: "POST" });
    } catch { }
    finally { setRunning(null); }
  };

  const addStep = () => {
    setForm({ ...form, steps: [...form.steps, { command: "", delay_seconds: 2 }] });
  };

  const updateStep = (index: number, field: string, value: string | number) => {
    const steps = [...form.steps];
    steps[index] = { ...steps[index], [field]: value };
    setForm({ ...form, steps });
  };

  const removeStep = (index: number) => {
    if (form.steps.length <= 1) return;
    setForm({ ...form, steps: form.steps.filter((_, i) => i !== index) });
  };

  return (
    <div data-testid="presets-page" className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">Command Presets</h2>
          <p className="text-slate-400 mt-1">Multi-step command sequences for automated voice routines</p>
        </div>
        <Button onClick={() => { resetForm(); setShowForm(!showForm); }} className="bg-emerald-600 hover:bg-emerald-700">
          <Plus className="h-4 w-4 mr-2" /> {showForm ? "Cancel" : "New Preset"}
        </Button>
      </div>

      {showForm && (
        <Card className="border-emerald-800 bg-slate-950/50">
          <CardContent className="pt-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-slate-300 block mb-1">Preset Name</label>
                <input className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100" placeholder="Morning routine" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <label className="text-sm text-slate-300 block mb-1">Description</label>
                <input className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100" placeholder="Turns on lights and checks weather" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm text-slate-300">Command Steps</label>
                <button onClick={addStep} className="text-xs text-emerald-400 hover:text-emerald-300">+ Add Step</button>
              </div>
              <div className="space-y-2">
                {form.steps.map((step, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 w-6">{i + 1}.</span>
                    <input
                      className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 text-sm"
                      placeholder='e.g. "Alexa, good morning"'
                      value={step.command}
                      onChange={(e) => updateStep(i, "command", e.target.value)}
                    />
                    <input
                      className="w-20 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 text-sm"
                      placeholder="Delay"
                      type="number"
                      min="0"
                      step="0.5"
                      value={step.delay_seconds}
                      onChange={(e) => updateStep(i, "delay_seconds", parseFloat(e.target.value) || 0)}
                    />
                    <span className="text-xs text-slate-500">s</span>
                    <button onClick={() => removeStep(i)} className="text-red-400 hover:text-red-300 text-xs disabled:opacity-30" disabled={form.steps.length <= 1}>✕</button>
                  </div>
                ))}
              </div>
            </div>

            <Button onClick={handleSave} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ListOrdered className="h-4 w-4 mr-2" />}
              {editing ? "Update Preset" : "Create Preset"}
            </Button>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-slate-500" /></div>
      ) : presets.length === 0 ? (
        <Card className="border-dashed border-slate-700 bg-slate-950/30">
          <CardContent className="py-12 text-center">
            <ListOrdered className="h-12 w-12 mx-auto text-slate-600 mb-4" />
            <p className="text-slate-400">No command presets yet.</p>
            <p className="text-sm text-slate-500 mt-1">Create multi-step voice sequences for complex routines.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {presets.map((preset) => (
            <Card key={preset.id} className="border-slate-800 bg-slate-950/50">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-sm font-medium text-slate-200">{preset.name}</CardTitle>
                    {preset.description && <p className="text-xs text-slate-500 mt-1">{preset.description}</p>}
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => handleEdit(preset)} className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-white"><Edit3 className="h-3.5 w-3.5" /></button>
                    <button onClick={() => handleDelete(preset.id)} className="p-1.5 rounded hover:bg-red-900/30 text-slate-400 hover:text-red-400"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-1 mb-3">
                  {preset.steps.map((step, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-slate-400">
                      <span className="w-4 h-4 rounded-full bg-slate-800 flex items-center justify-center text-[10px]">{i + 1}</span>
                      <span className="text-slate-300">{step.command}</span>
                      {step.delay_seconds > 0 && <span className="text-slate-600">({step.delay_seconds}s)</span>}
                    </div>
                  ))}
                </div>
                <Button onClick={() => handleRun(preset.id)} disabled={running === preset.id} size="sm" className="w-full bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-700/30">
                  {running === preset.id ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Play className="h-3 w-3 mr-1" />}
                  Run Sequence ({preset.run_count} runs)
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
