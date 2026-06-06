# Sandbox file explorer and file inspection

## Overview
Build a right-side tree explorer that shows the current sandbox file structure and allows the user to inspect generated files.

## Goals
- Display a hierarchical tree for files created in the E2B sandbox.
- Support file selection and content preview.
- Keep the explorer synchronized with tool activity.

## Scope / non-goals
### In scope
- Tree rendering and expansion state.
- File preview panel or content pane.
- Refresh behavior after tool calls.
### Non-goals
- In-browser editing of files.
- Drag-and-drop uploads.

## User flows / UX / design notes
- Explorer sits on the right on desktop, collapses for smaller screens.
- Clicking a folder toggles expansion.
- Clicking a file loads a preview from backend.
- Tool chips and explorer remain visually consistent.

## Functional requirements
- Load and render a tree view from backend file metadata.
- Highlight the currently selected file.
- Read file contents on demand through backend endpoints tied to the sandbox.
- Handle empty sandbox state gracefully.
- Refresh tree after file writes.

## Data model / schema
- `ExplorerState`: nodes, expandedPaths, selectedPath, previewContent, loading
- `FilePreview`: path, content, languageHint, error

## API contracts
- `GET /api/sandbox/{session_id}/tree`
- `GET /api/sandbox/{session_id}/file?path=/home/user/...`

## Edge cases / failure modes
- Deep folder nesting.
- Large file content preview.
- File deleted between tree refresh and preview request.

## Acceptance criteria
- Explorer shows a tree instead of flat file chips alone.
- User can preview files in the app.
- Mobile layout keeps explorer accessible.

## Test plan / test cases
- Render empty tree.
- Expand/collapse nested folders.
- Preview a text file.
- Handle preview error for missing file.

## Implementation notes
- Use recursive tree components with memoized nodes.
- Use monospace styling for paths and previews.

## Status / open questions
- Status: done
- Open questions: none.