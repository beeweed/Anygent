import { create } from 'zustand'

import type { ChatMessage, FilePreview, FileTreeNode, StreamStatus, ToolEvent } from '@/types/chat'

function createId() {
  return crypto.randomUUID()
}

interface AppState {
  sessionId: string
  messages: ChatMessage[]
  status: StreamStatus
  iteration: number
  maxIterations: number
  error: string | null
  isStreaming: boolean
  sandboxReady: boolean
  fileTree: FileTreeNode[]
  selectedFilePath: string | null
  filePreview: FilePreview | null
  mobileFilesOpen: boolean
  addUserMessage: (content: string) => void
  beginAssistantMessage: () => void
  appendAssistantToken: (token: string) => void
  completeAssistantMessage: (fallbackMessage?: string) => void
  addToolEvent: (event: ToolEvent) => void
  updateToolResult: (id: string, payload: Partial<ToolEvent>) => void
  setStatus: (status: StreamStatus) => void
  setIteration: (current: number, max?: number) => void
  setError: (message: string | null) => void
  setStreaming: (value: boolean) => void
  setSandboxReady: (value: boolean) => void
  setFileTree: (tree: FileTreeNode[]) => void
  setSelectedFilePath: (path: string | null) => void
  setFilePreview: (preview: FilePreview | null) => void
  setMobileFilesOpen: (open: boolean) => void
  resetForPrompt: () => void
}

export const useAppStore = create<AppState>((set) => ({
  sessionId: createId(),
  messages: [],
  status: 'idle',
  iteration: 0,
  maxIterations: 1000,
  error: null,
  isStreaming: false,
  sandboxReady: false,
  fileTree: [],
  selectedFilePath: null,
  filePreview: null,
  mobileFilesOpen: false,
  addUserMessage: (content) =>
    set((state) => ({
      messages: [...state.messages, { id: createId(), role: 'user', content, toolEvents: [] }],
    })),
  beginAssistantMessage: () =>
    set((state) => ({
      messages: [...state.messages, { id: createId(), role: 'assistant', content: '', toolEvents: [] }],
      isStreaming: true,
      error: null,
    })),
  appendAssistantToken: (token) =>
    set((state) => ({
      messages: state.messages.map((message, index) =>
        index === state.messages.length - 1 && message.role === 'assistant'
          ? { ...message, content: `${message.content}${token}` }
          : message,
      ),
    })),
  completeAssistantMessage: (fallbackMessage) =>
    set((state) => ({
      messages: state.messages.map((message, index) =>
        index === state.messages.length - 1 && message.role === 'assistant' && !message.content && fallbackMessage
          ? { ...message, content: fallbackMessage }
          : message,
      ),
      isStreaming: false,
      status: 'complete',
    })),
  addToolEvent: (event) =>
    set((state) => ({
      messages: state.messages.map((message, index) =>
        index === state.messages.length - 1 && message.role === 'assistant'
          ? { ...message, toolEvents: [...message.toolEvents, event] }
          : message,
      ),
    })),
  updateToolResult: (id, payload) =>
    set((state) => ({
      messages: state.messages.map((message, index) =>
        index === state.messages.length - 1 && message.role === 'assistant'
          ? {
              ...message,
              toolEvents: message.toolEvents.map((event) =>
                event.id === id ? { ...event, ...payload } : event,
              ),
            }
          : message,
      ),
    })),
  setStatus: (status) => set({ status }),
  setIteration: (iteration, maxIterations) =>
    set((state) => ({ iteration, maxIterations: maxIterations ?? state.maxIterations })),
  setError: (error) => set({ error }),
  setStreaming: (isStreaming) => set({ isStreaming }),
  setSandboxReady: (sandboxReady) => set({ sandboxReady }),
  setFileTree: (fileTree) => set({ fileTree }),
  setSelectedFilePath: (selectedFilePath) => set({ selectedFilePath }),
  setFilePreview: (filePreview) => set({ filePreview }),
  setMobileFilesOpen: (mobileFilesOpen) => set({ mobileFilesOpen }),
  resetForPrompt: () => set({ iteration: 0, error: null, status: 'thinking', isStreaming: true }),
}))