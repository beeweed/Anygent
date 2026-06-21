from __future__ import annotations

from typing import Any


class AppError(Exception):
    def __init__(self, message: str, *, code: str = "app_error", status_code: int = 400, details: Any = None):
        super().__init__(message)
        self.message = message
        self.code = code
        self.status_code = status_code
        self.details = details

    def to_dict(self) -> dict[str, Any]:
        return {
            "error": {
                "code": self.code,
                "message": self.message,
                "details": self.details,
            }
        }


def format_exception(error: Exception) -> dict[str, Any]:
    if isinstance(error, AppError):
        return error.to_dict()

    return {
        "error": {
            "code": "internal_error",
            "message": str(error),
            "details": None,
        }
    }