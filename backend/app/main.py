from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.openapi.utils import get_openapi
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from app.config import get_settings
from app.database import Base, engine
from app.routes import auth_routes, capture_routes

settings = get_settings()

# ──────────────────────────────────────────────
# Rate limiter
# ──────────────────────────────────────────────
limiter = Limiter(key_func=get_remote_address)

# ──────────────────────────────────────────────
# App
# ──────────────────────────────────────────────
app = FastAPI(
    title="PhotoBooth API",
    description="Backend for the Orbital 26 web-based photo booth application",
    version="0.1.0",
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ──────────────────────────────────────────────
# CORS
# ──────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ──────────────────────────────────────────────
# Routers
# ──────────────────────────────────────────────
app.include_router(auth_routes.router)
app.include_router(capture_routes.router)


# ──────────────────────────────────────────────
# Custom OpenAPI — adds a plain Bearer token box to Swagger UI
# so you don't have to deal with the confusing OAuth2 form
# ──────────────────────────────────────────────
def custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema
    schema = get_openapi(
        title=app.title,
        version=app.version,
        description=app.description,
        routes=app.routes,
    )
    schema.setdefault("components", {})
    schema["components"]["securitySchemes"] = {
        "BearerAuth": {
            "type": "http",
            "scheme": "bearer",
            "bearerFormat": "JWT",
            "description": "Paste your token from POST /auth/login (no 'Bearer' prefix needed)",
        }
    }
    for path in schema.get("paths", {}).values():
        for operation in path.values():
            if isinstance(operation, dict) and operation.get("security"):
                operation["security"] = [{"BearerAuth": []}]
    app.openapi_schema = schema
    return schema


app.openapi = custom_openapi


# ──────────────────────────────────────────────
# Startup — create DB tables
# ──────────────────────────────────────────────
@app.on_event("startup")
def on_startup():
    """Create all tables on startup (Milestone 1). Replace with Alembic in Milestone 2.
    Skipped automatically when DATABASE_URL is a SQLite test DB (controlled by conftest)."""
    if "sqlite" not in settings.database_url:
        Base.metadata.create_all(bind=engine)


# ──────────────────────────────────────────────
# Health check
# ──────────────────────────────────────────────
@app.get("/health", tags=["health"])
def health():
    return {"status": "ok", "version": app.version}


# ──────────────────────────────────────────────
# Global exception handler (don't leak internals)
# ──────────────────────────────────────────────
@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"detail": "An internal server error occurred"},
    )
