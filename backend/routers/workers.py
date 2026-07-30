from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from supabase import Client
from database import get_db
from deps import get_current_worker
from auth import get_password_hash
from schemas import WorkerCreate, WorkerResponse

router = APIRouter(prefix="/workers", tags=["Workers"])


@router.get("", response_model=List[WorkerResponse], summary="List all workers")
def get_workers(
    db: Client = Depends(get_db),
    current_worker: WorkerResponse = Depends(get_current_worker)
):
    try:
        res = db.table("workers").select("*").order("id", desc=False).execute()
        return res.data
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch workers: {str(e)}"
        )


@router.post("", response_model=WorkerResponse, status_code=status.HTTP_201_CREATED, summary="Create new worker")
def create_worker(
    worker_in: WorkerCreate,
    db: Client = Depends(get_db),
    current_worker: WorkerResponse = Depends(get_current_worker)
):
    existing_username = db.table("workers").select("id").eq("username", worker_in.username).execute()
    if existing_username.data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username is already registered"
        )
    
    existing_email = db.table("workers").select("id").eq("email", worker_in.email).execute()
    if existing_email.data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email is already registered"
        )

    hashed_password = get_password_hash(worker_in.password)

    payload = {
        "username": worker_in.username,
        "password": hashed_password,
        "full_name": worker_in.full_name,
        "email": worker_in.email,
        "phone": worker_in.phone,
        "role": worker_in.role
    }

    try:
        res = db.table("workers").insert(payload).execute()
        if not res.data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to create worker record"
            )
        return res.data[0]
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error while creating worker: {str(e)}"
        )