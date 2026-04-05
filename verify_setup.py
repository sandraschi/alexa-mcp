import asyncio
import os


async def main():
    print("Verifying core capabilities...")

    # 1. Verify Imports
    try:
        import edge_tts
        import faster_whisper
        import fastmcp
        import sounddevice

        print("[OK] All modules imported successfully.")
    except ImportError as e:
        print(f"[FAIL] Import error: {e}")
        return

    # 2. Verify STT Model Load (Preload)
    print("Loading Faster-Whisper model (this may take time)...")
    try:
        from alexa_mcp.stt import get_model

        # Use tiny or base for verification speed if valid, but code uses default (base)
        model = get_model(model_size="base", device="cpu", compute_type="int8")
        print("[OK] Faster-Whisper model loaded.")
    except Exception as e:
        print(f"[FAIL] Faster-Whisper load error: {e}")
        # Continue if it's just a download issue or device issue? No, it's critical.

    # 3. Verify TTS (Edge-TTS)
    print("Verifying TTS (Edge-TTS connectivity)...")
    try:
        # We won't play it to avoid noise, just generate
        # Mocking play_audio_file or modifying speak_text?
        # speak_text plays audio. We can patch it or just let it play (it's short).
        # Let's try to generate to file and verify file exists, then delete.
        # But speak_text plays it.
        # We can mock play_audio_file.
        import alexa_mcp.tts
        from alexa_mcp.tts import speak_text

        original_play = alexa_mcp.tts.play_audio_file
        alexa_mcp.tts.play_audio_file = lambda x: print(f"[MOCK] Playing {x}")

        await speak_text("Verification successful.", output_file="verify.wav")
        if os.path.exists("verify.wav"):
            print("[OK] TTS generated audio file.")
            os.remove("verify.wav")
        else:
            print("[FAIL] TTS did not generate audio file.")

        # Restore (not strictly needed as process ends)
        alexa_mcp.tts.play_audio_file = original_play

    except Exception as e:
        print(f"[FAIL] TTS error: {e}")

    print("Verification complete.")


if __name__ == "__main__":
    asyncio.run(main())
