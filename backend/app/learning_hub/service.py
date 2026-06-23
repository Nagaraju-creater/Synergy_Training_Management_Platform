from datetime import datetime
from typing import Optional, List, Tuple
from uuid import UUID
from sqlalchemy import select, or_, and_, func, desc
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.learning_hub.models import LearningCategory, LearningModule, LearningMaterial, Bookmark
from app.learning_hub.schemas import (
    LearningCategoryCreate,
    LearningModuleCreate,
    LearningModuleUpdate,
    LearningMaterialCreate,
    LearningMaterialUpdate,
    LearningHubAnalyticsResponse,
    LearningHubQuickFilterCounts,
    MostViewedMaterial,
    MostActiveContributor,
    RecentUpload
)
from app.utils.exceptions import NotFoundException, BadRequestException
from app.utils.pagination import paginate_query
from app.users.models import User
from app.employees.models import Employee
from app.enrollments.models import Enrollment, EnrollmentStatus


class LearningHubService:
    # --- Categories ---
    @staticmethod
    async def create_category(db: AsyncSession, payload: LearningCategoryCreate) -> LearningCategory:
        # Check if category already exists
        existing = await db.execute(select(LearningCategory).where(LearningCategory.name == payload.name))
        if existing.scalar_one_or_none():
            raise BadRequestException(f"Category with name '{payload.name}' already exists.")

        category = LearningCategory(
            name=payload.name,
            description=payload.description
        )
        db.add(category)
        await db.flush()
        return category

    @staticmethod
    async def list_categories(db: AsyncSession) -> List[LearningCategory]:
        res = await db.execute(select(LearningCategory).order_by(LearningCategory.name.asc()))
        return list(res.scalars().all())

    @staticmethod
    async def update_category(db: AsyncSession, category_id: UUID, payload: LearningCategoryCreate) -> LearningCategory:
        res = await db.execute(select(LearningCategory).where(LearningCategory.id == category_id))
        category = res.scalar_one_or_none()
        if not category:
            raise NotFoundException("Category not found.")

        # Check if name is taken by another category
        existing = await db.execute(
            select(LearningCategory)
            .where(and_(LearningCategory.name == payload.name, LearningCategory.id != category_id))
        )
        if existing.scalar_one_or_none():
            raise BadRequestException(f"Category with name '{payload.name}' already exists.")

        category.name = payload.name
        category.description = payload.description
        await db.flush()
        return category

    @staticmethod
    async def delete_category(db: AsyncSession, category_id: UUID) -> None:
        res = await db.execute(select(LearningCategory).where(LearningCategory.id == category_id))
        category = res.scalar_one_or_none()
        if not category:
            raise NotFoundException("Category not found.")

        await db.delete(category)
        await db.flush()

    # --- Modules ---
    @staticmethod
    async def create_module(db: AsyncSession, payload: LearningModuleCreate, user_id: UUID) -> LearningModule:
        module = LearningModule(
            title=payload.title,
            description=payload.description,
            category_id=payload.category_id,
            department_id=payload.department_id,
            training_id=payload.training_id,
            created_by=user_id
        )
        db.add(module)
        await db.flush()
        
        # Reload with relationships
        res = await db.execute(
            select(LearningModule)
            .options(
                selectinload(LearningModule.category),
                selectinload(LearningModule.department),
                selectinload(LearningModule.training),
                selectinload(LearningModule.creator)
            )
            .where(LearningModule.id == module.id)
        )
        return res.scalar_one()

    @staticmethod
    async def get_module(db: AsyncSession, module_id: UUID, user_role: str, user_id: UUID) -> LearningModule:
        res = await db.execute(
            select(LearningModule)
            .options(
                selectinload(LearningModule.category),
                selectinload(LearningModule.department),
                selectinload(LearningModule.training),
                selectinload(LearningModule.creator),
                selectinload(LearningModule.materials).selectinload(LearningMaterial.creator)
            )
            .where(LearningModule.id == module_id)
        )
        module = res.scalar_one_or_none()
        if not module:
            raise NotFoundException("Learning Module not found.")

        # Compute counts & last updated date on-the-fly
        is_admin = user_role.lower() == "admin"
        filtered_materials = [
            mat for mat in module.materials 
            if is_admin or mat.is_approved or mat.created_by == user_id
        ]
        
        module.material_count = len(filtered_materials)
        contributors = {mat.created_by for mat in filtered_materials if mat.created_by}
        module.contributor_count = len(contributors)
        
        material_updates = [mat.updated_at for mat in filtered_materials]
        module.last_updated_date = max([module.updated_at] + material_updates) if material_updates else module.updated_at
        
        bm_res = await db.execute(select(Bookmark.module_id, Bookmark.material_id).where(
            and_(Bookmark.user_id == user_id, or_(Bookmark.module_id == module.id, Bookmark.material_id.in_([m.id for m in filtered_materials])))
        ))
        bm_rows = bm_res.all()
        bm_mods = {r[0] for r in bm_rows if r[0]}
        bm_mats = {r[1] for r in bm_rows if r[1]}
        
        module.is_bookmarked = module.id in bm_mods
        for mat in filtered_materials:
            mat.is_bookmarked = mat.id in bm_mats

        # Override the materials property list with filtered materials for returning in response
        module.materials = filtered_materials

        return module

    @staticmethod
    async def update_module(db: AsyncSession, module_id: UUID, payload: LearningModuleUpdate) -> LearningModule:
        res = await db.execute(select(LearningModule).where(LearningModule.id == module_id))
        module = res.scalar_one_or_none()
        if not module:
            raise NotFoundException("Learning Module not found.")

        if payload.title is not None:
            module.title = payload.title
        if payload.description is not None:
            module.description = payload.description
        if payload.category_id is not None:
            module.category_id = payload.category_id
        if payload.department_id is not None:
            module.department_id = payload.department_id
        elif hasattr(payload, "department_id") and payload.department_id is None:
            module.department_id = None
        if payload.training_id is not None:
            module.training_id = payload.training_id
        elif hasattr(payload, "training_id") and payload.training_id is None:
            module.training_id = None

        await db.flush()

        # Reload with relationships
        res = await db.execute(
            select(LearningModule)
            .options(
                selectinload(LearningModule.category),
                selectinload(LearningModule.department),
                selectinload(LearningModule.training),
                selectinload(LearningModule.creator)
            )
            .where(LearningModule.id == module.id)
        )
        return res.scalar_one()

    @staticmethod
    async def delete_module(db: AsyncSession, module_id: UUID) -> None:
        res = await db.execute(select(LearningModule).where(LearningModule.id == module_id))
        module = res.scalar_one_or_none()
        if not module:
            raise NotFoundException("Learning Module not found.")

        await db.delete(module)
        await db.flush()

    # --- Sync ---
    @staticmethod
    async def sync_missing_modules(db: AsyncSession) -> int:
        """Create LearningModules for all trainings that don't have a linked module yet."""
        from app.trainings.models import Training
        # Get training_ids that already have a module
        existing_mod_training_ids = (
            select(LearningModule.training_id)
            .where(LearningModule.training_id.isnot(None))
            .scalar_subquery()
        )
        trainings_stmt = select(Training).where(
            Training.id.notin_(existing_mod_training_ids)
        )
        result = await db.execute(trainings_stmt)
        trainings = result.scalars().all()

        created = 0
        for training in trainings:
            module = LearningModule(
                title=training.title,
                description=training.description,
                category_id=training.category_id,
                department_id=None,
                training_id=training.id,
                created_by=training.created_by,
            )
            db.add(module)
            created += 1

        if created:
            await db.flush()
        return created


    # --- Bookmarks ---
    @staticmethod
    async def toggle_bookmark(db, user_id, module_id=None, material_id=None):
        from app.utils.exceptions import BadRequestException
        if not module_id and not material_id:
            raise BadRequestException("Must provide module_id or material_id")
            
        stmt = select(Bookmark).where(Bookmark.user_id == user_id)
        if module_id:
            stmt = stmt.where(Bookmark.module_id == module_id)
        if material_id:
            stmt = stmt.where(Bookmark.material_id == material_id)
            
        res = await db.execute(stmt)
        existing = res.scalar_one_or_none()
        
        if existing:
            await db.delete(existing)
            await db.flush()
            return {"status": "removed"}
        else:
            bookmark = Bookmark(user_id=user_id, module_id=module_id, material_id=material_id)
            db.add(bookmark)
            await db.flush()
            return {"status": "added"}

    @staticmethod
    async def get_quick_filter_counts(db, user_id, user_role) -> LearningHubQuickFilterCounts:
        is_admin = user_role.lower() == "admin"
        
        # 1. My Modules
        employee_stmt = select(Employee.id).where(Employee.user_id == user_id)
        emp_res = await db.execute(employee_stmt)
        emp_id = emp_res.scalar_one_or_none()
        
        my_modules_stmt = select(func.count(func.distinct(LearningModule.id)))
        my_modules_conds = []
        if emp_id:
            enrolled_trainings_subq = select(Enrollment.training_id).where(
                and_(Enrollment.employee_id == emp_id, Enrollment.status == EnrollmentStatus.APPROVED)
            )
            my_modules_conds.append(LearningModule.training_id.in_(enrolled_trainings_subq))
            
        materials_uploaded_subq = select(LearningMaterial.module_id).where(LearningMaterial.created_by == user_id)
        my_modules_conds.append(LearningModule.id.in_(materials_uploaded_subq))
        
        if my_modules_conds:
            my_modules_stmt = my_modules_stmt.where(or_(*my_modules_conds))
        else:
            my_modules_stmt = my_modules_stmt.where(False)
            
        my_modules_count = (await db.execute(my_modules_stmt)).scalar() or 0
        
        # 2. Recent Uploads (any module with materials)
        recent_uploads_stmt = select(func.count(func.distinct(LearningModule.id))).join(LearningMaterial).where(
            LearningMaterial.is_approved == True if not is_admin else True
        )
        recent_uploads_count = (await db.execute(recent_uploads_stmt)).scalar() or 0
        
        # 3. Popular
        popular_count = recent_uploads_count
        
        # 4. Bookmarks
        bookmarks_subq = select(Bookmark.module_id).where(and_(Bookmark.user_id == user_id, Bookmark.module_id.isnot(None)))
        materials_bookmarks_subq = select(LearningMaterial.module_id).join(Bookmark, Bookmark.material_id == LearningMaterial.id).where(Bookmark.user_id == user_id)
        bookmarks_stmt = select(func.count(func.distinct(LearningModule.id))).where(or_(
            LearningModule.id.in_(bookmarks_subq),
            LearningModule.id.in_(materials_bookmarks_subq)
        ))
        bookmarks_count = (await db.execute(bookmarks_stmt)).scalar() or 0
        
        return LearningHubQuickFilterCounts(
            my_modules=my_modules_count,
            recent_uploads=recent_uploads_count,
            popular=popular_count,
            bookmarks=bookmarks_count
        )

    # --- Analytics ---
    @staticmethod
    async def get_all_modules(
        db: AsyncSession,
        page: int,
        per_page: int,
        category_id: Optional[UUID],
        department_id: Optional[UUID],
        training_id: Optional[UUID],
        search: Optional[str],
        sort_by: Optional[str],
        user_role: str,
        user_id: UUID
    ) -> Tuple[List[LearningModule], int]:
        stmt = select(LearningModule)

        # Filters
        if category_id:
            stmt = stmt.where(LearningModule.category_id == category_id)

        if training_id:
            stmt = stmt.where(LearningModule.training_id == training_id)

        if department_id:
            # Department filter rule: return global (null dept), matching target dept, 
            # or matching any module where employees of this department contributed materials
            contributor_subquery = (
                select(LearningMaterial.module_id)
                .join(User, LearningMaterial.created_by == User.id)
                .join(Employee, User.id == Employee.user_id)
                .where(Employee.department_id == department_id)
            )
            stmt = stmt.where(
                or_(
                    LearningModule.department_id == department_id,
                    LearningModule.department_id.is_(None),
                    LearningModule.id.in_(contributor_subquery)
                )
            )

        if search:
            search_filter = f"%{search}%"
            material_exists_subquery = (
                select(1)
                .where(
                    and_(
                        LearningMaterial.module_id == LearningModule.id,
                        or_(
                            LearningMaterial.title.ilike(search_filter),
                            LearningMaterial.description.ilike(search_filter)
                        )
                    )
                )
                .exists()
            )
            stmt = stmt.where(
                or_(
                    LearningModule.title.ilike(search_filter),
                    LearningModule.description.ilike(search_filter),
                    material_exists_subquery
                )
            )


        # Quick Filters
        if quick_filter:
            if quick_filter == "my_modules":
                emp_id = (await db.execute(select(Employee.id).where(Employee.user_id == user_id))).scalar_one_or_none()
                conds = [LearningModule.id.in_(select(LearningMaterial.module_id).where(LearningMaterial.created_by == user_id))]
                if emp_id:
                    conds.append(LearningModule.training_id.in_(select(Enrollment.training_id).where(and_(Enrollment.employee_id == emp_id, Enrollment.status == EnrollmentStatus.APPROVED))))
                stmt = stmt.where(or_(*conds))
            elif quick_filter == "bookmarks":
                b_mods = select(Bookmark.module_id).where(and_(Bookmark.user_id == user_id, Bookmark.module_id.isnot(None)))
                b_mats = select(LearningMaterial.module_id).join(Bookmark, Bookmark.material_id == LearningMaterial.id).where(Bookmark.user_id == user_id)
                stmt = stmt.where(or_(LearningModule.id.in_(b_mods), LearningModule.id.in_(b_mats)))
            elif quick_filter == "popular":
                # We sort by views (which sort_by="most_viewed" handles), but let's ensure we only show modules with materials
                stmt = stmt.join(LearningMaterial, LearningMaterial.module_id == LearningModule.id).group_by(LearningModule.id)
            elif quick_filter == "recent_uploads":
                # Ensure we only show modules with materials
                stmt = stmt.join(LearningMaterial, LearningMaterial.module_id == LearningModule.id).group_by(LearningModule.id)

        # Sorting
        if sort_by == "most_viewed":
            views_sum_subquery = (
                select(func.coalesce(func.sum(LearningMaterial.views), 0))
                .where(LearningMaterial.module_id == LearningModule.id)
                .scalar_subquery()
            )
            stmt = stmt.order_by(views_sum_subquery.desc(), LearningModule.title.asc())
        elif sort_by == "alphabetical":
            stmt = stmt.order_by(LearningModule.title.asc())
        else:  # recently_added / default
            # We want to sort by latest updated_at of the module (or its materials)
            stmt = stmt.order_by(LearningModule.updated_at.desc())

        # Eager load relationships needed for response
        stmt = stmt.options(
            selectinload(LearningModule.category),
            selectinload(LearningModule.department),
            selectinload(LearningModule.training),
            selectinload(LearningModule.creator),
            selectinload(LearningModule.materials).selectinload(LearningMaterial.creator)
        )

        # Paginate
        modules, total = await paginate_query(db, stmt, page, per_page)

        # Compute summary fields for each paginated module
        is_admin = user_role.lower() == "admin"
        for m in modules:
            filtered_materials = [
                mat for mat in m.materials 
                if is_admin or mat.is_approved or mat.created_by == user_id
            ]
            m.material_count = len(filtered_materials)
            contributors = {mat.created_by for mat in filtered_materials if mat.created_by}
            m.contributor_count = len(contributors)
            
            material_updates = [mat.updated_at for mat in filtered_materials]
            m.last_updated_date = max([m.updated_at] + material_updates) if material_updates else m.updated_at
            
        # Bulk check bookmarks for these modules and their materials
        if modules:
            mod_ids = [m.id for m in modules]
            mat_ids = [mat.id for m in modules for mat in m.materials]
            bm_res = await db.execute(select(Bookmark.module_id, Bookmark.material_id).where(
                and_(Bookmark.user_id == user_id, or_(Bookmark.module_id.in_(mod_ids), Bookmark.material_id.in_(mat_ids)))
            ))
            bm_rows = bm_res.all()
            bm_mods = {r[0] for r in bm_rows if r[0]}
            bm_mats = {r[1] for r in bm_rows if r[1]}
            
            for m in modules:
                m.is_bookmarked = m.id in bm_mods
                for mat in m.materials:
                    mat.is_bookmarked = mat.id in bm_mats

        return modules, total

    # --- Materials ---
    @staticmethod
    async def add_material(
        db: AsyncSession,
        payload: LearningMaterialCreate,
        file_path: Optional[str],
        file_type: Optional[str],
        user_id: UUID
    ) -> LearningMaterial:
        # Check that module exists
        res = await db.execute(select(LearningModule).where(LearningModule.id == payload.module_id))
        if not res.scalar_one_or_none():
            raise NotFoundException("Learning Module not found.")

        material = LearningMaterial(
            module_id=payload.module_id,
            title=payload.title,
            description=payload.description,
            file_path=file_path,
            file_type=file_type,
            external_url=payload.external_url,
            tags=payload.tags,
            views=0,
            is_approved=True,  # Default auto-approved, can be governed by admin later
            created_by=user_id
        )
        db.add(material)
        await db.flush()

        # Reload with relationships
        res = await db.execute(
            select(LearningMaterial)
            .options(selectinload(LearningMaterial.creator))
            .where(LearningMaterial.id == material.id)
        )
        return res.scalar_one()

    @staticmethod
    async def update_material(
        db: AsyncSession,
        material_id: UUID,
        payload: LearningMaterialUpdate,
        file_path: Optional[str],
        file_type: Optional[str],
        user_role: str,
        user_id: UUID
    ) -> LearningMaterial:
        res = await db.execute(select(LearningMaterial).where(LearningMaterial.id == material_id))
        material = res.scalar_one_or_none()
        if not material:
            raise NotFoundException("Learning Material not found.")

        # Check permissions: Employees CANNOT edit other employee uploads
        if user_role.lower() != "admin" and material.created_by != user_id:
            raise BadRequestException("You do not have permission to edit this material.")

        if payload.title is not None:
            material.title = payload.title
        if payload.description is not None:
            material.description = payload.description
        if payload.external_url is not None:
            material.external_url = payload.external_url
        if payload.tags is not None:
            material.tags = payload.tags
        if payload.is_approved is not None and user_role.lower() == "admin":
            material.is_approved = payload.is_approved

        if file_path is not None:
            material.file_path = file_path
            material.file_type = file_type

        await db.flush()

        # Reload with relationships
        res = await db.execute(
            select(LearningMaterial)
            .options(selectinload(LearningMaterial.creator))
            .where(LearningMaterial.id == material.id)
        )
        return res.scalar_one()

    @staticmethod
    async def delete_material(db: AsyncSession, material_id: UUID, user_role: str, user_id: UUID) -> None:
        res = await db.execute(select(LearningMaterial).where(LearningMaterial.id == material_id))
        material = res.scalar_one_or_none()
        if not material:
            raise NotFoundException("Learning Material not found.")

        # Employees CANNOT delete materials at all
        if user_role.lower() != "admin":
            raise BadRequestException("Only administrators can delete materials.")

        await db.delete(material)
        await db.flush()

    @staticmethod
    async def increment_material_views(db: AsyncSession, material_id: UUID) -> None:
        res = await db.execute(select(LearningMaterial).where(LearningMaterial.id == material_id))
        material = res.scalar_one_or_none()
        if material:
            material.views += 1
            await db.flush()

    # --- Sync ---
    @staticmethod
    async def sync_missing_modules(db: AsyncSession) -> int:
        """Create LearningModules for all trainings that don't have a module yet."""
        from app.trainings.models import Training
        # Get all trainings without a linked module
        existing_mod_training_ids = (
            select(LearningModule.training_id)
            .where(LearningModule.training_id.isnot(None))
            .scalar_subquery()
        )
        trainings_stmt = select(Training).where(
            Training.id.notin_(existing_mod_training_ids)
        )
        result = await db.execute(trainings_stmt)
        trainings = result.scalars().all()

        created = 0
        for training in trainings:
            module = LearningModule(
                title=training.title,
                description=training.description,
                category_id=training.category_id,
                department_id=None,
                training_id=training.id,
                created_by=training.created_by,
            )
            db.add(module)
            created += 1

        if created:
            await db.flush()
        return created


    # --- Bookmarks ---
    @staticmethod
    async def toggle_bookmark(db, user_id, module_id=None, material_id=None):
        from app.utils.exceptions import BadRequestException
        if not module_id and not material_id:
            raise BadRequestException("Must provide module_id or material_id")
            
        stmt = select(Bookmark).where(Bookmark.user_id == user_id)
        if module_id:
            stmt = stmt.where(Bookmark.module_id == module_id)
        if material_id:
            stmt = stmt.where(Bookmark.material_id == material_id)
            
        res = await db.execute(stmt)
        existing = res.scalar_one_or_none()
        
        if existing:
            await db.delete(existing)
            await db.flush()
            return {"status": "removed"}
        else:
            bookmark = Bookmark(user_id=user_id, module_id=module_id, material_id=material_id)
            db.add(bookmark)
            await db.flush()
            return {"status": "added"}

    @staticmethod
    async def get_quick_filter_counts(db, user_id, user_role) -> LearningHubQuickFilterCounts:
        is_admin = user_role.lower() == "admin"
        
        # 1. My Modules
        employee_stmt = select(Employee.id).where(Employee.user_id == user_id)
        emp_res = await db.execute(employee_stmt)
        emp_id = emp_res.scalar_one_or_none()
        
        my_modules_stmt = select(func.count(func.distinct(LearningModule.id)))
        my_modules_conds = []
        if emp_id:
            enrolled_trainings_subq = select(Enrollment.training_id).where(
                and_(Enrollment.employee_id == emp_id, Enrollment.status == EnrollmentStatus.APPROVED)
            )
            my_modules_conds.append(LearningModule.training_id.in_(enrolled_trainings_subq))
            
        materials_uploaded_subq = select(LearningMaterial.module_id).where(LearningMaterial.created_by == user_id)
        my_modules_conds.append(LearningModule.id.in_(materials_uploaded_subq))
        
        if my_modules_conds:
            my_modules_stmt = my_modules_stmt.where(or_(*my_modules_conds))
        else:
            my_modules_stmt = my_modules_stmt.where(False)
            
        my_modules_count = (await db.execute(my_modules_stmt)).scalar() or 0
        
        # 2. Recent Uploads (any module with materials)
        recent_uploads_stmt = select(func.count(func.distinct(LearningModule.id))).join(LearningMaterial).where(
            LearningMaterial.is_approved == True if not is_admin else True
        )
        recent_uploads_count = (await db.execute(recent_uploads_stmt)).scalar() or 0
        
        # 3. Popular
        popular_count = recent_uploads_count
        
        # 4. Bookmarks
        bookmarks_subq = select(Bookmark.module_id).where(and_(Bookmark.user_id == user_id, Bookmark.module_id.isnot(None)))
        materials_bookmarks_subq = select(LearningMaterial.module_id).join(Bookmark, Bookmark.material_id == LearningMaterial.id).where(Bookmark.user_id == user_id)
        bookmarks_stmt = select(func.count(func.distinct(LearningModule.id))).where(or_(
            LearningModule.id.in_(bookmarks_subq),
            LearningModule.id.in_(materials_bookmarks_subq)
        ))
        bookmarks_count = (await db.execute(bookmarks_stmt)).scalar() or 0
        
        return LearningHubQuickFilterCounts(
            my_modules=my_modules_count,
            recent_uploads=recent_uploads_count,
            popular=popular_count,
            bookmarks=bookmarks_count
        )

    # --- Analytics ---
    @staticmethod
    async def get_analytics(db: AsyncSession) -> LearningHubAnalyticsResponse:
        # Total Modules
        modules_count = (await db.execute(select(func.count(LearningModule.id)))).scalar() or 0

        # Total Materials
        materials_count = (await db.execute(select(func.count(LearningMaterial.id)))).scalar() or 0

        # Most Viewed Materials
        most_viewed_stmt = (
            select(
                LearningMaterial.id,
                LearningMaterial.title,
                LearningMaterial.module_id,
                LearningModule.title.label("module_title"),
                LearningMaterial.views
            )
            .join(LearningModule, LearningMaterial.module_id == LearningModule.id)
            .order_by(desc(LearningMaterial.views))
            .limit(5)
        )
        most_viewed_res = await db.execute(most_viewed_stmt)
        most_viewed = [
            MostViewedMaterial(
                id=r[0],
                title=r[1],
                module_id=r[2],
                module_title=r[3],
                views=r[4]
            )
            for r in most_viewed_res.all()
        ]

        # Most Active Contributors
        contributors_stmt = (
            select(
                User.id,
                User.full_name,
                User.email,
                func.count(LearningMaterial.id).label("material_count")
            )
            .join(LearningMaterial, User.id == LearningMaterial.created_by)
            .group_by(User.id, User.full_name, User.email)
            .order_by(desc("material_count"))
            .limit(5)
        )
        contributors_res = await db.execute(contributors_stmt)
        most_active = [
            MostActiveContributor(
                user_id=r[0],
                full_name=r[1],
                email=r[2],
                material_count=r[3]
            )
            for r in contributors_res.all()
        ]

        # Recent Uploads
        recent_stmt = (
            select(
                LearningMaterial.id,
                LearningMaterial.title,
                LearningMaterial.module_id,
                LearningModule.title.label("module_title"),
                User.full_name.label("uploaded_by"),
                LearningMaterial.created_at
            )
            .join(LearningModule, LearningMaterial.module_id == LearningModule.id)
            .outerjoin(User, LearningMaterial.created_by == User.id)
            .order_by(desc(LearningMaterial.created_at))
            .limit(5)
        )
        recent_res = await db.execute(recent_stmt)
        recent = [
            RecentUpload(
                id=r[0],
                title=r[1],
                module_id=r[2],
                module_title=r[3],
                uploaded_by=r[4] or "System",
                uploaded_at=r[5]
            )
            for r in recent_res.all()
        ]

        return LearningHubAnalyticsResponse(
            total_modules=modules_count,
            total_materials=materials_count,
            most_viewed=most_viewed,
            most_active_contributors=most_active,
            recent_uploads=recent
        )
