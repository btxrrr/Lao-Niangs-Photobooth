"""
Tests for /auth/* endpoints.
Run with:  pytest tests/test_auth.py -v
"""
import pytest


REGISTER = {
    "email": "auth_test@photobooth.com",
    "username": "auth_tester",
    "password": "Secure123",
}


# ──────────────────────────────────────────────
# Registration
# ──────────────────────────────────────────────

def test_register_success(client):
    from app import models
    from tests.conftest import TestingSessionLocal
    db = TestingSessionLocal()
    db.query(models.User).filter(models.User.email == REGISTER["email"]).delete()
    db.commit(); db.close()

    r = client.post("/auth/register", json=REGISTER)
    assert r.status_code == 201
    body = r.json()
    assert body["email"] == REGISTER["email"]
    assert body["username"] == REGISTER["username"]
    assert "hashed_password" not in body   # never expose the hash


def test_register_duplicate_email(client):
    client.post("/auth/register", json=REGISTER)   # first (may already exist)
    r = client.post("/auth/register", json=REGISTER)
    assert r.status_code == 400
    assert "email" in r.json()["detail"].lower()


def test_register_weak_password(client):
    r = client.post(
        "/auth/register",
        json={**REGISTER, "email": "weak@test.com", "username": "weakuser", "password": "nouppercase1"},
    )
    assert r.status_code == 422


def test_register_invalid_email(client):
    r = client.post(
        "/auth/register",
        json={**REGISTER, "email": "not-an-email"},
    )
    assert r.status_code == 422


def test_register_username_special_chars(client):
    r = client.post(
        "/auth/register",
        json={**REGISTER, "email": "special@test.com", "username": "bad user!"},
    )
    assert r.status_code == 422


# ──────────────────────────────────────────────
# Login
# ──────────────────────────────────────────────

def _ensure_user(client):
    """Register REGISTER user, ignoring 400 if already exists."""
    client.post("/auth/register", json=REGISTER)


def test_login_success(client):
    _ensure_user(client)
    r = client.post("/auth/login", json={"email": REGISTER["email"], "password": REGISTER["password"]})
    assert r.status_code == 200
    body = r.json()
    assert "access_token" in body
    assert body["token_type"] == "bearer"
    assert body["user"]["email"] == REGISTER["email"]


def test_login_wrong_password(client):
    _ensure_user(client)
    r = client.post("/auth/login", json={"email": REGISTER["email"], "password": "WrongPass1"})
    assert r.status_code == 401


def test_login_unknown_email(client):
    r = client.post("/auth/login", json={"email": "nobody@nowhere.com", "password": "Whatever1"})
    assert r.status_code == 401


# ──────────────────────────────────────────────
# /auth/me
# ──────────────────────────────────────────────

def test_me_authenticated(client, auth_headers):
    r = client.get("/auth/me", headers=auth_headers)
    assert r.status_code == 200
    assert "email" in r.json()


def test_me_unauthenticated(client):
    r = client.get("/auth/me")
    assert r.status_code == 401


def test_me_bad_token(client):
    r = client.get("/auth/me", headers={"Authorization": "Bearer this.is.garbage"})
    assert r.status_code == 401


# ──────────────────────────────────────────────
# Logout
# ──────────────────────────────────────────────

def test_logout(client, auth_headers):
    r = client.post("/auth/logout", headers=auth_headers)
    assert r.status_code == 200
    assert "message" in r.json()


# ──────────────────────────────────────────────
# Password reset
# ──────────────────────────────────────────────

def test_request_password_reset_known_email(client, registered_user):
    r = client.post("/auth/request-password-reset", json={"email": registered_user["email"]})
    assert r.status_code == 200
    assert "message" in r.json()


def test_request_password_reset_unknown_email(client):
    # Should still return 200 to prevent user enumeration
    r = client.post("/auth/request-password-reset", json={"email": "ghost@nowhere.com"})
    assert r.status_code == 200


def test_reset_password_invalid_token(client):
    r = client.post(
        "/auth/reset-password",
        json={"token": "not-a-real-token", "new_password": "NewSecure1"},
    )
    assert r.status_code == 400


def test_reset_password_full_flow(client, registered_user):
    """Happy path: request token → fetch from DB → use it."""
    from app import models
    from tests.conftest import TestingSessionLocal

    # Trigger token generation
    client.post("/auth/request-password-reset", json={"email": registered_user["email"]})

    # Read token directly from the test DB
    db = TestingSessionLocal()
    user = db.query(models.User).filter(models.User.id == registered_user["id"]).first()
    token = user.reset_token
    db.close()

    assert token is not None

    # Use the token to reset
    r = client.post(
        "/auth/reset-password",
        json={"token": token, "new_password": "BrandNew9"},
    )
    assert r.status_code == 200

    # Old password should no longer work
    r2 = client.post(
        "/auth/login",
        json={"email": registered_user["email"], "password": "Secure123"},
    )
    assert r2.status_code == 401

    # New password should work
    r3 = client.post(
        "/auth/login",
        json={"email": registered_user["email"], "password": "BrandNew9"},
    )
    assert r3.status_code == 200
