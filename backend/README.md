# Lao Niangs Photo Booth Backend

## What This Service Handles

- JWT authentication and user profile endpoints
- Media upload/list/read/delete for captures
- Gesture GIF stitching from 4 video clips
- WebM to MP4 conversion endpoint for Smart Frame Studio
- Pose reference upload/list/image/delete
- Sticker export for WhatsApp ZIP and Telegram publishing

## Setup

1. Create and activate a virtual environment

```bash
python -m venv venv
venv\Scripts\activate
```

2. Install dependencies

```bash
pip install "pydantic[email]" -r requirements.txt
```

3. Create environment file

```bash
copy .env.example .env
```

4. Run API

```bash
uvicorn app.main:app --reload
```

API base URL: http://localhost:8000
Swagger docs: http://localhost:8000/docs

## Environment Variables

Required for all environments:

- DATABASE_URL: PostgreSQL URL used by SQLAlchemy at startup
- SECRET_KEY: JWT signing secret

Optional with sensible defaults:

- ALGORITHM: JWT algorithm, default HS256
- ACCESS_TOKEN_EXPIRE_MINUTES
- RESET_TOKEN_EXPIRE_MINUTES
- UPLOAD_DIR
- MAX_FILE_SIZE_MB
- ALLOWED_ORIGINS: comma-separated origins for CORS

Optional for Telegram sticker export:

- TELEGRAM_BOT_TOKEN
- TELEGRAM_BOT_USERNAME

Deployment notes:

- Do not commit .env.
- Commit .env.example only.
- Configure real values in your host's environment variable dashboard.

## Endpoint Summary

Auth:

- POST /auth/register
- POST /auth/login
- GET /auth/me
- POST /auth/logout
- POST /auth/request-password-reset
- POST /auth/reset-password

Captures:

- POST /captures/
- GET /captures/
- GET /captures/{id}
- GET /captures/{id}/image
- DELETE /captures/{id}

GIF and video:

- POST /clips/stitch
- GET /media/gifs/{filename}
- POST /clips/convert-mp4

Pose references:

- POST /poses/
- GET /poses/
- GET /poses/{pose_id}/image
- DELETE /poses/{pose_id}

Sticker export:

- POST /stickers/export
- GET /stickers/artifacts/{user_id}/{filename}

System:

- GET /health

## Common Startup Errors

Error: ModuleNotFoundError: No module named app

- Cause: Started uvicorn from repo root.
- Fix: run from backend folder, or use --app-dir backend.

Error: psycopg2 OperationalError connection refused on localhost:5432

- Cause: DATABASE_URL points to local Postgres, but DB is not running.
- Fix: start Postgres or switch DATABASE_URL to a live hosted Postgres instance.

## Tests

```bash
set DISABLE_RATE_LIMIT=1 && pytest -v
```
