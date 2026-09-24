"""
stt_processor.py
Real Speech-to-Text using OpenAI Whisper (open source, free)
Install: pip install openai-whisper ffmpeg-python
Also install ffmpeg: https://ffmpeg.org/download.html
"""

import os

try:
    import whisper
    WHISPER_AVAILABLE = True
except ImportError:
    WHISPER_AVAILABLE = False
    print("openai-whisper not installed — STT disabled. Run: pip install openai-whisper")


class STTProcessor:
    def __init__(self, model_size="base"):
        """
        model_size options:
        - "tiny"   — fastest, least accurate
        - "base"   — good balance (recommended for free hosting)
        - "small"  — better accuracy
        - "medium" — good accuracy
        - "large"  — best accuracy, needs GPU
        """
        self.model      = None
        self.model_size = model_size

        if WHISPER_AVAILABLE:
            try:
                print(f"Loading Whisper {model_size} model...")
                self.model = whisper.load_model(model_size)
                print("Whisper loaded.")
            except Exception as e:
                print(f"Whisper load error: {e}")

    def transcribe(self, filepath):
        """Transcribe audio/video file to text"""
        if not self.model:
            return ""

        ext = filepath.rsplit(".", 1)[-1].lower()
        if ext not in ("mp4", "mp3", "wav", "m4a", "ogg", "flac"):
            return ""

        try:
            print(f"Transcribing: {filepath}")
            result = self.model.transcribe(
                filepath,
                language   = "en",
                task       = "transcribe",
                fp16       = False  # Use fp32 for CPU compatibility
            )
            text = result.get("text", "").strip()
            print(f"Transcription complete: {len(text)} chars")
            return text
        except Exception as e:
            print(f"Transcription error: {e}")
            return ""
