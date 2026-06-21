export type ProviderId = 'openrouter' | 'nvidia';
export type MobileTab = 'chat' | 'files';
export type StatusPhase = 'idle' | 'thinking' | 'creating_sandbox' | 'error';

export interface ProviderDefinition {
  id: ProviderId;
  name: string;
  requires_base_url: boolean;
  key_label: string;
  model_source_label: string;
}

export interface ProviderModel {
  id: string;
  name: string;
  provider: string;
  description?: string | null;
  context_length?: number | null;
  supports_tools: boolean;
  metadata: Record<string, unknown>;
}

export interface SettingsState {
  provider: ProviderId;
  model: string;
  openrouterApiKey: string;
  nvidiaApiKey: string;
  nvidiaBaseUrl: string;
  e2bApiKey: string;
  e2bTemplateId: string;
}

export interface ToolChip {
  id: string;
  label: string;
  tool: string;
  status: 'pending' | 'success' | 'error';
  content?: string;
}

export interface AgentMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  toolChips: ToolChip[];
  statusLabel?: string;
  phase?: StatusPhase;
  createdAt: number;
  streaming?: boolean;
  error?: string;
}

export interface FileTreeNode {
  path: string;
  name: string;
  type: 'dir' | 'file' | string;
  children: FileTreeNode[];
}

export interface FilePreview {
  path: string;
  content: string;
  language: string;
}

export interface StreamEnvelope<T = Record<string, unknown>> {
  event: string;
  data: T;
}

export interface ChatHistory {
  id: string;
  name: string;
  messages: AgentMessage[];
  createdAt: number;
  updatedAt: number;
}