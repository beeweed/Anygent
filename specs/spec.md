# AI Sandbox Agent Master Spec

## Project overview
A production-grade autonomous coding agent web application that lets users configure LLM providers, create an E2B sandbox on first message, stream the agent response token-by-token over SSE, and inspect the sandbox file system in a responsive split workspace.

## Goals
- Build a real FastAPI + React Vite application with a modular backend and polished dark UI.
- Support native tool calling with sandbox-backed file read/write tools.
- Persist UI preferences, chat session metadata, and messages locally without a database.
- Match the supplied design direction: dark, professional, split-pane chat + file explorer, settings modal, animated thinking states.
- Make providers extensible so additional LLM vendors can be added with minimal code changes.

## Design direction
- Dark graphite workspace with indigo/cyan accents.
- Chat on the left, explorer/editor on the right on desktop.
- Mobile uses tabs to switch between Chat and Files.
- User messages appear in bubbles; assistant messages render as prose blocks.
- Tool activity appears inline as compact chips like `create: /path/file.py` and `read: /path/file.py`.
- Animated `thinking....` and `creating sandbox...` states with a shimmering effect.

## Technical stack decisions
- Frontend: React 19 + Vite + TypeScript + Tailwind CSS + Radix UI primitives + Zustand.
- Backend: FastAPI + asyncio + uvicorn + Pydantic + httpx + official E2B Python SDK.
- Persistence: browser localStorage for settings and client-side session cache.
- Streaming: Server-Sent Events from FastAPI to frontend.
- LLM providers: OpenRouter and NVIDIA NIM via OpenAI-compatible APIs with provider abstraction.
- Tool calling: native OpenAI-compatible `tools` parameter and structured tool call execution.

## Architecture rules
- Separate code into `frontend/` and `backend/`.
- Backend must expose health, provider models, settings-safe endpoints, sandbox file tree/read, and chat streaming endpoints.
- Agent runtime must maintain the full message history for the active session, including assistant text, tool calls, tool results, and errors.
- Agent iteration limit is 1000 per user message and resets every new user message.
- Sandbox must be created lazily on the first user message using the supplied E2B API key, one-hour timeout, and optional custom template id.
- `.env` in frontend stores backend base URL only.
- No database usage.

## Feature list
| Feature | Status | Spec |
| --- | --- | --- |
| Agent runtime and sandbox tools | planned | `specs/agent-runtime/document.md` |
| Provider settings and model discovery | planned | `specs/provider-settings/document.md` |
| Chat workspace UI and streaming UX | planned | `specs/chat-workspace-ui/document.md` |
| File explorer and file preview | planned | `specs/file-explorer/document.md` |