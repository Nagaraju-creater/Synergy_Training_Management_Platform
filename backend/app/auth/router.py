from fastapi import APIRouter, Depends, HTTPException, status, Response, Request, Cookie, BackgroundTasks
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional, Literal, cast
from datetime import datetime, timezone

from app.auth.schemas import (
    ForgotPasswordRequest,
    LoginRequest,
    RefreshRequest,
    TokenResponse,
    ResetPasswordRequest,
)
from app.auth.service import AuthService
from app.services.jwt_service import JWTService
from app.utils.response import success_response
from app.database import get_db
from app.config import settings
from app.dependencies import get_current_user
from sqlalchemy import select
from app.users.models import User
from app.utils.limiter import limiter

from app.utils.email import send_email
from app.users.schemas import UserResponse

router = APIRouter()
jwt_service = JWTService()

def get_client_ip(request: Request) -> str:
    """Safely get client IP address."""
    return request.client.host if request.client else "127.0.0.1"

@router.post("/login")
async def login(
    response: Response,
    request: Request,
    payload: LoginRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
) -> JSONResponse:
    ip_address = get_client_ip(request)
    
    try:
        user = await AuthService.authenticate(
            db, payload.email, payload.password, ip_address=ip_address
        )
    except HTTPException as e:
        # Log all auth failures as non-blocking background tasks
        if e.status_code == 401:
            background_tasks.add_task(
                AuthService.log_auth_event_background,
                None, "login_failed", {"email": payload.email}, ip_address,
            )
        raise e

    # Log success as a background task (non-blocking)
    background_tasks.add_task(
        AuthService.log_auth_event_background,
        user.id, "login_success", None, ip_address,
    )

    user.last_login = datetime.now(timezone.utc)
    db.add(user)
    await db.commit()
    
    from sqlalchemy.orm import selectinload
    result = await db.execute(
        select(User)
        .options(selectinload(User.role), selectinload(User.employee))
        .where(User.id == user.id)
    )
    user = result.scalar_one()

    role_name = user.role.name if user.role else ""
    tokens = AuthService.create_tokens(str(user.id), role_name)

    # Set refresh token in HttpOnly cookie
    response.set_cookie(
        key="refresh_token",
        value=tokens.refresh_token,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite=cast(Literal["lax", "strict", "none"], settings.COOKIE_SAMESITE),
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 3600,
        domain=settings.COOKIE_DOMAIN,
    )

    user_data = UserResponse.model_validate(user).model_dump()
    user_data["role"] = role_name
    
    if user.employee:
        from app.employees.schemas import EmployeeResponse
        user_data["employee"] = EmployeeResponse.model_validate(user.employee).model_dump()

    return success_response(
        {
            "access_token": tokens.access_token,
            "token_type": "bearer",
            "user": user_data
        },
        "Login successful"
    )

@router.post("/refresh")
async def refresh_token(
    request: Request,
    refresh_token: Optional[str] = Cookie(None),
) -> JSONResponse:
    if not refresh_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token missing",
        )

    data = jwt_service.decode_refresh_token(refresh_token)
    if not data:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
        )
    
    tokens = AuthService.create_tokens(data["sub"], data["role"])
    return success_response(
        {"access_token": tokens.access_token, "token_type": "bearer"},
        "Token refreshed"
    )

@router.post("/logout")
async def logout(
    response: Response,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user),
) -> JSONResponse:
    await AuthService.logout(db, current_user.id, ip_address=get_client_ip(request))
    
    response.delete_cookie(
        key="refresh_token",
        secure=settings.COOKIE_SECURE,
        samesite=cast(Literal["lax", "strict", "none"], settings.COOKIE_SAMESITE),
        domain=settings.COOKIE_DOMAIN,
    )
    return success_response(message="Logged out successfully")

@router.post("/forgot-password")
async def forgot_password(
    request: Request,
    payload: ForgotPasswordRequest,
    db: AsyncSession = Depends(get_db)
) -> JSONResponse:
    token = await AuthService.create_reset_token(
        db, payload.email, ip_address=get_client_ip(request)
    )
    
    if token:
        reset_url = f"{settings.FRONTEND_URL}/auth/reset-password?token={token}"
        # Also log to terminal for development visibility
        print(f"\n[RESET LINK] {payload.email} → {reset_url}\n")

        email_body = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
            <h2 style="color: #1a1a2e;">Password Reset Request</h2>
            <p>You requested a password reset for your Training Platform account.</p>
            <p>Click the button below to reset your password. This link expires in <strong>1 hour</strong>.</p>
            <a href="{reset_url}"
               style="display:inline-block; margin: 16px 0; padding: 12px 24px;
                      background-color: #4f46e5; color: #ffffff; text-decoration: none;
                      border-radius: 6px; font-weight: bold;">
               Reset Password
            </a>
            <p style="color: #666; font-size: 13px;">
                If you didn't request this, please ignore this email. Your password will not change.
            </p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
            <p style="color: #999; font-size: 12px;">Training Management Platform</p>
        </div>
        """
        await send_email(
            to_email=payload.email,
            subject="Password Reset – Training Platform",
            body=email_body,
        )
    
    # Generic message for security
    return success_response(
        message="If the email exists, a password reset link has been sent"
    )

@router.post("/reset-password")
async def reset_password(
    request: Request,
    payload: ResetPasswordRequest,
    db: AsyncSession = Depends(get_db)
) -> JSONResponse:
    success = await AuthService.reset_password(
        db, payload.token, payload.new_password, ip_address=get_client_ip(request)
    )
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token",
        )
        
    return success_response(message="Password reset successfully")
