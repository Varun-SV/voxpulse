import io
import time
from backend.app.engines.manager import engine_manager
from backend.app.models.schemas import DialogueRequest, SynthesizeRequest

class DialogueService:
    @staticmethod
    async def generate_dialogue(req: DialogueRequest) -> dict:
        """
        Synthesizes each speaker segment, measures timings, and assembles the master audio track.
        """
        segment_results = []
        master_audio_bytes = bytearray()
        
        # Simple MP3 silence padding frame (~150ms of silence)
        silence_frame = b"\xff\xfb\x90d\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00" * 8

        total_start = time.perf_counter()

        for idx, segment in enumerate(req.segments):
            synth_req = SynthesizeRequest(
                text=segment.text,
                voice=segment.voice,
                engine=segment.engine,
                speed=segment.speed,
                format=req.format
            )
            audio_bytes, latency = await engine_manager.synthesize(synth_req)
            
            segment_results.append({
                "index": idx,
                "speaker": segment.speaker,
                "engine": segment.engine,
                "voice": segment.voice,
                "text": segment.text,
                "latency_ms": round(latency, 1),
                "byte_length": len(audio_bytes)
            })

            # Append segment to master
            master_audio_bytes.extend(audio_bytes)
            # Add inter-segment pause
            if idx < len(req.segments) - 1 and req.pause_ms > 0:
                master_audio_bytes.extend(silence_frame * (req.pause_ms // 100))

        total_latency_ms = round((time.perf_counter() - total_start) * 1000.0, 1)

        return {
            "title": req.title,
            "segments": segment_results,
            "total_latency_ms": total_latency_ms,
            "master_audio_bytes": bytes(master_audio_bytes)
        }
