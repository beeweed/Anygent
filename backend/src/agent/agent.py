import json
import re
import asyncio
from dataclasses import dataclass
from typing import AsyncGenerator, Optional, Callable, Any
from uuid import uuid4

from src.agent.models import ChatRequest
from src.agent.systemprompt import SYSTEM_PROMPT
from src.services.provider_registry import ProviderRegistry
from src.services.sandbox_service import SandboxService
from src.services.session_service import SessionManager
from src.tools.registry import ToolRegistry
from src.utils.errors import AppError, format_exception
from src.utils.sse import sse_event


@dataclass
class ProviderStreamResult:
    content: str
    tool_calls: list[dict[str, Any]]
    finish_reason: Optional[str]


class AutonomousAgent:
    def __init__(
        self,
        *,
        session_manager: SessionManager,
        sandbox_service: SandboxService,
        provider_registry: ProviderRegistry,
        tool_registry: ToolRegistry,
    ):
        self.session_manager = session_manager
        self.sandbox_service = sandbox_service
        self.provider_registry = provider_registry
        self.tool_registry = tool_registry

    async def stream_chat(self, request: ChatRequest) -> AsyncGenerator[str, None]:
        state = await self.session_manager.get_or_create(request.session_id)
        assistant_message_id = str(uuid4())
        accumulated_response: list[str] = []

        try:
            async with state.lock:
                self._ensure_system_message(state)
                state.iteration_count = 0
                state.last_provider = request.provider
                state.last_model = request.model

                provider_api_key = self.provider_registry.get_api_key(request.provider, request.model_dump())
                if not request.e2b_api_key:
                    raise AppError("Missing E2B API key.", code="missing_e2b_key", status_code=400)

                yield sse_event(
                    "session",
                    {
                        "session_id": state.session_id,
                        "assistant_message_id": assistant_message_id,
                        "max_iterations": state.max_iterations,
                        "sandbox_id": state.sandbox_id,
                    },
                )
                yield sse_event("assistant_start", {"message_id": assistant_message_id})

                if state.sandbox is None:
                    yield sse_event(
                        "status",
                        {
                            "message_id": assistant_message_id,
                            "phase": "creating_sandbox",
                            "label": "creating sandbox...",
                        },
                    )
                    await self.sandbox_service.ensure_sandbox(
                        state=state,
                        api_key=request.e2b_api_key,
                        template_id=request.e2b_template_id,
                    )

                yield sse_event(
                    "status",
                    {
                        "message_id": assistant_message_id,
                        "phase": "thinking",
                        "label": "thinking....",
                        "sandbox_id": state.sandbox_id,
                    },
                )

                state.conversation.append({"role": "user", "content": request.message})
                state.timeline.append({"role": "user", "content": request.message})

                while state.iteration_count < state.max_iterations:
                    state.iteration_count += 1
                    yield sse_event(
                        "iteration",
                        {
                            "message_id": assistant_message_id,
                            "current": state.iteration_count,
                            "max": state.max_iterations,
                        },
                    )

                    content_parts: list[str] = []
                    finish_reason: Optional[str] = None
                    tool_calls_by_index: dict[int, dict[str, Any]] = {}

                    async for payload_line in self.provider_registry.stream_chat_completion(
                        provider=request.provider,
                        api_key=provider_api_key,
                        model=request.model,
                        messages=state.conversation,
                        tools=self.tool_registry.schemas,
                        base_url=request.nvidia_base_url,
                    ):
                        if payload_line == "[DONE]":
                            break

                        payload = json.loads(payload_line)
                        choices = payload.get("choices") or []
                        if not choices:
                            continue

                        for choice in choices:
                            delta = choice.get("delta") or choice.get("message") or {}
                            content = delta.get("content")
                            if content:
                                content_parts.append(content)
                                accumulated_response.append(content)
                                yield sse_event(
                                    "token",
                                    {
                                        "message_id": assistant_message_id,
                                        "token": content,
                                    },
                                )
                                await asyncio.sleep(0)

                            finish_reason = choice.get("finish_reason") or finish_reason
                            for tool_call in delta.get("tool_calls") or []:
                                index = tool_call.get("index", 0)
                                existing = tool_calls_by_index.setdefault(
                                    index,
                                    {
                                        "id": tool_call.get("id") or f"call_{uuid4().hex}",
                                        "type": "function",
                                        "function": {"name": "", "arguments": ""},
                                    },
                                )
                                if tool_call.get("id"):
                                    existing["id"] = tool_call["id"]
                                function = tool_call.get("function") or {}
                                if function.get("name"):
                                    existing["function"]["name"] = function["name"]
                                if function.get("arguments"):
                                    existing["function"]["arguments"] += function["arguments"]

                    stream_result = ProviderStreamResult(
                        content="".join(content_parts),
                        tool_calls=[self._normalize_tool_call(item) for _, item in sorted(tool_calls_by_index.items())],
                        finish_reason=finish_reason,
                    )

                    if stream_result.tool_calls:
                        state.conversation.append(
                            {
                                "role": "assistant",
                                "content": stream_result.content,
                                "tool_calls": [self._tool_call_for_provider(call) for call in stream_result.tool_calls],
                            }
                        )

                        for tool_call in stream_result.tool_calls:
                            yield sse_event(
                                "tool_call",
                                {
                                    "message_id": assistant_message_id,
                                    "tool": tool_call["name"],
                                    "tool_call_id": tool_call["id"],
                                    "input": tool_call["input"],
                                    "label": self._tool_chip_label(tool_call["name"], tool_call["input"]),
                                },
                            )
                            result_text, is_error = await self._execute_tool(state, tool_call)
                            state.conversation.append(
                                {
                                    "role": "tool",
                                    "tool_call_id": tool_call["id"],
                                    "content": result_text,
                                }
                            )
                            yield sse_event(
                                "tool_result",
                                {
                                    "message_id": assistant_message_id,
                                    "tool": tool_call["name"],
                                    "tool_call_id": tool_call["id"],
                                    "is_error": is_error,
                                    "content": result_text,
                                    "refresh_files": tool_call["name"] == "file_write",
                                },
                            )
                            if tool_call["name"] == "file_write":
                                yield sse_event(
                                    "files_updated",
                                    {
                                        "message_id": assistant_message_id,
                                        "path": tool_call["input"].get("file_path"),
                                    },
                                )

                        yield sse_event(
                            "status",
                            {
                                "message_id": assistant_message_id,
                                "phase": "thinking",
                                "label": "thinking....",
                            },
                        )
                        continue

                    state.conversation.append(
                        {
                            "role": "assistant",
                            "content": stream_result.content,
                        }
                    )
                    break
                else:
                    raise AppError(
                        "Maximum iteration limit reached.",
                        code="iteration_limit_reached",
                        status_code=400,
                        details={"max_iterations": state.max_iterations},
                    )

                final_message = "".join(accumulated_response)
                state.timeline.append({"role": "assistant", "content": final_message})
                yield sse_event(
                    "complete",
                    {
                        "message_id": assistant_message_id,
                        "content": final_message,
                        "session_id": state.session_id,
                        "sandbox_id": state.sandbox_id,
                    },
                )
        except Exception as error:
            yield sse_event(
                "error",
                {
                    "message_id": assistant_message_id,
                    **format_exception(error),
                    "session_id": state.session_id,
                },
            )

    async def _execute_tool(self, state, tool_call: dict[str, Any]) -> tuple[str, bool]:
        try:
            result = await self.tool_registry.execute(tool_call["name"], state.sandbox, tool_call["input"])
            return result, False
        except Exception as error:
            return json.dumps(format_exception(error)), True

    def _ensure_system_message(self, state) -> None:
        if state.conversation:
            return
        state.conversation.append({"role": "system", "content": SYSTEM_PROMPT})

    def _normalize_tool_call(self, tool_call: dict[str, Any]) -> dict[str, Any]:
        arguments_text = tool_call["function"]["arguments"]
        arguments = self._parse_tool_arguments(arguments_text)
        return {
            "id": tool_call["id"],
            "name": tool_call["function"]["name"],
            "input": arguments,
        }

    def _parse_tool_arguments(self, payload: str) -> dict[str, Any]:
        cleaned = payload.strip()
        if cleaned.startswith("```"):
            cleaned = re.sub(r"^```(?:json)?|```$", "", cleaned).strip()
        cleaned = re.sub(r",\s*([}\]])", r"\1", cleaned)
        if not cleaned:
            return {}
        try:
            return json.loads(cleaned)
        except json.JSONDecodeError as error:
            raise AppError(
                "The provider returned malformed tool arguments.",
                code="invalid_tool_arguments",
                status_code=400,
                details={"payload": payload, "error": str(error)},
            ) from error

    @staticmethod
    def _tool_call_for_provider(tool_call: dict[str, Any]) -> dict[str, Any]:
        return {
            "id": tool_call["id"],
            "type": "function",
            "function": {
                "name": tool_call["name"],
                "arguments": json.dumps(tool_call["input"]),
            },
        }

    @staticmethod
    def _tool_chip_label(tool_name: str, tool_input: dict[str, Any]) -> str:
        file_path = tool_input.get("file_path", "")
        if tool_name == "file_write":
            return f"create: {file_path}"
        if tool_name == "file_read":
            return f"read: {file_path}"
        return f"{tool_name}: {file_path}" if file_path else tool_name