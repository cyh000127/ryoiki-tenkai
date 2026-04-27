from typing import TypeVar

from pydantic import BaseModel, ConfigDict


def to_camel(value: str) -> str:
    head, *tail = value.split("_")
    return head + "".join(part.capitalize() for part in tail)


class ApiSchema(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        from_attributes=True,
    )


DataT = TypeVar("DataT")


class ApiError(ApiSchema):
    code: str
    message: str


class ApiResponse[DataT](ApiSchema):
    success: bool
    data: DataT | None = None
    error: ApiError | None = None


def ok[DataT](data: DataT) -> ApiResponse[DataT]:
    return ApiResponse(success=True, data=data, error=None)
