from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from supabase import Client
from database import get_db
from auth import decode_access_token
from schemas import WorkerResponse

# Use HTTPBearer for simple, clean Bearer Token entry in Swagger UI
security = HTTPBearer()


def get_current_worker(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Client = Depends(get_db)
) -> WorkerResponse:
    """
    Dependency to validate JWT access token and return the currently authenticated worker.
    """
    token = credentials.credentials

    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    payload = decode_access_token(token)
    if payload is None:
        raise credentials_exception
    
    username: str = payload.get("sub")
    if username is None:
        raise credentials_exception

    # Query worker from Supabase database
    try:
        response = db.table("workers").select("*").eq("username", username).execute()
        if not response.data or len(response.data) == 0:
            raise credentials_exception
        
        worker_data = response.data[0]
        return WorkerResponse(**worker_data)
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database query error during authentication: {str(e)}"
        )