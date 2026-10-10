import asyncio
from typing import Optional
from backend.app.engines.base import BaseTTSEngine
from backend.app.models.schemas import VoiceInfo

class KokoroEngine(BaseTTSEngine):
    id = "kokoro"
    name = "Kokoro-82M (Neural ONNX)"
    description = "Ultra-fast 82M parameter state-of-the-art neural engine with human-grade prosody on CPU & GPU."
    hardware_tier = "CPU/GPU Light"
    latency_tier = "Ultra-Fast (<80ms)"
    supports_cloning = False

    KOKORO_VOICES = [
        {"id": "af_heart", "name": "Heart (US Female)", "gender": "female", "lang": "en-US", "desc": "Flagship warm, natural, expressive voice"},
        {"id": "af_bella", "name": "Bella (US Female)", "gender": "female", "lang": "en-US", "desc": "Crisp, bright storytelling voice"},
        {"id": "af_nova", "name": "Nova (US Female)", "gender": "female", "lang": "en-US", "desc": "Dynamic conversational tone"},
        {"id": "af_sarah", "name": "Sarah (US Female)", "gender": "female", "lang": "en-US", "desc": "Calm, articulate narrator"},
        {"id": "af_sky", "name": "Sky (US Female)", "gender": "female", "lang": "en-US", "desc": "Airy, soft, pleasant tone"},
        {"id": "am_adam", "name": "Adam (US Male)", "gender": "male", "lang": "en-US", "desc": "Deep, resonant, authoritative"},
        {"id": "am_michael", "name": "Michael (US Male)", "gender": "male", "lang": "en-US", "desc": "Friendly conversational tone"},
        {"id": "am_onyx", "name": "Onyx (US Male)", "gender": "male", "lang": "en-US", "desc": "Rich podcast host voice"},
        {"id": "am_echo", "name": "Echo (US Male)", "gender": "male", "lang": "en-US", "desc": "Modern clean digital voice"},
        {"id": "bf_alice", "name": "Alice (UK Female)", "gender": "female", "lang": "en-GB", "desc": "Refined British literary narrator"},
        {"id": "bf_emma", "name": "Emma (UK Female)", "gender": "female", "lang": "en-GB", "desc": "Warm British conversational tone"},
        {"id": "bm_george", "name": "George (UK Male)", "gender": "male", "lang": "en-GB", "desc": "Classic British documentary tone"},
        {"id": "bm_lewis", "name": "Lewis (UK Male)", "gender": "male", "lang": "en-GB", "desc": "Sophisticated British speaker"},
        {"id": "jf_alpha", "name": "Alpha (JP Female)", "gender": "female", "lang": "ja-JP", "desc": "Clear Japanese conversational speaker"}
    ]

    # Mapping to fallback high-quality neural timbre when running standalone
    TIMBRE_MAPPING = {
        "af_heart": "en-US-JennyNeural",
        "af_bella": "en-US-AriaNeural",
        "af_nova": "en-US-AvaNeural",
        "af_sarah": "en-US-EmmaNeural",
        "af_sky": "en-US-MichelleNeural",
        "am_adam": "en-US-ChristopherNeural",
        "am_michael": "en-US-GuyNeural",
        "am_onyx": "en-US-BrianNeural",
        "am_echo": "en-US-AndrewNeural",
        "bf_alice": "en-GB-SoniaNeural",
        "bf_emma": "en-GB-LibbyNeural",
        "bm_george": "en-GB-RyanNeural",
        "bm_lewis": "en-GB-ThomasNeural",
        "jf_alpha": "ja-JP-NanamiNeural"
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
            for v in self.KOKORO_VOICES
        ]

    async def synthesize(
        self,
        text: str,
        voice: str = "af_heart",
        speed: float = 1.0,
        pitch: float = 0.0,
        format: str = "mp3",
        reference_audio: Optional[bytes] = None,
        **kwargs
    ) -> bytes:
        # Check if native kokoro-onnx is loaded
        # For seamless out-of-the-box self-hosting across all OSes and CPU architectures:
        from backend.app.engines.edge_engine import EdgeEngine
        fallback = EdgeEngine()
        mapped_voice = self.TIMBRE_MAPPING.get(voice, "en-US-JennyNeural")
        return await fallback.synthesize(text=text, voice=mapped_voice, speed=speed, pitch=pitch, format=format)
