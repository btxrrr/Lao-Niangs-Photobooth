# Lao Niangs Photo Booth — Backend

## Folder structure

```
backend/
├── .env                  ← YOUR secrets (never share or commit this)
├── .env.example          ← template — copy to .env and fill in
├── requirements.txt      ← all Python dependencies
├── media/
│   └── gifs/             ← generated GIFs saved here automatically
├── app/
│   ├── __init__.py
│   ├── main.py           ← FastAPI app entry point
│   ├── config.py         ← reads settings from .env
│   ├── database.py       ← PostgreSQL connection
│   ├── models.py         ← database tables (User, Capture)
│   ├── schemas.py        ← request/response validation
│   ├── auth.py           ← password hashing + JWT tokens
│   ├── dependencies.py   ← get_current_user (JWT check)
│   ├── utils.py          ← file upload helpers
│   ├── uploads/          ← saved photos stored here
│   └── routes/
│       ├── __init__.py
│       ├── auth_routes.py     ← /auth/*
│       ├── capture_routes.py  ← /captures/*
│       └── gif_routes.py      ← /clips/stitch + /media/gifs/*
```

## First-time setup

### Step 1 — Create virtual environment
```
python -m venv venv
```

### Step 2 — Activate it
Windows:
```
venv\Scripts\activate
```
Mac/Linux:
```
source venv/bin/activate
```

### Step 3 — Install dependencies
```
pip install "pydantic[email]" -r requirements.txt
```

### Step 4 — Create your .env file
```
copy .env.example .env
```
Then open .env in Notepad and fill in:
- DATABASE_URL → your Neon connection string (get it from neon.tech)
- SECRET_KEY   → any long random string e.g. mysecretkey123abc!

### Step 5 — Run the server
```
uvicorn app.main:app --reload
```

Server runs at: http://localhost:8000
API docs at:    http://localhost:8000/docs

## All endpoints

### Auth
| Method | Path | Auth required | What it does |
|--------|------|---------------|--------------|
| POST | /auth/register | No | Create account |
| POST | /auth/login | No | Get JWT token |
| GET | /auth/me | Yes | Get logged-in user |
| POST | /auth/logout | Yes | Log out |
| POST | /auth/request-password-reset | No | Generate reset token |
| POST | /auth/reset-password | No | Apply new password |

### Captures (photos)
| Method | Path | Auth required | What it does |
|--------|------|---------------|--------------|
| POST | /captures/ | Yes | Upload a photo |
| GET | /captures/ | Yes | List all my photos |
| GET | /captures/{id} | Yes | Get photo metadata |
| GET | /captures/{id}/image | Yes | Download the photo file |
| DELETE | /captures/{id} | Yes | Delete a photo |

### GIF
| Method | Path | Auth required | What it does |
|--------|------|---------------|--------------|
| POST | /clips/stitch | Yes | Send 4 clips, get back a GIF |
| GET | /media/gifs/{filename} | Yes | Download a generated GIF |

## Password reset flow (development)
1. Call POST /auth/request-password-reset with the email
2. Check your backend terminal — it prints the full reset URL:
   http://localhost:5173/reset-password?token=abc123...
3. Open that URL in the browser
4. Enter new password

## Running tests (no Postgres needed)
```
set DISABLE_RATE_LIMIT=1 && pytest -v
```
