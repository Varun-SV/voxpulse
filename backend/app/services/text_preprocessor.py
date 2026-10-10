import re
from typing import Tuple, Optional

class TextPreprocessor:
    """
    Intelligent Script & Director Notes Preprocessor for TTS.

    Parses stage directions and parentheticals (e.g. [Deep, cinematic, mysterious],
    [Speaking slowly], [Curious], (whispering)), extracts prosody modifiers (speed, pitch,
    emotion), and strips the metadata so the acoustic model speaks only the actual dialogue.
    """

    SPEED_MODIFIERS = {
        "speaking slowly": 0.80,
        "very slow": 0.75,
        "slowly": 0.82,
        "slow": 0.85,
        "deliberate": 0.85,
        "calm": 0.90,
        "speaking quickly": 1.25,
        "hurried": 1.20,
        "fast": 1.25,
        "rapid": 1.30,
        "rushed": 1.25,
    }

    PITCH_MODIFIERS = {
        "very deep": -4.0,
        "deep": -2.5,
        "low pitch": -2.5,
        "low voice": -2.0,
        "low": -2.0,
        "resonant": -1.5,
        "high pitch": 3.0,
        "high voice": 2.5,
        "high": 2.5,
        "squeaky": 4.0,
    }

    EMOTIONS = [
        "mysterious",
        "cinematic",
        "curious",
        "whispering",
        "whisper",
        "dramatic",
        "cheerful",
        "excited",
        "sad",
        "angry",
        "thoughtful",
        "epic",
        "somber",
        "playful",
        "warm"
    ]

    @classmethod
    def process_script(
        cls,
        text: str,
        current_speed: float = 1.0,
        current_pitch: float = 0.0,
        current_emotion: Optional[str] = None
    ) -> Tuple[str, float, float, Optional[str]]:
        """
        Parses script instructions, updates prosody, and returns (clean_text, speed, pitch, emotion).
        """
        if not text:
            return text, current_speed, current_pitch, current_emotion

        bracket_pattern = re.compile(r"\[([^\]]+)\]")
        paren_pattern = re.compile(r"^\(([^\)]+)\)\s*", re.MULTILINE)

        extracted_speed = current_speed
        extracted_pitch = current_pitch
        extracted_emotion = current_emotion

        # 1. Extract director instructions from bracket tags
        bracket_matches = bracket_pattern.findall(text)
        for note in bracket_matches:
            note_lower = note.lower().strip()

            # Direct syntax: [speed: 0.8]
            speed_match = re.search(r"speed:\s*([0-9\.]+)", note_lower)
            if speed_match:
                try:
                    extracted_speed = float(speed_match.group(1))
                except ValueError:
                    pass

            # Direct syntax: [pitch: -2]
            pitch_match = re.search(r"pitch:\s*([\-0-9\.]+)", note_lower)
            if pitch_match:
                try:
                    extracted_pitch = float(pitch_match.group(1))
                except ValueError:
                    pass

            # Keyword-based speed parsing
            for kw, s_val in cls.SPEED_MODIFIERS.items():
                if kw in note_lower:
                    extracted_speed = s_val
                    break

            # Keyword-based pitch parsing
            for kw, p_val in cls.PITCH_MODIFIERS.items():
                if kw in note_lower:
                    extracted_pitch = p_val
                    break

            # Keyword-based emotion parsing
            for emo in cls.EMOTIONS:
                if emo in note_lower:
                    extracted_emotion = emo
                    break

        # 2. Strip bracketed stage notes from the vocalized output
        cleaned = bracket_pattern.sub("", text)
        cleaned = paren_pattern.sub("", cleaned)
        cleaned = re.sub(r"\n\s*\n+", "\n\n", cleaned).strip()

        # If user literally only input bracketed text with nothing else (e.g. "[hello]"), preserve it
        if not cleaned:
            cleaned = text

        return cleaned, extracted_speed, extracted_pitch, extracted_emotion
