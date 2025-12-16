from contextlib import asynccontextmanager
import logging
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.core.config import settings
from app.api.router import api_router
from app.services.rag import initialize_rag

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events."""
    # Startup
    logger.info("Starting application...")
    try:
        logger.info("Initializing RAG service...")
        initialize_rag()
        logger.info("RAG service initialization complete.")
    except Exception as e:
        logger.warning(f"RAG initialization failed (non-critical): {e}")
        # Continue anyway - RAG is optional
    logger.info("Application started successfully.")
    yield
    # Shutdown
    logger.info("Shutting down application...")


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="探究学習日記アプリ API - 生徒の探究学習の進捗を記録し、評価をサポートするアプリケーション",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# CORS middleware
logger.info(f"CORS_ORIGINS configured: {settings.CORS_ORIGINS}")
origins = settings.CORS_ORIGINS if isinstance(settings.CORS_ORIGINS, list) else [settings.CORS_ORIGINS]
# Common local dev ports (vite:5173, CRA:3000-3002) and loopback variants
origins = list({
    *origins,
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:3002",
    "http://localhost:5173",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3001",
    "http://127.0.0.1:3002",
    "http://127.0.0.1:5173",
})
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    # Allow Azure static hosting origins (dev/prod) without hardcoding every hostname
    allow_origin_regex=r"https://.*\.azurewebsites\.net",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API router
app.include_router(api_router, prefix="/api")


# Mount static files
if not os.path.exists("static"):
    os.makedirs("static")
app.mount("/static", StaticFiles(directory="static"), name="static")


@app.get("/")
async def root():
    """Health check endpoint."""
    return {
        "message": "探究学習日記アプリ API",
        "version": settings.APP_VERSION,
        "docs": "/docs",
    }


@app.get("/health")
async def health_check():
    """Health check endpoint for monitoring."""
    return {"status": "healthy"}
