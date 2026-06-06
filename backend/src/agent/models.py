from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field


class UserMessage(BaseModel):
    content: str
    role: str = "user"


class AssistantMessage(BaseModel):
    content: str
    role: str = "assistant"


class ToolUse(BaseModel):
    type: str = "tool_use"
    id: str
    name: str
    input: dict


class ToolUseMessage(BaseModel):
    role: str = "assistant"
    content: list[ToolUse]


class ToolResult(BaseModel):
    type: str = "tool_result"
    tool_use_id: str
    content: str
    is_error: bool


class ToolResultMessage(BaseModel):
    role: str = "user"
    content: list[ToolResult]


class ClientMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str = ""


class ProviderConfig(BaseModel):
    provider: Literal["openrouter"] = "openrouter"
    api_key: str = Field(min_length=1)
    model_id: str = Field(min_length=1)


class SandboxConfig(BaseModel):
    api_key: str = Field(min_length=1)
    template_id: str | None = None
    timeout_seconds: int = 3600


class ChatStreamRequest(BaseModel):
    session_id: str = Field(min_length=1)
    messages: list[ClientMessage]
    provider: ProviderConfig
    sandbox: SandboxConfig


class ModelsRequest(BaseModel):
    api_key: str = Field(min_length=1)


class SandboxSessionRequest(BaseModel):
    session_id: str = Field(min_length=1)
    api_key: str = Field(min_length=1)
    template_id: str | None = None
    timeout_seconds: int = 3600


class FileTreeNode(BaseModel):
    path: str
    name: str
    type: Literal["file", "directory"]
    children: list["FileTreeNode"] = Field(default_factory=list)


class FilePreviewResponse(BaseModel):
    path: str
    content: str


class ModelPricing(BaseModel):
    prompt: str | None = None
    completion: str | None = None
    request: str | None = None
    image: str | None = None


class OpenRouterModelOption(BaseModel):
    id: str
    name: str
    description: str = ""
    context_length: int | None = None
    pricing: ModelPricing = Field(default_factory=ModelPricing)
    supported_parameters: list[str] = Field(default_factory=list)
    architecture: dict[str, Any] = Field(default_factory=dict)


class SandboxSessionResponse(BaseModel):
    session_id: str
    sandbox_id: str
    template_id: str | None = None
    timeout_seconds: int
    created_at: datetime
    tree: list[FileTreeNode] = Field(default_factory=list)


class ToolExecutionResult(BaseModel):
    content: str
    is_error: bool = False
    touched_paths: list[str] = Field(default_factory=list)


class StreamEvent(BaseModel):
    type: str
    data: dict[str, Any] = Field(default_factory=dict)