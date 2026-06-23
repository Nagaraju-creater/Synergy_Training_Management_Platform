from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.nominations.schemas import (
    NominationCreate,
    NominationResponse,
    NominationUpdate,
)
from app.nominations.service import NominationService
from app.utils.response import paginated_response, success_response
from app.database import get_db
from app.dependencies import get_current_user, require_role

router = APIRouter()


# ── Employee: own nominations only ─────────────────────────────────────────────
@router.get("/my")
async def list_my_nominations(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Returns ONLY the nominations that belong to the authenticated employee.
    Enforced server-side — never returns another employee's data.
    """
    items, total = await NominationService.get_my(db, page, per_page, current_user)
    return paginated_response(
        [NominationResponse.model_validate(i).model_dump() for i in items],
        total, page, per_page,
    )


# ── Manager: team nominations only ─────────────────────────────────────────────
@router.get("/team")
async def list_team_nominations(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role("manager", "admin")),
):
    """
    Returns ONLY nominations where manager_id == current_user.id.
    A manager can never see nominations outside their direct reports.
    """
    items, total = await NominationService.get_team(db, page, per_page, current_user)
    return paginated_response(
        [NominationResponse.model_validate(i).model_dump() for i in items],
        total, page, per_page,
    )


# ── Admin: all nominations ──────────────────────────────────────────────────────
@router.get("/")
async def list_all_nominations(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role("admin")),
):
    """Admin-only. Returns every nomination in the system."""
    items, total = await NominationService.get_all(db, page, per_page, current_user)
    return paginated_response(
        [NominationResponse.model_validate(i).model_dump() for i in items],
        total, page, per_page,
    )


# ── Create nomination ───────────────────────────────────────────────────────────
@router.post("/", status_code=201)
async def nominate(
    payload: NominationCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    n = await NominationService.create(db, payload, current_user)
    return success_response(NominationResponse.model_validate(n).model_dump(), "Nominated", 201)


# ── Get single nomination ───────────────────────────────────────────────────────
@router.get("/{nomination_id}")
async def get_nomination(
    nomination_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Returns a nomination only if the caller is:
      - the nominee (employee_id owner), or
      - the assigned manager (manager_id), or
      - an admin / trainer
    """
    from sqlalchemy import select
    from app.employees.models import Employee
    from app.nominations.models import Nomination

    n = await NominationService.get_by_id(db, nomination_id)

    user_role = current_user.role.name.lower() if current_user.role else ""
    if user_role in ("admin", "trainer"):
        return success_response(NominationResponse.model_validate(n).model_dump())

    # Check manager ownership
    if n.manager_id == current_user.employee_id:
        return success_response(NominationResponse.model_validate(n).model_dump())

    # Check employee ownership
    if n.employee_id == current_user.employee_id:
        return success_response(NominationResponse.model_validate(n).model_dump())

    raise HTTPException(status_code=403, detail="You do not have access to this nomination")


# ── Review nomination ───────────────────────────────────────────────────────────
@router.patch("/{nomination_id}/review")
async def review_nomination(
    nomination_id: UUID,
    payload: NominationUpdate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role("admin", "manager")),
):
    """
    Managers may only review nominations where manager_id == their user id.
    Admins may review any nomination.
    """
    from app.nominations.models import Nomination
    from sqlalchemy import select

    user_role = current_user.role.name.lower() if current_user.role else ""

    if user_role == "manager":
        # Validate ownership before acting
        res = await db.execute(
            select(Nomination.manager_id).where(Nomination.id == nomination_id)
        )
        manager_id = res.scalar()
        if manager_id != current_user.employee_id:
            raise HTTPException(
                status_code=403,
                detail="You can only review nominations assigned to you",
            )

    n = await NominationService.review(db, nomination_id, payload, current_user)
    return success_response(NominationResponse.model_validate(n).model_dump(), "Nomination reviewed")
