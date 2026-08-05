from datetime import datetime, timedelta, timezone
from typing import Optional, Any, Dict
from jose import jwt, JWTError
from passlib.context import CryptContext
from config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify a plain-text password against the stored hash.
    Supports bcrypt hashes; also allows legacy plain-text records to
    transparently re-hash on first successful login via authenticate().
    """
    if not hashed_password or not plain_password:
        return False

    p_clean = str(plain_password).strip()

    try:
        return bool(pwd_context.verify(p_clean, str(hashed_password)))
    except Exception:
        # Fall back to direct equality check (legacy / imported data)
        return p_clean == str(hashed_password).strip()


def get_password_hash(password: str) -> str:
    """Generate a bcrypt hash of the given plain-text password."""
    return pwd_context.hash(password)


def needs_rehash(hashed_password: str) -> bool:
    """Return True if the stored hash should be upgraded (e.g., legacy plaintext)."""
    try:
        return pwd_context.needs_update(hashed_password)
    except Exception:
        return True


def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """Mint a signed JWT access token."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(
            minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
        )

    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_access_token(token: str) -> Optional[Dict[str, Any]]:
    """Decode a JWT token; return the payload or None if invalid."""
    try:
        return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    except JWTError:
        return None
