import { useCallback, useEffect, useRef, useState } from "react";
import { Bot, Download, Eraser, Loader2, Mic, MicOff, Send, User } from "lucide-react";
import { runBridgeCommand } from "@/common/bridge-run";
import { cn } from "@/common/utils";

const HISTORY_KEY = "alexa-chat-history";
const PERSONALITY_KEY = "alexa-chat-personality";
const MAX_HISTORY = 100;

const PERSONALITIES: Record<string, string> = {
  "Smart Home Expert": "You are a smart home expert specializing in Alexa integration. Provide guidance on device control, routines, voice commands, and home automation best practices.",
  "Voice Designer": "You are a voice interface designer. Focus on natural language patterns, Alexa voice interaction design, and user experience for voice-controlled smart homes.",
  "Quick Summarizer": "Keep responses to 2-3 sentences. Focus on key facts.",
  "Custom": "Custom prompt \u2014 editable below.",
};

const EXAMPLE_PROMPTS = [
  { group: "Devices", prompts: ["What\u2019s the weather?", "Turn on the lights", "Set thermostat to 22 degrees"] },
  { group: "Voice", prompts: ["Test voice response", "Create a routine for good morning", "Check microphone status"] },
  { group: "Skills", prompts: ["What skills are available?", "Enable a news flash briefing", "List smart home devices"] },
];

interface Message { role: "user" | "assistant"; content: string; timestamp: string; }

