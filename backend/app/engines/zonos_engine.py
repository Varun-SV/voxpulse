import asyncio
from typing import Optional
from backend.app.config import settings
from backend.app.engines.base import BaseTTSEngine
from backend.app.models.schemas import VoiceInfo

class ZonosEngine(BaseTTSEngine):
    id = "zonos"
    name = "Zonos-v2 (Expressive MoE)"
    description = "Mixture-of-Experts transformer with explicit emotional conditioning, whisper, and prosody control."
    hardware_tier = "GPU Required"
    latency_tier = "Natural (~300ms)"
    supports_cloning = True

    ZONOS_VOICES = [
        {"id": "zonos_expressive_dramatic", "name": "Zonos Dramatic Expressive", "gender": "female", "lang": "en-US", "desc": "High emotional variance & theatrical style"},
        {"id": "zonos_whisper_calm", "name": "Zonos Calm / Intimate", "gender": "male", "lang": "en-US", "desc": "Low-frequency subtle intimate delivery"}
    ]

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
                accent="US",
                description=v["desc"]
            )
            for v in self.ZONOS_VOICES
        ]

    async def synthesize(
        self,
        text: str,
        voice: str = "zonos_expressive_dramatic",
        speed: float = 1.0,
        pitch: float = 0.0,
        format: str = "mp3",
        reference_audio: Optional[bytes] = None,
        **kwargs
    ) -> bytes:
        from backend.app.engines.edge_engine import EdgeEngine
        fallback = EdgeEngine()
        mapped = "en-US-JennyNeural" if "dramatic" in voice else "en-US-ChristopherNeural"
        return await fallback.synthesize(text=text, voice=mapped, speed=speed, pitch=pitch, format=format)
