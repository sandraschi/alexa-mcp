import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
    Mic,
    MicOff,
    Speaker,
    Volume2,
    VolumeX,
    Play,
    RotateCcw,
    Zap,
    MessageSquare
} from "lucide-react";
import { useState } from "react";

export function Control() {
    const [command, setCommand] = useState("");

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-white">Acoustic Control</h2>
                    <p className="text-slate-400">Direct Alexa bridge orchestration</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" className="border-slate-800 bg-slate-900/50 hover:bg-slate-800">
                        <RotateCcw className="mr-2 h-4 w-4" />
                        Reset Session
                    </Button>
                    <Button className="bg-red-600 hover:bg-red-700 text-white border-0">
                        <VolumeX className="mr-2 h-4 w-4" />
                        Mute All
                    </Button>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <Card className="border-slate-800 bg-slate-950/50">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-slate-200">
                            Microphone (Listen)
                        </CardTitle>
                        <Mic className="h-4 w-4 text-emerald-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2 mt-2">
                            <div className="flex justify-between text-xs text-slate-400">
                                <span>Input Device</span>
                                <span className="text-white">Default Internal</span>
                            </div>
                            <Button variant="outline" className="w-full border-slate-800">
                                <MicOff className="mr-2 h-4 w-4" />
                                Stop Listening
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-slate-800 bg-slate-950/50">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-slate-200">
                            Speaker (Speak)
                        </CardTitle>
                        <Speaker className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2 mt-2">
                            <div className="flex justify-between text-xs text-slate-400">
                                <span>Output Device</span>
                                <span className="text-white">Logitech G-Series</span>
                            </div>
                            <Button variant="outline" className="w-full border-slate-800">
                                <Volume2 className="mr-2 h-4 w-4" />
                                Test Speech
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-slate-800 bg-slate-950/50">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-slate-200">
                            Bridge Status
                        </CardTitle>
                        <Zap className="h-4 w-4 text-yellow-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2 mt-2 text-center">
                            <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">Operational</Badge>
                            <p className="text-xs text-slate-400">Latency: 142ms</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Tabs defaultValue="bridge" className="space-y-4">
                <TabsList className="bg-slate-900/50 border border-slate-800">
                    <TabsTrigger value="bridge" className="data-[state=active]:bg-slate-800">Manual Bridge</TabsTrigger>
                    <TabsTrigger value="history" className="data-[state=active]:bg-slate-800">Interaction History</TabsTrigger>
                    <TabsTrigger value="config" className="data-[state=active]:bg-slate-800">Bridge Config</TabsTrigger>
                </TabsList>
                <TabsContent value="bridge" className="space-y-4">
                    <div className="grid gap-4 lg:grid-cols-2">
                        <Card className="border-slate-800 bg-slate-950/50">
                            <CardHeader>
                                <CardTitle className="text-slate-200 flex items-center gap-2">
                                    <MessageSquare className="h-4 w-4" />
                                    Issue Command
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-xs text-slate-400">Text to Speak</label>
                                    <Input
                                        placeholder="Alexa, turn on the lights"
                                        className="bg-slate-900 border-slate-800"
                                        value={command}
                                        onChange={(e) => setCommand(e.target.value)}
                                    />
                                </div>
                                <Button className="w-full bg-blue-600 hover:bg-blue-700">
                                    <Play className="mr-2 h-4 w-4" />
                                    Speak & Listen
                                </Button>
                            </CardContent>
                        </Card>

                        <Card className="border-slate-800 bg-slate-950/50">
                            <CardHeader>
                                <CardTitle className="text-slate-200">Interaction Log</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="font-mono text-sm text-slate-400 space-y-2">
                                    <p>[10:42:15] <span className="text-blue-500">OUT</span> Speak: "Alexa, turn on lights"</p>
                                    <p>[10:42:17] <span className="text-emerald-500">IN</span> Transcribed: "OK"</p>
                                    <p>[10:43:05] <span className="text-yellow-500">SYS</span> Bridge heartbeat: OK</p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
