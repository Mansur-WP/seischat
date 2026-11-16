"""Shared test configuration."""

import os

os.environ.setdefault("DATABASE_URL", "sqlite+pysqlite:///:memory:")
os.environ.setdefault("APP_ENVIRONMENT", "test")

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.database.base import Base
from app.database.connection import SessionLocal, engine, get_db
from app.models import Message, Session, User

Base.metadata.create_all(engine)


def override_get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db


@pytest.fixture
def client() -> TestClient:
    """Create a test client backed by an in-memory database."""

    return TestClient(app)


@pytest.fixture(autouse=True)
def clear_database():
    yield
    with SessionLocal() as db:
        for table in (Message, Session, User):
            db.query(table).delete()
        db.commit()
