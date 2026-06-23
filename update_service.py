import re

with open('backend/app/learning_hub/service.py', 'r') as f:
    content = f.read()

# 1. Update imports
content = content.replace(
    'from app.learning_hub.models import LearningCategory, LearningModule, LearningMaterial',
    'from app.learning_hub.models import LearningCategory, LearningModule, LearningMaterial, Bookmark'
)

if 'LearningHubQuickFilterCounts' not in content:
    content = content.replace(
        'LearningHubAnalyticsResponse,',
        'LearningHubAnalyticsResponse,\n    LearningHubQuickFilterCounts,'
    )

if 'from app.enrollments.models import Enrollment' not in content:
    content = content.replace(
        'from app.employees.models import Employee',
        'from app.employees.models import Employee\nfrom app.enrollments.models import Enrollment, EnrollmentStatus'
    )

# 2. Add bookmark methods and quick filter counts
bookmark_methods = """
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

"""

if 'def toggle_bookmark' not in content:
    content = content.replace('    # --- Analytics ---', bookmark_methods + '    # --- Analytics ---')

# 3. Update get_all_modules signature and logic
old_sig = """    def get_all_modules(
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
    ) -> Tuple[List[LearningModule], int]:"""

new_sig = """    def get_all_modules(
        db: AsyncSession,
        page: int,
        per_page: int,
        category_id: Optional[UUID],
        department_id: Optional[UUID],
        training_id: Optional[UUID],
        search: Optional[str],
        sort_by: Optional[str],
        quick_filter: Optional[str],
        user_role: str,
        user_id: UUID
    ) -> Tuple[List[LearningModule], int]:"""

if 'quick_filter: Optional[str],' not in content:
    content = content.replace(old_sig, new_sig)

    filter_logic_injection = """
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

        # Sorting"""
    content = content.replace('        # Sorting', filter_logic_injection)

# Add is_bookmarked check in the loop at the end of get_all_modules
old_loop = """            material_updates = [mat.updated_at for mat in filtered_materials]
            m.last_updated_date = max([m.updated_at] + material_updates) if material_updates else m.updated_at"""

new_loop = """            material_updates = [mat.updated_at for mat in filtered_materials]
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
                    mat.is_bookmarked = mat.id in bm_mats"""

if '# Bulk check bookmarks' not in content:
    content = content.replace(old_loop, new_loop)

# Also update `get_module` to return `is_bookmarked`
old_get_module = """        module.last_updated_date = max([module.updated_at] + material_updates) if material_updates else module.updated_at
        
        # Override the materials property list with filtered materials for returning in response
        module.materials = filtered_materials"""

new_get_module = """        module.last_updated_date = max([module.updated_at] + material_updates) if material_updates else module.updated_at
        
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
        module.materials = filtered_materials"""

if 'module.is_bookmarked = module.id in bm_mods' not in content:
    content = content.replace(old_get_module, new_get_module)


with open('backend/app/learning_hub/service.py', 'w') as f:
    f.write(content)
