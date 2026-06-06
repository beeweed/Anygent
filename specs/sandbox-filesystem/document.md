# E2B sandbox filesystem integration

## Overview
Create and manage E2B sandboxes for each chat session and expose file operations that map directly to the sandbox filesystem.

## Goals
- Provision a sandbox on the first chat request.
- Use official E2B SDK calls with api key, timeout, and optional template id.
- Ensure file tool operations read and write inside the sandbox.

## Scope / non-goals
### In scope
- Sandbox lifecycle management.
- File read/write operations.
- Sandbox timeout and template support.
- File tree listing for the UI.
### Non-goals
- Persistent sandbox recovery after backend restart.
- Multi-user auth/session storage.

## User flows / UX / design notes
- Without a sandbox, user cannot complete a chat request.
- First message creates sandbox automatically and updates the UI state.
- File explorer reflects the current sandbox filesystem after tool calls.

## Functional requirements
- Create sandbox with `Sandbox.create(api_key=..., timeout=3600, template=...)` or async equivalent.
- Keep sandbox references in server memory by session id.
- Implement `file_write` tool to create or overwrite any file content at an absolute `/home/user/...` path.
- Implement `file_read` tool to return file content with line numbers.
- Return structured errors when files are missing so the loop can continue.
- Provide a file tree/listing endpoint or stream event for explorer refresh.
- Remove any old browser-side file persistence approach.

## Data model / schema
- `SandboxSession`: id, templateId, timeoutSeconds, createdAt, sandboxId, readyState
- `FileTreeNode`: path, name, type, children[]
- `ToolResultPayload`: output, isError, touchedPaths[]

## API contracts
- `POST /api/sandbox/session`
  - Body: `{ apiKey: string, templateId?: string }`
  - Response: session metadata and initial file tree
- `GET /api/sandbox/{session_id}/tree`
  - Response: hierarchical file structure

## Edge cases / failure modes
- Invalid E2B API key.
- Sandbox creation timeout.
- Sandbox expires during a later chat.
- File path outside `/home/user`.
- Binary file reads with undecodable content.

## Acceptance criteria
- First chat creates a sandbox with one-hour timeout.
- File tools operate against E2B sandbox storage only.
- Missing files return usable errors, not crashes.
- Explorer updates after file changes.

## Test plan / test cases
- Validate path guard rejects non-absolute or non-`/home/user` paths.
- Mock sandbox and test create/read/write/list flows.
- Verify file_read line numbering.
- Verify missing file result has `is_error=true` semantics.

## Implementation notes
- Wrap E2B SDK inside a service to isolate vendor-specific behavior.
- Provide helper methods for `read_text_file`, `write_text_file`, and `build_file_tree`.

## Status / open questions
- Status: done
- Open questions: none.