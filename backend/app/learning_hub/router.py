import os
from typing import Optional
from uuid import UUID
from fastapi import APIRouter, Depends, Query, File, UploadFile, Form, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user, require_role
from app.utils.response import paginated_response, success_response
from app.services.storage import storage_service
from app.learning_hub.service import LearningHubService
from app.learning_hub.schemas import (
    LearningCategoryCreate,
    LearningCategoryResponse,
    LearningModuleCreate,
    LearningModuleUpdate,
    LearningModuleResponse,
    LearningMaterialCreate,
    LearningMaterialUpdate,
    LearningMaterialResponse,
    LearningHubAnalyticsResponse,
    LearningHubQuickFilterCounts,
    BookmarkCreate,
    BookmarkResponse
)

router = APIRouter()


# --- Categories ---

@router.get("/categories")
async def list_categories(
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user)
):
    categories = await LearningHubService.list_categories(db)
    return success_response([LearningCategoryResponse.model_validate(c).model_dump() for c in categories])


@router.post("/categories", status_code=201)
async def create_category(
    payload: LearningCategoryCreate,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_role("admin"))
):
    cat = await LearningHubService.create_category(db, payload)
    return success_response(LearningCategoryResponse.model_validate(cat).model_dump(), "Category created", 201)


@router.put("/categories/{category_id}")
async def update_category(
    category_id: UUID,
    payload: LearningCategoryCreate,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_role("admin"))
):
    cat = await LearningHubService.update_category(db, category_id, payload)
    return success_response(LearningCategoryResponse.model_validate(cat).model_dump(), "Category updated")


@router.delete("/categories/{category_id}", status_code=204)
async def delete_category(
    category_id: UUID,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_role("admin"))
):
    await LearningHubService.delete_category(db, category_id)


# --- Modules ---

@router.get("/modules")
async def list_modules(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    category_id: Optional[UUID] = Query(None),
    department_id: Optional[UUID] = Query(None),
    training_id: Optional[UUID] = Query(None),
    search: Optional[str] = Query(None),
    sort_by: Optional[str] = Query("recently_added"),
    quick_filter: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    role = current_user.role.name.lower() if current_user.role else ""
    modules, total = await LearningHubService.get_all_modules(
        db=db,
        page=page,
        per_page=per_page,
        category_id=category_id,
        department_id=department_id,
        training_id=training_id,
        search=search,
        sort_by=sort_by,
        quick_filter=quick_filter,
        user_role=role,
        user_id=current_user.id
    )
    return paginated_response(
        [LearningModuleResponse.model_validate(m).model_dump() for m in modules],
        total, page, per_page
    )


@router.get("/modules/{module_id}")
async def get_module(
    module_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    role = current_user.role.name.lower() if current_user.role else ""
    module = await LearningHubService.get_module(db, module_id, role, current_user.id)
    
    # Dump and serialize materials inside
    dumped = LearningModuleResponse.model_validate(module).model_dump()
    dumped["materials"] = [LearningMaterialResponse.model_validate(m).model_dump() for m in module.materials]
    return success_response(dumped)


@router.post("/modules", status_code=201)
async def create_module(
    payload: LearningModuleCreate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(require_role("admin"))
):
    module = await LearningHubService.create_module(db, payload, current_user.id)
    return success_response(LearningModuleResponse.model_validate(module).model_dump(), "Learning Module created", 201)


@router.put("/modules/{module_id}")
async def update_module(
    module_id: UUID,
    payload: LearningModuleUpdate,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_role("admin"))
):
    module = await LearningHubService.update_module(db, module_id, payload)
    return success_response(LearningModuleResponse.model_validate(module).model_dump(), "Learning Module updated")


@router.delete("/modules/{module_id}", status_code=204)
async def delete_module(
    module_id: UUID,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_role("admin"))
):
    await LearningHubService.delete_module(db, module_id)


# --- Admin Sync ---

@router.post("/sync-modules")
async def sync_missing_modules(
    db: AsyncSession = Depends(get_db),
    _=Depends(require_role("admin"))
):
    """Create learning modules for any trainings that don't have one yet."""
    created_count = await LearningHubService.sync_missing_modules(db)
    await db.commit()
    return success_response({"modules_created": created_count}, f"{created_count} missing module(s) created")


# --- Materials ---

