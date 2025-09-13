from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .settings import get_settings
from .utils.errors import register_exception_handlers
from .routers.health import router as health_router
from .routers.convert import router as convert_router
from .services.triposr_service import TripoSRService
from .services.image_service import ImageService
from .services.concurrency import init_inference_semaphore


def create_app() -> FastAPI:
    settings = get_settings()

    app = FastAPI(title="TripoSR Backend", version="0.1.0")

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    register_exception_handlers(app)

    # Routers
    app.include_router(health_router)
    app.include_router(convert_router)

    # Application state
    app.state.settings = settings
    app.state.triposr_service = TripoSRService(settings)
    app.state.image_service = ImageService(settings)
    init_inference_semaphore(settings.concurrent_jobs)

    @app.on_event("startup")
    async def on_startup() -> None:
        await app.state.image_service.initialize()
        await app.state.triposr_service.initialize()

    @app.on_event("shutdown")
    async def on_shutdown() -> None:
        await app.state.triposr_service.shutdown()

    return app


app = create_app()


