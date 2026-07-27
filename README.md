# Lao Niangs Photobooth

A web-based AI-powered photo booth built with React + FastAPI. Users can capture media with gesture controls, curate memories, compose frame designs, and export content to social sticker formats.

## Features

- User authentication: register, login, logout, profile, password reset flow
- Gesture photo booth: open-palm trigger, countdown capture, and save to archive
- Pose Assistant: built-in pose references and custom pose reference uploads by shot type
- Gesture GIF mode: record 4 clips, reorder, restitch into a looping GIF
- Smart Frame Studio: layered canvas editor with backgrounds, frames, stickers, image/GIF support, and story layouts
- Video conversion pipeline: WebM to MP4 backend conversion for browser compatibility
- Sticker pack export: WhatsApp ZIP generation and Telegram sticker pack publishing
- Personal archive: per-user media listing, download, and deletion

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React, Vite |
| Backend | FastAPI, SQLAlchemy |
| Database | PostgreSQL |
| Auth | JWT, bcrypt/passlib |
| CV + Media | MediaPipe, OpenCV, Pillow, PyAV |

## Project Structure

```
Lao-Niangs-Photobooth/
├── frontend-themed 5/     # React + Vite frontend
└── backend/               # FastAPI backend
```

## Local Setup

Prerequisites:

- Node.js 18+
- Python 3.9+

1. Install frontend dependencies

```bash
cd "frontend-themed 5"
npm install
```

2. Install backend dependencies

```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install "pydantic[email]" -r requirements.txt
```

3. Configure backend environment

```bash
copy .env.example .env
```

Then update .env with real values (never commit secrets).

4. Run backend

```bash
cd backend
uvicorn app.main:app --reload
```

Backend: http://localhost:8000

5. Run frontend

```bash
cd "frontend-themed 5"
npm run dev
```

Frontend: http://localhost:5173

## Deployment Environment Variables

Set these in your hosting platform secret manager (do not commit real values):

Backend variables:

- DATABASE_URL: PostgreSQL connection string
- SECRET_KEY: JWT signing secret
- ALGORITHM: JWT algorithm (default HS256)
- ACCESS_TOKEN_EXPIRE_MINUTES
- RESET_TOKEN_EXPIRE_MINUTES
- UPLOAD_DIR
- MAX_FILE_SIZE_MB
- ALLOWED_ORIGINS: comma-separated frontend origins
- TELEGRAM_BOT_TOKEN: required only for Telegram sticker publishing
- TELEGRAM_BOT_USERNAME: required only for Telegram sticker publishing

Frontend variables:

- This repository currently hardcodes the backend base URL in frontend API files.
- Before production deploy, update frontend base URL values from localhost to your deployed backend URL.

## Security Notes

- Commit .env.example only.
- Keep .env local and untracked.
- If any secret was exposed previously, rotate it immediately.

## Team

Lao Niangs - NUS Orbital AY2025/26 (Apollo 11)

| Member | Role |
|---|---|
| Jamie Lim | Frontend |
| Bernice Tan | Backend |
