# PhotoBooth Backend — Milestone 1

FastAPI + SQLAlchemy backend for the Orbital 26 photo booth application.

## Structure

```
backend/
├── app/
│   ├── main.py          # FastAPI app, CORS, routers
│   ├── config.py        # Settings loaded from .env
│   ├── database.py      # SQLAlchemy engine + session
│   ├── models.py        # ORM models (User, Capture)
│   ├── schemas.py       # Pydantic request/response schemas
│   ├── auth.py          # Password hashing + JWT helpers
│   ├── dependencies.py  # get_current_user FastAPI dependency
│   ├── utils.py         # File save/delete helpers
│   ├── routes/
│   │   ├── auth_routes.py     # /auth/*
│   │   └── capture_routes.py  # /captures/*
│   └── uploads/         # Stored images (git-ignored)
└── tests/
    ├── conftest.py
    ├── test_auth.py
    └── test_captures.py
```

## Quick Start

```bash
cd backend

# 1. Create virtual environment
python -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate

# 2. Install dependencies
pip install -r requirements.txt

# 3. Configure environment
cp .env.example .env
# Edit .env — set DATABASE_URL and SECRET_KEY at minimum

# 4. Run the server
uvicorn app.main:app --reload

# 5. Open docs
# http://localhost:8000/docs   (Swagger UI)
# http://localhost:8000/redoc  (ReDoc)
```

## API Endpoints

### Auth
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/register` | — | Create account |
| POST | `/auth/login` | — | Get JWT token |
| GET | `/auth/me` | ✓ | Current user profile |
| POST | `/auth/logout` | ✓ | Logout (stateless) |
| POST | `/auth/request-password-reset` | — | Send reset token |
| POST | `/auth/reset-password` | — | Apply new password |

### Captures
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/captures/` | ✓ | Upload image |
| GET | `/captures/` | ✓ | List my captures |
| GET | `/captures/{id}` | ✓ | Get capture metadata |
| GET | `/captures/{id}/image` | ✓ | Serve image file |
| DELETE | `/captures/{id}` | ✓ | Delete capture |

## Running Tests

```bash
# Uses in-memory SQLite — no Postgres needed for tests
# DISABLE_RATE_LIMIT=1 prevents login rate-limit from tripping in rapid test loops
DISABLE_RATE_LIMIT=1 pytest -v
```

## Milestone 2+ Notes

- **Token blacklisting**: Add a `revoked_tokens` table or Redis set, check in `get_current_user`.
- **Email sending**: Replace the `print()` in `request_password_reset` with a real mailer (SendGrid, SMTP).
- **Cloud storage**: Replace `save_upload()` in `utils.py` with a Cloudinary/S3 upload helper.
- **Alembic migrations**: Replace `Base.metadata.create_all()` in `main.py` with `alembic upgrade head`.
