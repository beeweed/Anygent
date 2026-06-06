# ReAct agent engine and native tool calling

## Overview
Implement a backend ReAct-style agent loop that uses OpenRouter native tool calling, processes file read/write observations, and streams state back to the frontend in real time.

## Goals
- Use native tool calling through the LLM API `tools` parameter.
- Execute a Thought → Action → Observation → Repeat loop until completion or max iterations.
- Stream tool events, iteration count, and assistant tokens.

## Scope / non-goals
### In scope
- Agent orchestration loop.
- Tool registry and dispatch.
- OpenRouter chat completion calls with tools.
- Native tool message plumbing.
- Max iteration guard at 1000.
### Non-goals
- Hidden chain-of-thought exposure to the user.
- Background job queueing.

## User flows / UX / design notes
- Agent should feel like a real coding assistant, with visible activity when tools run.
- The visible UI should not print faux `Thought:` text; only status and tool chips are streamed.

## Functional requirements
- Maintain a structured message list for user, assistant, tool calls, and tool results.
- Pass `tools` to the OpenRouter API and let the model decide when to call them.
- Support sequential tool handling with `parallel_tool_calls=false`.
- Detect tool calls from the API response, execute them, append tool result messages, and continue looping.
- Enforce max iterations of 1000 and stop gracefully with an explanatory final response if reached.
- Surface tool errors back to the model as tool results.

## Data model / schema
- Pydantic models for `UserMessage`, `AssistantMessage`, `ToolUse`, `ToolUseMessage`, `ToolResult`, `ToolResultMessage`.
- `AgentRunContext`: provider config, sandbox session, tools, iteration count.
- `StreamEvent`: discriminated event payload with type and data.

## API contracts
- Internal provider interface:
  - `stream_or_complete(messages, tools, model, api_key, on_token, on_tool_call)`
- Tool registry interface:
  - `list_tools() -> list[dict]`
  - `execute(name: str, arguments: dict, context: AgentRunContext) -> str`

## Edge cases / failure modes
- Tool arguments malformed JSON.
- Repeated failing tool calls.
- OpenRouter returns no choices or unexpected schema.
- Stream interrupted mid-completion.

## Acceptance criteria
- No fake/manual tool call parsing from assistant text.
- Tool execution loop works for multi-step file tasks.
- Iteration guard and error propagation are implemented.
- Required imports exist in `backend/src/agent/react_agent.py`.

## Test plan / test cases
- Unit test tool registry dispatch.
- Unit test iteration limit stop condition.
- Unit test tool result injection after file write and file read.
- Mock OpenRouter response with tool calls and verify continuation.

## Implementation notes
- Add required imports to `backend/src/agent/react_agent.py`: `json`, `re`, `asyncio`, `AsyncGenerator`, `Optional`, `Callable`.
- Use `httpx.AsyncClient` against OpenRouter chat completions.
- Start with non-streaming provider calls for tool-call turns, then stream the final natural-language completion token-by-token via a follow-up streaming pass when feasible.

## Status / open questions
- Status: done
- Open questions: none.