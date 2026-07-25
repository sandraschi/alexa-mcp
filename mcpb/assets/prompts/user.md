# alexa-mcp User Guide

## Overview

alexa-mcp lets you control Amazon Alexa devices through text commands, without ever touching the Alexa app or speaking to the device yourself. You type a command, the server synthesizes it to speech, plays it to Alexa, captures her spoken response through the microphone, and transcribes it back to text.

This works with any Alexa device that can hear your computer's speaker: Echo, Echo Dot, Echo Show, Echo Flex, Echo Studio, Echo Input, Echo Link, or any third-party device with Alexa built in. The physical device does not need any special configuration -- just be within earshot of the computer.

## Quick Start

### Basic Interaction

The simplest way to interact with Alexa:

```
interact(command="what is the weather in Vienna")
```

This will:
1. Detect that "Alexa" is missing from the command and prepend it: "Alexa, what is the weather in Vienna"
2. Synthesize the command using neural TTS (Edge-TTS) and play it through your speaker
3. Listen for Alexa's response through your microphone for 10 seconds
4. Transcribe the audio to text using Faster-Whisper
5. Return a formatted report with the command, response, and success status

### Without Waiting for Response

For fire-and-forget commands where you trust Alexa will handle them correctly:

```
interact(command="set a timer for 10 minutes", wait_for_response=False)
```

This speaks the command but does not listen for or transcribe a response. Good for: setting timers, adjusting volume, turning on devices where you do not need verbal confirmation.

### Manual Two-Step Control

For maximum control over the interaction, use the two-step approach:

```
# Step 1: Speak the command
speak_command(text="Alexa, add milk to my shopping list")

# Step 2: Listen for the response
listen_for_response(duration=8)
```

Step 1 synthesizes and plays the command. Step 2 captures microphone audio and returns the transcription. This two-step flow is useful when:
- You want to adjust the listen duration separately from the speak
- You want to handle errors between steps
- You need to verify the speak succeeded before listening
- You want to listen for longer than the default 10 seconds

### Using AI to Refine Commands

If you are not sure how to phrase something optimally for Alexa:

```
agentic_alexa_query(query="I need to know if it will rain today")
```

The server uses FastMCP sampling to convert your natural language into an optimal Alexa command ("Alexa, what is the weather forecast for today?") before executing the full interaction loop.

## Common Commands by Category

### Smart Home Control
- "turn on the living room lights" / "turn off the kitchen lights"
- "set the thermostat to 22 degrees" / "set the thermostat to 20 degrees"
- "set the bedroom light to 50 percent" (brightness control)
- "set the living room light to blue" / "set the hallway light to warm white" (color control)
- "lock the front door" / "unlock the back door"
- "turn on the coffee maker" / "turn on the porch light"
- "set the dining room light to 30 percent" (dimming)
- "turn off all lights"

### Music and Entertainment
- "play some jazz music" / "play relaxing music on Spotify"
- "play my Discover Weekly playlist"
- "pause" / "next track" / "Alexa, stop the music"
- "volume 5" / "set the volume to 40 percent" / "turn it up"
- "what song is this" / "shuffle my music"
- "play white noise" / "play nature sounds"
- "set sleep timer for 30 minutes"

### Information and Queries
- "what time is it" / "what is the weather today" / "what is the weather this weekend"
- "what is the news" / "what is my flash briefing"
- "what is on my calendar today"
- "what is the capital of Austria" / "how many ounces in a cup"
- "what is 15 percent of 80" / "what is the square root of 144"
- "when is the next solar eclipse" / "what movies are playing this weekend"
- "tell me a joke" / "tell me a fun fact"
- "translate hello to Spanish" / "how do you say thank you in French"

### Timers, Alarms, and Reminders
- "set a timer for 10 minutes" / "set a timer for 5 minutes called pasta"
- "set an alarm for 7 AM" / "set an alarm for 6:30 AM called wake up"
- "cancel my 7 AM alarm"
- "check my timers" / "what reminders do I have"
- "remind me to take out the trash at 8 PM"

