from typing import Any, Optional, Tuple, Type, TypeVar

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

ModelT = TypeVar("ModelT")


async def paginate(
    db: AsyncSession,
    model: Type[ModelT],
    page: int = 1,
    per_page: int = 20,
    filters: Optional[Any] = None,
    sort_by: Optional[str] = None,
    descending: bool = False,
) -> Tuple[list, int]:
    """
    Generic async paginator for a SQLAlchemy model.

    Returns (items, total_count).
    """
    from sqlalchemy import asc, desc

    offset = (page - 1) * per_page

    count_stmt = select(func.count()).select_from(model)  # type: ignore[arg-type]
    if filters is not None:
        count_stmt = count_stmt.where(filters)
    total = (await db.execute(count_stmt)).scalar_one()

    data_stmt = select(model)  # type: ignore[arg-type]
    if filters is not None:
        data_stmt = data_stmt.where(filters)

    if sort_by is not None:
        col = getattr(model, sort_by, None)
        if col is not None:
            data_stmt = data_stmt.order_by(desc(col) if descending else asc(col))

    data_stmt = data_stmt.offset(offset).limit(per_page)
    items = (await db.execute(data_stmt)).scalars().all()

    return list(items), total


async def paginate_query(
    db: AsyncSession,
    stmt: Any,
    page: int = 1,
    per_page: int = 20,
) -> Tuple[list, int]:
    """
    Paginate a pre-constructed SQLAlchemy select statement.
    """
    offset = (page - 1) * per_page

    count_stmt = select(func.count()).select_from(stmt.subquery())
    total = (await db.execute(count_stmt)).scalar_one()

    data_stmt = stmt.offset(offset).limit(per_page)
    result = await db.execute(data_stmt)
    
    # If the statement selects multiple columns, we want the full rows.
    # If it selects only one entity/column, .scalars() is usually preferred.
    if len(stmt.column_descriptions) > 1:
        items = result.all()
    else:
        items = result.scalars().all()

    return list(items), total

