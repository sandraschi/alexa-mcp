import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Terminal, Play, Loader2, Mic, MessageSquare } from 'lucide-react';

export function Tools() {
    const [executing, setExecuting] = useState<{ [key: string]: boolean }>({});
    const [results, setResults] = useState<{ [key: string]: any }>({});

    const tools = [
        {
            name: 'speak_command',
            description: 'Synthesizes and speaks the given text via the default speaker.',
            parameters: 'text: string',
            icon: Mic
        },
        {
            name: 'listen_for_response',
            description: 'Listens to the microphone and transcribes the audio.',
            parameters: 'duration: int (default: 10)',
            icon: MessageSquare
        },
        {
            name: 'interact',
            description: 'Full interaction loop: Speak command -> Wait -> Listen for response.',
            parameters: 'command: string, wait_for_response: bool, timeout: int',
            icon: Play
        }
    ];

    const handleExecute = async (toolName: string) => {
        setExecuting(prev => ({ ...prev, [toolName]: true }));
        try {
            const res = await fetch(`/api/tools/${toolName}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ arguments: {} })
            });
            const data = await res.json();
            setResults(prev => ({ ...prev, [toolName]: data.result || data.error }));
        } catch (err) {
            setResults(prev => ({ ...prev, [toolName]: 'Execution failed' }));
        } finally {
            setExecuting(prev => ({ ...prev, [toolName]: false }));
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-white">MCP Tools</h2>
                    <p className="text-slate-400">Direct interface to Alexa MCP server tools</p>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {tools.map((tool) => (
                    <Card key={tool.name} className="bg-slate-900/40 border-slate-800 hover:border-blue-500/50 transition-colors flex flex-col group">
                        <CardHeader className="flex flex-row items-center space-y-0 gap-4">
                            <div className="p-2 rounded-lg bg-blue-500/10 group-hover:bg-blue-500/20 transition-colors">
                                <tool.icon className="h-5 w-5 text-blue-500" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <CardTitle className="text-sm font-mono text-slate-100 truncate">{tool.name}</CardTitle>
                                <CardDescription className="text-xs text-slate-500 mt-1 line-clamp-2">
                                    {tool.description}
                                </CardDescription>
                            </div>
                        </CardHeader>
                        <CardContent className="flex-1 space-y-4">
                            <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono bg-slate-950/50 p-2 rounded">
                                <Terminal className="h-3 w-3" />
                                <span>args: {tool.parameters}</span>
                            </div>

                            <Button
                                onClick={() => handleExecute(tool.name)}
                                disabled={executing[tool.name]}
                                className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200"
                            >
                                {executing[tool.name] ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
                                {executing[tool.name] ? 'Executing...' : 'Run Tool'}
                            </Button>

                            {results[tool.name] && (
                                <div className="p-3 text-xs font-mono rounded bg-slate-950 border border-slate-800 overflow-auto max-h-32">
                                    <div className="text-blue-400 mb-1 font-semibold">Result:</div>
                                    <pre className="text-slate-300 whitespace-pre-wrap">
                                        {typeof results[tool.name] === 'string' ? results[tool.name] : JSON.stringify(results[tool.name], null, 2)}
                                    </pre>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
