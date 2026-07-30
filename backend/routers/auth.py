from fastapi import APIRouter, Depends, HTTPException, status
from supabase import Client
from database import get_db
from auth import verify_password, create_access_token, get_password_hash
from schemas import Token, WorkerResponse, LoginRequest

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/login", response_model=Token, summary="Worker Login")
def login_worker(
    login_data: LoginRequest,
    db: Client = Depends(get_db)
):
    username = login_data.username.strip()
    password = login_data.password

    # 1. Fetch worker record from Supabase
    try:
        res = db.table("workers").select("*").eq("username", username).execute()
    except Exception as e:
        err_msg = str(e)
        if "404" in err_msg or "PGRST204" in err_msg or "does not exist" in err_msg.lower():
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Supabase table 'workers' does not exist! Please run the table creation SQL script in Supabase SQL Editor."
            )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Supabase connection error: {err_msg}"
        )

    # 2. Self-Healing Fallback: If 'admin' user is missing, automatically insert it into Supabase!
    if not res.data or len(res.data) == 0:
        if username.lower() == "admin" and password == "admin123":
            try:
                admin_seed = {
                    "username": "admin",
                    "password": get_password_hash("admin123"),
                    "full_name": "System Administrator",
                    "email": "admin@pgmanagement.com",
                    "phone": "9876543210",
                    "role": "admin"
                }
                insert_res = db.table("workers").insert(admin_seed).execute()
                if insert_res.data:
                    worker = insert_res.data[0]
                    access_token = create_access_token(
                        data={"sub": worker["username"], "role": worker.get("role", "admin")}
                    )
                    return {
                        "access_token": access_token,
                        "token_type": "bearer",
                        "worker": WorkerResponse(**worker)
                    }
            except Exception as insert_err:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Failed to auto-create admin user in Supabase: {str(insert_err)}"
                )

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Worker username '{username}' not found in Supabase 'workers' table.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    worker = res.data[0]

    # 3. Verify hashed password
    if not verify_password(password, worker["password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Password verification failed. Invalid password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # 4. Create JWT access token
    access_token = create_access_token(
        data={"sub": worker["username"], "role": worker.get("role", "worker")}
    )

    # 5. Return token and worker details
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "worker": WorkerResponse(**worker)
    }