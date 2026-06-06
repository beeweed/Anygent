from __future__ import annotations

import json
import re
import asyncio
from typing import Any, AsyncGenerator, Optional, Callable

from src.agent.models import ChatStreamRequest
from src.agent.systemprompt import SYSTEM_PROMPT
from src.agent.tool_registry import AgentRunContext, ToolRegistry
from src.config.settings import settings
from src.services.openrouter_service import OpenRouterService
from src.services.sandbox_service import SandboxService


class ReactAgent:
    def __init__(
        self,
        *,
        openrouter_service: OpenRouterService,
        sandbox_service: SandboxService,
        tool_registry: ToolRegistry,
    ) -> None:
        self._openrouter = openrouter_service
        self._sandbox_service = sandbox_service
        self._tool_registry = tool_registry

    async def stream(
        self,
        request: ChatStreamRequest,
        emit: Optional[Callable[[dict[str, Any]], None]] = None,
    ) -> AsyncGenerator[dict[str, Any], None]:
        async def publish(event: dict[str, Any]) -> AsyncGenerator[dict[str, Any], None]:
            if emit is not None:
                emit(event)
            yield event

        await asyncio.sleep(0)

        async for event in publish({"type": "status", "data": {"value": "thinking"}}):
            yield event

        if not self._sandbox_service.has_session(request.session_id):
            async for event in publish({"type": "status", "data": {"value": "creating_sandbox"}}):
                yield event
            sandbox_response = await self._sandbox_service.ensure_session(
                session_id=request.session_id,
                api_key=request.sandbox.api_key,
                template_id=request.sandbox.template_id,
                timeout_seconds=request.sandbox.timeout_seconds or settings.sandbox_timeout_seconds,
            )
            async for event in publish(
                {
                    "type": "sandbox",
                    "data": {
                        "session_id": sandbox_response.session_id,
                        "sandbox_id": sandbox_response.sandbox_id,
                        "tree": [node.model_dump() for node in sandbox_response.tree],
                    },
                }
            ):
                yield event
        else:
            tree = await self._sandbox_service.list_tree(request.session_id)
            async for event in publish(
                {
                    "type": "sandbox",
                    "data": {
                        "session_id": request.session_id,
                        "tree": [node.model_dump() for node in tree],
                    },
                }
            ):
                yield event

        messages: list[dict[str, Any]] = [
            {"role": "system", "content": SYSTEM_PROMPT},
            *[message.model_dump() for message in request.messages],
        ]
        context = AgentRunContext(session_id=request.session_id, sandbox_service=self._sandbox_service)

        for iteration in range(1, settings.max_iterations + 1):
            async for event in publish(
                {
                    "type": "iteration",
                    "data": {"current": iteration, "max": settings.max_iterations},
                }
            ):
                yield event

            assistant_text_parts: list[str] = []
            tool_calls: dict[int, dict[str, Any]] = {}
            saw_stream_content = False

            async for chunk in self._openrouter.stream_chat_completion(
                api_key=request.provider.api_key,
                model=request.provider.model_id,
                messages=messages,
                tools=self._tool_registry.list_tools(),
            ):
                choice = (chunk.get("choices") or [{}])[0]
                delta = choice.get("delta") or {}
                finish_reason = choice.get("finish_reason") or delta.get("finish_reason")

                for content_part in self._extract_content(delta):
                    cleaned = re.sub(r"\r\n?", "\n", content_part)
                    assistant_text_parts.append(cleaned)
                    saw_stream_content = True
                    async for event in publish({"type": "status", "data": {"value": "streaming"}}):
                        yield event
                    async for event in publish({"type": "token", "data": {"value": cleaned}}):
                        yield event

                if delta.get("tool_calls"):
                    self._merge_tool_calls(tool_calls, delta["tool_calls"])

                if finish_reason == "tool_calls":
                    assistant_message = {
                        "role": "assistant",
                        "content": "".join(assistant_text_parts) or None,
                        "tool_calls": self._finalize_tool_calls(tool_calls),
                    }
                    messages.append(assistant_message)

                    for tool_call in assistant_message["tool_calls"]:
                        function_payload = tool_call.get("function") or {}
                        name = function_payload.get("name", "unknown")
                        arguments_text = function_payload.get("arguments") or "{}"
                        try:
                            arguments = json.loads(arguments_text)
                        except json.JSONDecodeError:
                            arguments = {}

                        label = self._tool_label(name, arguments)
                        async for event in publish(
                            {
                                "type": "tool_call",
                                "data": {
                                    "id": tool_call.get("id"),
                                    "name": name,
                                    "label": label,
                                    "arguments": arguments,
                                },
                            }
                        ):
                            yield event

                        result = await self._tool_registry.execute(
                            name=name,
                            arguments=arguments,
                            context=context,
                        )
                        messages.append(
                            {
                                "role": "tool",
                                "tool_call_id": tool_call.get("id"),
                                "content": result.content,
                            }
                        )

                        async for event in publish(
                            {
                                "type": "tool_result",
                                "data": {
                                    "id": tool_call.get("id"),
                                    "name": name,
                                    "label": label,
                                    "result": result.content,
                                    "is_error": result.is_error,
                                    "touched_paths": result.touched_paths,
                                },
                            }
                        ):
                            yield event

                    refreshed_tree = await self._sandbox_service.list_tree(request.session_id)
                    async for event in publish(
                        {
                            "type": "file_tree",
                            "data": {"tree": [node.model_dump() for node in refreshed_tree]},
                        }
                    ):
                        yield event
                    break

                if finish_reason == "stop":
                    content = self._final_text("".join(assistant_text_parts))
                    if not saw_stream_content:
                        async for event in publish({"type": "status", "data": {"value": "complete"}}):
                            yield event
                    messages.append({"role": "assistant", "content": content})
                    async for event in publish({"type": "done", "data": {"message": content}}):
                        yield event
                    return
            else:
                content = self._final_text("".join(assistant_text_parts))
                messages.append({"role": "assistant", "content": content})
                async for event in publish({"type": "done", "data": {"message": content}}):
                    yield event
                return

        async for event in publish(
            {
                "type": "done",
                "data": {
                    "message": "The agent reached the maximum iteration limit of 1000 before finishing the task."
                },
            }
        ):
            yield event

    @staticmethod
    def _extract_content(delta: dict[str, Any]) -> list[str]:
        content = delta.get("content")
        if content is None:
            return []
        if isinstance(content, str):
            return [content]
        parts: list[str] = []
        if isinstance(content, list):
            for item in content:
                if isinstance(item, dict) and item.get("type") == "text":
                    parts.append(item.get("text", ""))
        return parts

    @staticmethod
    def _merge_tool_calls(store: dict[int, dict[str, Any]], deltas: list[dict[str, Any]]) -> None:
        for delta in deltas:
            index = int(delta.get("index", 0))
            target = store.setdefault(
                index,
                {
                    "id": delta.get("id"),
                    "type": "function",
                    "function": {"name": "", "arguments": ""},
                },
            )
            if delta.get("id"):
                target["id"] = delta["id"]
            function_delta = delta.get("function") or {}
            if function_delta.get("name"):
                target["function"]["name"] += function_delta["name"]
            if function_delta.get("arguments"):
                target["function"]["arguments"] += function_delta["arguments"]

    @staticmethod
    def _finalize_tool_calls(store: dict[int, dict[str, Any]]) -> list[dict[str, Any]]:
        return [store[index] for index in sorted(store.keys())]

    @staticmethod
    def _tool_label(name: str, arguments: dict[str, Any]) -> str:
        path = arguments.get("file_path", "")
        if name == "file_write":
            return f"create: {path}"
        if name == "file_read":
            return f"read: {path}"
        return name

    @staticmethod
    def _final_text(text: str) -> str:
        cleaned = re.sub(r"\n{3,}", "\n\n", text).strip()
        return cleaned or "Done."