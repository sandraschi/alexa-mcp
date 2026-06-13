export type PlaygroundExample = {
    id: string;
    category: string;
    label: string;
    /** Spoken to the bridge (Alexa prefix added server-side if missing). */
    command: string;
    hint: string;
    suggestedListen: boolean;
    suggestedSeconds: number;
};

export const PLAYGROUND_EXAMPLES: PlaygroundExample[] = [
    {
        id: "weather-vienna",
        category: "Everyday",
        label: "Weather in Vienna",
        command: "what's the weather in Vienna",
        hint: "Classic full loop; Alexa+ may answer with a station-style or longer summary.",
        suggestedListen: true,
        suggestedSeconds: 25,
    },
    {
        id: "time",
        category: "Everyday",
        label: "What time is it",
        command: "what time is it",
        hint: "Short reply; good sanity check for TTS clarity.",
        suggestedListen: true,
        suggestedSeconds: 15,
    },
    {
        id: "timer-5",
        category: "Everyday",
        label: "Five-minute timer",
        command: "set a timer for five minutes",
        hint: "Listen for confirmation chime or spoken OK.",
        suggestedListen: true,
        suggestedSeconds: 20,
    },
    {
        id: "mozart",
        category: "Music (Amazon Music)",
        label: "Play Mozart",
        command: "play Mozart",
        hint: "Often starts a station or mix; not a single track.",
        suggestedListen: true,
        suggestedSeconds: 20,
    },
    {
        id: "mozart-studio",
        category: "Music (Amazon Music)",
        label: "Mozart on Echo Studio",
        command: "play Mozart on Echo Studio",
        hint: "Targets a named device when your account has one.",
        suggestedListen: true,
        suggestedSeconds: 25,
    },
    {
        id: "desguello",
        category: "Music (Amazon Music)",
        label: "Play Desgüello (flamenco)",
        command: "play Desgüello",
        hint: "Tests music catalog + device routing.",
        suggestedListen: true,
        suggestedSeconds: 25,
    },
    {
        id: "volume-down",
        category: "Smart home",
        label: "Volume down",
        command: "volume down",
        hint: "Speak-only is enough; no long reply expected.",
        suggestedListen: false,
        suggestedSeconds: 10,
    },
    {
        id: "lights-on",
        category: "Smart home",
        label: "Turn on lights (if configured)",
        command: "turn on the living room lights",
        hint: "Only works if Alexa controls those devices in your home.",
        suggestedListen: true,
        suggestedSeconds: 20,
    },
    {
        id: "wurlibrumf",
        category: "Edge cases",
        label: "Nonsense word (wurlibrumf)",
        command: "wurlibrumf",
        hint: "See how Alexa handles unknown words; STT may return garbage.",
        suggestedListen: true,
        suggestedSeconds: 20,
    },
    {
        id: "thank-you",
        category: "Edge cases",
        label: "Short thank you",
        command: "thank you",
        hint: "Low-stakes phrasing test.",
        suggestedListen: true,
        suggestedSeconds: 15,
    },
    {
        id: "alexa-plus-followup",
        category: "Alexa+ style",
        label: "Follow-up question",
        command: "what did you just say",
        hint: "After a prior reply, tests dialogic follow-up (device must still be listening).",
        suggestedListen: true,
        suggestedSeconds: 30,
    },
    {
        id: "news-brief",
        category: "Alexa+ style",
        label: "News brief",
        command: "give me a quick news update",
        hint: "Longer spoken answer; increase listen window.",
        suggestedListen: true,
        suggestedSeconds: 45,
    },
    {
        id: "speak-only",
        category: "Bridge modes",
        label: "Speak only (no listen)",
        command: "stop",
        hint: "Use with Listen after speak off; only TTS out.",
        suggestedListen: false,
        suggestedSeconds: 10,
    },
];

export const PLAYGROUND_CATEGORIES = [
    ...new Set(PLAYGROUND_EXAMPLES.map((e) => e.category)),
];
