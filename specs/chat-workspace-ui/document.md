# Chat Workspace UI and Streaming UX

## Overview
Build a responsive workspace that mirrors the supplied design while connecting to the live backend stream.

## Goals
- Recreate the supplied dark split-pane composition.
- Provide smooth token streaming, animated thinking states, inline tool chips, iteration badge, and a settings dialog.
- Show assistant prose without bubbles and user text in bubbles.

## Scope / non-goals
- In scope: header, chat timeline, composer, settings modal, memory drawer, responsive mobile tabs, streaming state handling.
- Out of scope: rich markdown editors, syntax-highlighted final code rendering for every assistant response.

## User flows / UX / design notes
- Desktop: left chat panel, right explorer/editor panel.
- Mobile: tabs to switch between chat and files.
- Assistant stream shows `thinking....` or `creating sandbox...` with shimmer until tokens arrive.
- Tool chips appear inline in the conversation where events occur.

## Functional requirements
- Use Radix UI primitives for dialog, tabs, scroll area, separator, select, and tooltip where useful.
- Use Zustand for app state.
- Show current iteration and max iteration in the header.
- User messages use compact bubbles; assistant output renders as plain text/prose blocks.
- Composer supports multiline input and disabled state when required settings are missing.
- Loading, empty, and error states are required.

## Data model / schema
- Frontend store slices: settings, session, messages, file explorer, ui.
- ChatMessage UI model: id, role, content, toolChips, statusLabel, timestamp.

## API contracts
- Consumes the SSE chat endpoint and sandbox file endpoints.

## Edge cases / failure modes
- SSE disconnect during generation.
- Tool event without matching text yet.
- Sandbox creation fails before chat starts.
- Missing backend URL in env.

## Acceptance criteria
- UI matches the provided visual hierarchy and is responsive.
- Streaming feels real-time and resumes after tool execution.
- Status animations switch appropriately between thinking and sandbox creation.

## Test plan / test cases
- Component tests for message rendering states.
- Store tests for SSE event reducer.
- Browser test for desktop and mobile layout behavior.

## Implementation notes
- Use CSS variables and custom animations for shimmer and thinking dots.
- Avoid classic assistant bubbles.

## Status / open questions
- Status: planned
- Open question: file preview will show text content and friendly placeholder for non-selected files.