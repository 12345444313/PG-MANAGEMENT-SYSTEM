from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from supabase import Client
from database import get_db
from deps import get_current_worker
from schemas import RoomCreate, RoomResponse, WorkerResponse

router = APIRouter(prefix="/rooms", tags=["Rooms"])


@router.get("", response_model=List[RoomResponse], summary="List all rooms")
def get_rooms(
    db: Client = Depends(get_db),
    current_worker: WorkerResponse = Depends(get_current_worker)
):
    try:
        res = db.table("rooms").select("*").order("room_number", desc=False).execute()
        return res.data
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch rooms: {str(e)}"
        )


@router.post("", response_model=RoomResponse, status_code=status.HTTP_201_CREATED, summary="Create a room")
def create_room(
    room_in: RoomCreate,
    db: Client = Depends(get_db),
    current_worker: WorkerResponse = Depends(get_current_worker)
):
    room_num = room_in.room_number.strip()

    # Check for duplicate room number
    existing_room = db.table("rooms").select("id").eq("room_number", room_num).execute()
    if existing_room.data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Room number '{room_num}' already exists"
        )

    # Build payload with explicit default for occupied
    payload = {
        "room_number": room_num,
        "capacity": room_in.capacity,
        "occupied": 0,
        "rent_amount": float(room_in.rent_amount),
        "status": room_in.status or "available"
    }

    try:
        res = db.table("rooms").insert(payload).execute()
        if not res.data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to create room record in database"
            )
        return res.data[0]
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error creating room: {str(e)}"
        )