import uvicorn
from backend.app.config import settings

if __name__ == "__main__":
    print(f"Starting {settings.app_name} on http://localhost:{settings.port}")
    uvicorn.run("backend.app.main:app", host=settings.host, port=settings.port, reload=False)
