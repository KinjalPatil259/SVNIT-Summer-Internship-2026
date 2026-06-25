"""
EquationAI — Database Configuration
SQLAlchemy engine, session factory, and declarative Base.
"""

from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from app.config import get_settings

settings = get_settings()

# ── Engine Setup ──
# For SQLite: enable WAL mode and foreign keys for better concurrency
connect_args = {}
if settings.DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

engine = create_engine(
    settings.DATABASE_URL,
    connect_args=connect_args,
    echo=settings.is_development and False,  # Set True to debug SQL queries
    pool_pre_ping=True,
)

# Enable SQLite WAL mode and foreign keys
if settings.DATABASE_URL.startswith("sqlite"):
    @event.listens_for(engine, "connect")
    def _set_sqlite_pragma(dbapi_conn, connection_record):
        cursor = dbapi_conn.cursor()
        cursor.execute("PRAGMA journal_mode=WAL;")
        cursor.execute("PRAGMA foreign_keys=ON;")
        cursor.close()

# ── Session Factory ──
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


# ── Declarative Base ──
class Base(DeclarativeBase):
    pass


def get_db():
    """Dependency generator — yields a scoped database session per request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def create_tables():
    """Create all tables from registered models. Used on startup."""
    # Import models to register them with Base.metadata
    import app.models  # noqa: F401
    Base.metadata.create_all(bind=engine)
