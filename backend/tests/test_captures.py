"""
Tests for /captures/* endpoints.
Run with:  pytest tests/test_captures.py -v
"""
import io
import pytest
from PIL import Image


def _make_jpeg_bytes(width: int = 100, height: int = 100) -> bytes:
    """Create a minimal in-memory JPEG for upload tests."""
    buf = io.BytesIO()
    Image.new("RGB", (width, height), color=(255, 0, 0)).save(buf, format="JPEG")
    return buf.getvalue()


def _upload(client, auth_headers, image_bytes=None, extra_data=None):
    img = image_bytes or _make_jpeg_bytes()
    files = {"file": ("photo.jpg", img, "image/jpeg")}
    data = extra_data or {}
    return client.post("/captures/", files=files, data=data, headers=auth_headers)


# ──────────────────────────────────────────────
# Upload
# ──────────────────────────────────────────────

def test_upload_success(client, auth_headers):
    r = _upload(client, auth_headers)
    assert r.status_code == 201
    body = r.json()
    assert "id" in body
    assert body["content_type"] == "image/jpeg"


def test_upload_with_caption_and_frame(client, auth_headers):
    r = _upload(client, auth_headers, extra_data={"caption": "Hello!", "frame_style": "retro"})
    assert r.status_code == 201
    body = r.json()
    assert body["caption"] == "Hello!"
    assert body["frame_style"] == "retro"


def test_upload_requires_auth(client):
    img = _make_jpeg_bytes()
    r = client.post("/captures/", files={"file": ("photo.jpg", img, "image/jpeg")})
    assert r.status_code == 401


def test_upload_rejects_non_image(client, auth_headers):
    files = {"file": ("doc.pdf", b"%PDF-fake", "application/pdf")}
    r = client.post("/captures/", files=files, headers=auth_headers)
    assert r.status_code == 400


# ──────────────────────────────────────────────
# Fetch metadata
# ──────────────────────────────────────────────

def test_get_capture(client, auth_headers):
    upload = _upload(client, auth_headers)
    capture_id = upload.json()["id"]

    r = client.get(f"/captures/{capture_id}", headers=auth_headers)
    assert r.status_code == 200
    assert r.json()["id"] == capture_id


def test_get_capture_not_found(client, auth_headers):
    r = client.get("/captures/99999", headers=auth_headers)
    assert r.status_code == 404


def test_get_capture_wrong_user(client, auth_headers):
    """A second user should not be able to access another user's capture."""
    from tests.conftest import TestingSessionLocal
    from app import models

    # Upload as original user
    upload = _upload(client, auth_headers)
    capture_id = upload.json()["id"]

    # Register & log in as a second user
    second = {"email": "second@test.com", "username": "second_user", "password": "Other456A"}
    db = TestingSessionLocal()
    db.query(models.User).filter(models.User.email == second["email"]).delete()
    db.commit(); db.close()

    client.post("/auth/register", json=second)
    login = client.post("/auth/login", json={"email": second["email"], "password": second["password"]})
    token2 = login.json()["access_token"]
    headers2 = {"Authorization": f"Bearer {token2}"}

    r = client.get(f"/captures/{capture_id}", headers=headers2)
    assert r.status_code == 403


# ──────────────────────────────────────────────
# List
# ──────────────────────────────────────────────

def test_list_captures(client, auth_headers):
    _upload(client, auth_headers)
    _upload(client, auth_headers)
    r = client.get("/captures/", headers=auth_headers)
    assert r.status_code == 200
    assert isinstance(r.json(), list)
    assert len(r.json()) >= 2


# ──────────────────────────────────────────────
# Delete
# ──────────────────────────────────────────────

def test_delete_capture(client, auth_headers):
    upload = _upload(client, auth_headers)
    capture_id = upload.json()["id"]

    r = client.delete(f"/captures/{capture_id}", headers=auth_headers)
    assert r.status_code == 200

    # Should be gone
    r2 = client.get(f"/captures/{capture_id}", headers=auth_headers)
    assert r2.status_code == 404


def test_delete_capture_wrong_user(client, auth_headers):
    upload = _upload(client, auth_headers)
    capture_id = upload.json()["id"]

    from tests.conftest import TestingSessionLocal
    from app import models
    third = {"email": "third@test.com", "username": "third_user", "password": "Third789B"}
    db = TestingSessionLocal()
    db.query(models.User).filter(models.User.email == third["email"]).delete()
    db.commit(); db.close()

    client.post("/auth/register", json=third)
    login = client.post("/auth/login", json={"email": third["email"], "password": third["password"]})
    headers3 = {"Authorization": f"Bearer {login.json()['access_token']}"}

    r = client.delete(f"/captures/{capture_id}", headers=headers3)
    assert r.status_code == 403
