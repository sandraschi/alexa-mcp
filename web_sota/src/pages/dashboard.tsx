import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mic, MessageSquare, Bot, Zap, Activity, Speaker } from "lucide-react";

export function Dashboard() {
    const stats = [
        { label: 'Voice Status', value: 'Ready', change: 'Acoustic Bridge', icon: Mic, color: 'text-blue-500' },
        { label: 'STT Engine', value: 'Whisper', change: '85ms Latency', icon: MessageSquare, color: 'text-green-500' },
        { label: 'TTS Engine', value: 'Edge-TTS', change: 'SOTA Quality', icon: Bot, color: 'text-purple-500' },
        { label: 'Total Interactions', value: '1,284', change: '+12% this week', icon: Zap, color: 'text-yellow-500' },
    ];

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-white">Alexa Control</h2>
                    <p className="text-slate-400">Centralized control and monitoring for Alexa acoustic bridge</p>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {stats.map((stat, idx) => (
                    <Card key={idx} className="border-slate-800 bg-slate-950/50">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-slate-200">
                                {stat.label}
                            </CardTitle>
                            <stat.icon className={`h-4 w-4 ${stat.color}`} />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-white">{stat.value}</div>
                            <p className="text-xs text-slate-400">
                                {stat.change}
                            </p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <Card className="col-span-4 border-slate-800 bg-slate-950/50">
                    <CardHeader>
                        <CardTitle className="text-white">Acoustic Levels</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[200px] flex items-center justify-center border border-dashed border-slate-800 rounded-md bg-slate-900/20">
                            <span className="text-slate-500 text-sm">Real-time spectrum monitoring nominal</span>
                        </div>
                    </CardContent>
                </Card>
                <Card className="col-span-3 border-slate-800 bg-slate-950/50">
                    <CardHeader>
                        <CardTitle className="text-white">Recent Responses</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="flex items-center">
                                <span className="relative flex h-2 w-2 mr-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                </span>
                                <div className="ml-2 space-y-1">
                                    <p className="text-sm font-medium leading-none text-white">"Alexa, what time is it?"</p>
                                    <p className="text-xs text-slate-400">Success • Local Engine</p>
                                </div>
                                <div className="ml-auto font-mono text-xs text-slate-400">Just now</div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-slate-200">
                            STT Engine
                        </CardTitle>
                        <Activity className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-white">Ready</div>
                        <p className="text-xs text-slate-400">
                            faster-whisper local
                        </p>
                    </CardContent>
                </Card >

    <Card className="border-slate-800 bg-slate-950/50">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-200">
                TTS Engine
            </CardTitle>
            <Speaker className="h-4 w-4 text-purple-500" />
        </CardHeader>
        <CardContent>
            <div className="text-2xl font-bold text-white">Online</div>
            <p className="text-xs text-slate-400">
                edge-tts cloud
            </p>
        </CardContent>
    </Card>
            </div >

    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4 border-slate-800 bg-slate-950/50">
            <CardHeader>
                <CardTitle className="text-white">Acoustic Levels</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="h-[200px] flex items-center justify-center border border-dashed border-slate-800 rounded-md bg-slate-900/20">
                    <span className="text-slate-500 text-sm">Real-time spectrum placeholder</span>
                </div>
            </CardContent>
        </Card>
        <Card className="col-span-3 border-slate-800 bg-slate-950/50">
            <CardHeader>
                <CardTitle className="text-white">Recent Interactions</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    <div className="flex items-center">
                        <span className="relative flex h-2 w-2 mr-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                        <div className="ml-2 space-y-1">
                            <p className="text-sm font-medium leading-none text-white">"Alexa, turn on lights"</p>
                            <p className="text-xs text-slate-400">Success • Living Room</p>
                        </div>
                        <div className="ml-auto font-mono text-xs text-slate-400">10:42</div>
                    </div>
                    <div className="flex items-center">
                        <span className="relative flex h-2 w-2 mr-2 bg-slate-700 rounded-full"></span>
                        <div className="ml-2 space-y-1">
                            <p className="text-sm font-medium leading-none text-white text-opacity-50">"Alexa, play music"</p>
                            <p className="text-xs text-slate-500">Queued</p>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    </div>
        </div >
    );
}