### Shopping and Lists
- "add milk to my shopping list" / "add eggs to my shopping list"
- "what is on my shopping list" / "what is on my to-do list"

### Safety Note on Shopping Guard
The server includes a TTS Shopping Guard that blocks commands containing purchase keywords (buy, order, purchase, cart, checkout) to prevent accidental purchases. If a legitimate command is blocked, set `ALEXA_SHOPPING_GUARD=0` in the environment and restart the server.

## Prompt Engineering for Best Results

### For Alexa Understanding (TTS Quality)

The synthesized voice must be clear enough for Alexa's far-field microphone array to understand:
- **Keep commands concise**: 5-15 words is optimal. "Set a timer for 10 minutes" works perfectly. "I was wondering if you could please set a timer for ten minutes if it is not too much trouble" is too verbose and may be misheard.
- **Standard phrasing**: Alexa understands standard English commands best. Use the same phrasing you would use speaking directly to an Echo device.
- **Include device names**: For smart home, specify the exact device name as configured in the Alexa app. "Turn off the bedroom light" only works if the device is named "Bedroom Light" in the Alexa app.
- **Avoid homophones and similar-sounding words**: "Set the light to red" is clearer than "Set the light to read".

### For Accurate Transcription (STT Quality)

For Faster-Whisper to accurately transcribe Alexa's response:
- **Reduce background noise**: Turn off fans, close windows, mute notifications.
- **Position the microphone**: Place it closer to the Alexa device than to the speaker. Alexa's voice should be louder than the ambient noise.
- **Default 10-second listen window**: This covers most Alexa responses. Increase for news briefings (20-30s), decrease for simple confirmations (3-5s).
- **Alexa speaks at a moderate pace**: Responses are typically 5-30 seconds long. The default 10-second timeout covers most interactions.

### Using the Timeout Parameter

Adjust the `timeout` parameter based on the expected response length:
- Short confirmation ("OK"): 3-5 seconds
- Simple information ("It is 22 degrees"): 8-10 seconds
- Weather forecast: 12-15 seconds
- News briefing: 20-30 seconds
- Recipe steps: 15-20 seconds

## Troubleshooting

### "No speech detected" After interact()

Alexa probably responded, but the microphone did not pick it up clearly:
- **Alexa didn't hear the command**: The speaker may be too quiet or too far from the Echo device. Move the speaker closer or increase volume.
- **Alexa responded but too quietly**: Position the microphone closer to the Alexa device.
- **The listen window was too short**: Increase `timeout` to 15 or 20 seconds.
- **Background noise interference**: Reduce ambient noise (close windows, pause fans).
- **Edge-TTS failed**: Check internet connectivity. The server falls back to SAPI5 which is lower quality.

### Command Not Executed By Alexa

- The wake word "Alexa" must be clearly audible. If the synthesized voice is unclear or the volume is too low, Alexa may not wake.
- Some commands require exact device names. "Turn off the bedroom lamp" may fail if the device is named "Bedside Lamp" in the Alexa app.
- Alexa may not respond to commands while a timer is ringing or music is playing loudly.

### Audio Hardware Issues

- **"Error speaking command"**: Check that the default audio output device is working. Edge-TTS requires internet; SAPI5 fallback works offline.
- **"Error listening"** (SoundDevice error): Ensure a microphone is connected and set as the default recording device. Check Windows privacy settings -- microphone access must be enabled for the Python process.
- **Poor audio quality**: Laptop internal speakers and microphones have limited quality. An external USB speaker and microphone significantly improve reliability.
- **Echo/feedback**: The speaker output being picked up by the microphone can cause feedback. Separate the speaker and microphone physically, or use headphones for the computer while pointing an external mic at the Echo.

## Advanced Configuration

### Audio Device Selection

