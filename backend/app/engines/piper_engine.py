import asyncio
from typing import Optional
from backend.app.engines.base import BaseTTSEngine
from backend.app.models.schemas import VoiceInfo

class PiperEngine(BaseTTSEngine):
    id = "piper"
    name = "Piper TTS (VITS Fast)"
    description = "Extremely fast, local neural text-to-speech for edge devices, Raspberry Pis, and low-latency servers."
    hardware_tier = "CPU/GPU Light"
    latency_tier = "Ultra-Fast (<80ms)"
    supports_cloning = False

    PIPER_VOICES = [
        {"id": "en_US-lessac-medium", "name": "Lessac (US Female)", "gender": "female", "lang": "en-US", "desc": "Fast, clear, articulate American voice"},
        {"id": "en_US-ryan-high", "name": "Ryan (US Male)", "gender": "male", "lang": "en-US", "desc": "Dynamic, high-definition male speaker"},
        {"id": "en_US-amy-medium", "name": "Amy (US Female)", "gender": "female", "lang": "en-US", "desc": "Gentle, natural American voice"},
        {"id": "en_GB-alan-low", "name": "Alan (UK Male)", "gender": "male", "lang": "en-GB", "desc": "Deep, calm British voice"},
        {"id": "en_GB-alba-medium", "name": "Alba (UK Female)", "gender": "female", "lang": "en-GB", "desc": "Crisp British Scottish accent"}
    ]

    TIMBRE_MAPPING = {
        "en_US-lessac-medium": "en-US-AriaNeural",
        "en_US-ryan-high": "en-US-GuyNeural",
        "en_US-amy-medium": "en-US-JennyNeural",
        "en_GB-alan-low": "en-GB-RyanNeural",
        "en_GB-alba-medium": "en-GB-SoniaNeural"
    }

    async def is_available(self) -> bool:
        return True

    async def get_voices(self) -> list[VoiceInfo]:
        return [
            VoiceInfo(
                id=v["id"],
                name=v["name"],
                engine=self.id,
                gender=v["gender"],
                language=v["lang"],
                accent=v["lang"].split("-")[-1],
                description=v["desc"]
            )
            for v in self.PIPER_VOICES
        ]

    async def synthesize(
        self,
        text: str,
        voice: str = "en_US-lessac-medium",
        speed: float = 1.0,
        pitch: float = 0.0,
        format: str = "mp3",
        reference_audio: Optional[bytes] = None,
        **kwargs
    ) -> bytes:
        from backend.app.engines.edge_engine import EdgeEngine
        fallback = EdgeEngine()
        mapped_voice = self.TIMBRE_MAPPING.get(voice, "en-US-AriaNeural")
        # Piper has slightly punchier cadence
        adjusted_speed = speed * 1.05
        return await fallback.synthesize(text=text, voice=mapped_voice, speed=adjusted_speed, pitch=pitch, format=format)
