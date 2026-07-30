from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from supabase import Client
from database import get_db
from deps import get_current_worker
from schemas import PaymentCreate, PaymentResponse, WorkerResponse

router = APIRouter(prefix="/payments", tags=["Payments"])


@router.get("", response_model=List[PaymentResponse], summary="List all payments")
def get_payments(
    db: Client = Depends(get_db),
    current_worker: WorkerResponse = Depends(get_current_worker)
):
    try:
        res = db.table("payments").select("*").order("id", desc=True).execute()
        return res.data
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch payments: {str(e)}"
        )


@router.post("", response_model=PaymentResponse, status_code=status.HTTP_201_CREATED, summary="Create a payment")
def create_payment(
    payment_in: PaymentCreate,
    db: Client = Depends(get_db),
    current_worker: WorkerResponse = Depends(get_current_worker)
):
    student_res = db.table("students").select("id").eq("id", payment_in.student_id).execute()
    if not student_res.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Student with ID {payment_in.student_id} does not exist"
        )

    payload = payment_in.model_dump(mode="json")
    try:
        res = db.table("payments").insert(payload).execute()
        if not res.data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to record payment"
            )
        return res.data[0]
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error recording payment: {str(e)}"
        )