The server uses Windows system default audio devices automatically. To use specific devices:
1. Open Windows Sound Settings
2. Under Output, select the speaker that can best reach the Echo device
3. Under Input, select the microphone best positioned to hear the Echo device

### Sample Rate

The server uses 16kHz sample rate for both playback and recording. This is optimal for speech: high enough for intelligibility, low enough for efficient processing.

### Interpreting Responses

The `interact()` return value is a formatted report:

```
# Command
Alexa, what is the weather in Vienna

# Response
Currently in Vienna, Austria, it is 22 degrees Celsius and partly cloudy.

# Status
Success
```

On failure, the report includes the error type and recovery suggestions.

## Web Dashboard

The server exposes a FastAPI web dashboard for monitoring:
- **GET /api/status**: Server health, version, engine status, interaction count
- **GET /api/logs**: Query interaction history
- **POST /api/fleet/launch**: Launch other fleet applications

Access at http://localhost:10801 when running in HTTP mode.

## Example Workflows

### Workflow: Morning Routine
1. `interact(command="what is the weather today")` -- check weather
2. `interact(command="what is on my calendar today")` -- check schedule
3. `interact(command="what is my flash briefing")` -- get news
4. `interact(command="turn on the kitchen lights", wait_for_response=False)` -- lights on
5. `interact(command="set the thermostat to 22 degrees", wait_for_response=False)` -- set temperature

### Workflow: Evening Wind-Down
1. `interact(command="set a timer for 10 minutes called tea", wait_for_response=False)` -- brew timer
2. `interact(command="turn off the living room lights", wait_for_response=False)` -- dim lights
3. `interact(command="play relaxing jazz music", wait_for_response=False)` -- background music
4. `interact(command="set sleep timer for 30 minutes", wait_for_response=False)` -- auto-stop music
5. `interact(command="set an alarm for 7 AM called wake up", wait_for_response=False)` -- morning alarm

### Workflow: Smart Home Away Mode
1. `interact(command="set thermostat to 18 degrees", wait_for_response=False)` -- energy saving
2. `interact(command="turn off all lights", wait_for_response=False)` -- all lights off
3. `interact(command="lock the front door", wait_for_response=False)` -- secure door
4. `interact(command="turn on do not disturb", wait_for_response=False)` -- silence notifications
5. `interact(command="arm the security system", wait_for_response=False)` -- alarm on

### Workflow: Cooking Assistant
1. `interact(command="set a timer for 5 minutes called pasta water", wait_for_response=False)` -- boil water timer
2. `interact(command="set a timer for 8 minutes called pasta", wait_for_response=False)` -- cook timer
3. `interact(command="how many ounces in a cup")` -- measurement conversion
4. `interact(command="set a timer for 2 minutes called sauce", wait_for_response=False)` -- sauce timer
5. `interact(command="what is the weather in Vienna")` -- check if good for dining outside

### Workflow: Entertainment Setup
1. `interact(command="play some jazz music", wait_for_response=False)` -- start background music
2. `interact(command="set volume to 5", wait_for_response=False)` -- adjust volume
3. `interact(command="what song is this")` -- identify current track
4. `interact(command="turn on do not disturb", wait_for_response=False)` -- block interruptions
5. `interact(command="set a timer for 60 minutes called movie", wait_for_response=False)` -- movie end timer

### Workflow: Verify Alexa Status
1. `speak_command(text="Alexa, are you there?")`
2. `listen_for_response(duration=5)` -- Alexa should respond "Yes, I'm here"
3. If no response: check speaker volume and microphone position
4. If Alexa responds but incorrectly: check the command phrasing

## Natural Language Command Translation Guide

The `agentic_alexa_query` tool translates natural language into Alexa commands. Here is how various intents are translated:

