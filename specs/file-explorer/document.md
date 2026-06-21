# File Explorer and File Preview

## Overview
Provide a tree-based explorer of the sandbox file system with selectable files and a code-like preview panel.

## Goals
- Render generated folders/files from the sandbox.
- Let users browse the structure and inspect file contents.
- Keep the UI aligned with the provided VS Code-inspired panel.

## Scope / non-goals
- In scope: hierarchical tree, selected file state, refresh, collapse, preview area, empty states.
- Out of scope: full IDE editing, syntax-aware save from the preview panel.

## User flows / UX / design notes
- Explorer shows root project folder and nested structure.
- Selected file highlights in the tree and opens in the preview panel.
- Refresh button re-fetches tree after tool activity.

## Functional requirements
- Backend returns normalized tree nodes for sandbox files.
- Frontend renders recursive folders/files with expand/collapse.
- Preview area shows line-numbered text content for selected files.
- Tool-generated file changes should be visible after refresh or after successful tool events.

## Data model / schema
- FileTreeNode: path, name, type, children.
- FilePreview: path, content, languageHint, error.

## API contracts
- `GET /api/sandbox/tree`
- `GET /api/sandbox/file`

## Edge cases / failure modes
- Empty sandbox.
- Deeply nested folders.
- Non-text file read attempt.
- Deleted file still selected.

## Acceptance criteria
- User can inspect sandbox output from the UI.
- Tree behaves correctly on desktop and mobile.
- File preview updates when a different node is selected.

## Test plan / test cases
- Unit test tree building from flat file list.
- Integration test preview endpoint line-number formatting.
- UI test folder expand/collapse.

## Implementation notes
- Keep the explorer performant by avoiding unnecessary rerenders.
- Refresh file tree automatically after successful file tool calls.

## Status / open questions
- Status: planned
- Open question: preview will focus on text/code files and return clear error for binary content.