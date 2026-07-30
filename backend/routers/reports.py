from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from supabase import Client
from database import get_db
from deps import get_current_worker
from schemas import ReportCreate, ReportResponse, WorkerResponse

router = APIRouter(prefix="/reports", tags=["Reports"])


@router.get("", response_model=List[ReportResponse], summary="List all reports")
def get_reports(
    db: Client = Depends(get_db),
    current_worker: WorkerResponse = Depends(get_current_worker)
):
    try:
        res = db.table("reports").select("*").order("id", desc=True).execute()
        return res.data
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch reports: {str(e)}"
        )


@router.post("", response_model=ReportResponse, status_code=status.HTTP_201_CREATED, summary="Create a report")
def create_report(
    report_in: ReportCreate,
    db: Client = Depends(get_db),
    current_worker: WorkerResponse = Depends(get_current_worker)
):
    payload = report_in.model_dump(mode="json")
    if not payload.get("worker_id"):
        payload["worker_id"] = current_worker.id

    try:
        res = db.table("reports").insert(payload).execute()
        if not res.data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to create report"
            )
        return res.data[0]
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error creating report: {str(e)}"
        )