| Natural Language Query | Translated Alexa Command |
|------------------------|-------------------------|
| "I need to know if it will rain today" | "Alexa, what is the weather forecast for today" |
| "whats the score of the Austria football match" | "Alexa, what is the score of the Austria football match" |
| "I want to listen to something relaxing" | "Alexa, play relaxing music" |
| "check if I have any packages arriving today" | "Alexa, what deliveries do I have today" |
| "is there any traffic on my commute" | "Alexa, what is the traffic on my commute" |
| "tell me about the history of the Roman Empire" | "Alexa, tell me about the history of the Roman Empire" |

The translation removes hedging language ("I need to know", "I want to") and structures the command for optimal voice recognition. If the translation is too aggressive (removed important context), use `interact()` with manual command crafting instead.

## Working with the Activity Log

The in-memory activity log records every interaction. Use it to:
- Review past commands and responses
- Debug failed interactions
- Track usage patterns
- Export for external analysis

### View Recent Interactions
```
docs_help() -- shows available documentation
```

The `interaction://logs` resource shows the last 50 interactions formatted as Markdown with success/failure indicators.

### Log Fields
Each log entry contains:
- `interaction_id`: Sequential counter
- `command`: The full text that was spoken (with Alexa prefix)
- `response`: Alexa's transcribed response (or error/"[No speech detected]")
- `success`: Whether the interaction completed without errors
- `timestamp`: When the interaction occurred
- `kind`: Always "interaction" for interact() calls

### Log Capacity
The buffer holds a maximum of 1000 entries. When full, the oldest entries are automatically removed. On server restart, the buffer is cleared.

## Weather Query Examples

Weather is one of the most common use cases for Alexa voice interaction. Here are specific weather queries:

- "what is the weather in Vienna" -- current conditions for a specific city
- "what is the weather today" -- current conditions for your default location
- "what is the weather this weekend" -- weekend forecast
- "what is the weather this week" -- weekly forecast
- "is it going to rain today" -- precipitation check
- "what is the temperature right now" -- current temperature only
- "what is the humidity" -- humidity level
- "what is the wind speed" -- wind conditions
- "what is the UV index" -- UV radiation level
- "what is the air quality" -- air quality index
- "what is the weather in Paris on Friday" -- specific day and city

The response format varies by Alexa region and settings. Common responses include: temperature range (current/high/low), precipitation probability, humidity percentage, wind speed and direction, and weather condition icons/descriptions.

## Room Setup for Optimal Performance

The physical arrangement of your computer, microphone, speaker, and Alexa device significantly affects performance.

### Ideal Setup
- Computer speaker and Alexa device face each other, 1-3 meters apart
- External USB microphone positioned closer to the Alexa device (30-50cm)
- No obstacles between the speaker and Alexa
- Quiet room with minimal background noise (no fans, open windows, or traffic noise)

### Acceptable Setup
- Laptop speakers and built-in microphone, Alexa device within 2 meters
- Moderate background noise (fan, air conditioning)
- Speaker volume at 50-70%

### Poor Setup (will have failures)
- Computer and Alexa in different rooms
- Loud background noise (TV, conversation, construction)
- Microphone more than 5 meters from Alexa
- Speaker volume very low or Alexa behind an obstacle

## Alexa+ Ecosystem (As of June 2026)

Amazon's Alexa+ is a generative AI upgrade to Alexa, offering more natural conversations, better context awareness, and proactive assistance. The acoustic bridge works with both classic Alexa and Alexa+. Key differences relevant to the bridge:

- **Classic Alexa**: Commands are typically one-shot ("turn on the light", "what is the weather"). Responses are concise and predictable.
- **Alexa+**: Commands can be more conversational ("can you please turn on the living room light and set it to a warm color"). Responses may be longer and more detailed.

The bridge handles both naturally. If you have Alexa+, take advantage of more natural language commands. If you have classic Alexa, keep commands short and structured.

### Alexa+ Availability
- United States: Broad launch (February 2026 per trade press)
- United Kingdom: Early Access from March 19, 2026
- Canada, Mexico, Italy: Announced alongside US/UK
- Austria: Not officially named in Amazon's international announcement as of June 2026

