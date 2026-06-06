from __future__ import annotations

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse

from src.agent.models import (
    ChatStreamRequest,
    FilePreviewResponse,
    ModelsRequest,
    SandboxSessionRequest,
)
from src.agent.react_agent import ReactAgent
from src.agent.tool_registry import ToolRegistry
from src.config.settings import settings
from src.services.openrouter_service import OpenRouterService
from src.services.sandbox_service import (
    SandboxFileNotFoundError,
    SandboxPathError,
    SandboxService,
    SandboxServiceError,
)
from src.utils.sse import sse_event

app = FastAPI(title=settings.app_name)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

sandbox_service = SandboxService()
openrouter_service = OpenRouterService()
tool_registry = ToolRegistry()
react_agent = ReactAgent(
    openrouter_service=openrouter_service,
    sandbox_service=sandbox_service,
    tool_registry=tool_registry,
)


@app.get("/health")
async def health_check() -> dict[str, str]:
    return {"status": "healthy"}


@app.get("/ready")
async def readiness_check() -> dict[str, str]:
    return {"status": "ready"}


@app.post("/api/providers/openrouter/models")
async def list_openrouter_models(request: ModelsRequest) -> JSONResponse:
    try:
        models = await openrouter_service.fetch_models(request.api_key)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Failed to fetch OpenRouter models: {exc}") from exc

    return JSONResponse({"data": [model.model_dump() for model in models]})


@app.post("/api/sandbox/session")
async def create_sandbox_session(request: SandboxSessionRequest) -> JSONResponse:
    try:
        session = await sandbox_service.ensure_session(
            session_id=request.session_id,
            api_key=request.api_key,
            template_id=request.template_id,
            timeout_seconds=request.timeout_seconds,
        )
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Failed to create sandbox: {exc}") from exc

    return JSONResponse(session.model_dump(mode="json"))


@app.get("/api/sandbox/{session_id}/tree")
async def get_sandbox_tree(session_id: str) -> JSONResponse:
    try:
        tree = await sandbox_service.list_tree(session_id)
    except SandboxServiceError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    return JSONResponse({"tree": [node.model_dump() for node in tree]})


@app.get("/api/sandbox/{session_id}/file")
async def get_sandbox_file(
    session_id: str,
    path: str = Query(..., description="Absolute sandbox file path"),
) -> FilePreviewResponse:
    try:
        content = await sandbox_service.get_file_preview(session_id, path)
    except SandboxFileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except SandboxPathError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except SandboxServiceError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    return FilePreviewResponse(path=path, content=content)


@app.post("/api/chat/stream")
async def stream_chat(request: ChatStreamRequest) -> StreamingResponse:
    async def event_stream():
        try:
            async for event in react_agent.stream(request):
                yield sse_event(event)
        except Exception as exc:  # pragma: no cover - runtime stream guard
            yield sse_event({"type": "error", "data": {"message": str(exc)}})

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )