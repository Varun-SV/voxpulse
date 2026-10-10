import asyncio
import io
import edge_tts
from backend.app.engines.base import BaseTTSEngine
from backend.app.models.schemas import VoiceInfo

class EdgeEngine(BaseTTSEngine):
    id = "edge"
    name = "Edge Neural TTS"
    description = "Zero-dependency cloud-free neural engine with 100+ pristine voices across 40+ languages."
    hardware_tier = "CPU/GPU Light"
    latency_tier = "Instant (<120ms)"
    supports_cloning = False

    def __init__(self):
        self._voices_cache: list[VoiceInfo] = []

    async def is_available(self) -> bool:
        return True

    async def get_voices(self) -> list[VoiceInfo]:
        if self._voices_cache:
            return self._voices_cache
            
        try:
            voices = await edge_tts.list_voices()
            parsed: list[VoiceInfo] = []
            for v in voices:
                short_name = v.get("ShortName", "")
                gender = "female" if v.get("Gender", "").lower() == "female" else "male"
                locale = v.get("Locale", "en-US")
                friendly = v.get("FriendlyName", short_name)
                
                # Filter down to top standard languages for curated speed, or include all
                if any(locale.startswith(prefix) for prefix in ["en-", "es-", "fr-", "de-", "ja-", "zh-", "it-", "hi-"]):
                    parsed.append(VoiceInfo(
                        id=short_name,
                        name=f"{short_name.split('-')[-1].replace('Neural', '')} ({locale})",
                        engine=self.id,
                        gender=gender,
                        language=locale,
                        accent=locale.split("-")[-1],
                        description=friendly
                    ))
            self._voices_cache = parsed if parsed else self._default_fallback_voices()
            return self._voices_cache
        except Exception:
            return self._default_fallback_voices()

    def _default_fallback_voices(self) -> list[VoiceInfo]:
        return [
            VoiceInfo(id="en-US-ChristopherNeural", name="Christopher (US)", engine=self.id, gender="male", language="en-US", accent="US", description="Reliable conversational tone"),
            VoiceInfo(id="en-US-JennyNeural", name="Jenny (US)", engine=self.id, gender="female", language="en-US", accent="US", description="Warm, clear, natural"),
            VoiceInfo(id="en-US-GuyNeural", name="Guy (US)", engine=self.id, gender="male", language="en-US", accent="US", description="Casual conversational tone"),
            VoiceInfo(id="en-US-AriaNeural", name="Aria (US)", engine=self.id, gender="female", language="en-US", accent="US", description="Crisp expressive female"),
            VoiceInfo(id="en-GB-SoniaNeural", name="Sonia (UK)", engine=self.id, gender="female", language="en-GB", accent="GB", description="Refined British English"),
            VoiceInfo(id="en-GB-RyanNeural", name="Ryan (UK)", engine=self.id, gender="male", language="en-GB", accent="GB", description="Natural British narrator"),
            VoiceInfo(id="ja-JP-NanamiNeural", name="Nanami (JP)", engine=self.id, gender="female", language="ja-JP", accent="JP", description="Smooth Japanese voice"),
            VoiceInfo(id="fr-FR-DeniseNeural", name="Denise (FR)", engine=self.id, gender="female", language="fr-FR", accent="FR", description="Parisian French tone")
        ]

    async def synthesize(
        self,
        text: str,
        voice: str = "en-US-ChristopherNeural",
        speed: float = 1.0,
        pitch: float = 0.0,
        format: str = "mp3",
        reference_audio = None,
        **kwargs
    ) -> bytes:
        # Convert speed multiplier (e.g. 1.2 -> "+20%", 0.8 -> "-20%")
        speed_percent = int((speed - 1.0) * 100)
        rate_str = f"{'+' if speed_percent >= 0 else ''}{speed_percent}%"
        
        # Convert pitch offset (e.g. 2 -> "+2Hz")
        pitch_int = int(pitch * 5)
        pitch_str = f"{'+' if pitch_int >= 0 else ''}{pitch_int}Hz"

        # Validate voice belongs to edge or map fallback
        if not voice or "Neural" not in voice:
            voice = "en-US-ChristopherNeural"

        communicate = edge_tts.Communicate(text=text, voice=voice, rate=rate_str, pitch=pitch_str)
        audio_stream = io.BytesIO()

        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                audio_stream.write(chunk["data"])

        return audio_stream.getvalue()
