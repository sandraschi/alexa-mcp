import { useState, useRef, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Send, Bot, User, Loader2, Trash2 } from "lucide-react";
import { cn } from "@/common/utils";
import { toast } from "sonner";

const STORAGE_KEY = "alexa_chat_history";

interface Message {
    role: "user" | "assistant";
    content: string;
    timestamp: string;
}

const WELCOME: Message = {
    role: "assistant",
    content: "Alexa Control ready. Type a command — I'll speak it through the acoustic bridge and transcribe Alexa's response.",
    timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
};

function now() {
    return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function Chat() {
    const [messages, setMessages] = useState<Message[]>(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            return saved ? JSON.parse(saved) : [WELCOME];
        } catch { return [WELCOME]; }
    });
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    }, [messages]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, isLoading]);

    const clearHistory = () => {
        setMessages([WELCOME]);
        localStorage.removeItem(STORAGE_KEY);
        toast.success("Chat history cleared");
    };

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;
        const text = input.trim();
        setMessages(prev => [...prev, { role: "user", content: text, timestamp: now() }]);
        setInput("");
        setIsLoading(true);
        try {
            const res = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ command: text, wait_for_response: true }),
            });
            if (!res.ok) throw new Error(`Server returned HTTP ${res.status}`);
            const data = await res.json();
            setMessages(prev => [...prev, {
                role: "assistant",
                content: data.response ?? "No response from bridge.",
                timestamp: now(),
            }]);
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            setMessages(prev => [...prev, { role: "assistant", content: `Error: ${msg}`, timestamp: now() }]);
            toast.error(msg);
        } finally { setIsLoading(false); }
    };

    return (
        <div className="flex h-[calc(100vh-8rem)] flex-col space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-white">Alexa Interface</h2>
                    <p className="text-slate-400">Commands are spoken aloud — Alexa's reply is transcribed</p>
                </div>
                <Button variant="ghost" size="sm" onClick={clearHistory}
                    className="text-slate-500 hover:text-slate-300 hover:bg-slate-800">
                    <Trash2 className="h-4 w-4 mr-1.5" />Clear
                </Button>
            </div>

            <Card className="flex-1 border-slate-800 bg-slate-950/50 flex flex-col overflow-hidden">
                <CardContent className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
                    {messages.map((msg, idx) => (
                        <div key={idx} className="flex gap-3">
                            <div className={cn(
                                "h-8 w-8 rounded-full flex items-center justify-center border shrink-0",
                                msg.role === "user" ? "bg-slate-800 border-slate-700" : "bg-blue-900/20 border-blue-800"
                            )}>
                                {msg.role === "user"
                                    ? <User className="h-4 w-4 text-slate-400" />
                                    : <Bot className="h-4 w-4 text-blue-400" />}
                            </div>
                            <div className="flex-1 space-y-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className={cn("text-sm font-medium",
                                        msg.role === "user" ? "text-slate-200" : "text-blue-400")}>
                                        {msg.role === "user" ? "Operator" : "Bridge"}
                                    </span>
                                    <span className="text-xs text-slate-500">{msg.timestamp}</span>
                                </div>
                                <div className={cn(
                                    "text-sm p-3 rounded-md border whitespace-pre-wrap break-words",
                                    msg.role === "user"
                                        ? "text-slate-300 bg-slate-900/50 border-slate-800"
                                        : "text-blue-100 bg-blue-950/10 border-blue-900/30"
                                )}>
                                    {msg.content}
                                </div>
            </div>
                        </div>
                    ))}
                    {isLoading && (
                        <div className="flex items-center gap-2 text-slate-500 text-xs animate-pulse pl-11">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            Speaking command and listening for Alexa's response...
                        </div>
                    )}
                    <div ref={bottomRef} />
                </CardContent>
                <div className="p-4 border-t border-slate-800 bg-slate-900/30 shrink-0">
                    <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex gap-2">
                        <input value={input} onChange={(e) => setInput(e.target.value)}
                            className="flex-1 bg-slate-950 border border-slate-800 rounded-md px-4 py-2 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            placeholder="turn on the kitchen lights"
                            disabled={isLoading} />
                        <Button type="submit" size="icon" className="bg-blue-600 hover:bg-blue-700 shrink-0"
                            disabled={isLoading || !input.trim()}>
                            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                        </Button>
                    </form>
                </div>
            </Card>
        </div>
    );
}
