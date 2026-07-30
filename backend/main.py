from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import auth, workers, rooms, students, payments, reports

app = FastAPI(
    title="PG Management System API",
    description="Production-ready FastAPI backend for PG (Hostel) Management System integrated with Supabase PostgreSQL and JWT Auth.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Enable CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific frontend origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register APIRouters
app.include_router(auth.router)
app.include_router(workers.router)
app.include_router(rooms.router)
app.include_router(students.router)
app.include_router(payments.router)
app.include_router(reports.router)


@app.get("/", tags=["Health Check"])
def root():
    """
    Root health check endpoint.
    """
    return {
        "status": "online",
        "message": "PG Management System API is running successfully!",
        "documentation": "/docs"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)