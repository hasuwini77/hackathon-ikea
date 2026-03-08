"""Database initialization and session management."""

from sqlmodel import create_engine, SQLModel, Session
from typing import Generator
import os

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://localhost/ikea")

engine = create_engine(DATABASE_URL, echo=False)


def init_db() -> None:
    """Initialize the database by creating all tables."""
    SQLModel.metadata.create_all(engine)


def get_session() -> Generator[Session, None, None]:
    """Get a database session.

    Yields:
        Session: SQLModel session for database operations
    """
    with Session(engine) as session:
        yield session
