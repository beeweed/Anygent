# Chat workbench and streaming UX

## Overview
Build the primary agent workspace where users submit prompts, watch the agent think and act in real time, and review the final response with inline tool activity.

## Goals
- Provide a responsive split-screen chat experience matching the supplied dark design language.
- Stream assistant output token by token over SSE.
- Show thinking and sandbox-creation states with animated shimmer.
- Surface iteration progress and tool usage inline.

## Scope / non-goals
### In scope
- Chat transcript rendering.
- User message composer and send flow.
- Assistant streaming content.
- Inline status chips and loading indicators.
- Iteration counter reset on each user message.
### Non-goals
- Rich markdown editor features.
- Multi-conversation history persistence.
- Authentication.

## User flows / UX / design notes
- User opens the app and sees chat on the left and file tree on the right.
- User opens settings, enters OpenRouter key, E2B key, optional template id, and selects a model.
- On first send, UI blocks the request until a sandbox is created, displaying `creating sandbox...` with a shiny animated state.
- Once sandbox is ready, assistant content streams live into the current response area.
- Tool calls appear inline near the active assistant message as compact chips.
- On small screens, the explorer becomes a drawer/tab while the chat stays primary.

## Functional requirements
- Compose and send user messages.
- Disable send when required settings are missing.
- Display current iteration as `Iteration N/1000`.
- Render assistant messages without bubble framing.
- Render user messages with bubbles.
- Render tool chips for `file_read` and `file_write` activity.
- Render live thinking states before first token arrives.
- Auto-scroll transcript during active streaming unless user has intentionally scrolled away.

## Data model / schema
- `ChatMessage`: id, role, content, createdAt, toolEvents[]
- `ToolChip`: id, toolName, label, path, status
- `StreamStatus`: idle | thinking | creating_sandbox | streaming | tool_running | error | complete

## API contracts
- `POST /api/chat/stream`
  - Request body: provider config snapshot, messages, optional sandbox/session ids
  - Response: SSE stream with events such as `status`, `iteration`, `token`, `tool_call`, `tool_result`, `file_tree`, `done`, `error`

## Edge cases / failure modes
- Missing API keys or model selection.
- SSE disconnect during response.
- Tool execution error inside agent loop.
- Sandbox creation timeout.
- User submits another message while one is active.

## Acceptance criteria
- First message triggers sandbox creation when needed.
- Assistant text visibly streams token by token.
- Tool chips appear and update during tool use.
- Layout remains usable on mobile and desktop.
- Iteration counter resets for each message.

## Test plan / test cases
- Send message without settings and verify clear blocked state.
- Send first valid message and verify sandbox creation indicator.
- Send a file-writing task and verify token stream and chips.
- Resize to mobile width and verify accessible explorer/settings.
- Simulate backend error and verify error state rendering.

## Implementation notes
- Use Zustand for app, settings, chat, and sandbox state.
- Use EventSource-compatible fetch stream consumption in a custom hook to support POST-based SSE parsing.
- Use Radix Dialog, ScrollArea, Separator, Tooltip, and Collapsible primitives.

## Status / open questions
- Status: done
- Open questions: none; runtime-only session state is acceptable.