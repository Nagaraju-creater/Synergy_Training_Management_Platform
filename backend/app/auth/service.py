import secrets
import uuid
from typing import Optional, Dict

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.audit.models import AuditLog
from app.auth.schemas import TokenResponse
from app.services.jwt_service import JWTService
from app.users.models import User
from app.users.service import UserService
from app.employees.models import Employee

jwt_service = JWTService()

# In-memory store for development (since Redis is unavailable)
_reset_tokens: Dict[str, str] = {}

# Pre-computed dummy hash used to normalise timing when a user is not found.
# Prevents user-enumeration via response-time differences.
_DUMMY_HASH = "$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMrKGCp.H8NlE6qzMmMiClIlPi"


class AuthService:
    @staticmethod
    async def log_auth_event_background(
        user_id: Optional[uuid.UUID],
        action: str,
        details: Optional[dict] = None,
        ip_address: Optional[str] = None,
    ) -> None:
        from app.database import AsyncSessionLocal
        async with AsyncSessionLocal() as db:
            log = AuditLog(
                user_id=user_id,
                action=action,
                entity_type="auth",
                details=details or {},
                ip_address=ip_address,
            )
            db.add(log)
            await db.commit()

    @staticmethod
    async def log_auth_event(
        db: AsyncSession,
        user_id: Optional[uuid.UUID],
        action: str,
        details: Optional[dict] = None,
        ip_address: Optional[str] = None,
    ) -> None:
        log = AuditLog(
            user_id=user_id,
            action=action,
            entity_type="auth",
            details=details or {},
            ip_address=ip_address,
        )
        db.add(log)
        await db.flush()

    @staticmethod
    async def authenticate(
        db: AsyncSession,
        email: str,
        password: str,
        ip_address: Optional[str] = None,
    ) -> User:
        from fastapi.concurrency import run_in_threadpool

        # Always normalise — registration stores emails lowercase already.
        email = email.strip().lower()

        # ── Step 1: Fast single-column lookup (uses the email index) ─────────
        # No joins here — we don't pay relationship costs on failed logins.
        result = await db.execute(
            select(User).where(User.email == email)
        )
        user = result.scalar_one_or_none()

        # ── Step 2: bcrypt in threadpool (CPU-bound, never block the event loop)
        # Use a dummy hash when user not found so timing is identical either way.
        hash_to_check = user.hashed_password if user else _DUMMY_HASH
        is_valid = await run_in_threadpool(
            UserService.verify_password, password, hash_to_check
        )

        # ── Step 3: Fast rejection — return immediately ───────────────────────
        if not user or not is_valid:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials",
            )

        if not user.is_active:
            # Log inline here because we need the real user_id for audit trail.
            await AuthService.log_auth_event(
                db, user.id, "login_disabled",
                details={"email": email}, ip_address=ip_address,
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account is disabled",
            )

        # ── Step 4: Load relationships ONLY on successful auth ────────────────
        result = await db.execute(
            select(User)
            .options(
                selectinload(User.role),
                selectinload(User.employee).selectinload(Employee.department),
                selectinload(User.employee).selectinload(Employee.manager),
            )
            .where(User.id == user.id)
        )
        return result.scalar_one()

    @staticmethod
    async def logout(db: AsyncSession, user_id: uuid.UUID, ip_address: Optional[str] = None) -> None:
        await AuthService.log_auth_event(db, user_id, "logout", ip_address=ip_address)

    @staticmethod
    def create_tokens(user_id: str, role: str) -> TokenResponse:
        payload = {"sub": str(user_id), "role": role}
        return TokenResponse(
            access_token=jwt_service.create_access_token(payload),
            refresh_token=jwt_service.create_refresh_token(payload),
        )

    @staticmethod
    async def create_reset_token(db: AsyncSession, email: str, ip_address: Optional[str] = None) -> Optional[str]:
        try:
            user = await UserService.get_by_email(db, email)
        except Exception:
            # Silently fail to prevent email enumeration
            return None

        token = secrets.token_urlsafe(32)

        # Store token -> user_id mapping in memory
        _reset_tokens[token] = str(user.id)

        await AuthService.log_auth_event(
            db, user.id, "password_reset_request", ip_address=ip_address
        )
        return token

    @staticmethod
    async def reset_password(
        db: AsyncSession, token: str, new_password: str, ip_address: Optional[str] = None
    ) -> bool:
        user_id_str = _reset_tokens.get(token)

        if not user_id_str:
            return False

        user_id = uuid.UUID(user_id_str)
        user = await UserService.get_by_id(db, user_id)

        user.hashed_password = UserService.hash_password(new_password)
        db.add(user)

        # Remove token after use
        _reset_tokens.pop(token, None)

        await AuthService.log_auth_event(
            db, user.id, "password_reset_success", ip_address=ip_address
        )
        return True
