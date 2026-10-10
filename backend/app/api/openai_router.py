from fastapi import APIRouter, Response, HTTPException
from backend.app.models.schemas import OpenAISpeechRequest, SynthesizeRequest
from backend.app.engines.manager import engine_manager

router = APIRouter(tags=["OpenAI Speech Standard"])

OPENAI_VOICE_MAP = {
    "alloy": ("kokoro", "af_heart"),
    "echo": ("kokoro", "am_echo"),
    "fable": ("kokoro", "bf_alice"),
    "onyx": ("kokoro", "am_onyx"),
    "nova": ("kokoro", "af_nova"),
    "shimmer": ("kokoro", "af_bella")
}

@router.post("/v1/audio/speech", summary="OpenAI-compatible Speech Synthesis")
async def openai_speech(req: OpenAISpeechRequest):
    """
    Drop-in replacement for OpenAI's POST https://api.openai.com/v1/audio/speech.
    Works directly with Open WebUI, LibreChat, Obsidian, Home Assistant, and OpenAI SDKs.
    """
    voice_key = req.voice.lower()
    
    # Check if requested voice is one of standard OpenAI voices
    if voice_key in OPENAI_VOICE_MAP:
        engine_id, internal_voice = OPENAI_VOICE_MAP[voice_key]
    else:
        # Check if model has engine prefix (e.g., voxpulse-piper)
        if "piper" in req.model.lower():
            engine_id = "piper"
        elif "xtts" in req.model.lower():
            engine_id = "xtts"
        elif "f5" in req.model.lower():
            engine_id = "f5"
        else:
            engine_id = "kokoro"
        internal_voice = req.voice

    synth_req = SynthesizeRequest(
        text=req.input,
        voice=internal_voice,
        engine=engine_id,
        speed=req.speed,
        format="mp3" if req.response_format in ["mp3", "aac", "opus"] else "wav"
    )

    try:
        audio_bytes, latency = await engine_manager.synthesize(synth_req)
        media_type = "audio/mpeg" if synth_req.format == "mp3" else "audio/wav"
        
        return Response(
            content=audio_bytes,
            media_type=media_type,
            headers={
                "X-VoxPulse-Engine": engine_id,
                "X-VoxPulse-Voice": internal_voice,
                "X-VoxPulse-Latency-Ms": f"{latency:.1f}"
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Synthesis failed: {str(e)}")

@router.get("/v1/models", summary="OpenAI-compatible Models List")
async def list_models():
    return {
        "object": "list",
        "data": [
            {"id": "tts-1", "object": "model", "owned_by": "voxpulse"},
            {"id": "tts-1-hd", "object": "model", "owned_by": "voxpulse"},
            {"id": "voxpulse-kokoro", "object": "model", "owned_by": "voxpulse"},
            {"id": "voxpulse-piper", "object": "model", "owned_by": "voxpulse"},
            {"id": "voxpulse-edge", "object": "model", "owned_by": "voxpulse"},
            {"id": "voxpulse-xtts", "object": "model", "owned_by": "voxpulse"},
            {"id": "voxpulse-f5", "object": "model", "owned_by": "voxpulse"}
        ]
    }
