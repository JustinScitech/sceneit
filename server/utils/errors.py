from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse


class PayloadTooLarge(HTTPException):
    def __init__(self, detail: str = "Payload too large"):
        super().__init__(status_code=413, detail=detail)


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(HTTPException)
    async def http_exception_handler(_: Request, exc: HTTPException):
        return JSONResponse(status_code=exc.status_code, content={"error_code": exc.status_code, "message": exc.detail})

    @app.exception_handler(Exception)
    async def generic_exception_handler(_: Request, exc: Exception):
        return JSONResponse(status_code=500, content={"error_code": 500, "message": str(exc)})


