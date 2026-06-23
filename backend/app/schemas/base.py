from typing import Generic, List, Optional, TypeVar

from pydantic import BaseModel

DataT = TypeVar("DataT")


class StandardResponse(BaseModel, Generic[DataT]):
    success: bool = True
    message: str = "OK"
    data: Optional[DataT] = None
    error: Optional[str] = None


class PaginationMeta(BaseModel):
    page: int
    per_page: int
    total: int
    total_pages: int


class PaginatedResponse(BaseModel, Generic[DataT]):
    success: bool = True
    message: str = "OK"
    data: List[DataT] = []
    meta: PaginationMeta
    error: Optional[str] = None
