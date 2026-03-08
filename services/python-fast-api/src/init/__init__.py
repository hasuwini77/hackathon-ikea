"""Centralized initialization and deinitialization for the API."""

from fastapi import FastAPI
from utils import log

logger = log.get_logger(__name__)


async def init(app: FastAPI) -> None:
    """Initialize all components during app startup."""
    # Initialize database
    try:
        from init.database import init_db
        init_db()
        logger.info("Database initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize database: {e}")


async def deinit(app: FastAPI) -> None:
    """Deinitialize all components during app shutdown."""
    pass
