from fastapi import APIRouter, Depends, HTTPException, status
from supabase import Client
from database import get_db
from auth import (
    verify_password,
    create_access_token,
    get_password_hash,
    needs_rehash,
)
from schemas import Token, WorkerResponse, LoginRequest

router = APIRouter(prefix="/auth", tags=["Authentication"])

# Default admin bootstrap credentials — only used to auto-seed a fresh
# Supabase project the very first time someone logs in.
DEFAULT_ADMIN_USERNAME = "admin"
DEFAULT_ADMIN_PASSWORD = "admin123"


@router.post("/login", response_model=Token, summary="Worker Login")
def login_worker(
    login_data: LoginRequest,
    db: Client = Depends(get_db),
):
    username = (login_data.username or "").strip()
    password = login_data.password or ""

    if not username or not password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username and password are required.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # 1. Fetch the worker record
    try:
        res = db.table("workers").select("*").eq("username", username).execute()
    except Exception as exc:
        err_msg = str(exc)
        if (
            "PGRST" in err_msg
            or "404" in err_msg
            or "does not exist" in err_msg.lower()
        ):
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=(
                    "Supabase table 'workers' does not exist! "
                    "Please run the table creation SQL script in the Supabase SQL Editor."
                ),
            )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Supabase connection error: {err_msg}",
        )

    # 2. Self-Healing bootstrap: if 'admin' is missing, create it on first login.
    if not res.data or len(res.data) == 0:
        if (
            username.lower() == DEFAULT_ADMIN_USERNAME
            and password == DEFAULT_ADMIN_PASSWORD
        ):
            try:
                admin_seed = {
                    "username": DEFAULT_ADMIN_USERNAME,
                    "password": get_password_hash(DEFAULT_ADMIN_PASSWORD),
                    "full_name": "System Administrator",
                    "email": "admin@pgmanagement.com",
                    "phone": "9876543210",
                    "role": "admin",
                }
                insert_res = db.table("workers").insert(admin_seed).execute()
                if insert_res.data:
                    worker = insert_res.data[0]
                    access_token = create_access_token(
                        data={
                            "sub": worker["username"],
                            "role": worker.get("role", "admin"),
                        }
                    )
                    return {
                        "access_token": access_token,
                        "token_type": "bearer",
                        "worker": WorkerResponse(**worker),
                    }
            except Exception as insert_err:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=(
                        "Failed to auto-create the default admin user in Supabase: "
                        f"{insert_err}"
                    ),
                )

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Worker username '{username}' not found.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    worker = res.data[0]

    # 3. Verify password against the stored hash
    if not verify_password(password, worker.get("password", "")):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # 4. Optional: re-hash legacy plaintext on successful login
    if needs_rehash(worker.get("password", "")):
        try:
            db.table("workers").update(
                {"password": get_password_hash(password)}
            ).eq("id", worker["id"]).execute()
            worker["password"] = get_password_hash(password)
        except Exception:
            # Non-fatal: the user is still authenticated even if rehash fails
            pass

    # 5. Issue a fresh JWT
    access_token = create_access_token(
        data={"sub": worker["username"], "role": worker.get("role", "worker")}
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "worker": WorkerResponse(**worker),
    }
