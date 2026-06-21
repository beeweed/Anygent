# Agent Runtime and Sandbox Tools

## Overview
Implement the backend agent loop that sends chat history and tool schemas to an OpenAI-compatible model, executes native tool calls against an E2B sandbox, and streams progress and final assistant output back to the client.

## Goals
- Use native tool calling only.
- Support `file_write` and `file_read` tools with the exact user-provided schemas.
- Preserve full session history including user inputs, assistant outputs, tool calls, tool results, and error states.
- Create the sandbox lazily on the first user message and reuse it for the session.

## Scope / non-goals
- In scope: sandbox creation, message memory, iteration control, structured SSE events, tool execution, provider invocation.
- Out of scope: multi-user auth, cross-session durable storage, background jobs, database persistence.

## User flows / UX / design notes
- First message triggers sandbox creation state before model streaming starts.
- During tool execution, inline chips appear in the chat timeline.
- Iteration count is visible and updates as the loop progresses.

## Functional requirements
- Maximum iterations per request: 1000.
- Sandbox creation uses E2B `create` API with user api key, timeout 3600, optional template id.
- `file_write` creates or overwrites a file at an absolute `/home/user/...` path.
- `file_read` reads a file from an absolute `/home/user/...` path and returns line-numbered content; missing files return structured error text for continued agent reasoning.
- Agent sends `tools` to the LLM API and executes returned structured tool calls.
- Tool results are appended back into the same conversation before the next model call.
- History retention must include the message objects needed for native tool calling.
- Expose a way to inspect sandbox file tree and file contents from the frontend.

## Data model / schema
- Session: id, provider, model, created_at, sandbox_id, sandbox_status, iteration_count, max_iterations.
- Message timeline entry: id, role, kind (`text`, `tool_call`, `tool_result`, `status`), content, created_at, metadata.
- Runtime state: settings snapshot, conversation history list, latest file tree snapshot.

## API contracts
- `GET /api/health`
- `GET /api/providers/models?provider=...&api_key=...`
- `POST /api/chat/stream` -> SSE stream of status/message/tool events.
- `GET /api/sandbox/tree?session_id=...`
- `GET /api/sandbox/file?session_id=...&path=...`
- `POST /api/session/reset`

## Edge cases / failure modes
- Missing provider key.
- Missing E2B key.
- Sandbox creation timeout.
- Invalid template id.
- Unsupported model for tool calling.
- Tool schema validation errors.
- File path outside `/home/user/`.
- File missing or binary/unreadable data.
- Provider/network rate limits.
- Iteration cap reached before completion.

## Acceptance criteria
- User can send a prompt and the backend creates a sandbox automatically if needed.
- Agent can read and overwrite sandbox files using real tool calls.
- SSE emits status, token, tool, and done/error events in order.
- Full history is preserved during the active session.

## Test plan / test cases
- Unit test tool path validation and missing-file behavior.
- Unit test provider request construction includes `tools`.
- Integration test SSE stream emits sandbox-creating event then assistant tokens.
- Integration test tool call execution loop appends tool results and continues.
- Integration test session reset clears runtime state.

## Implementation notes
- Prefer async services and centralized error formatting.
- Use provider abstraction to normalize OpenRouter and NVIDIA NIM.
- Keep system prompt in `backend/src/agent/systemprompt.py`.
- Put the mandatory imports in `backend/src/agent/agent.py`.

## Status / open questions
- Status: planned
- Open question: NVIDIA NIM model listing can be via `/v1/models`; cloud base URL should remain configurable.