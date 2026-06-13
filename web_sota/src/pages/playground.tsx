import { useCallback, useMemo, useState } from "react";
import { runBridgeCommand } from "@/common/bridge-run";
import {
    PLAYGROUND_CATEGORIES,
    PLAYGROUND_EXAMPLES,
    type PlaygroundExample,
} from "@/common/playground-examples";
import { cn } from "@/common/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
    ArrowRight,
    Bot,
    Loader2,
    Mic,
    MicOff,
    Play,
    Radio,
    User,
    Volume2,
} from "lucide-react";

type FlowStepId = "operator" | "tts" | "alexa" | "mic" | "stt" | "result";
type FlowStepState = "idle" | "active" | "done" | "skipped";

type FlowStep = {
    id: FlowStepId;
    label: string;
    detail: string;
    state: FlowStepState;
};

type Turn = {
    command: string;
    response: string;
    waitForResponse: boolean;
    timestamp: string;
    ok: boolean;
};

function buildFlowSteps(waitForResponse: boolean, phase: "idle" | "running" | "done"): FlowStep[] {
    const stateFor = (id: FlowStepId): FlowStepState => {
        if (!waitForResponse && (id === "mic" || id === "stt")) {
            return "skipped";
        }
        if (phase === "idle") {
            return "idle";
        }
        if (phase === "running") {
            if (id === "operator") return "done";
            if (id === "result") return waitForResponse ? "idle" : "active";
            return "active";
        }
        return "done";
    };

    return [
        {
            id: "operator",
            label: "You / web",
            detail: "Command text sent to POST /api/chat",
            state: stateFor("operator"),
        },
        {
            id: "tts",
            label: "Bridge TTS",
            detail: "edge-tts → speakers (Alexa hears it)",
            state: stateFor("tts"),
        },
        {
            id: "alexa",
            label: "Alexa device",
            detail: "Echo processes wake word + utterance",
            state: stateFor("alexa"),
        },
        {
            id: "mic",
            label: "PC microphone",
            detail: "Records room audio after speak",
            state: stateFor("mic"),
        },
        {
            id: "stt",
            label: "Bridge STT",
            detail: "faster-whisper transcribes reply",
            state: stateFor("stt"),
        },
        {
            id: "result",
            label: "Transcript",
            detail: "Shown in conversation panel",
            state: stateFor("result"),
        },
    ];
}

function stepStyles(state: FlowStepState): string {
    switch (state) {
        case "active":
            return "border-blue-500/60 bg-blue-950/30 text-blue-100 ring-1 ring-blue-500/40";
        case "done":
            return "border-emerald-800/50 bg-emerald-950/20 text-emerald-100";
        case "skipped":
            return "border-slate-800 bg-slate-950/30 text-slate-600 line-through decoration-slate-600";
        default:
            return "border-slate-800 bg-slate-950/40 text-slate-500";
    }
}