### Known Alexa+ Issues (Third-Party Reports)
- Reliability concerns: occasional failures to understand context across turns
- Over-chatty responses: some users report Alexa+ providing too much information
- App UX: The Alexa app has been updated but some users find it less intuitive

## Voice Command Best Practices

### For Smart Home
- Use the exact device name as configured in the Alexa app. If you named your device "Living Room Lamp", do not say "living room light" or "lamp in the living room".
- Group devices in the Alexa app for batch control. "Turn off the downstairs lights" works if the devices are grouped as "Downstairs".
- Routines created in the Alexa app can be triggered by voice: "Alexa, good morning" can trigger lights, thermostat, and news in one command.

### For Music
- Streaming services (Spotify, Amazon Music, Apple Music) must be linked in the Alexa app first.
- "Play some music" is intentionally vague -- Alexa picks based on your listening history.
- For specific playlists: "Alexa, play my Discover Weekly on Spotify" (include the service name).

### For Information
- Weather queries: "Alexa, what is the weather in Vienna" works better than "Alexa, weather Vienna" (more natural = better transcription).
- Math queries: "Alexa, what is 15 percent of 80" works; "Alexa, calculate 15% of 80" may not.
- Definition queries: "Alexa, what is the definition of serendipity" works; "Alexa, define serendipity" may trigger a different response format.

## Recording Duration Recommendations

| Command Type | Listen Duration | Examples |
|---|---|---|
| Simple confirmation | 3-5 seconds | "OK", "Turning on the light", "Timer set" |
| Short information | 8-10 seconds | Time, temperature, single fact |
| Weather forecast | 12-15 seconds | Extended forecast, multiple cities |
| News briefing | 20-30 seconds | Flash briefing, news summary |
| Recipe/cooking | 15-20 seconds | Step-by-step instructions, timers |
| Music identification | 8-12 seconds | "What song is this" response |
| Long-form information | 15-25 seconds | Wikipedia summaries, book reading |

## Command Category Catalog

### Smart Home (50+ commands)
Lights: turn on/off, set brightness (percent), set color (red/blue/green/white/warm white), dim/brighten
Thermostats: set temperature (degrees), increase/decrease, set mode (heat/cool/auto)
Locks: lock/unlock, check status
Switches: turn on/off (coffee maker, fan, plug)
Blinds: open/close, set position (percent)
Garage: open/close, check status
Sprinklers: turn on/off, set duration
Cameras: show (on Echo Show), check status
Sensors: check temperature, humidity, motion, contact

### Music and Audio (30+ commands)
Playback: play, pause, resume, stop, next track, previous track
Volume: set level (0-10 or percent), increase, decrease, mute/unmute
Selection: play artist/song/genre/playlist, shuffle, repeat
Services: Spotify, Amazon Music, Apple Music, TuneIn, iHeartRadio
Multi-room: play everywhere, play in [room], group/ungroup speakers
Alarms: set (time, label), cancel, snooze, check
Timers: set (duration, label), cancel, check status

### Information (30+ commands)
Weather: current conditions, forecast (today/weekend), precipitation, wind, UV, humidity, air quality
Time: current time, time in [city], alarms
Calendar: today's events, upcoming events, add event
News: flash briefing, news by category (technology, world, sports)
Sports: scores, schedules, standings
Finance: stock prices, market updates
Traffic: commute time, traffic conditions
Shopping: add to list, read list, order (blocked by shopping guard)

### Alexa Settings (15+ commands)
Communication: do not disturb (on/off), calls, messages
Alexa privacy: review history, delete recording, manage skills
Device settings: equalizer (bass, treble), notification sounds
Routines: trigger by name, manage routines
Skills: enable/disable, discover new

## Service Status Checks

Before relying on the acoustic bridge, verify your audio setup:

### Test the Audio Output
`speak_command(text="Alexa, are you there?")` -- this tests:
- Edge-TTS synthesis (or SAPI5 fallback)
- Audio playback through the default speaker
- Whether the speaker is working and loud enough

