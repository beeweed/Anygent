export type Role = 'user' | 'assistant'

export type StreamStatus =
  | 'idle'
  | 'thinking'
  | 'creating_sandbox'
  | 'streaming'
  | 'complete'
  | 'error'

export interface ToolEvent {
  id: string
  name: string
  label: string
  result?: string
  isError?: boolean
  touchedPaths?: string[]
}

export interface ChatMessage {
  id: string
  role: Role
  content: string
  toolEvents: ToolEvent[]
}

export interface ModelPricing {
  prompt?: string | null
  completion?: string | null
  request?: string | null
  image?: string | null
}

export interface ModelOption {
  id: string
  name: string
  description: string
  context_length?: number | null
  pricing: ModelPricing
  supported_parameters: string[]
  architecture: Record<string, unknown>
}

export interface FileTreeNode {
  path: string
  name: string
  type: 'file' | 'directory'
  children: FileTreeNode[]
}

export interface FilePreview {
  path: string
  content: string
}

export interface StreamEnvelope {
  type: string
  data: Record<string, unknown>
}