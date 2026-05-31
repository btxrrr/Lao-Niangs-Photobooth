"""
Pytest configuration.

Strategy: patch app.database.engine and app.database.SessionLocal BEFORE
the app module is imported, so the test SQLite DB is used everywhere.
"""
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import app.database as _db_module

# ── 1. Build the test SQLite engine ──────────────────────────────────────────
TEST_DATABASE_URL = "sqlite:///./test.db"

test_engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

# ── 2. Monkey-patch the database module BEFORE anything imports it ────────────
_db_module.engine = test_engine
_db_module.SessionLocal = TestingSessionLocal


# ── 3. Create tables once per session ────────────────────────────────────────
@pytest.fixture(scope="session", autouse=True)
def setup_db():
    from app.database import Base
    Base.metadata.create_all(bind=test_engine)
    yield
    Base.metadata.drop_all(bind=test_engine)


# ── 4. Override get_db so routes use the test session ─────────────────────────
def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


# ── 5. Test client ────────────────────────────────────────────────────────────
@pytest.fixture()
def client(setup_db):
    from app.main import app
    from app.database import get_db
    app.dependency_overrides[get_db] = override_get_db
    from fastapi.testclient import TestClient
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


# ── 6. Convenience fixtures ───────────────────────────────────────────────────
REGISTER_PAYLOAD = {
    "email": "test@photobooth.com",
    "username": "testuser",
    "password": "Secure123",
}


@pytest.fixture()
def registered_user(client):
    db = TestingSessionLocal()
    from app import models
    db.query(models.User).filter(models.User.email == REGISTER_PAYLOAD["email"]).delete()
    db.commit()
    db.close()

    r = client.post("/auth/register", json=REGISTER_PAYLOAD)
    assert r.status_code == 201, r.json()
    return r.json()


@pytest.fixture()
def auth_headers(client, registered_user):
    r = client.post(
        "/auth/login",
        json={"email": REGISTER_PAYLOAD["email"], "password": REGISTER_PAYLOAD["password"]},
    )
    assert r.status_code == 200, r.json()
    token = r.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}