### Test the Audio Input
`listen_for_response(duration=5)` -- this tests:
- Microphone recording through the default input device
- Faster-Whisper transcription (model loading on first call)
- Whether the microphone is positioned correctly

### Full Loop Test
`interact(command="what time is it")` -- this tests the complete interaction:
- Wake word prepending
- TTS synthesis and playback
- Alexa wake and response
- Audio capture and transcription
- Activity logging

### Expected Results
- A working setup returns the current time correctly
- A partially working setup may return "[No speech detected]" (Alexa responded but was not heard clearly)
- A broken setup returns an error message with troubleshooting guidance

## Advanced Voice Interaction Patterns

### Multi-Turn Conversations
While the acoustic bridge does not maintain conversation state, you can simulate multi-turn interactions:
1. `interact(command="what is the weather")` -- get weather
2. `interact(command="set a timer for 10 minutes", wait_for_response=False)` -- set timer based on weather context
3. `interact(command="play music for this weather", wait_for_response=False)` -- contextual music

Each turn is independent -- Alexa may or may not remember the previous context depending on whether she treats them as separate conversations.

### Conditional Interactions
Use the results of one interaction to decide the next:
1. `interact(command="is it raining")` -- check rain status
2. If "yes" is detected in the response: `interact(command="close the windows", wait_for_response=False)`
3. If "no" is detected: `interact(command="open the windows", wait_for_response=False)`

Parse the transcription text for keywords to make decisions about subsequent commands.

### Error Recovery Sequences
If an interaction fails, try these recovery steps in order:
1. Retry with simpler wording: "turn on light" instead of "would you please turn on the lights in the living room"
2. Retry with explicit device name: "turn on living room light" instead of "turn on the light"
3. Check device status: `interact(command="is the living room light on")`
4. If all fails, check the Alexa app for device connectivity

## Integration with Other Fleet MCP Servers

alexa-mcp integrates with other fleet tools for advanced automation. Example cross-tool workflows:

**aiwatcher-mcp + alexa-mcp**: Have aiwatcher detect breaking news, then use alexa-mcp to ask Alexa for more details via voice.

**monitoring-mcp + alexa-mcp**: When monitoring detects a server issue, use alexa-mcp to announce it: "The server room temperature is above threshold."

**devices-mcp + alexa-mcp**: Coordinate smart home devices through both the Tapo bridge and Alexa voice for redundant control.

**fleet-agent-mcp + alexa-mcp**: Use fleet-agent to orchestrate multi-step routines involving Alexa voice commands as part of larger automated workflows.

Example:
1. aiwatcher detects a critical alert about severe weather
2. alexa-mcp is called: `interact(command="what is the severe weather warning")`
3. The response is captured and logged
4. The information is forwarded to email-mcp or discord-mcp for distribution

## Understanding the Acoustic Bridge Limitations

### Why the Bridge Cannot Use the Alexa API
alexa-mcp does not use Amazon's Alexa Voice Service (AVS) API because AVS requires complex OAuth2 authentication, does not support all Alexa features, requires special approval from Amazon, and is designed for hardware manufacturers embedding Alexa. The acoustic bridge bypasses these limitations by treating Alexa as a black box that accepts voice input and produces voice output. The tradeoff is that it requires physical proximity and audio hardware.

### Device Compatibility
The bridge works with any Alexa-capable device within earshot: Echo Dot (all generations), Echo (all generations), Echo Show, Echo Studio, Echo Flex, Echo Input, Echo Link, Echo Auto, and third-party devices with Alexa built in.

### Why Not Use the Alexa App
The Alexa mobile app provides touch-based control but cannot be automated via MCP. The acoustic bridge enables programmatic control through voice, which is essential for AI agent integration.

