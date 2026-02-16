import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Send, Bot, User, Loader2 } from "lucide-react";

interface Message {
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
}

export function Chat() {
    const [messages, setMessages] = useState<Message[]>([
        {
            role: 'assistant',
            content: 'Alexa Control ready. Enter a natural language command.',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSendMessage = async () => {
        if (!input.trim() || isLoading) return;

        const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const userMsg: Message = { role: 'user', content: input, timestamp };

        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsLoading(true);

        try {
            const res = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    command: input,
                    wait_for_response: true
                })
            });
            const data = await res.json();

            const aiMsg: Message = {
                role: 'assistant',
                content: data.response || 'No response from bridge.',
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            };
            setMessages(prev => [...prev, aiMsg]);
        } catch (err) {
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
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-white">Alexa Interface</h2>
                    <p className="text-slate-400">Natural language bridge control</p>
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
                            Awaiting bridge response...
                        </div>
                    )}
                </CardContent>
                <div className="p-4 border-t border-slate-800 bg-slate-900/30">
                    <form
                        onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}
                        className="flex gap-2"
                    >
                        <input
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            className="flex-1 bg-slate-950 border border-slate-800 rounded-md px-4 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                            placeholder="Enter a command for Alexa..."
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

function cn(...classes: string[]) {
    return classes.filter(Boolean).join(' ');
}
