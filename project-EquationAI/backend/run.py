"""
EquationAI — Application Entry Point
Run with: python run.py
"""

import uvicorn
from app.config import get_settings


def main():
    settings = get_settings()
    print(f"\nEquationAI v{settings.APP_VERSION}")
    print(f"Environment: {settings.FASTAPI_ENV}")
    print(f"Server: http://{settings.BACKEND_HOST}:{settings.BACKEND_PORT}")
    print(f"Docs: http://localhost:{settings.BACKEND_PORT}/docs")
    print(f"ReDoc: http://localhost:{settings.BACKEND_PORT}/redoc")
    print()

    uvicorn.run(
        "app.main:app",
        host=settings.BACKEND_HOST,
        port=settings.BACKEND_PORT,
        reload=settings.is_development,
        log_level=settings.LOG_LEVEL.lower(),
    )


if __name__ == "__main__":
    main()
