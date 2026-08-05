import os
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException
from routers import auth, workers, rooms, students, payments, reports

# Allowed origins for CORS. Override via the ALLOWED_ORIGINS env var
# (comma-separated). Defaults to "*" for hassle-free deployment; restrict
# this in production.
_allowed_origins_env = os.getenv("ALLOWED_ORIGINS", "*")
_allowed_origins = (
    [o.strip() for o in _allowed_origins_env.split(",") if o.strip()]
    if _allowed_origins_env != "*"
    else ["*"]
)

app = FastAPI(
    title="PG Management System API",
    description=(
        "Production-ready FastAPI backend for PG (Hostel) Management System "
        "integrated with Supabase PostgreSQL and JWT Auth."
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(auth.router)
app.include_router(workers.router)
app.include_router(rooms.router)
app.include_router(students.router)
app.include_router(payments.router)
app.include_router(reports.router)


@app.get("/", tags=["Health Check"])
def root():
    """Root health check endpoint."""
    return {
        "status": "online",
        "message": "PG Management System API is running successfully!",
        "documentation": "/docs",
    }


@app.get("/health", tags=["Health Check"])
def health():
    """Liveness probe for deployment platforms."""
    return {"status": "ok"}


@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    """Uniform JSON error response shape across the API."""
    # Surface request path/method in logs when an error is raised.
    print(f"[error] {request.method} {request.url.path} -> {exc.status_code}: {exc.detail}")
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
        headers=exc.headers,
    )


if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", "8000"))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=os.getenv("DEV", "0") == "1")
