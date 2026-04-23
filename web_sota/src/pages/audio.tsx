import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api, postTool } from "@/common/api";
import { Bell, Headphones, Loader2, Mic, Radio, Volume2 } from "lucide-react";

const DEFAULT_SPEAK = "Alexa, hello.";
const SELECT_DEFAULT = "__system_default__";

interface OutputDeviceRow {
    id: number;
    name: string;
    channels: number;
    is_default: boolean;
}

interface PlaybackPayload {
    device_id: number | null;
    volume: number;
    output_devices: OutputDeviceRow[];
}

function LevelMeter() {
    return (
        <div className="flex h-36 items-end justify-center gap-1.5 px-4">
            {Array.from({ length: 12 }, (_, i) => (
                <motion.div
                    key={i}
                    className="w-2.5 max-h-full rounded-t bg-gradient-to-t from-blue-600/40 to-cyan-400/90"
                    initial={{ height: 16 }}
                    animate={{ height: [12, 48 + (i % 5) * 12, 20, 56 + (i % 3) * 8, 16] }}
                    transition={{
                        duration: 1.4,
                        repeat: Number.POSITIVE_INFINITY,
                        delay: i * 0.08,
                        ease: "easeInOut",
                    }}
                />
            ))}
        </div>
    );
}

export function Audio() {
    const [playbackLoading, setPlaybackLoading] = useState(true);
    const [playbackError, setPlaybackError] = useState<string | null>(null);
    const [outputDevices, setOutputDevices] = useState<OutputDeviceRow[]>([]);
    const [deviceSelect, setDeviceSelect] = useState(SELECT_DEFAULT);
    const [volumePct, setVolumePct] = useState(100);
    const volDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [testBusy, setTestBusy] = useState(false);

    const [speakText, setSpeakText] = useState(DEFAULT_SPEAK);
    const [speakBusy, setSpeakBusy] = useState(false);
    const [speakResult, setSpeakResult] = useState<string | null>(null);

    const [listenSec, setListenSec] = useState(8);
    const [listenBusy, setListenBusy] = useState(false);
    const [listenResult, setListenResult] = useState<string | null>(null);

    const applyPlayback = useCallback(async (device_id: number | null, volume: number) => {
        setPlaybackError(null);
        const res = await fetch(api.playback, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ device_id, volume }),
        });
        if (!res.ok) {
            const t = await res.text();
            throw new Error(t || `${res.status}`);
        }
        const data = (await res.json()) as PlaybackPayload;
        setOutputDevices(data.output_devices ?? []);
        setDeviceSelect(data.device_id === null ? SELECT_DEFAULT : String(data.device_id));
        setVolumePct(Math.round(data.volume * 100));
    }, []);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            setPlaybackLoading(true);
            setPlaybackError(null);
            try {
                const res = await fetch(api.playback);
                if (!res.ok) throw new Error(`${res.status}`);
                const data = (await res.json()) as PlaybackPayload;
                if (cancelled) return;
                setOutputDevices(data.output_devices ?? []);
                setDeviceSelect(data.device_id === null ? SELECT_DEFAULT : String(data.device_id));
                setVolumePct(Math.round(data.volume * 100));
            } catch (e) {
                if (!cancelled) setPlaybackError(e instanceof Error ? e.message : "Failed to load playback settings");
            } finally {
                if (!cancelled) setPlaybackLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    const onDeviceChange = (value: string) => {
        setDeviceSelect(value);
        const device_id = value === SELECT_DEFAULT ? null : Number.parseInt(value, 10);
        if (value !== SELECT_DEFAULT && Number.isNaN(device_id)) return;
        void applyPlayback(device_id, volumePct / 100).catch((e: unknown) => {
            setPlaybackError(e instanceof Error ? e.message : String(e));
        });
    };

    const onVolumeInput = (pct: number) => {
        const p = Math.min(100, Math.max(0, Math.round(pct)));
        setVolumePct(p);
        if (volDebounceRef.current) clearTimeout(volDebounceRef.current);
        volDebounceRef.current = setTimeout(() => {
            const device_id = deviceSelect === SELECT_DEFAULT ? null : Number.parseInt(deviceSelect, 10);
            if (deviceSelect !== SELECT_DEFAULT && Number.isNaN(device_id!)) return;
            void applyPlayback(device_id, p / 100).catch((e: unknown) => {
                setPlaybackError(e instanceof Error ? e.message : String(e));
            });
        }, 350);
    };

    const runPlaybackTest = async (kind: "chime" | "hello") => {
        setTestBusy(true);
        setPlaybackError(null);
        try {
            const res = await fetch(api.playbackTest, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ kind }),
            });
            if (!res.ok) {
                const t = await res.text();
                throw new Error(t || `${res.status}`);
            }
        } catch (e) {
            setPlaybackError(e instanceof Error ? e.message : String(e));
        } finally {
            setTestBusy(false);
        }
    };

    const runSpeak = async () => {
        const t = speakText.trim();
        if (!t) return;
        setSpeakBusy(true);
        setSpeakResult(null);
        const out = await postTool("speak_command", { text: t });
        setSpeakResult(out.ok ? String(out.result ?? "") : out.message);
        setSpeakBusy(false);
    };

    const runListen = async () => {
        const d = Math.min(60, Math.max(1, Math.floor(listenSec)));
        setListenBusy(true);
        setListenResult(null);
        const out = await postTool("listen_for_response", { duration: d });
        setListenResult(out.ok ? String(out.result ?? "") : out.message);
        setListenBusy(false);
    };

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold tracking-tight text-white">Audio lab</h2>
                <p className="text-slate-400">
                    TTS: Edge-TTS → <strong className="text-slate-300">miniaudio</strong> decode → <strong className="text-slate-300">sounddevice</strong> on
                    the output you choose below (settings file: <code className="text-slate-500">~/.alexa-mcp/playback.json</code> on the server
                    host). Pick a real speaker, not a silent virtual cable, and set in-app level so audio does not &quot;vanish&quot; on the
                    wrong device.
                </p>
            </div>

            <Card className="border-slate-800 bg-slate-950/50">
                <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2 text-lg">
                        <Volume2 className="h-5 w-5 text-amber-400" />
                        Playback output
                    </CardTitle>
                    <CardDescription className="text-slate-500">
                        PortAudio output used for <code className="text-slate-400">speak_command</code> and the speak step of <code className="text-slate-400">interact</code>.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {playbackLoading && <p className="text-sm text-slate-500">Loading devices…</p>}
                    {playbackError && <p className="text-sm text-amber-400">{playbackError}</p>}
                    {!playbackLoading && (
                        <>
                            <div className="space-y-2 max-w-xl">
                                <Label className="text-slate-300">Output device</Label>
                                <Select value={deviceSelect} onValueChange={onDeviceChange}>
                                    <SelectTrigger className="bg-slate-900 border-slate-800 text-slate-100 w-full max-w-xl">
                                        <SelectValue placeholder="Select device" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-slate-900 border-slate-800 text-slate-100 max-h-72 z-[200]">
                                        <SelectItem value={SELECT_DEFAULT}>System default (OS)</SelectItem>
                                        {outputDevices.map((d) => (
                                            <SelectItem key={d.id} value={String(d.id)}>
                                                {d.name}
                                                {d.is_default ? " (OS default)" : ""}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2 max-w-xl">
                                <div className="flex justify-between text-sm">
                                    <Label htmlFor="tts-vol" className="text-slate-300">
                                        TTS level (in-app)
                                    </Label>
                                    <span className="text-slate-500 tabular-nums">{volumePct}%</span>
                                </div>
                                <input
                                    id="tts-vol"
                                    type="range"
                                    min={0}
                                    max={100}
                                    value={volumePct}
                                    onChange={(e) => onVolumeInput(Number(e.target.value))}
                                    className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                                />
                                <p className="text-xs text-slate-600">Multiplies samples before playback; use together with Windows mixer level.</p>
                            </div>
                            <div className="space-y-2 max-w-2xl">
                                <Label className="text-slate-300">Level check</Label>
                                <div className="flex flex-wrap gap-2 items-center">
                                    <Button
                                        type="button"
                                        size="sm"
                                        className="bg-amber-600 hover:bg-amber-700"
                                        disabled={testBusy}
                                        onClick={() => void runPlaybackTest("chime")}
                                    >
                                        {testBusy ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <Bell className="h-4 w-4 mr-1" />
                                        )}
                                        Test chime
                                    </Button>
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        className="border-slate-700 text-slate-200"
                                        disabled={testBusy}
                                        onClick={() => void runPlaybackTest("hello")}
                                    >
                                        {testBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                                        Test &quot;Hello&quot; (TTS)
                                    </Button>
                                </div>
                                <p className="text-xs text-slate-600">
                                    <strong className="text-slate-400">Chime</strong> is a local two-tone beep (no network) for routing and
                                    loudness. <strong className="text-slate-400">Hello</strong> uses Edge-TTS on the same device and level.
                                </p>
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>

            <Card className="border-slate-800 bg-slate-950/50 overflow-hidden">
                <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                        <Radio className="h-5 w-5 text-cyan-400" />
                        Output level
                    </CardTitle>
                    <CardDescription className="text-slate-500">
                        Indicative animation only — not live RMS from the device.
                    </CardDescription>
                </CardHeader>
                <CardContent className="bg-slate-900/20 pb-6">
                    <LevelMeter />
                </CardContent>
            </Card>

            <div className="grid gap-6 md:grid-cols-2">
                <Card className="border-slate-800 bg-slate-950/50">
                    <CardHeader>
                        <CardTitle className="text-white flex items-center gap-2 text-lg">
                            <Volume2 className="h-5 w-5 text-purple-400" />
                            Test speak (TTS)
                        </CardTitle>
                        <CardDescription className="text-slate-500">
                            Calls <code className="text-slate-400">speak_command</code> — Edge-TTS, then in-process MP3 decode and play.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label className="text-slate-300">Phrase</Label>
                            <Input
                                className="bg-slate-900 border-slate-800 text-slate-100"
                                value={speakText}
                                onChange={(e) => setSpeakText(e.target.value)}
                                placeholder="Words to synthesize"
                            />
                        </div>
                        <Button
                            type="button"
                            className="w-full bg-blue-600 hover:bg-blue-700"
                            onClick={() => void runSpeak()}
                            disabled={speakBusy || !speakText.trim()}
                        >
                            {speakBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Volume2 className="h-4 w-4 mr-2" />}
                            Test speak
                        </Button>
                        {speakResult !== null && (
                            <pre className="text-xs text-slate-300 bg-slate-900/80 border border-slate-800 rounded-md p-3 whitespace-pre-wrap font-mono">
                                {speakResult}
                            </pre>
                        )}
                    </CardContent>
                </Card>

                <Card className="border-slate-800 bg-slate-950/50">
                    <CardHeader>
                        <CardTitle className="text-white flex items-center gap-2 text-lg">
                            <Mic className="h-5 w-5 text-emerald-400" />
                            Test listen (STT)
                        </CardTitle>
                        <CardDescription className="text-slate-500">
                            Calls <code className="text-slate-400">listen_for_response</code> with a capture window in seconds.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label className="text-slate-300">Duration (seconds)</Label>
                            <Input
                                type="number"
                                min={1}
                                max={60}
                                className="bg-slate-900 border-slate-800 text-slate-100"
                                value={listenSec}
                                onChange={(e) => setListenSec(Number(e.target.value))}
                            />
                        </div>
                        <Button
                            type="button"
                            variant="outline"
                            className="w-full border-slate-700 text-slate-100 hover:bg-slate-800"
                            onClick={() => void runListen()}
                            disabled={listenBusy}
                        >
                            {listenBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Headphones className="h-4 w-4 mr-2" />}
                            Capture &amp; transcribe
                        </Button>
                        {listenResult !== null && (
                            <pre className="text-xs text-slate-300 bg-slate-900/80 border border-slate-800 rounded-md p-3 whitespace-pre-wrap font-mono max-h-48 overflow-y-auto">
                                {listenResult}
                            </pre>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
