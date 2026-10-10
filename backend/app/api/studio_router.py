import base64
from fastapi import APIRouter, Response, HTTPException, Query
from backend.app.models.schemas import SynthesizeRequest, DialogueRequest, CompareRequest
from backend.app.engines.manager import engine_manager
from backend.app.services.dialogue_builder import DialogueService

router = APIRouter(prefix="/api", tags=["Studio Operations"])

@router.post("/synthesize", summary="Synthesize speech with studio controls")
async def synthesize_speech(req: SynthesizeRequest, return_json: bool = Query(default=False)):
    try:
        audio_bytes, latency = await engine_manager.synthesize(req)
        
        if return_json:
            return {
                "engine": req.engine,
                "voice": req.voice,
                "latency_ms": round(latency, 1),
                "format": req.format,
                "byte_size": len(audio_bytes),
                "audio_base64": base64.b64encode(audio_bytes).decode("utf-8")
            }

        media_type = "audio/mpeg" if req.format == "mp3" else "audio/wav"
        return Response(
            content=audio_bytes,
            media_type=media_type,
            headers={
                "X-VoxPulse-Engine": req.engine or "kokoro",
                "X-VoxPulse-Voice": req.voice or "default",
                "X-VoxPulse-Latency-Ms": f"{latency:.1f}"
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/compare", summary="Compare multiple engines on the same text")
async def compare_engines(req: CompareRequest):
    try:
        results = await engine_manager.compare(req.text, req.engines)
        return {
            "text": req.text,
            "comparisons": results
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/dialogue", summary="Assemble multi-speaker dialogue script")
async def build_dialogue(req: DialogueRequest, return_json: bool = Query(default=False)):
    try:
        result = await DialogueService.generate_dialogue(req)
        
        if return_json:
            return {
                "title": result["title"],
                "segments": result["segments"],
                "total_latency_ms": result["total_latency_ms"],
                "audio_base64": base64.b64encode(result["master_audio_bytes"]).decode("utf-8")
            }

        media_type = "audio/mpeg" if req.format == "mp3" else "audio/wav"
        return Response(
            content=result["master_audio_bytes"],
            media_type=media_type,
            headers={
                "X-VoxPulse-Segments": str(len(req.segments)),
                "X-VoxPulse-Total-Latency-Ms": f"{result['total_latency_ms']:.1f}"
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