### Alexa+ Compatibility (June 2026)
As of June 2026, Alexa+ (Amazon's generative AI upgrade) does not have a public API. The acoustic bridge works with both classic Alexa and Alexa+ devices interchangeably.
- United States: Broad launch (Feb 2026 per trade press)
- United Kingdom: Early Access from March 19, 2026
- Canada, Mexico, Italy: Announced alongside US/UK
- Austria: Not officially named in Amazon's announcement
- Reported issues: reliability concerns, over-chatty responses, app UX changes

### Room Acoustics and Hardware Tips
For best results with the acoustic bridge:
- Use an external powered speaker (USB or 3.5mm) rather than laptop speakers
- Position a USB microphone (Jabra, Blue Yeti) 30-50cm from the Echo device
- Place the Echo device 1-2 meters from the speaker
- Minimize background noise (fans, traffic, conversation)
- Test your setup: `speak_command(text="Alexa, are you there?")` then `listen_for_response(duration=5)`

## Troubleshooting Common Interaction Failures

### Alexa Does Not Wake
If `speak_command` completes successfully (audio played) but Alexa does not respond:
- **Speaker volume too low**: Increase Windows speaker volume to 70%+ and try again
- **Echo device too far**: Move the Echo device within 3 meters of the speaker
- **Background noise too high**: Quiet the room -- Alexa may not hear the wake word
- **Wrong wake word**: Ensure "Alexa" is at the start of the command text
- **Multiple Alexa devices**: If you have multiple Echos, they may conflict. Mute the ones not near the computer

### Alexa Responds Inaudibly
If Alexa's response is too quiet for the microphone:
- **Echo volume too low**: Ask "Alexa, set volume to 7" through the web interface
- **Microphone too far**: Move the microphone closer to the Echo device
- **Obstacle blocking sound**: Clear the path between Echo and microphone

### Transcription Is Garbage
If Faster-Whisper returns nonsense text:
- **Background noise**: Reduce ambient noise (fans, traffic, conversation)
- **Echo/feedback**: The speaker output may be bleeding into the microphone recording. Separate speaker and microphone or reduce speaker volume
- **Alexa spoke too fast**: Some Alexa responses are very fast. Increase listen duration
- **Accent mismatch**: The base model may struggle with non-US English accents. Try English (US) voice settings on the Echo

### Command Executes Incorrectly
If Alexa does the wrong thing:
- **Misheard command**: The TTS may have pronounced the command unclearly. Try simpler phrasing
- **Wrong device name**: Verify device names in the Alexa app. "Bedroom light" vs "Bedside lamp"
- **Ambiguous command**: "Turn on the light" fails if multiple lights exist. Be specific

## Troubleshooting Matrix

| Symptom | Likely Cause | Solution |
|---------|-------------|----------|
| "No speech detected" | Alexa didn't respond audibly | Check if command was heard; try simpler phrasing |
| "No speech detected" | Microphone too far from Alexa | Move mic closer; increase mic gain |
| "No speech detected" | Listen timeout too short | Increase `timeout` parameter |
| "Error speaking command" | Edge-TTS failed (no internet) | Check internet; falls back to SAPI5 |
| Command not executed | Alexa didn't wake | Increase speaker volume; move speaker closer to Echo |
| Wrong response | Alexa misheard the command | Clearer phrasing; check for homophones |
| Echo/feedback loop | Speaker picked up by microphone | Separate speaker from mic; reduce volume |
| Slow responses | Faster-Whisper on CPU | Use GPU if available; reduce sample rate |
| "Alexa+" unavailable | Regional limitation | Not available in Austria per Amazon announcements |
| Shopping guard blocks | Purchase keywords detected | Set ALEXA_SHOPPING_GUARD=0 (at your own risk) |

## Safety

- The TTS Shopping Guard blocks purchase-adjacent commands. Review blocked interactions in the activity log.
- Interaction logs are in-memory only. They are lost on server restart unless exported.
- Audio recordings are temporary WAV files cleaned up after each interaction.
- The web bridge FastAPI endpoints are protected by Basic Authentication.
- Fleet launch is restricted to paths under D:/Dev/repos.
