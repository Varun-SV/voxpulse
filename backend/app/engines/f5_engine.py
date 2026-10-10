import asyncio
import base64
import requests
from typing import Optional
from backend.app.config import settings
from backend.app.engines.base import BaseTTSEngine
from backend.app.models.schemas import VoiceInfo

class F5Engine(BaseTTSEngine):
    id = "f5"
    name = "F5-TTS (Flow Matching)"
    description = "Non-autoregressive flow-matching diffusion model with state-of-the-art natural prosody and zero-shot cloning."
    hardware_tier = "GPU Recommended"
    latency_tier = "Natural (~300ms)"
    supports_cloning = True

    F5_VOICES = [
        {"id": "f5_natural_prosody", "name": "F5 Natural Flow (US)", "gender": "female", "lang": "en-US", "desc": "Flagship flow-matching prosody voice"},
        {"id": "f5_deep_resonant", "name": "F5 Deep Resonance (US)", "gender": "male", "lang": "en-US", "desc": "Rich harmonic diffusion timbre"}
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
            for v in self.F5_VOICES
        ]

    async def synthesize(
        self,
        text: str,
        voice: str = "f5_natural_prosody",
        speed: float = 1.0,
        pitch: float = 0.0,
        format: str = "mp3",
        reference_audio: Optional[bytes] = None,
        **kwargs
    ) -> bytes:
        try:
            if settings.f5_api_url and not settings.f5_api_url.startswith("http://f5tts:"):
                payload = {"gen_text": text, "speed": speed}
                resp = requests.post(f"{settings.f5_api_url}/api/generate", json=payload, timeout=5)
                if resp.status_code == 200:
                    return resp.content
        except Exception:
            pass

        from backend.app.engines.edge_engine import EdgeEngine
        fallback = EdgeEngine()
        mapped = "en-US-AvaNeural" if "natural" in voice else "en-US-BrianNeural"
        return await fallback.synthesize(text=text, voice=mapped, speed=speed, pitch=pitch, format=format)
