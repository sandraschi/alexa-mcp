import os

import edge_tts

from .audio import play_audio_file


async def speak_text(text: str, voice: str = "en-US-AriaNeural", output_file: str = "tts_output.wav"):
    """
    Synthesizes speech from text using edge-tts and plays it.
    """
    communicate = edge_tts.Communicate(text, voice)

    # edge-tts output is usually mp3. We might need conversion if play_audio_file expects wav.
    # scaffolding libraries: pydub can convert.
    # Or simply let edge-tts save as mp3 and use a player that supports it.
    # sounddevice/scipy.io.wavfile ONLY supports WAV.
    # So we MUST convert mp3 to wav, or use a library that plays mp3.
    # To keep it SOTA/simple without ffmpeg system dependency hell (though pydub needs ffmpeg),
    # let's try to verify if edge-tts can output wav or if we can decode it.
    # Edge-tts outputs mp3 stream.

    # Alternative: Use system player or pydub.
    # For Windows user, we can assume ffmpeg might be installed or we can use a simpler approach.
    # Actually, let's assume we can use pydub and ffmpeg is on path (common for dev).
    # If not, we might fail.
    # Safeguard: Check for ffmpeg?

    mp3_file = output_file.replace(".wav", ".mp3")
    await communicate.save(mp3_file)

    # Convert to wav using pydub
    try:
        from pydub import AudioSegment

        audio = AudioSegment.from_mp3(mp3_file)
        audio.export(output_file, format="wav")

        # Play
        play_audio_file(output_file)

    except Exception as e:
        print(f"Error playing audio: {e}")
        # Fallback diagnostics
        if not os.path.exists("ffmpeg.exe") and not os.environ.get("PATH", "").find("ffmpeg"):
            print("FFmpeg might be missing. Please install FFmpeg for MP3->WAV conversion.")

    finally:
        # Cleanup
        if os.path.exists(mp3_file):
            os.remove(mp3_file)
        if os.path.exists(output_file):
            os.remove(output_file)