export function Chat() {
  const [personality, setPersonality] = useState(() => localStorage.getItem(PERSONALITY_KEY) || "Smart Home Expert");
  const [messages, setMessages] = useState<Message[]>(() => {
    try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]"); } catch { return []; }
  });
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [waitForResponse, setWaitForResponse] = useState(true);
  const [listenSeconds, setListenSeconds] = useState(20);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => { localStorage.setItem(HISTORY_KEY, JSON.stringify(messages)); }, [messages]);
  useEffect(() => { localStorage.setItem(PERSONALITY_KEY, personality); }, [personality]);
  useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  useEffect(() => {
    if (messages.length === 0) {
      setMessages([{ role: "assistant", content: "Alexa Control ready. When \u201cListen after speak\u201d is on, the bridge plays your command, records the default mic, transcribes it (e.g. Alexa\u2019s weather), and returns text here. Turn it off to speak only (no listening). An MCP client can do the same via `interact` with `wait_for_response`.", timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) }]);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSendMessage = useCallback(async () => {
    if (!input.trim() || isLoading) return;
    const timestamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const userMsg: Message = { role: "user", content: input, timestamp };
    setMessages((prev) => { const next = [...prev, userMsg]; return next.length > MAX_HISTORY ? next.slice(-MAX_HISTORY) : next; });
    setInput("");
    setIsLoading(true);
    try {
      const text = await runBridgeCommand({ command: input, waitForResponse, timeout: listenSeconds });
      setMessages((prev) => [...prev, { role: "assistant", content: text, timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) }]);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "Error: Failed to communicate with Alexa Bridge.", timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) }]);
    } finally { setIsLoading(false); }
  }, [input, isLoading, waitForResponse, listenSeconds]);

  const exportChat = () => {
    const text = messages.map((m) => `[${m.timestamp}] [${m.role.toUpperCase()}] ${m.content}`).join("\n\n");
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "alexa-chat.txt"; a.click();
    URL.revokeObjectURL(url);
  };

  const clearChat = () => { setMessages([]); };

  return (
    <div data-testid="chat-page" className="flex h-[calc(100vh-8rem)] flex-col space-y-4">
      <div data-testid="chat-controls" className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">Alexa Interface</h2>
          <p className="text-slate-400">Natural language bridge: speak, optionally listen and show transcription.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 bg-slate-800 px-2 py-1 rounded">skill:alexa-expert</span>
          <select data-testid="personality-select" className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200" value={personality} onChange={(e) => setPersonality(e.target.value)}>
            {Object.keys(PERSONALITIES).map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          <button data-testid="chat-export" onClick={exportChat} disabled={messages.length === 0} className="p-1.5 rounded hover:bg-slate-800 text-slate-400 disabled:opacity-30" title="Export"><Download className="h-4 w-4" /></button>
          <button data-testid="chat-clear" onClick={clearChat} disabled={messages.length === 0} className="p-1.5 rounded hover:bg-slate-800 text-slate-400 disabled:opacity-30" title="Clear"><Eraser className="h-4 w-4" /></button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4">
        {messages.map((msg, idx) => (
          <div key={idx} className="flex gap-3">
            <div className={cn("h-8 w-8 rounded-full flex items-center justify-center border", msg.role === "user" ? "bg-slate-800 border-slate-700" : "bg-blue-900/20 border-blue-800")}>
              {msg.role === "user" ? <User className="h-4 w-4 text-slate-400" /> : <Bot className="h-4 w-4 text-blue-400" />}
            </div>
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <span className={cn("text-sm font-medium", msg.role === "user" ? "text-slate-200" : "text-blue-400")}>{msg.role === "user" ? "Operator" : "System AI"}</span>
                <span className="text-xs text-slate-500">{msg.timestamp}</span>
              </div>
              <div className={cn("text-sm p-3 rounded-md border", msg.role === "user" ? "text-slate-300 bg-slate-900/50 border-slate-800" : "text-blue-100 bg-blue-950/10 border-blue-900/30")}>{msg.content}</div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex items-center gap-2 text-slate-500 text-xs animate-pulse">
            <Loader2 className="h-3 w-3 animate-spin" />
            {waitForResponse ? "Speaking, then listening and transcribing\u2026" : "Sending to bridge (speak only)\u2026"}
          </div>
        )}
        <div ref={scrollRef} />
      </div>

      <div data-testid="example-prompts" className="flex flex-wrap gap-2">
        {EXAMPLE_PROMPTS.map((group) => (
          <div key={group.group} className="flex flex-wrap items-center gap-1">
            <span className="text-xs text-slate-500 mr-1">{group.group}:</span>
            {group.prompts.map((p) => (
              <button key={p} onClick={() => setInput(p)} className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-1 rounded">{p}</button>
            ))}
          </div>
        ))}
      </div>

      <div className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-md border border-slate-800/80 bg-slate-950/40 p-3">
          <div className="flex items-center gap-3 min-w-0">
            {waitForResponse ? <Mic className="h-4 w-4 text-emerald-500 shrink-0" aria-hidden /> : <MicOff className="h-4 w-4 text-amber-500/90 shrink-0" aria-hidden />}
            <div className="flex flex-col gap-1 min-w-0">
              <label htmlFor="wait-for-response" className="text-slate-200 text-sm cursor-pointer">Listen after speak</label>
              <p className="text-xs text-slate-500 leading-snug">Off: TTS only. On: play command, then record and transcribe (e.g. weather) into the reply below.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 pl-0 sm:pl-2">
            <button role="switch" aria-checked={waitForResponse} id="wait-for-response" onClick={() => { if (!isLoading) setWaitForResponse(!waitForResponse); }}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${waitForResponse ? "bg-blue-600" : "bg-slate-700"}`}>
              <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${waitForResponse ? "translate-x-[18px]" : "translate-x-[3px]"}`} />
            </button>
          </div>
        </div>
        {waitForResponse && (
          <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3 max-w-md">
            <label htmlFor="listen-seconds" className="text-slate-400 text-xs whitespace-nowrap sm:w-40">Listen window (seconds)</label>
            <input id="listen-seconds" type="number" min={1} max={120} className="bg-slate-950 border border-slate-800 text-slate-100 h-9 w-24 text-sm tabular-nums rounded px-2" value={listenSeconds}
              onChange={(e) => setListenSeconds(Number(e.target.value))} disabled={isLoading} />
            <span className="text-[11px] text-slate-600">1\u2013120 (ramble-y replies need more time)</span>
          </div>
        )}
        <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} className="flex gap-2">
          <input data-testid="chat-input" value={input} onChange={(e) => setInput(e.target.value)} className="flex-1 bg-slate-950 border border-slate-800 rounded-md px-4 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="e.g. what\u2019s the weather?" disabled={isLoading} />
          <button data-testid="chat-send" type="submit" disabled={isLoading || !input.trim()} className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-md">
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </form>
      </div>
    </div>
  );
}
