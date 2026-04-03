import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Terminal, Play, Loader2, Mic, MessageSquare, RefreshCw, CloudSun, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/common/utils";

// ---------------------------------------------------------------------------
// Static parameter definitions for known tools
// (fallback when inputSchema is not available from the server)
// ---------------------------------------------------------------------------
interface ParamDef {
    name: string;
    type: "string" | "number" | "boolean";
    label: string;
    required?: boolean;
    default?: string | number | boolean;
    placeholder?: string;
}

const KNOWN_PARAMS: Record<string, ParamDef[]> = {
    speak_command: [
        {
            name: "text",
            type: "string",
            label: "Text to speak",
            required: true,
            placeholder: 'Alexa, what time is it?',
        },
    ],
    listen_for_response: [
        {
            name: "duration",
            type: "number",
            label: "Duration (seconds)",
            default: 10,
            placeholder: "10",
        },
    ],
    interact: [
        {
            name: "command",
            type: "string",
            label: "Command",
            required: true,
            placeholder: "turn on the living room lights",
        },
        {
            name: "wait_for_response",
            type: "boolean",
            label: "Wait for response",
            default: true,
        },
        {
            name: "timeout",
            type: "number",
            label: "Timeout (seconds)",
            default: 10,
            placeholder: "10",
        },
    ],
    get_weather: [
        {
            name: "timeout",
            type: "number",
            label: "Listen timeout (seconds)",
            default: 15,
            placeholder: "15",
        },
    ],
};

const TOOL_ICONS: Record<string, React.ElementType> = {
    speak_command: Mic,
    listen_for_response: MessageSquare,
    interact: Play,
    get_weather: CloudSun,
};

function defaultArgs(params: ParamDef[]): Record<string, string | number | boolean> {
    const args: Record<string, string | number | boolean> = {};
    for (const p of params) {
        if (p.default !== undefined) args[p.name] = p.default;
        else if (p.type === "boolean") args[p.name] = false;
        else if (p.type === "number") args[p.name] = 0;
        else args[p.name] = "";
    }
    return args;
}

// ---------------------------------------------------------------------------
// Per-tool argument editor
// ---------------------------------------------------------------------------
interface ArgEditorProps {
    params: ParamDef[];
    values: Record<string, string | number | boolean>;
    onChange: (values: Record<string, string | number | boolean>) => void;
}

function ArgEditor({ params, values, onChange }: ArgEditorProps) {
    if (params.length === 0) {
        return <p className="text-xs text-slate-500 italic">No parameters required.</p>;
    }

    return (
        <div className="space-y-3">
            {params.map((p) => (
                <div key={p.name} className="space-y-1">
                    <Label className="text-xs text-slate-400 font-mono">
                        {p.label}
                        {p.required && <span className="text-red-400 ml-1">*</span>}
                    </Label>
                    {p.type === "boolean" ? (
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id={p.name}
                                checked={!!values[p.name]}
                                onChange={(e) =>
                                    onChange({ ...values, [p.name]: e.target.checked })
                                }
                                className="h-4 w-4 accent-blue-500"
                            />
                            <label htmlFor={p.name} className="text-xs text-slate-300 cursor-pointer">
                                {values[p.name] ? "true" : "false"}
                            </label>
                        </div>
                    ) : (
                        <Input
                            type={p.type === "number" ? "number" : "text"}
                            value={String(values[p.name] ?? "")}
                            placeholder={p.placeholder}
                            onChange={(e) =>
                                onChange({
                                    ...values,
                                    [p.name]:
                                        p.type === "number"
                                            ? Number(e.target.value)
                                            : e.target.value,
                                })
                            }
                            className="h-8 text-xs bg-slate-950 border-slate-700 text-slate-100 placeholder:text-slate-600 focus:border-blue-500"
                        />
                    )}
                </div>
            ))}
        </div>
    );
}

