import time
import base64
from typing import Optional
from backend.app.engines.base import BaseTTSEngine
from backend.app.engines.kokoro_engine import KokoroEngine
from backend.app.engines.piper_engine import PiperEngine
from backend.app.engines.edge_engine import EdgeEngine
from backend.app.engines.xtts_engine import XTTSEngine
from backend.app.engines.f5_engine import F5Engine
from backend.app.engines.chattts_engine import ChatTTSEngine
from backend.app.engines.zonos_engine import ZonosEngine
from backend.app.models.schemas import EngineInfo, VoiceInfo, SynthesizeRequest

class EngineManager:
    def __init__(self):
        self._engines: dict[str, BaseTTSEngine] = {
            "kokoro": KokoroEngine(),
            "piper": PiperEngine(),
            "edge": EdgeEngine(),
            "xtts": XTTSEngine(),
            "f5": F5Engine(),
            "chattts": ChatTTSEngine(),
            "zonos": ZonosEngine(),
        }

    def get_engine(self, engine_id: Optional[str]) -> BaseTTSEngine:
        if not engine_id or engine_id not in self._engines:
            return self._engines["kokoro"]
        return self._engines[engine_id]

    async def list_engines(self) -> list[EngineInfo]:
        result = []
        for eng_id, eng in self._engines.items():
            voices = await eng.get_voices()
            is_act = await eng.is_available()
            result.append(EngineInfo(
                id=eng.id,
                name=eng.name,
                description=eng.description,
                hardware_tier=eng.hardware_tier,
                latency_tier=eng.latency_tier,
                supports_cloning=eng.supports_cloning,
                is_active=is_act,
                voice_count=len(voices)
            ))
        return result

    async def list_all_voices(self) -> list[VoiceInfo]:
        all_voices: list[VoiceInfo] = []
        for eng in self._engines.values():
            voices = await eng.get_voices()
            all_voices.extend(voices)
        return all_voices

    async def synthesize(self, req: SynthesizeRequest) -> tuple[bytes, float]:
        """Synthesizes audio and returns (audio_bytes, latency_ms)."""
        engine = self.get_engine(req.engine)
        voice_id = req.voice or "af_heart"
        
        # Segment script into acoustic beats based on director notes ([Deep], [Speaking slowly], etc.)
        from backend.app.services.text_preprocessor import TextPreprocessor
        beats = TextPreprocessor.segment_into_beats(
            text=req.text,
            default_speed=req.speed,
            default_pitch=req.pitch,
            default_emotion=req.emotion
        )

        # Decode reference audio if cloning sample provided
        ref_bytes = None
        if req.reference_audio_base64:
            try:
                ref_bytes = base64.b64decode(req.reference_audio_base64)
            except Exception:
                ref_bytes = None

        start_time = time.perf_counter()

        # If single beat, synthesize directly
        if len(beats) <= 1:
            beat = beats[0] if beats else {
                "text": req.text, "speed": req.speed, "pitch": req.pitch, "emotion": req.emotion
            }
            audio_data = await engine.synthesize(
                text=beat["text"],
                voice=voice_id,
                speed=beat["speed"],
                pitch=beat["pitch"],
                format=req.format,
                reference_audio=ref_bytes,
                emotion=beat["emotion"]
            )
        else:
            # Multi-beat cinematic script assembly
            master_bytes = bytearray()
            # MP3 silence padding frame (~150ms)
            silence_frame = b"\xff\xfb\x90d\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00" * 8
            for i, beat in enumerate(beats):
                chunk = await engine.synthesize(
                    text=beat["text"],
                    voice=voice_id,
                    speed=beat["speed"],
                    pitch=beat["pitch"],
                    format=req.format,
                    reference_audio=ref_bytes,
                    emotion=beat["emotion"]
                )
                master_bytes.extend(chunk)
                if i < len(beats) - 1 and beat.get("pause_ms", 0) > 0:
                    master_bytes.extend(silence_frame * (beat["pause_ms"] // 100))
            audio_data = bytes(master_bytes)

        latency_ms = (time.perf_counter() - start_time) * 1000.0
        return audio_data, latency_ms

    async def compare(self, text: str, engine_ids: list[str]) -> list[dict]:
        from backend.app.services.text_preprocessor import TextPreprocessor
        clean_text, speed, pitch, _ = TextPreprocessor.process_script(text)

        results = []
        for eng_id in engine_ids:
            if eng_id not in self._engines:
                continue
            eng = self._engines[eng_id]
            voices = await eng.get_voices()
            default_voice = voices[0].id if voices else "default"
            
            start_time = time.perf_counter()
            audio_bytes = await eng.synthesize(text=clean_text, voice=default_voice, speed=speed, pitch=pitch)
            latency_ms = round((time.perf_counter() - start_time) * 1000.0, 1)
            
            results.append({
                "engine_id": eng.id,
                "engine_name": eng.name,
                "voice_name": voices[0].name if voices else "Default Voice",
                "latency_ms": latency_ms,
                "audio_base64": base64.b64encode(audio_bytes).decode("utf-8"),
                "format": "mp3"
            })
        return results

engine_manager = EngineManager()
