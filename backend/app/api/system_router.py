from fastapi import APIRouter
from backend.app.config import settings
from backend.app.models.schemas import HealthResponse, EngineInfo, VoiceInfo
from backend.app.engines.manager import engine_manager

router = APIRouter(prefix="/api", tags=["System & Metadata"])

@router.get("/health", response_model=HealthResponse, summary="System health and status")
async def health_check():
    engines = await engine_manager.list_engines()
    active = [e.id for e in engines if e.is_active]
    voices = await engine_manager.list_all_voices()
    return HealthResponse(
        status="healthy",
        app_name=settings.app_name,
        version=settings.version,
        active_engines=active,
        total_voices=len(voices)
    )

@router.get("/engines", response_model=list[EngineInfo], summary="List all supported TTS engines")
async def get_engines():
    return await engine_manager.list_engines()

@router.get("/voices", response_model=list[VoiceInfo], summary="Catalog of available voices")
async def get_voices(engine: str = None, gender: str = None, lang: str = None):
    all_voices = await engine_manager.list_all_voices()
    filtered = all_voices
    if engine:
        filtered = [v for v in filtered if v.engine.lower() == engine.lower()]
    if gender:
        filtered = [v for v in filtered if v.gender.lower() == gender.lower()]
    if lang:
        filtered = [v for v in filtered if lang.lower() in v.language.lower()]
    return filtered