function FlowPipeline({
    steps,
    waitForResponse,
}: {
    steps: FlowStep[];
    waitForResponse: boolean;
}) {
    return (
        <div className="space-y-3">
            <p className="text-xs text-slate-500 leading-relaxed">
                Acoustic loop — not the Alexa API.{" "}
                {waitForResponse
                    ? "Full path: speak → Alexa answers → mic → STT → text."
                    : "Speak-only: TTS steps run; mic/STT skipped."}
            </p>
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-stretch">
                {steps.map((step, i) => (
                    <div key={step.id} className="flex items-center gap-2 min-w-0 sm:flex-1 sm:max-w-[11rem]">
                        <div
                            className={cn(
                                "flex-1 rounded-lg border px-3 py-2.5 text-left min-w-0",
                                stepStyles(step.state),
                            )}
                        >
                            <div className="text-xs font-semibold truncate">{step.label}</div>
                            <div className="text-[10px] opacity-80 mt-0.5 line-clamp-2">{step.detail}</div>
                        </div>
                        {i < steps.length - 1 && (
                            <ArrowRight
                                className="h-4 w-4 text-slate-600 shrink-0 hidden sm:block"
                                aria-hidden
                            />
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

export function Playground() {
    const [selectedId, setSelectedId] = useState(PLAYGROUND_EXAMPLES[0].id);
    const [command, setCommand] = useState(PLAYGROUND_EXAMPLES[0].command);
    const [hint, setHint] = useState(PLAYGROUND_EXAMPLES[0].hint);
    const [waitForResponse, setWaitForResponse] = useState(PLAYGROUND_EXAMPLES[0].suggestedListen);
    const [listenSeconds, setListenSeconds] = useState(PLAYGROUND_EXAMPLES[0].suggestedSeconds);
    const [phase, setPhase] = useState<"idle" | "running" | "done">("idle");
    const [isLoading, setIsLoading] = useState(false);
    const [turns, setTurns] = useState<Turn[]>([]);
    const [lastError, setLastError] = useState<string | null>(null);

    const selected = useMemo(
        () => PLAYGROUND_EXAMPLES.find((e) => e.id === selectedId) ?? PLAYGROUND_EXAMPLES[0],
        [selectedId],
    );

    const applyExample = useCallback((ex: PlaygroundExample) => {
        setSelectedId(ex.id);
        setCommand(ex.command);
        setHint(ex.hint);
        setWaitForResponse(ex.suggestedListen);
        setListenSeconds(ex.suggestedSeconds);
    }, []);

    const flowSteps = useMemo(
        () => buildFlowSteps(waitForResponse, phase),
        [waitForResponse, phase],
    );

    const handleRun = async () => {
        const text = command.trim();
        if (!text || isLoading) return;

        setIsLoading(true);
        setLastError(null);
        setPhase("running");

        const ts = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

        try {
            const response = await runBridgeCommand({
                command: text,
                waitForResponse,
                timeout: listenSeconds,
            });
            setTurns((prev) => [
                {
                    command: text,
                    response,
                    waitForResponse,
                    timestamp: ts,
                    ok: true,
                },
                ...prev,
            ]);
            setPhase("done");
        } catch (e) {
            const msg = e instanceof Error ? e.message : "Bridge request failed";
            setLastError(msg);
            setTurns((prev) => [
                {
                    command: text,
                    response: msg,
                    waitForResponse,
                    timestamp: ts,
                    ok: false,
                },
                ...prev,
            ]);
            setPhase("done");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold tracking-tight text-white">Playground</h2>
                <p className="text-slate-400">
                    Curated acoustic-bridge examples, live pipeline state, and conversation history.
                </p>
            </div>

            <Card className="border-slate-800 bg-slate-950/50">
                <CardHeader className="pb-2">
                    <CardTitle className="text-base text-slate-100 flex items-center gap-2">
                        <Radio className="h-4 w-4 text-blue-400" />
                        Conversation flow
                    </CardTitle>
                    <CardDescription className="text-slate-500">
                        Step status updates while a run is in progress.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <FlowPipeline steps={flowSteps} waitForResponse={waitForResponse} />
                    {isLoading && (
                        <p className="mt-3 flex items-center gap-2 text-xs text-blue-400/90 animate-pulse">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            {waitForResponse
                                ? "Speaking, then recording and transcribing…"
                                : "Speaking command (no listen)…"}
                        </p>
                    )}
                </CardContent>
            </Card>

            <div className="grid gap-6 lg:grid-cols-2">
                <Card className="border-slate-800 bg-slate-950/50">
                    <CardHeader>
                        <CardTitle className="text-base text-slate-100">Example library</CardTitle>
                        <CardDescription>Pick a preset or edit the command below.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label className="text-slate-300">Preset</Label>
                            <Select
                                value={selectedId}
                                onValueChange={(id) => {
                                    const ex = PLAYGROUND_EXAMPLES.find((e) => e.id === id);
                                    if (ex) applyExample(ex);
                                }}
                            >
                                <SelectTrigger className="bg-slate-900 border-slate-800 text-slate-100">
                                    <SelectValue placeholder="Choose example" />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-900 border-slate-800 text-slate-100 max-h-80">
                                    {PLAYGROUND_CATEGORIES.map((cat) => (
                                        <SelectGroup key={cat}>
                                            <SelectLabel className="text-slate-500">{cat}</SelectLabel>
                                            {PLAYGROUND_EXAMPLES.filter((e) => e.category === cat).map(
                                                (ex) => (
                                                    <SelectItem
                                                        key={ex.id}
                                                        value={ex.id}
                                                        className="text-slate-200 focus:bg-slate-800"
                                                    >
                                                        {ex.label}
                                                    </SelectItem>
                                                ),
                                            )}
                                        </SelectGroup>
                                    ))}
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-slate-500">{hint}</p>
                            <div className="flex flex-wrap gap-2">
                                <Badge variant="outline" className="border-slate-700 text-slate-400">
                                    {selected.category}
                                </Badge>
                                {selected.suggestedListen ? (
                                    <Badge className="bg-emerald-950 text-emerald-300 border-emerald-800">
                                        Full loop
                                    </Badge>
                                ) : (
                                    <Badge className="bg-amber-950 text-amber-200 border-amber-800">
                                        Speak only
                                    </Badge>
                                )}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="pg-command" className="text-slate-300">
                                Command
                            </Label>
                            <Input
                                id="pg-command"
                                value={command}
                                onChange={(e) => setCommand(e.target.value)}
                                className="bg-slate-950 border-slate-800 text-slate-100"
                                disabled={isLoading}
                            />
                        </div>

                        <div className="flex flex-col gap-3 rounded-md border border-slate-800/80 bg-slate-950/40 p-3">
                            <div className="flex items-center gap-3">
                                {waitForResponse ? (
                                    <Mic className="h-4 w-4 text-emerald-500 shrink-0" />
                                ) : (
                                    <MicOff className="h-4 w-4 text-amber-500/90 shrink-0" />
                                )}
                                <div className="flex-1">
                                    <Label htmlFor="pg-listen" className="text-slate-200 text-sm cursor-pointer">
                                        Listen after speak
                                    </Label>
                                    <p className="text-xs text-slate-500">Matches MCP `interact` wait_for_response.</p>
                                </div>
                                <Switch
                                    id="pg-listen"
                                    checked={waitForResponse}
                                    onCheckedChange={setWaitForResponse}
                                    disabled={isLoading}
                                />
                            </div>
                            {waitForResponse && (
                                <div className="flex items-center gap-3">
                                    <Label htmlFor="pg-seconds" className="text-slate-400 text-xs whitespace-nowrap">
                                        Listen (s)
                                    </Label>
                                    <Input
                                        id="pg-seconds"
                                        type="number"
                                        min={1}
                                        max={120}
                                        className="bg-slate-950 border-slate-800 text-slate-100 h-9 w-20 text-sm"
                                        value={listenSeconds}
                                        onChange={(e) => setListenSeconds(Number(e.target.value))}
                                        disabled={isLoading}
                                    />
                                </div>
                            )}
                        </div>

                        <Button
                            className="w-full bg-blue-600 hover:bg-blue-700"
                            onClick={() => void handleRun()}
                            disabled={isLoading || !command.trim()}
                        >
                            {isLoading ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                                <Play className="h-4 w-4 mr-2" />
                            )}
                            Run on bridge
                        </Button>
                        {lastError && (
                            <p className="text-xs text-red-400/90">{lastError}</p>
                        )}
                    </CardContent>
                </Card>

                <Card className="border-slate-800 bg-slate-950/50 flex flex-col min-h-[24rem]">
                    <CardHeader>
                        <CardTitle className="text-base text-slate-100">Conversation</CardTitle>
                        <CardDescription>
                            Operator command and bridge result for each run (newest first).
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1 overflow-y-auto max-h-[32rem] space-y-4 p-4 pt-0">
                        {turns.length === 0 && (
                            <p className="text-sm text-slate-500 py-8 text-center">
                                No runs yet. Choose an example and press Run on bridge.
                            </p>
                        )}
                        {turns.map((turn, idx) => (
                            <div
                                key={`${turn.timestamp}-${idx}`}
                                className="rounded-lg border border-slate-800 bg-slate-900/40 p-3 space-y-3"
                            >
                                <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
                                    <span className="tabular-nums">{turn.timestamp}</span>
                                    <span className="flex items-center gap-1.5">
                                        {turn.waitForResponse ? (
                                            <Volume2 className="h-3 w-3" />
                                        ) : (
                                            <MicOff className="h-3 w-3" />
                                        )}
                                        {turn.waitForResponse ? "Full loop" : "Speak only"}
                                    </span>
                                </div>
                                <div className="flex gap-2">
                                    <User className="h-4 w-4 text-slate-500 shrink-0 mt-0.5" />
                                    <div>
                                        <span className="text-xs font-medium text-slate-400">Operator</span>
                                        <p className="text-sm text-slate-200 mt-0.5">{turn.command}</p>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <Bot
                                        className={cn(
                                            "h-4 w-4 shrink-0 mt-0.5",
                                            turn.ok ? "text-blue-400" : "text-red-400",
                                        )}
                                    />
                                    <div>
                                        <span className="text-xs font-medium text-blue-400/90">
                                            {turn.waitForResponse ? "Alexa reply (STT)" : "Bridge"}
                                        </span>
                                        <p
                                            className={cn(
                                                "text-sm mt-0.5 whitespace-pre-wrap",
                                                turn.ok ? "text-blue-100" : "text-red-300",
                                            )}
                                        >
                                            {turn.response || "(empty)"}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
