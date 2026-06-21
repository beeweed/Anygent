from __future__ import annotations

import asyncio
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Optional
from uuid import uuid4


@dataclass
class AgentSessionState:
    session_id: str
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    conversation: list[dict[str, Any]] = field(default_factory=list)
    timeline: list[dict[str, Any]] = field(default_factory=list)
    sandbox: Any | None = None
    sandbox_id: Optional[str] = None
    iteration_count: int = 0
    max_iterations: int = 1000
    last_provider: Optional[str] = None
    last_model: Optional[str] = None
    lock: asyncio.Lock = field(default_factory=asyncio.Lock)


class SessionManager:
    def __init__(self):
        self._sessions: dict[str, AgentSessionState] = {}
        self._lock = asyncio.Lock()

    async def get_or_create(self, session_id: str | None = None) -> AgentSessionState:
        async with self._lock:
            if session_id and session_id in self._sessions:
                session = self._sessions[session_id]
                session.updated_at = datetime.now(timezone.utc)
                return session

            new_session_id = session_id or str(uuid4())
            session = AgentSessionState(session_id=new_session_id)
            self._sessions[new_session_id] = session
            return session

    async def get(self, session_id: str) -> AgentSessionState | None:
        async with self._lock:
            return self._sessions.get(session_id)

    async def delete(self, session_id: str) -> AgentSessionState | None:
        async with self._lock:
            return self._sessions.pop(session_id, None)