// ---------------------------------------------------------------------------
// Result display
// ---------------------------------------------------------------------------
function ResultDisplay({ result }: { result: unknown }) {
    const [expanded, setExpanded] = useState(false);
    const text =
        typeof result === "string"
            ? result
            : JSON.stringify(result, null, 2);
    const isLong = text.length > 300;

    return (
        <div className="rounded bg-slate-950 border border-slate-800 overflow-hidden">
            <div className="flex items-center justify-between px-3 py-1.5 border-b border-slate-800">
                <span className="text-[10px] font-semibold text-blue-400 uppercase tracking-wide">Result</span>
                {isLong && (
                    <button
                        onClick={() => setExpanded((v) => !v)}
                        className="text-slate-500 hover:text-slate-300"
                    >
                        {expanded ? (
                            <ChevronUp className="h-3.5 w-3.5" />
                        ) : (
                            <ChevronDown className="h-3.5 w-3.5" />
                        )}
                    </button>
                )}
            </div>
            <pre
                className={cn(
                    "text-xs font-mono text-slate-300 whitespace-pre-wrap p-3 overflow-auto",
                    !expanded && isLong ? "max-h-28" : "max-h-96"
                )}
            >
                {text}
            </pre>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
interface ToolDef {
    name: string;
    description: string;
    inputSchema: Record<string, unknown>;
}

export function Tools() {
    const [tools, setTools] = useState<ToolDef[]>([]);
    const [loadingTools, setLoadingTools] = useState(true);
    const [fetchError, setFetchError] = useState<string | null>(null);

    const [args, setArgs] = useState<Record<string, Record<string, string | number | boolean>>>({});
    const [executing, setExecuting] = useState<Record<string, boolean>>({});
    const [results, setResults] = useState<Record<string, unknown>>({});
    const [errors, setErrors] = useState<Record<string, string>>({});

    const fetchTools = async () => {
        setLoadingTools(true);
        setFetchError(null);
        try {
            const res = await fetch("/api/tools");
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            const fetched: ToolDef[] = data.tools ?? [];
            setTools(fetched);
            // Initialise arg state for each tool
            const initArgs: Record<string, Record<string, string | number | boolean>> = {};
            for (const t of fetched) {
                const params = KNOWN_PARAMS[t.name] ?? [];
                initArgs[t.name] = defaultArgs(params);
            }
            setArgs(initArgs);
        } catch (err) {
            setFetchError(String(err));
        } finally {
            setLoadingTools(false);
        }
    };

    useEffect(() => {
        fetchTools();
    }, []);

    const handleExecute = async (toolName: string) => {
        const toolArgs = args[toolName] ?? {};

        // Strip empty optional strings so the server uses defaults
        const cleaned: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(toolArgs)) {
            if (v !== "" && v !== null && v !== undefined) cleaned[k] = v;
        }

        setExecuting((prev) => ({ ...prev, [toolName]: true }));
        setErrors((prev) => ({ ...prev, [toolName]: "" }));
        try {
            const res = await fetch(`/api/tools/${toolName}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ arguments: cleaned }),
            });
            const data = await res.json();
            if (data.error) {
                setErrors((prev) => ({ ...prev, [toolName]: data.error }));
            } else {
                setResults((prev) => ({ ...prev, [toolName]: data.result }));
            }
        } catch (err) {
            setErrors((prev) => ({ ...prev, [toolName]: `Network error: ${err}` }));
        } finally {
            setExecuting((prev) => ({ ...prev, [toolName]: false }));
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-white">MCP Tools</h2>
                    <p className="text-slate-400">Direct interface to Alexa MCP server tools</p>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={fetchTools}
                    disabled={loadingTools}
                    className="border-slate-700 text-slate-300 hover:bg-slate-800"
                >
                    <RefreshCw className={cn("h-3.5 w-3.5 mr-1.5", loadingTools && "animate-spin")} />
                    Refresh
                </Button>
            </div>

            {fetchError && (
                <div className="rounded border border-red-900/50 bg-red-950/20 px-4 py-3 text-sm text-red-400">
                    Could not load tools from server: {fetchError}
                </div>
            )}

            {loadingTools ? (
                <div className="flex items-center gap-2 text-slate-500 text-sm py-8">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading tools from server…
                </div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-2">
                    {tools.map((tool) => {
                        const Icon = TOOL_ICONS[tool.name] ?? Terminal;
                        const params = KNOWN_PARAMS[tool.name] ?? [];
                        const isRunning = executing[tool.name];
                        const result = results[tool.name];
                        const error = errors[tool.name];

                        return (
                            <Card
                                key={tool.name}
                                className="bg-slate-900/40 border-slate-800 hover:border-blue-500/40 transition-colors flex flex-col"
                            >
                                <CardHeader className="flex flex-row items-start space-y-0 gap-3 pb-3">
                                    <div className="p-2 rounded-lg bg-blue-500/10 mt-0.5">
                                        <Icon className="h-4 w-4 text-blue-400" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <CardTitle className="text-sm font-mono text-slate-100">
                                            {tool.name}
                                        </CardTitle>
                                        <CardDescription className="text-xs text-slate-500 mt-1">
                                            {tool.description}
                                        </CardDescription>
                                    </div>
                                </CardHeader>

                                <CardContent className="flex-1 space-y-4">
                                    {/* Argument inputs */}
                                    <div className="rounded-md bg-slate-950/60 border border-slate-800 p-3 space-y-3">
                                        <div className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-500 uppercase tracking-wide">
                                            <Terminal className="h-3 w-3" />
                                            Parameters
                                        </div>
                                        <ArgEditor
                                            params={params}
                                            values={args[tool.name] ?? {}}
                                            onChange={(newVals) =>
                                                setArgs((prev) => ({
                                                    ...prev,
                                                    [tool.name]: newVals,
                                                }))
                                            }
                                        />
                                    </div>

                                    <Button
                                        onClick={() => handleExecute(tool.name)}
                                        disabled={isRunning}
                                        className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                                    >
                                        {isRunning ? (
                                            <>
                                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                                Running…
                                            </>
                                        ) : (
                                            <>
                                                <Play className="h-4 w-4 mr-2" />
                                                Run {tool.name}
                                            </>
                                        )}
                                    </Button>

                                    {error && (
                                        <div className="rounded border border-red-900/50 bg-red-950/20 px-3 py-2 text-xs text-red-400 font-mono">
                                            {error}
                                        </div>
                                    )}

                                    {result !== undefined && !error && (
                                        <ResultDisplay result={result} />
                                    )}
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
