import { useState } from "react";
import { runBridgeCommand } from "@/common/bridge-run";
import { cn } from "@/common/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Send, Bot, User, Loader2, Mic, MicOff } from "lucide-react";

interface Message {
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
}

export function Chat() {
    const [messages, setMessages] = useState<Message[]>([
        {
            role: 'assistant',
            content:
                "Alexa Control ready. When “Listen after speak” is on, the bridge plays your command, records the default mic, transcribes it (e.g. Alexa’s weather), and returns text here. Turn it off to speak only (no listening). An MCP client can do the same via `interact` with `wait_for_response`.",
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
    ]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    /** When true, run full `interact` loop: TTS then mic + STT. When false, TTS only (`speak_command` path inside interact). */
    const [waitForResponse, setWaitForResponse] = useState(true);
    /** Seconds to record after speaking when waiting for a response (passed to the bridge as `timeout`). */
    const [listenSeconds, setListenSeconds] = useState(20);

    const handleSendMessage = async () => {
        if (!input.trim() || isLoading) return;

        const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const userMsg: Message = { role: 'user', content: input, timestamp };

        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsLoading(true);

        try {
            const text = await runBridgeCommand({
                command: input,
                waitForResponse,
                timeout: listenSeconds,
            });

            const aiMsg: Message = {
                role: 'assistant',
                content: text,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            };
            setMessages(prev => [...prev, aiMsg]);
        } catch {
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: 'Error: Failed to communicate with Alexa Bridge.',
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex h-[calc(100vh-8rem)] flex-col space-y-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-white">Alexa Interface</h2>
                    <p className="text-slate-400">Natural language bridge: speak, optionally listen and show transcription.</p>
                </div>
            </div>

            <Card className="flex-1 border-slate-800 bg-slate-950/50 flex flex-col overflow-hidden">
                <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
                    {messages.map((msg, idx) => (
                        <div key={idx} className="flex gap-3">
                            <div className={cn(
                                "h-8 w-8 rounded-full flex items-center justify-center border",
                                msg.role === 'user' ? "bg-slate-800 border-slate-700" : "bg-blue-900/20 border-blue-800"
                            )}>
                                {msg.role === 'user' ? <User className="h-4 w-4 text-slate-400" /> : <Bot className="h-4 w-4 text-blue-400" />}
                            </div>
                            <div className="flex-1 space-y-1">
                                <div className="flex items-center gap-2">
                                    <span className={cn("text-sm font-medium", msg.role === 'user' ? "text-slate-200" : "text-blue-400")}>
                                        {msg.role === 'user' ? "Operator" : "System AI"}
                                    </span>
                                    <span className="text-xs text-slate-500">{msg.timestamp}</span>
                                </div>
                                <div className={cn(
                                    "text-sm p-3 rounded-md border",
                                    msg.role === 'user' ? "text-slate-300 bg-slate-900/50 border-slate-800" : "text-blue-100 bg-blue-950/10 border-blue-900/30"
                                )}>
                                    {msg.content}
                                </div>
                            </div>
                        </div>
                    ))}
                    {isLoading && (
                        <div className="flex items-center gap-2 text-slate-500 text-xs animate-pulse">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            {waitForResponse ? "Speaking, then listening and transcribing…" : "Sending to bridge (speak only)…"}
                        </div>
                    )}
                </CardContent>
                <div className="p-4 border-t border-slate-800 bg-slate-900/30 space-y-3">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-md border border-slate-800/80 bg-slate-950/40 p-3">
                        <div className="flex items-center gap-3 min-w-0">
                            {waitForResponse ? (
                                <Mic className="h-4 w-4 text-emerald-500 shrink-0" aria-hidden />
                            ) : (
                                <MicOff className="h-4 w-4 text-amber-500/90 shrink-0" aria-hidden />
                            )}
                            <div className="flex flex-col gap-1 min-w-0">
                                <Label htmlFor="wait-for-response" className="text-slate-200 text-sm cursor-pointer">
                                    Listen after speak
                                </Label>
                                <p className="text-xs text-slate-500 leading-snug">
                                    Off: TTS only. On: play command, then record and transcribe (e.g. weather) into the reply below.
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 pl-0 sm:pl-2">
                            <Switch
                                id="wait-for-response"
                                checked={waitForResponse}
                                onCheckedChange={setWaitForResponse}
                                disabled={isLoading}
                            />
                        </div>
                    </div>
                    {waitForResponse && (
                        <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3 max-w-md">
                            <Label htmlFor="listen-seconds" className="text-slate-400 text-xs whitespace-nowrap sm:w-40">
                                Listen window (seconds)
                            </Label>
                            <Input
                                id="listen-seconds"
                                type="number"
                                min={1}
                                max={120}
                                className="bg-slate-950 border-slate-800 text-slate-100 h-9 w-24 text-sm tabular-nums"
                                value={listenSeconds}
                                onChange={(e) => setListenSeconds(Number(e.target.value))}
                                disabled={isLoading}
                            />
                            <span className="text-[11px] text-slate-600">1–120 (ramble-y replies need more time)</span>
                        </div>
                    )}
                    <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} className="flex gap-2">
                        <input
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            className="flex-1 bg-slate-950 border border-slate-800 rounded-md px-4 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                            placeholder="e.g. what’s the weather?"
                            disabled={isLoading}
                        />
                        <Button type="submit" size="icon" className="bg-blue-600 hover:bg-blue-700" disabled={isLoading}>
                            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                        </Button>
                    </form>
                </div>
            </Card>
        </div>
    );
}