@router.post("/materials", status_code=201)
async def add_material(
    module_id: UUID = Form(...),
    title: str = Form(...),
    description: Optional[str] = Form(None),
    external_url: Optional[str] = Form(None),
    tags: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    file_path = None
    file_type = None

    if file and file.filename:
        # Check file extension
        ext = os.path.splitext(file.filename)[1].lower()
        allowed_extensions = {
            '.pdf', '.ppt', '.pptx', '.doc', '.docx', 
            '.xls', '.xlsx', '.mp4', '.zip',
            '.png', '.jpg', '.jpeg', '.gif'
        }
        if ext not in allowed_extensions:
            raise HTTPException(
                status_code=400, 
                detail=f"Unsupported file format '{ext}'. Supported formats: PDF, PPT, PPTX, DOC, DOCX, XLS, XLSX, MP4, Images, ZIP."
            )
        
        file_path = await storage_service.upload_learning_material(str(module_id), file)
        file_type = ext.lstrip('.')
    elif not external_url:
        raise HTTPException(
            status_code=400, 
            detail="You must upload a file or enter an external URL."
        )

    payload = LearningMaterialCreate(
        module_id=module_id,
        title=title,
        description=description,
        external_url=external_url,
        tags=tags
    )

    material = await LearningHubService.add_material(
        db=db,
        payload=payload,
        file_path=file_path,
        file_type=file_type,
        user_id=current_user.id
    )
    return success_response(LearningMaterialResponse.model_validate(material).model_dump(), "Material uploaded successfully", 201)


@router.put("/materials/{material_id}")
async def update_material(
    material_id: UUID,
    title: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    external_url: Optional[str] = Form(None),
    tags: Optional[str] = Form(None),
    is_approved: Optional[bool] = Form(None),
    file: Optional[UploadFile] = File(None),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    role = current_user.role.name.lower() if current_user.role else ""
    file_path = None
    file_type = None

    if file and file.filename:
        ext = os.path.splitext(file.filename)[1].lower()
        allowed_extensions = {
            '.pdf', '.ppt', '.pptx', '.doc', '.docx', 
            '.xls', '.xlsx', '.mp4', '.zip',
            '.png', '.jpg', '.jpeg', '.gif'
        }
        if ext not in allowed_extensions:
            raise HTTPException(
                status_code=400, 
                detail=f"Unsupported file format '{ext}'."
            )
        # We need the module ID to upload to the correct folder
        # Query material to get its module ID
        from sqlalchemy import select
        from app.learning_hub.models import LearningMaterial
        res = await db.execute(select(LearningMaterial.module_id).where(LearningMaterial.id == material_id))
        module_id = res.scalar_one_or_none()
        if not module_id:
            raise HTTPException(status_code=404, detail="Material not found")

        file_path = await storage_service.upload_learning_material(str(module_id), file)
        file_type = ext.lstrip('.')

    payload = LearningMaterialUpdate(
        title=title,
        description=description,
        external_url=external_url,
        tags=tags,
        is_approved=is_approved
    )

    material = await LearningHubService.update_material(
        db=db,
        material_id=material_id,
        payload=payload,
        file_path=file_path,
        file_type=file_type,
        user_role=role,
        user_id=current_user.id
    )
    return success_response(LearningMaterialResponse.model_validate(material).model_dump(), "Material updated successfully")


@router.delete("/materials/{material_id}", status_code=204)
async def delete_material(
    material_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    role = current_user.role.name.lower() if current_user.role else ""
    await LearningHubService.delete_material(db, material_id, role, current_user.id)


@router.post("/materials/{material_id}/view")
async def track_view(
    material_id: UUID,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user)
):
    await LearningHubService.increment_material_views(db, material_id)
    return success_response(None, "View tracked")


# --- Sync (Admin Utility) ---

@router.post("/sync-modules", status_code=200)
async def sync_missing_modules(
    db: AsyncSession = Depends(get_db),
    _=Depends(require_role("admin"))
):
    """Create learning modules for any trainings that don't have one yet."""
    created_count = await LearningHubService.sync_missing_modules(db)
    return success_response({"modules_created": created_count}, f"{created_count} missing module(s) created")


# --- Analytics ---

@router.get("/analytics")
async def get_analytics(
    db: AsyncSession = Depends(get_db),
    _=Depends(require_role("admin"))
):
    analytics = await LearningHubService.get_analytics(db)
    return success_response(analytics.model_dump())


# --- Quick Filters & Bookmarks ---

@router.get("/modules/quick-counts")
async def get_quick_filter_counts(
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    role = current_user.role.name.lower() if current_user.role else ""
    counts = await LearningHubService.get_quick_filter_counts(db, current_user.id, role)
    return success_response(counts.model_dump())

@router.post("/bookmarks")
async def toggle_bookmark(
    payload: BookmarkCreate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    res = await LearningHubService.toggle_bookmark(
        db, current_user.id, payload.module_id, payload.material_id
    )
    return success_response(res, "Bookmark updated successfully")

