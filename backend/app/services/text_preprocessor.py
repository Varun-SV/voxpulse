import re
from typing import Tuple, Optional, List, Dict, Any

class TextPreprocessor:
    """
    Intelligent Script Director & Prosody Preprocessor for VoxPulse Studio.

    Translates bracketed director instructions ([Deep, cinematic], [Speaking slowly], [Curious])
    into multi-beat prosodic parameters (speed, pitch, emotion, timbre, dramatic pauses)
    and segments arbitrary-length scripts into emotionally dynamic audio beats.
    """

    SPEED_MODIFIERS = {
        # Slow / Cinematic pacing
        "very slow": 0.72,
        "speaking slowly": 0.78,
        "slowly": 0.80,
        "slow": 0.82,
        "deliberate": 0.82,
        "ponderous": 0.75,
        "calm": 0.88,
        "unhurried": 0.82,
        "relaxed": 0.88,
        "somber": 0.82,
        "cinematic": 0.80,
        "epic": 0.82,
        "mysterious": 0.82,
        "solemn": 0.80,

        # Fast / Urgent pacing
        "speaking quickly": 1.25,
        "speaking fast": 1.25,
        "very fast": 1.35,
        "panicked": 1.30,
        "urgent": 1.25,
        "hurried": 1.22,
        "fast": 1.22,
        "rapid": 1.28,
        "rushed": 1.25,
        "excited": 1.20,
        "energetic": 1.18,
        "breathless": 1.22,
        "alarmed": 1.25
    }

    PITCH_MODIFIERS = {
        # Deep / Low registers
        "very deep": -4.5,
        "guttural": -4.5,
        "deep": -2.8,
        "baritone": -3.0,
        "grave": -3.0,
        "low pitch": -2.8,
        "low voice": -2.5,
        "low": -2.2,
        "resonant": -2.0,
        "cinematic": -2.2,
        "movie trailer": -3.5,
        "epic": -2.5,
        "whispering": -1.5,
        "whisper": -1.5,
        "hushed": -1.5,
        "somber": -2.0,

        # High / Bright registers
        "high pitch": 3.5,
        "squeaky": 4.5,
        "shrill": 4.0,
        "high voice": 2.8,
        "high": 2.5,
        "curious": 1.5,
        "inquisitive": 1.5,
        "youthful": 2.2,
        "bright": 1.8,
        "playful": 1.8,
        "excited": 2.2
    }

    EMOTIONS = [
        "mysterious",
        "cinematic",
        "curious",
        "inquisitive",
        "whispering",
        "whisper",
        "hushed",
        "dramatic",
        "urgent",
        "panicked",
        "cheerful",
        "excited",
        "sad",
        "angry",
        "thoughtful",
        "epic",
        "somber",
        "playful",
        "warm",
        "robotic",
        "authoritative"
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
        Parses script instructions from a single-segment block, updates prosody,
        and returns (clean_text, speed, pitch, emotion).
        """
        if not text:
            return text, current_speed, current_pitch, current_emotion

        bracket_pattern = re.compile(r"\[([^\]]+)\]")
        paren_pattern = re.compile(r"^\(([^\)]+)\)\s*", re.MULTILINE)

        extracted_speed = current_speed
        extracted_pitch = current_pitch
        extracted_emotion = current_emotion

        # Extract instructions from bracket tags
        bracket_matches = bracket_pattern.findall(text)
        for note in bracket_matches:
            note_lower = note.lower().strip()

            # Direct syntax: [speed: 0.85]
            speed_match = re.search(r"speed:\s*([0-9\.]+)", note_lower)
            if speed_match:
                try:
                    extracted_speed = float(speed_match.group(1))
                except ValueError:
                    pass

            # Direct syntax: [pitch: -2.5]
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

        # Strip bracket tags and parentheticals
        cleaned = bracket_pattern.sub("", text)
        cleaned = paren_pattern.sub("", cleaned)
        cleaned = re.sub(r"\n\s*\n+", "\n\n", cleaned).strip()

        # Acoustic punctuation physics: convert dramatic '...' into natural pauses
        # If '...' has no comma or space around it, ensure clean spacing
        cleaned = re.sub(r"\.{3,}", "...", cleaned)

        if not cleaned:
            cleaned = text

        return cleaned, extracted_speed, extracted_pitch, extracted_emotion

    @classmethod
    def segment_into_beats(
        cls,
        text: str,
        default_speed: float = 1.0,
        default_pitch: float = 0.0,
        default_emotion: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Segments arbitrary-length scripts with 'n' number of stage directions
        into acoustic beats, each maintaining its own speed, pitch, emotion, and pause.
        """
        if not text:
            return []

        # Check if text contains bracket directives
        bracket_pattern = re.compile(r"\[([^\]]+)\]")
        if not bracket_pattern.search(text):
            # No stage directions, single beat
            return [{
                "text": text.strip(),
                "speed": default_speed,
                "pitch": default_pitch,
                "emotion": default_emotion,
                "pause_ms": 400
            }]

        # Split text by paragraphs or bracket tags
        lines = text.split("\n")
        beats = []
        current_beat_text = []
        cur_speed = default_speed
        cur_pitch = default_pitch
        cur_emotion = default_emotion

        for line in lines:
            line_stripped = line.strip()
            if not line_stripped:
                continue

            # Check if this line is purely stage directions like [Deep, cinematic]
            if re.match(r"^(\[[^\]]+\]\s*)+$", line_stripped):
                # If we had accumulated text, flush previous beat
                if current_beat_text:
                    beat_str = " ".join(current_beat_text).strip()
                    if beat_str:
                        beats.append({
                            "text": beat_str,
                            "speed": cur_speed,
                            "pitch": cur_pitch,
                            "emotion": cur_emotion,
                            "pause_ms": 600 if "..." in beat_str else 400
                        })
                    current_beat_text = []

                # Update current prosodic state with new directives
                _, cur_speed, cur_pitch, cur_emotion = cls.process_script(
                    line_stripped, cur_speed, cur_pitch, cur_emotion
                )
            else:
                # Line contains spoken text (might have inline tags too)
                clean_line, line_spd, line_pitch, line_emo = cls.process_script(
                    line_stripped, cur_speed, cur_pitch, cur_emotion
                )
                if line_spd != cur_speed or line_pitch != cur_pitch or line_emo != cur_emotion:
                    # Inline tag changed the state
                    if current_beat_text:
                        beat_str = " ".join(current_beat_text).strip()
                        if beat_str:
                            beats.append({
                                "text": beat_str,
                                "speed": cur_speed,
                                "pitch": cur_pitch,
                                "emotion": cur_emotion,
                                "pause_ms": 400
                            })
                        current_beat_text = []
                    cur_speed = line_spd
                    cur_pitch = line_pitch
                    cur_emotion = line_emo

                if clean_line:
                    current_beat_text.append(clean_line)

        # Flush final beat
        if current_beat_text:
            beat_str = " ".join(current_beat_text).strip()
            if beat_str:
                beats.append({
                    "text": beat_str,
                    "speed": cur_speed,
                    "pitch": cur_pitch,
                    "emotion": cur_emotion,
                    "pause_ms": 500
                })

        return beats if beats else [{
            "text": text.strip(),
            "speed": default_speed,
            "pitch": default_pitch,
            "emotion": default_emotion,
            "pause_ms": 400
        }]
