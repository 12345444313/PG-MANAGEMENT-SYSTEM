from datetime import datetime, date
from typing import Optional, List
from pydantic import BaseModel, EmailStr, ConfigDict, Field


# ----------------------------------------------------
# Auth & Token Schemas
# ----------------------------------------------------
class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    worker: "WorkerResponse"


class TokenData(BaseModel):
    username: Optional[str] = None
    role: Optional[str] = None


class LoginRequest(BaseModel):
    username: str
    password: str


# ----------------------------------------------------
# Worker Schemas
# ----------------------------------------------------
class WorkerBase(BaseModel):
    username: str
    full_name: str
    email: EmailStr
    phone: Optional[str] = None
    role: str = "worker"


class WorkerCreate(WorkerBase):
    password: str = Field(..., min_length=6, description="Plain text password (will be hashed)")


class WorkerResponse(WorkerBase):
    id: int
    created_at: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


# ----------------------------------------------------
# Room Schemas
# ----------------------------------------------------
class RoomBase(BaseModel):
    room_number: str
    capacity: int = Field(gt=0, description="Maximum number of occupants")
    rent_amount: float = Field(gt=0, description="Monthly rent amount")
    status: str = "available"


class RoomCreate(RoomBase):
    pass


class RoomResponse(RoomBase):
    id: int
    occupied: int = 0
    created_at: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


# ----------------------------------------------------
# Student Schemas
# ----------------------------------------------------
class StudentBase(BaseModel):
    full_name: str
    email: EmailStr
    phone: str
    room_id: Optional[int] = None
    joining_date: Optional[date] = None
    status: str = "active"


class StudentCreate(StudentBase):
    pass


class StudentResponse(StudentBase):
    id: int
    created_at: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


# ----------------------------------------------------
# Payment Schemas
# ----------------------------------------------------
class PaymentBase(BaseModel):
    student_id: int
    amount: float = Field(gt=0)
    payment_date: Optional[date] = None
    payment_method: str = "UPI"
    status: str = "completed"


class PaymentCreate(PaymentBase):
    pass


class PaymentResponse(PaymentBase):
    id: int
    created_at: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


# ----------------------------------------------------
# Report Schemas
# ----------------------------------------------------
class ReportBase(BaseModel):
    title: str
    description: str
    worker_id: Optional[int] = None
    status: str = "pending"


class ReportCreate(ReportBase):
    pass


class ReportResponse(ReportBase):
    id: int
    created_at: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


# Rebuild recursive models
Token.model_rebuild()