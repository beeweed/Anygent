from __future__ import annotations

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse

from src.agent.agent import AutonomousAgent
from src.agent.models import ChatRequest, ProviderModelsRequest, ResetSessionRequest, SandboxFileResponse, SandboxTreeResponse
from src.config.settings import get_settings
from src.services.provider_registry import ProviderRegistry
from src.services.sandbox_service import SandboxService
from src.services.session_service import SessionManager
from src.tools.registry import ToolRegistry
from src.utils.errors import AppError

settings = get_settings()
session_manager = SessionManager()
provider_registry = ProviderRegistry(settings)
sandbox_service = SandboxService(settings)
tool_registry = ToolRegistry(settings.sandbox_root)
agent = AutonomousAgent(
    session_manager=session_manager,
    sandbox_service=sandbox_service,
    provider_registry=provider_registry,
    tool_registry=tool_registry,
)

app = FastAPI(title=settings.app_name)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(AppError)
async def app_error_handler(_, exc: AppError):
    return JSONResponse(status_code=exc.status_code, content=exc.to_dict())


@app.get("/health")
@app.get(f"{settings.api_prefix}/health")
async def health_check():
    return {"status": "healthy", "app": settings.app_name}


@app.get(f"{settings.api_prefix}/providers")
async def list_providers():
    return {"providers": [provider.model_dump() for provider in provider_registry.list_providers()]}


@app.post(f"{settings.api_prefix}/providers/models")
async def fetch_provider_models(request: ProviderModelsRequest):
    models = await provider_registry.fetch_models(request.provider, request.api_key, request.base_url)
    return {"models": [model.model_dump() for model in models]}


@app.post(f"{settings.api_prefix}/chat/stream")
async def chat_stream(request: ChatRequest):
    generator = agent.stream_chat(request)
    return StreamingResponse(generator, media_type="text/event-stream")


@app.get(f"{settings.api_prefix}/sandbox/tree", response_model=SandboxTreeResponse)
async def sandbox_tree(session_id: str = Query(...)):
    session = await session_manager.get(session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found")
    return await sandbox_service.get_tree(session)


@app.get(f"{settings.api_prefix}/sandbox/file", response_model=SandboxFileResponse)
async def sandbox_file(session_id: str = Query(...), path: str = Query(...)):
    session = await session_manager.get(session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found")
    return await sandbox_service.read_file(session, path)


@app.post(f"{settings.api_prefix}/session/reset")
async def reset_session(request: ResetSessionRequest):
    session = await session_manager.delete(request.session_id)
    if session is None:
        return {"ok": True, "session_id": request.session_id, "deleted": False}
    await sandbox_service.dispose_sandbox(session)
    return {"ok": True, "session_id": request.session_id, "deleted": True}