import { useEffect, useState } from "react";
import { api } from "@/common/api";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { BookOpen, HelpCircle, Info, MessageSquare, ShieldAlert } from "lucide-react";

interface StatusData {
    status: string;
    engines: {
        stt: string;
        tts: string;
        io: string;
    };
}

export function Help() {
    const [status, setStatus] = useState<StatusData | null>(null);

    useEffect(() => {
        fetch(api.status)
            .then(res => res.json())
            .then(data => setStatus(data))
            .catch(err => console.error("Failed to fetch help status:", err));
    }, []);

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
                            It uses <strong>{status?.engines?.tts || "Edge-TTS"}</strong> for high-quality speech synthesis and
                            <strong>{status?.engines?.stt || "Faster-Whisper"}</strong> for accurate transcription.
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
                        <span>Amazon Alexa+ (on-device, not this app)</span>
                    </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground space-y-4">
                    <p>
                        <strong className="text-foreground">Alexa+</strong> is Amazon’s name for the newer, more conversational
                        generative upgrade of Alexa (LLM-style answers, deeper flows, new integrations). It runs on{" "}
                        <strong>Amazon’s cloud and your Echo / Alexa app</strong> — not inside this bridge. This project only
                        speaks clear commands and transcribes what your speaker and mic pick up.
                    </p>
                    <div className="space-y-2">
                        <h3 className="text-foreground text-xs font-semibold uppercase tracking-wide">Where it is live</h3>
                        <ul className="list-disc list-inside space-y-1 text-xs">
                            <li>
                                <strong className="text-foreground">United States</strong> — broad rollout and pricing tiers
                                described in{" "}
                                <a
                                    className="text-primary hover:underline"
                                    href="https://www.aboutamazon.com/news/devices/alexa-plus-available-free-prime-members-us"
                                    rel="noopener noreferrer"
                                    target="_blank"
                                >
                                    About Amazon
                                </a>{" "}
                                and{" "}
                                <a
                                    className="text-primary hover:underline"
                                    href="https://techcrunch.com/2026/02/04/alexa-amazons-ai-assistant-is-now-available-to-everyone-in-the-u-s"
                                    rel="noopener noreferrer"
                                    target="_blank"
                                >
                                    TechCrunch
                                </a>
                                .
                            </li>
                            <li>
                                <strong className="text-foreground">United Kingdom</strong> — from{" "}
                                <span className="text-foreground">19 March 2026</span> (Early Access), first European market
                                called out in{" "}
                                <a
                                    className="text-primary hover:underline"
                                    href="https://www.aboutamazon.com/news/devices/alexa-plus-international-launch"
                                    rel="noopener noreferrer"
                                    target="_blank"
                                >
                                    Amazon’s international post
                                </a>{" "}
                                (see also{" "}
                                <a
                                    className="text-primary hover:underline"
                                    href="https://www.macrumors.com/2026/03/19/amazons-alexa-launches-uk-free-early-access/"
                                    rel="noopener noreferrer"
                                    target="_blank"
                                >
                                    MacRumors
                                </a>
                                ).
                            </li>
                            <li>
                                <strong className="text-foreground">Also named</strong> in the same 2026 coverage: Canada, Mexico, Italy
                                (alongside the US/UK in Amazon’s list). <strong className="text-foreground">Austria</strong> is not in
                                those public announcements; check Amazon’s help for your account region.
                            </li>
                        </ul>
                    </div>
                    <div className="space-y-2">
                        <h3 className="text-foreground text-xs font-semibold uppercase tracking-wide">What changes for you</h3>
                        <p className="text-xs">
                            Reported and marketed capabilities: longer conversations, more natural follow-ups, “agentic”
                            actions where Amazon has integrations (e.g. food and rides in supported locales), and bundled or
                            subscription access depending on region and{" "}
                            <strong className="text-foreground">Prime</strong> status. Your Echo may still be on “classic” Alexa
                            or Alexa+ depending on firmware, account, and rollout.
                        </p>
                    </div>
                    <div className="space-y-2 border-t border-white/10 pt-3">
                        <h3 className="text-foreground text-xs font-semibold uppercase tracking-wide">Project intent (Austria, testing)</h3>
                        <p className="text-xs">
                            The roadmap is <strong className="text-foreground">agentic and more dialogic</strong> use: multi-step
                            flows, back-and-forth, and model-assisted phrasing <strong className="text-foreground">spoken to the
                            Echo</strong> — not just one-liners. <strong className="text-foreground">Austria</strong> is not in the
                            Alexa+ rollout list above, so <strong className="text-foreground">full end-to-end tests of that vision
                            are not possible here yet</strong>. Until the service is available (or you test in a supported region),
                            the bridge focuses on <strong className="text-foreground">clear TTS in</strong> and{" "}
                            <strong className="text-foreground">reliable STT out</strong>.
                        </p>
                    </div>
                    <div className="space-y-2 border-t border-white/10 pt-3">
                        <h3 className="text-foreground text-xs font-semibold uppercase tracking-wide">Reviews and public reaction</h3>
                        <p className="text-xs">
                            Third-party writeups are <strong className="text-foreground">mixed</strong> — which is normal for a
                            large, staged migration. Favorable reviews often praise a big jump in Q&amp;A and smart home depth for
                            existing Echo users (see{" "}
                            <a
                                className="text-primary hover:underline"
                                href="https://www.consumerreports.org/electronics/digital-assistants/amazon-alexa-plus-ai-assistant-review-a1667486499/"
                                rel="noopener noreferrer"
                                target="_blank"
                            >
                                Consumer Reports
                            </a>{" "}
                            and{" "}
                            <a
                                className="text-primary hover:underline"
                                href="https://www.cnet.com/tech/services-and-software/a-year-with-alexa-plus-an-ai-thats-worth-it-if-youre-someone-like-me/"
                                rel="noopener noreferrer"
                                target="_blank"
                            >
                                CNET
                            </a>
                            ).
                        </p>
                        <p className="text-xs">
                            Critical pieces stress unreliable device control, slow or over-talking replies, and “chatbot” failure
                            modes (confident but wrong, or no change after “done”). Examples:{" "}
                            <a
                                className="text-primary hover:underline"
                                href="https://www.wired.com/story/why-is-amazon-alexa-plus-so-bad/"
                                rel="noopener noreferrer"
                                target="_blank"
                            >
                                WIRED
                            </a>
                            ,{" "}
                            <a
                                className="text-primary hover:underline"
                                href="https://tech.yahoo.com/ai/copilot/articles/alexa-bringer-sorrow-amazon-starts-140000443.html"
                                rel="noopener noreferrer"
                                target="_blank"
                            >
                                Yahoo (Reddit-style complaint roundup)
                            </a>
                            .
                        </p>
                        <p className="text-xs italic text-muted-foreground/90">
                            None of the above is an endorsement. For Austria, your device may not offer Alexa+ yet; when it does,
                            dialogic quality improves on the Amazon side; this app still only needs TTS that Alexa can hear.
                        </p>
                    </div>
                </CardContent>
            </Card>

            <Card className="bg-card/50 backdrop-blur-sm border-primary/20">
                <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                        <ShieldAlert className="w-5 h-5 text-primary" />
                        <span>Security &amp; access</span>
                    </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground space-y-4">
                    <div className="space-y-2">
                        <h3 className="text-foreground text-xs font-semibold uppercase tracking-wide">
                            Voice shopping and prompt injection
                        </h3>
                        <p className="text-xs">
                            Any path like <strong className="text-foreground">(LLM or agent) → TTS → your speakers → Alexa</strong>{" "}
                            can trigger <strong className="text-foreground">real account actions</strong> if you allow it: voice
                            purchasing, skills, and smart-home control. A manipulated or hallucinated line could, in the worst
                            case, be read aloud and result in a surprise order. This app does <strong className="text-foreground">not
                            </strong> implement purchase or policy controls — use <strong className="text-foreground">Amazon
                            settings</strong> (restrict or disable voice shopping, require voice PIN, confirmation steps, limit
                            1-Click) and                             <strong className="text-foreground">never</strong> send unreviewed model text straight to
                            speak if money or devices are in scope.
                        </p>
                    </div>
                    <div className="space-y-2 border-t border-white/10 pt-3">
                        <h3 className="text-foreground text-xs font-semibold uppercase tracking-wide">Automatic block (Amazon orders)</h3>
                        <p className="text-xs">
                            By default, the server <strong className="text-foreground">refuses to play TTS</strong> if the line
                            looks like <strong className="text-foreground">buy / order / cart</strong> language in an{" "}
                            <strong className="text-foreground">Amazon</strong> shopping context (e.g. “order … on Amazon”).
                            Tracking-only questions and many media phrases are left through. It is a{" "}
                            <strong className="text-foreground">heuristic</strong>, not a guarantee. Set environment variable{" "}
                            <code className="text-slate-300">ALEXA_SHOPPING_GUARD=0</code> to turn it off (see README). Phrases
                            with no Amazon cue (e.g. “order a pizza”) are <strong className="text-foreground">not</strong> caught;
                            use Amazon account settings to restrict voice shopping.
                        </p>
                    </div>
                    <div className="space-y-2 border-t border-white/10 pt-3">
                        <h3 className="text-foreground text-xs font-semibold uppercase tracking-wide">Web control plane (roadmap)</h3>
                        <p className="text-xs">
                            The <strong className="text-foreground">dashboard and HTTP APIs</strong> for this project are a local
                            / lab control surface, not a hardened public product. <strong className="text-foreground">Proper
                            authentication for the bridge and UI is planned</strong> before any untrusted, shared, or
                            internet-facing use. Do not expose the process on the public internet without a gate you trust
                            (e.g. VPN, reverse proxy with strong auth) until that ships.
                        </p>
                    </div>
                    <div className="space-y-2 border-t border-white/10 pt-3">
                        <h3 className="text-foreground text-xs font-semibold uppercase tracking-wide">Edge-case test ideas</h3>
                        <p className="text-xs">
                            Try a <strong className="text-foreground">nonsense or child-invented word</strong> as the only
                            “command” (the kind Alexa does not recognize as real English). On the device you will usually get
                            a generic “I did not understand”-style reply; STT may return garbage or a best guess. That is
                            useful to see how the full loop behaves when the intent is unclear. Contrast with a clear test
                            like weather in a known city.
                        </p>
                    </div>
                </CardContent>
            </Card>

            <Card className="bg-card/50 backdrop-blur-sm border-primary/20">
                <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                        <Info className="w-5 h-5 text-primary" />
                        <span>Technical Specifications</span>
                    </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                    <p className="mb-4">
                        Acoustic bridge optimized for low-latency voice command processing.
                        Utilizes local models for transcription and cloud-based synthesis.
                    </p>
                    <div className="grid grid-cols-2 gap-4 text-xs">
                        <div className="p-3 bg-muted/50 rounded border border-white/5">
                            <div className="font-semibold text-primary">TTS Engine</div>
                            <div>{status?.engines?.tts || "Microsoft Edge (Open Source)"}</div>
                        </div>
                        <div className="p-3 bg-muted/50 rounded border border-white/5">
                            <div className="font-semibold text-primary">STT Model</div>
                            <div>{status?.engines?.stt || "Whisper-base (Int8 Quantized)"}</div>
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
