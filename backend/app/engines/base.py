from abc import ABC, abstractmethod
from typing import Optional
from backend.app.models.schemas import VoiceInfo

class BaseTTSEngine(ABC):
    id: str
    name: str
    description: str
    hardware_tier: str
    latency_tier: str
    supports_cloning: bool = False
    
    @abstractmethod
    async def is_available(self) -> bool:
        """Check if engine runtime or microservice is available."""
        pass
        
    @abstractmethod
    async def get_voices(self) -> list[VoiceInfo]:
        """Return list of supported voices for this engine."""
        pass
        
    @abstractmethod
    async def synthesize(
        self,
        text: str,
        voice: str,
        speed: float = 1.0,
        pitch: float = 0.0,
        format: str = "mp3",
        reference_audio: Optional[bytes] = None,
        **kwargs
    ) -> bytes:
        """Synthesize text into raw audio bytes."""
        pass
