from __future__ import annotations

from typing import Any, Literal, Optional

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


class ProviderModel(BaseModel):
    id: str
    name: str
    provider: str
    description: str | None = None
    context_length: int | None = None
    supports_tools: bool = False
    metadata: dict[str, Any] = Field(default_factory=dict)


class ProviderDefinition(BaseModel):
    id: Literal["openrouter", "nvidia"]
    name: str
    requires_base_url: bool = False
    key_label: str
    model_source_label: str


class ProviderModelsRequest(BaseModel):
    provider: Literal["openrouter", "nvidia"]
    api_key: str
    base_url: Optional[str] = None


class ChatRequest(BaseModel):
    session_id: Optional[str] = None
    message: str = Field(min_length=1)
    provider: Literal["openrouter", "nvidia"]
    model: str = Field(min_length=1)
    openrouter_api_key: Optional[str] = None
    nvidia_api_key: Optional[str] = None
    nvidia_base_url: Optional[str] = None
    e2b_api_key: Optional[str] = None
    e2b_template_id: Optional[str] = None


class ResetSessionRequest(BaseModel):
    session_id: str


class SandboxTreeResponse(BaseModel):
    root: str
    tree: list[dict[str, Any]]


class SandboxFileResponse(BaseModel):
    path: str
    content: str
    language: str


class StreamEvent(BaseModel):
    event: str
    data: dict[str, Any]