# Sandbox Agent Studio Spec

## Project overview
Sandbox Agent Studio is a production-grade AI coding agent web application that lets a user chat with an LLM, provision an E2B sandbox on first use, and let the model read, create, and overwrite files inside that sandbox through native tool calling. The product has a split architecture with a React + Vite frontend and an async FastAPI backend.

## Goals
- Deliver a real ReAct-style agent loop using native OpenRouter tool calling.
- Provision and manage an E2B sandbox automatically on first chat message.
- Stream assistant tokens and state transitions over SSE in real time.
- Expose file read and file write tools that operate directly on the E2B sandbox filesystem.
- Present a responsive, professional dark UI based on the provided design direction.
- Make model provider integration extensible beyond OpenRouter.

## Design direction
- Dark, dense, professional workstation aesthetic with near-black surfaces and cool indigo/cyan accents.
- Split layout: chat workspace on the left, tree-based sandbox file explorer on the right.
- User messages use bubbles; assistant output renders as flat streamed content without bubble chrome.
- Tool activity renders inline as small chips such as `create: /home/user/project/app.py` or `read: /home/user/project/app.py`.
- Typing indicators use animated shimmer and moving dots; sandbox provisioning switches indicator copy to `creating sandbox...`.
- UI must adapt for desktop, tablet, and mobile by collapsing the file panel and keeping the settings accessible.

## Technical stack decisions
- Database: none.
- Frontend: React 19, Vite, TypeScript, Radix UI primitives, Zustand, SSE client consumption.
- Backend: Python 3.12+, FastAPI, Pydantic, asyncio, uvicorn, httpx, official `e2b` SDK.
- LLM provider abstraction: OpenRouter first, designed so additional providers can implement the same interface.
- Streaming transport: text/event-stream (SSE).
- State persistence: runtime-only server memory and frontend state; no browser file storage and no database persistence.

## Architecture rules
- All model tool calls must be native tool calls from the LLM API. No text-parsed fake tool calls.
- Sandbox file operations must target E2B sandbox paths and enforce absolute `/home/user/...` paths.
- Agent loop must be iterative with max iterations set to 1000 and reset per user message.
- Tool execution results must be fed back into the loop as structured observations.
- SSE must stream both content and structured events such as thinking state, tool chips, iteration count, and file tree refresh.
- Secrets remain in memory only for the session and are never logged.
- Backend services stay async where possible and expose health endpoints.

## Feature list
| Feature | Status | Spec |
| --- | --- | --- |
| Chat workbench and streaming UX | done | `specs/chat-workbench/document.md` |
| Provider settings and model selection | done | `specs/provider-settings/document.md` |
| ReAct agent engine and native tool calling | done | `specs/react-agent-engine/document.md` |
| E2B sandbox filesystem integration | done | `specs/sandbox-filesystem/document.md` |
| Sandbox file explorer and file inspection | done | `specs/file-explorer/document.md` |