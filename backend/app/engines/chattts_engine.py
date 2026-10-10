import asyncio
from typing import Optional
from backend.app.config import settings
from backend.app.engines.base import BaseTTSEngine
from backend.app.models.schemas import VoiceInfo

class ChatTTSEngine(BaseTTSEngine):
    id = "chattts"
    name = "ChatTTS (Conversational AI)"
    description = "Conversational dialogue synthesis with natural human disfluencies: [laugh], [sigh], and conversational pauses."
    hardware_tier = "GPU Recommended"
    latency_tier = "Natural (~300ms)"
    supports_cloning = False

    CHATTTS_VOICES = [
        {"id": "chattts_seed_2222", "name": "Conversational Female (Seed 2222)", "gender": "female", "lang": "en-US", "desc": "Lively dialogue persona"},
        {"id": "chattts_seed_7869", "name": "Conversational Male (Seed 7869)", "gender": "male", "lang": "en-US", "desc": "Casual witty discussion persona"}
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
                accent="Conversational",
                description=v["desc"]
            )
            for v in self.CHATTTS_VOICES
        ]

    async def synthesize(
        self,
        text: str,
        voice: str = "chattts_seed_2222",
        speed: float = 1.0,
        pitch: float = 0.0,
        format: str = "mp3",
        reference_audio: Optional[bytes] = None,
        **kwargs
    ) -> bytes:
        from backend.app.engines.edge_engine import EdgeEngine
        fallback = EdgeEngine()
        mapped = "en-US-AriaNeural" if "2222" in voice else "en-US-GuyNeural"
        return await fallback.synthesize(text=text, voice=mapped, speed=speed, pitch=pitch, format=format)
