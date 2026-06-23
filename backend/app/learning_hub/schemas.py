from datetime import datetime
from typing import Optional, List, Any
from uuid import UUID
from pydantic import BaseModel, Field

# --- Bookmarks ---
class BookmarkCreate(BaseModel):
    module_id: Optional[UUID] = None
    material_id: Optional[UUID] = None

class BookmarkResponse(BaseModel):
    id: UUID
    user_id: UUID
    module_id: Optional[UUID] = None
    material_id: Optional[UUID] = None
    created_at: datetime

    model_config = {"from_attributes": True}


# --- Category ---
class LearningCategoryBase(BaseModel):
    name: str
    description: Optional[str] = None


class LearningCategoryCreate(LearningCategoryBase):
    pass


class LearningCategoryResponse(LearningCategoryBase):
    id: UUID
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# --- Material ---
class LearningMaterialBase(BaseModel):
    title: str
    description: Optional[str] = None
    external_url: Optional[str] = None
    tags: Optional[str] = None  # Comma-separated
    is_approved: bool = True


class LearningMaterialCreate(BaseModel):
    module_id: UUID
    title: str
    description: Optional[str] = None
    external_url: Optional[str] = None
    tags: Optional[str] = None  # Comma-separated


class LearningMaterialUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    external_url: Optional[str] = None
    tags: Optional[str] = None
    is_approved: Optional[bool] = None


# User Summary for creator info
class UserSummary(BaseModel):
    id: UUID
    full_name: str
    email: str

    model_config = {"from_attributes": True}


class LearningMaterialResponse(BaseModel):
    id: UUID
    module_id: UUID
    title: str
    description: Optional[str] = None
    file_path: Optional[str] = None
    file_type: Optional[str] = None
    external_url: Optional[str] = None
    tags: Optional[str] = None
    views: int
    is_approved: bool
    created_by: Optional[UUID] = None
    creator: Optional[UserSummary] = None
    created_at: datetime
    updated_at: datetime
    is_bookmarked: bool = False

    model_config = {"from_attributes": True}



# --- Module ---
class LearningModuleBase(BaseModel):
    title: str
    description: Optional[str] = None
    category_id: Optional[UUID] = None
    department_id: Optional[UUID] = None
    training_id: Optional[UUID] = None


class LearningModuleCreate(LearningModuleBase):
    pass


class LearningModuleUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category_id: Optional[UUID] = None
    department_id: Optional[UUID] = None
    training_id: Optional[UUID] = None


# Department Summary
class DepartmentSummary(BaseModel):
    id: UUID
    name: str
    code: str

    model_config = {"from_attributes": True}


# Training Summary
class TrainingSummary(BaseModel):
    id: UUID
    title: str

    model_config = {"from_attributes": True}


class LearningModuleResponse(BaseModel):
    id: UUID
    title: str
    description: Optional[str] = None
    category_id: Optional[UUID] = None
    category: Optional[LearningCategoryResponse] = None
    department_id: Optional[UUID] = None
    department: Optional[DepartmentSummary] = None
    training_id: Optional[UUID] = None
    training: Optional[TrainingSummary] = None
    created_by: Optional[UUID] = None
    creator: Optional[UserSummary] = None
    created_at: datetime
    updated_at: datetime

    # Summary counts and computed stats for hub dashboard list
    material_count: int = 0
    contributor_count: int = 0
    last_updated_date: Optional[datetime] = None
    is_bookmarked: bool = False

    model_config = {"from_attributes": True}



# --- Analytics Response ---
class MostViewedMaterial(BaseModel):
    id: UUID
    title: str
    module_id: UUID
    module_title: str
    views: int


class MostActiveContributor(BaseModel):
    user_id: UUID
    full_name: str
    email: str
    material_count: int


class RecentUpload(BaseModel):
    id: UUID
    title: str
    module_id: UUID
    module_title: str
    uploaded_by: str
    uploaded_at: datetime


class LearningHubAnalyticsResponse(BaseModel):
    total_modules: int
    total_materials: int
    most_viewed: List[MostViewedMaterial]
    most_active_contributors: List[MostActiveContributor]
    recent_uploads: List[RecentUpload]

# --- Quick Filter Counts ---
class LearningHubQuickFilterCounts(BaseModel):
    my_modules: int = 0
    recent_uploads: int = 0
    popular: int = 0
    bookmarks: int = 0
