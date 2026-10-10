from typing import Optional, Literal
from pydantic import BaseModel, Field

class OpenAISpeechRequest(BaseModel):
    model: str = Field(default="tts-1", description="Model ID e.g. tts-1, tts-1-hd, voxpulse-kokoro, voxpulse-piper")
    input: str = Field(..., description="Text content to synthesize into speech")
    voice: str = Field(default="alloy", description="Voice ID or standard OpenAI voice (alloy, echo, fable, onyx, nova, shimmer)")
    response_format: Literal["mp3", "opus", "aac", "flac", "wav", "pcm"] = Field(default="mp3")
    speed: float = Field(default=1.0, ge=0.25, le=4.0, description="Speech playback speed multiplier")

class SynthesizeRequest(BaseModel):
    text: str = Field(..., min_length=1, description="Text to synthesize")
    voice: Optional[str] = Field(default="af_heart", description="Target voice identifier")
    engine: Optional[str] = Field(default="kokoro", description="Target engine: kokoro, piper, edge, xtts, f5, chattts, zonos, cosyvoice")
    speed: float = Field(default=1.0, ge=0.5, le=2.5)
    pitch: float = Field(default=0.0, ge=-10.0, le=10.0)
    format: Literal["mp3", "wav", "ogg", "flac"] = Field(default="mp3")
    emotion: Optional[str] = Field(default=None, description="Emotional coloring if supported by engine")
    reference_audio_base64: Optional[str] = Field(default=None, description="Base64 encoded audio sample for zero-shot cloning")

class DialogueSegment(BaseModel):
    speaker: str = Field(default="Speaker 1")
    text: str = Field(..., min_length=1)
    engine: str = Field(default="kokoro")
    voice: str = Field(default="af_heart")
    speed: float = Field(default=1.0)

class DialogueRequest(BaseModel):
    title: str = Field(default="Dialogue Session")
    segments: list[DialogueSegment]
    format: Literal["mp3", "wav"] = Field(default="mp3")
    pause_ms: int = Field(default=400, ge=0, le=3000, description="Pause duration in ms between lines")

class VoiceInfo(BaseModel):
    id: str
    name: str
    engine: str
    gender: Literal["female", "male", "neutral"]
    language: str
    accent: Optional[str] = None
    description: Optional[str] = None

class EngineInfo(BaseModel):
    id: str
    name: str
    description: str
    hardware_tier: Literal["CPU/GPU Light", "GPU Recommended", "GPU Required"]
    latency_tier: Literal["Ultra-Fast (<80ms)", "Instant (<120ms)", "Natural (~300ms)", "Heavy"]
    supports_cloning: bool
    is_active: bool
    voice_count: int

class CompareRequest(BaseModel):
    text: str = Field(..., min_length=1)
    engines: list[str] = Field(default=["kokoro", "piper", "edge"])
    format: Literal["mp3", "wav"] = Field(default="mp3")

class HealthResponse(BaseModel):
    status: str
    app_name: str
    version: str
    active_engines: list[str]
    total_voices: int
