import os
import shutil
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query, File, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.trainings.schemas import (
    TrainingCreate, TrainingResponse, TrainingUpdate, 
    TrainingCategoryCreate, TrainingCategoryResponse,
    TrainingDocumentResponse,
    TrainingImportPreviewResponse, TrainingImportConfirmPayload,
    TrainingImportConfirmResponse, TrainingImportHistoryResponse,
    MasterImportPreviewResponse, MasterImportConfirmPayload,
    MasterImportConfirmResponse
)
from app.trainings.service import TrainingService
from app.trainings.master_import_service import MasterImportService

from app.utils.response import paginated_response, success_response
from app.database import get_db
from app.dependencies import get_current_user, require_role
from fastapi.responses import StreamingResponse

router = APIRouter()


@router.get("/")
async def list_trainings(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    category_id: Optional[UUID] = Query(None),
    department_id: Optional[UUID] = Query(None),
    status: Optional[str] = Query(None),
    training_type: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    include_archived: bool = Query(False),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    role = current_user.role.name.lower() if current_user.role else ""
    is_admin = role == "admin"
    
    if not is_admin:
        if not current_user.employee or not current_user.employee.department_id:
            return paginated_response([], 0, page, per_page)
        department_id = current_user.employee.department_id

    trainings, total, status_counts = await TrainingService.get_all(
        db, page, per_page, category_id, department_id, 
        status, training_type, search, include_archived, is_admin=is_admin,
    )
    return paginated_response(
        [TrainingResponse.model_validate(t).model_dump() for t in trainings],
        total, page, per_page,
        extra_meta={"status_counts": status_counts}
    )


# --- Categories ---

@router.get("/categories")
async def list_categories(
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    cats = await TrainingService.list_categories(db)
    return success_response([TrainingCategoryResponse.model_validate(c).model_dump() for c in cats])


@router.post("/categories", status_code=201)
async def create_category(
    payload: TrainingCategoryCreate,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_role("admin")),
):
    cat = await TrainingService.create_category(db, payload)
    return success_response(TrainingCategoryResponse.model_validate(cat).model_dump(), "Category created", 201)


@router.post("/", status_code=201)
async def create_training(
    payload: TrainingCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role("admin", "manager", "trainer")),
):
    t = await TrainingService.create(db, payload, current_user.id)
    return success_response(
        TrainingResponse.model_validate(t).model_dump(), "Training created", 201
    )


# --- Import Center ---

@router.get("/import/template")
async def download_import_template(
    db: AsyncSession = Depends(get_db),
    _=Depends(require_role("admin")),
):
    buffer = await TrainingService.generate_import_template(db)
    return StreamingResponse(
        buffer,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=training_import_template.xlsx"}
    )


@router.post("/import/parse")
async def parse_import_file(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    _=Depends(require_role("admin")),
):
    content = await file.read()
    res = await TrainingService.parse_import_file(db, content)
    validated = TrainingImportPreviewResponse.model_validate(res)
    return success_response(validated.model_dump(), "File parsed successfully")


@router.post("/import/confirm")
async def confirm_import(
    payload: TrainingImportConfirmPayload,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role("admin")),
):
    res = await TrainingService.confirm_import(
        db,
        payload.records,
        payload.duplicate_strategy,
        current_user.id,
        "Imported Excel File"
    )
    validated = TrainingImportConfirmResponse.model_validate(res)
    return success_response(validated.model_dump(), "Import completed successfully")


@router.get("/import/history")
async def get_import_history(
    db: AsyncSession = Depends(get_db),
    _=Depends(require_role("admin")),
):
    res = await TrainingService.get_import_history(db)
    validated = [TrainingImportHistoryResponse.model_validate(h).model_dump() for h in res]
    return success_response(validated, "Import history retrieved successfully")


@router.get("/import/master-template")
async def download_master_template(
    db: AsyncSession = Depends(get_db),
    _=Depends(require_role("admin")),
):
    buffer = await MasterImportService.generate_master_template(db)
    return StreamingResponse(
        buffer,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=master_import_template.xlsx"}
    )


@router.post("/import/master-parse")
async def parse_master_file(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    _=Depends(require_role("admin")),
):
    content = await file.read()
    res = await MasterImportService.parse_master_file(db, content)
    validated = MasterImportPreviewResponse.model_validate(res)
    return success_response(validated.model_dump(), "Master workbook parsed successfully")


@router.post("/import/master-confirm")
async def confirm_master_import(
    payload: MasterImportConfirmPayload,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role("admin")),
):
    res = await MasterImportService.confirm_master_import(
        db,
        payload.sheets,
        payload.duplicate_strategy,
        current_user.id,
        "Master Import Workbook"
    )
    validated = MasterImportConfirmResponse.model_validate(res)
    return success_response(validated.model_dump(), "Master import completed successfully")


@router.get("/{training_id}")
async def get_training(
    training_id: UUID,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    t = await TrainingService.get_by_id(db, training_id)
    return success_response(TrainingResponse.model_validate(t).model_dump())


@router.patch("/{training_id}")
async def update_training(
    training_id: UUID,
    payload: TrainingUpdate,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_role("admin", "manager", "trainer")),
):
    t = await TrainingService.update(db, training_id, payload)
    return success_response(TrainingResponse.model_validate(t).model_dump(), "Training updated")


@router.post("/{training_id}/archive")
async def archive_training(
    training_id: UUID,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_role("admin", "manager")),
):
    t = await TrainingService.archive(db, training_id)
    return success_response(TrainingResponse.model_validate(t).model_dump(), "Training archived")


@router.delete("/{training_id}", status_code=204)
async def delete_training(
    training_id: UUID,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_role("admin")),
):
    await TrainingService.delete(db, training_id)


@router.post("/{training_id}/documents", status_code=201)
async def upload_document(
    training_id: UUID,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    _=Depends(require_role("admin", "manager", "trainer")),
):
    from app.services.storage import storage_service
    file_url = await storage_service.upload_training_document(str(training_id), file)
    doc = await TrainingService.upload_document(db, training_id, file.filename, file_url)
    return success_response(TrainingDocumentResponse.model_validate(doc).model_dump(), "Document uploaded", 201)
