import { useEffect, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Terminal, Play, Loader2, Mic, MessageSquare, BookOpen, Sparkles, Wrench } from 'lucide-react';
import { api } from '@/common/api';

interface ListedTool {
    name: string;
    description: string;
}

const TOOL_ICONS: Record<string, LucideIcon> = {
    speak_command: Mic,
    listen_for_response: MessageSquare,
    interact: Play,
    docs_help: BookOpen,
    agentic_alexa_query: Sparkles,
};

function iconForTool(name: string): LucideIcon {
    return TOOL_ICONS[name] ?? Wrench;
}

export function Tools() {
    const [tools, setTools] = useState<ListedTool[]>([]);
    const [listError, setListError] = useState<string | null>(null);
    const [listLoading, setListLoading] = useState(true);
    const [executing, setExecuting] = useState<Record<string, boolean>>({});
    const [results, setResults] = useState<Record<string, unknown>>({});

    useEffect(() => {
        let cancelled = false;
        (async () => {
            setListLoading(true);
            setListError(null);
            try {
                const res = await fetch(api.tools);
                const data = (await res.json()) as { tools?: ListedTool[] };
                const list = data.tools;
                if (!Array.isArray(list)) {
                    if (!cancelled) setListError('Server returned no tools list.');
                    return;
                }
                if (!cancelled) setTools(list);
            } catch {
                if (!cancelled) setListError('Failed to load tools from /api/tools.');
            } finally {
                if (!cancelled) setListLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    const handleExecute = async (toolName: string) => {
        setExecuting((prev) => ({ ...prev, [toolName]: true }));
        try {
            const res = await fetch(api.toolExecute(toolName), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ arguments: {} }),
            });
            const data = (await res.json()) as { result?: unknown; error?: string };
            setResults((prev) => ({ ...prev, [toolName]: data.result ?? data.error ?? 'Empty response' }));
        } catch {
            setResults((prev) => ({ ...prev, [toolName]: 'Execution failed' }));
        } finally {
            setExecuting((prev) => ({ ...prev, [toolName]: false }));
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-white">MCP Tools</h2>
                    <p className="text-slate-400">Tools from GET {api.tools} — execute via POST {api.toolExecute('{name}')}</p>
                </div>
            </div>

            {listLoading && (
                <p className="text-sm text-slate-500 flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" /> Loading tool registry…
                </p>
            )}
            {listError && <p className="text-sm text-amber-400">{listError}</p>}

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {tools.map((tool) => {
                    const Icon = iconForTool(tool.name);
                    return (
                        <Card
                            key={tool.name}
                            className="bg-slate-900/40 border-slate-800 hover:border-blue-500/50 transition-colors flex flex-col group"
                        >
                            <CardHeader className="flex flex-row items-center space-y-0 gap-4">
                                <div className="p-2 rounded-lg bg-blue-500/10 group-hover:bg-blue-500/20 transition-colors">
                                    <Icon className="h-5 w-5 text-blue-500" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <CardTitle className="text-sm font-mono text-slate-100 truncate">{tool.name}</CardTitle>
                                    <CardDescription className="text-xs text-slate-500 mt-1 line-clamp-3">
                                        {tool.description}
                                    </CardDescription>
                                </div>
                            </CardHeader>
                            <CardContent className="flex-1 space-y-4">
                                <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono bg-slate-950/50 p-2 rounded">
                                    <Terminal className="h-3 w-3" />
                                    <span>POST JSON body: {'{'} &quot;arguments&quot;: {'{'} … {'}'} {'}'}</span>
                                </div>

                                <Button
                                    onClick={() => handleExecute(tool.name)}
                                    disabled={executing[tool.name]}
                                    className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200"
                                >
                                    {executing[tool.name] ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <Play className="h-4 w-4 mr-2" />
                                    )}
                                    {executing[tool.name] ? 'Executing...' : 'Run Tool'}
                                </Button>

                                {(() => {
                                    const r = results[tool.name];
                                    if (r === undefined) return null;
                                    const text = typeof r === 'string' ? r : JSON.stringify(r, null, 2);
                                    return (
                                        <div className="p-3 text-xs font-mono rounded bg-slate-950 border border-slate-800 overflow-auto max-h-32">
                                            <div className="text-blue-400 mb-1 font-semibold">Result:</div>
                                            <pre className="text-slate-300 whitespace-pre-wrap">{text}</pre>
                                        </div>
                                    );
                                })()}
                            </CardContent>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
}
