import os
from pathlib import Path
from pydantic import BaseModel

class Settings(BaseModel):
    app_name: str = "VoxPulse Studio"
    version: str = "1.0.0"
    host: str = os.getenv("HOST", "0.0.0.0")
    port: int = int(os.getenv("PORT", "8000"))
    
    # Storage paths
    base_dir: Path = Path(__file__).resolve().parent.parent.parent
    storage_dir: Path = base_dir / "storage"
    cache_dir: Path = storage_dir / "cache"
    output_dir: Path = storage_dir / "outputs"
    
    # Engine defaults
    default_engine: str = os.getenv("DEFAULT_ENGINE", "kokoro")
    default_voice: str = os.getenv("DEFAULT_VOICE", "af_heart")
    
    # External adapter microservice endpoints (optional profiles)
    xtts_api_url: str = os.getenv("XTTS_API_URL", "http://xtts:8020")
    f5_api_url: str = os.getenv("F5_API_URL", "http://f5tts:9998")
    chattts_api_url: str = os.getenv("CHATTTS_API_URL", "http://chattts:8050")
    zonos_api_url: str = os.getenv("ZONOS_API_URL", "http://zonos:1919")
    cosyvoice_api_url: str = os.getenv("COSYVOICE_API_URL", "http://cosyvoice:9233")
    
    # CORS
    cors_origins: list[str] = ["*"]

settings = Settings()

# Ensure directories exist
settings.storage_dir.mkdir(parents=True, exist_ok=True)
settings.cache_dir.mkdir(parents=True, exist_ok=True)
settings.output_dir.mkdir(parents=True, exist_ok=True)
