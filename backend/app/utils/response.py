import math
from typing import Any, Optional

from fastapi.responses import JSONResponse
from fastapi.encoders import jsonable_encoder


def success_response(
    data: Any = None,
    message: str = "Success",
    status_code: int = 200,
) -> JSONResponse:
    return JSONResponse(
        status_code=status_code,
        content=jsonable_encoder({"success": True, "message": message, "data": data, "error": None}),
    )


def error_response(
    message: str = "An error occurred",
    error: Optional[str] = None,
    status_code: int = 400,
) -> JSONResponse:
    return JSONResponse(
        status_code=status_code,
        content=jsonable_encoder({"success": False, "message": message, "data": None, "error": error or message}),
    )


def paginated_response(
    data: list,
    total: int,
    page: int,
    per_page: int,
    message: str = "Success",
    extra_meta: Optional[dict] = None,
) -> JSONResponse:
    total_pages = math.ceil(total / per_page) if per_page else 1
    meta = {"page": page, "per_page": per_page, "total": total, "total_pages": total_pages}
    if extra_meta:
        meta.update(extra_meta)
    return JSONResponse(
        status_code=200,
        content=jsonable_encoder({
            "success": True,
            "message": message,
            "data": data,
            "meta": meta,
            "error": None,
        }),
    )
