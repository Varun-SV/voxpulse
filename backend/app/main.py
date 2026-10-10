import os
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from backend.app.config import settings
from backend.app.api.openai_router import router as openai_router
from backend.app.api.studio_router import router as studio_router
from backend.app.api.system_router import router as system_router

app = FastAPI(
    title=settings.app_name,
    version=settings.version,
    description="The Universal Open-Source Self-Hosted Text-to-Speech Platform & Studio",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API Routers
app.include_router(openai_router)
app.include_router(studio_router)
app.include_router(system_router)

# Mount frontend static directory
frontend_dir = settings.base_dir / "frontend"
if frontend_dir.exists():
    app.mount("/static", StaticFiles(directory=str(frontend_dir)), name="static")

    @app.get("/", include_in_schema=False)
    async def serve_index():
        index_file = frontend_dir / "index.html"
        if index_file.exists():
            return FileResponse(str(index_file))
        return {"status": "ok", "message": "VoxPulse Studio Backend Ready"}

# Mount assets directory for screenshots and brand images
assets_dir = settings.base_dir / "assets"
if assets_dir.exists():
    app.mount("/assets", StaticFiles(directory=str(assets_dir)), name="assets")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host=settings.host, port=settings.port, reload=True)
