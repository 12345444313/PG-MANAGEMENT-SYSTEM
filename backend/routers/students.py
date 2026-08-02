from typing import List
from datetime import date
from fastapi import APIRouter, Depends, HTTPException, status
from supabase import Client
from database import get_db
from deps import get_current_worker
from schemas import StudentCreate, StudentResponse, WorkerResponse

router = APIRouter(prefix="/students", tags=["Students"])


@router.get("", response_model=List[StudentResponse], summary="List all students")
def get_students(
    db: Client = Depends(get_db),
    current_worker: WorkerResponse = Depends(get_current_worker)
):
    try:
        res = db.table("students").select("*").order("id", desc=False).execute()
        return res.data
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch students: {str(e)}"
        )


@router.post("", response_model=StudentResponse, status_code=status.HTTP_201_CREATED, summary="Create a student")
def create_student(
    student_in: StudentCreate,
    db: Client = Depends(get_db),
    current_worker: WorkerResponse = Depends(get_current_worker)
):
    email_clean = student_in.email.strip().lower()

    # Check email duplicate
    existing_email = db.table("students").select("id").eq("email", email_clean).execute()
    if existing_email.data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Student email is already registered"
        )

    # Validate room if provided
    room_res = None
    if student_in.room_id:
        room_res = db.table("rooms").select("*").eq("id", student_in.room_id).execute()
        if not room_res.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Room ID {student_in.room_id} not found"
            )
        room = room_res.data[0]
        if room["occupied"] >= room["capacity"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Room {room['room_number']} is already at full capacity"
            )

    # Ensure joining_date defaults to today's date if not provided
    joining_date_val = str(student_in.joining_date) if student_in.joining_date else str(date.today())

    payload = {
        "full_name": student_in.full_name.strip(),
        "email": email_clean,
        "phone": student_in.phone.strip(),
        "father_name": student_in.father_name.strip() if student_in.father_name else None,
        "father_phone": student_in.father_phone.strip() if student_in.father_phone else None,
        "aadhaar_no": student_in.aadhaar_no.strip() if student_in.aadhaar_no else None,
        "room_id": student_in.room_id,
        "joining_date": joining_date_val,
        "status": student_in.status or "active"
    }

    try:
        res = db.table("students").insert(payload).execute()
        if not res.data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to create student record"
            )
        
        # Increment room occupied count if room assigned
        if student_in.room_id and room_res and room_res.data:
            room = room_res.data[0]
            new_occupied = room["occupied"] + 1
            new_status = "full" if new_occupied >= room["capacity"] else "available"
            db.table("rooms").update({"occupied": new_occupied, "status": new_status}).eq("id", student_in.room_id).execute()

        return res.data[0]
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error creating student: {str(e)}"
        )


@router.delete("/{student_id}", summary="Delete a student")
def delete_student(
    student_id: int,
    db: Client = Depends(get_db),
    current_worker: WorkerResponse = Depends(get_current_worker)
):
    student_res = db.table("students").select("*",).eq("id", student_id).execute()
    if not student_res.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Student with ID {student_id} not found"
        )

    student = student_res.data[0]
    room_id = student.get("room_id")

    try:
        delete_res = db.table("students").delete().eq("id", student_id).execute()
        if not delete_res.data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to delete student"
            )

        if room_id:
            room_res = db.table("rooms").select("*",).eq("id", room_id).execute()
            if room_res.data:
                room = room_res.data[0]
                new_occupied = max(0, room.get("occupied", 0) - 1)
                new_status = "available" if new_occupied < room.get("capacity", 0) else "full"
                db.table("rooms").update({"occupied": new_occupied, "status": new_status}).eq("id", room_id).execute()

        return {"message": f"Student {student_id} deleted successfully"}
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error deleting student: {str(e)}"
        )