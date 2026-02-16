import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Info, HelpCircle, BookOpen, MessageSquare } from 'lucide-react';

export function Help() {
    return (
        <div className="p-6 space-y-6 max-w-4xl mx-auto">
            <div className="flex items-center space-x-3 mb-8">
                <HelpCircle className="w-10 h-10 text-primary" />
                <h1 className="text-4xl font-bold tracking-tight">Help & Documentation</h1>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <Card className="bg-card/50 backdrop-blur-sm border-primary/20">
                    <CardHeader>
                        <CardTitle className="flex items-center space-x-2">
                            <BookOpen className="w-5 h-5 text-primary" />
                            <span>Acoustic Bridge Basics</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm text-muted-foreground">
                        <p>
                            Alexa MCP acts as an acoustic bridge between your AI and a physical Alexa device.
                            It uses <strong>Edge-TTS</strong> for high-quality speech synthesis and
                            <strong>Faster-Whisper</strong> for accurate transcription.
                        </p>
                        <ul className="list-disc list-inside space-y-1">
                            <li>Commands are spoken via your default audio output.</li>
                            <li>Responses are captured via your default microphone.</li>
                            <li>Always ensure Alexa is within range of your speakers.</li>
                        </ul>
                    </CardContent>
                </Card>

                <Card className="bg-card/50 backdrop-blur-sm border-primary/20">
                    <CardHeader>
                        <CardTitle className="flex items-center space-x-2">
                            <MessageSquare className="w-5 h-5 text-primary" />
                            <span>Voice Commands</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm text-muted-foreground">
                        <p>The system automatically prepends "Alexa" to your commands if missing.</p>
                        <div className="p-3 bg-muted rounded font-mono text-xs">
                            Direct Command: "What time is it?" <br />
                            Result: "Alexa, what time is it?"
                        </div>
                        <p className="italic">Pro Tip: Use the 'Interact' tool for full two-way communication.</p>
                    </CardContent>
                </Card>
            </div>

            <Card className="bg-card/50 backdrop-blur-sm border-primary/20">
                <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                        <Info className="w-5 h-5 text-primary" />
                        <span>Vienna SOTA Configuration</span>
                    </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                    <p className="mb-4">
                        Custom engineered for high-fidelity performance in the 9th District.
                        Optimized for low-latency acoustic loops.
                    </p>
                    <div className="grid grid-cols-2 gap-4 text-xs">
                        <div className="p-3 bg-muted/50 rounded border border-white/5">
                            <div className="font-semibold text-primary">TTS Engine</div>
                            <div>Microsoft Edge (Open Source)</div>
                        </div>
                        <div className="p-3 bg-muted/50 rounded border border-white/5">
                            <div className="font-semibold text-primary">STT Model</div>
                            <div>Whisper-base (Int8 Quantized)</div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="text-center pt-8 opacity-50 text-xs">
                &copy; 2026 Sandra Schipal | Vienna, AT
            </div>
        </div>
    );
}
