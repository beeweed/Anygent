import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type {
  AgentMessage,
  FilePreview,
  FileTreeNode,
  MobileTab,
  ProviderDefinition,
  ProviderModel,
  SettingsState,
  StatusPhase,
  ToolChip,
} from '@/types';

const defaultSettings: SettingsState = {
  provider: 'openrouter',
  model: '',
  openrouterApiKey: '',
  nvidiaApiKey: '',
  nvidiaBaseUrl: 'https://integrate.api.nvidia.com',
  e2bApiKey: '',
  e2bTemplateId: '',
};

const initialAssistantMessage = (id: string): AgentMessage => ({
  id,
  role: 'assistant',
  content: '',
  toolChips: [],
  createdAt: Date.now(),
  streaming: true,
  phase: 'thinking',
  statusLabel: 'thinking....',
});

type AgentStore = {
  settings: SettingsState;
  providers: ProviderDefinition[];
  models: ProviderModel[];
  modelQuery: string;
  messages: AgentMessage[];
  sessionId: string | null;
  currentAssistantMessageId: string | null;
  iterationCurrent: number;
  iterationMax: number;
  isStreaming: boolean;
  statusPhase: StatusPhase;
  statusLabel: string;
  isSettingsOpen: boolean;
  isMemoryOpen: boolean;
  mobileTab: MobileTab;
  explorerTree: FileTreeNode[];
  selectedFilePath: string | null;
  filePreview: FilePreview | null;
  fileLoading: boolean;
  error: string | null;
  setSettings: (partial: Partial<SettingsState>) => void;
  setProviders: (providers: ProviderDefinition[]) => void;
  setModels: (models: ProviderModel[]) => void;
  setModelQuery: (query: string) => void;
  setSettingsOpen: (open: boolean) => void;
  setMemoryOpen: (open: boolean) => void;
  setMobileTab: (tab: MobileTab) => void;
  startStreamingMessage: (messageId: string) => void;
  addUserMessage: (content: string) => void;
  appendAssistantToken: (messageId: string, token: string) => void;
  setAssistantStatus: (messageId: string, phase: StatusPhase, label: string) => void;
  addToolChip: (messageId: string, chip: ToolChip) => void;
  resolveToolChip: (messageId: string, chipId: string, status: ToolChip['status'], content?: string) => void;
  completeAssistantMessage: (messageId: string, content?: string) => void;
  failAssistantMessage: (messageId: string, error: string) => void;
  setSessionId: (sessionId: string) => void;
  setIteration: (current: number, max: number) => void;
  setExplorerTree: (tree: FileTreeNode[]) => void;
  setSelectedFilePath: (path: string | null) => void;
  setFilePreview: (preview: FilePreview | null) => void;
  setFileLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  resetConversation: () => void;
};

export const useAgentStore = create<AgentStore>()(
  persist(
    (set) => ({
      settings: defaultSettings,
      providers: [],
      models: [],
      modelQuery: '',
      messages: [],
      sessionId: null,
      currentAssistantMessageId: null,
      iterationCurrent: 0,
      iterationMax: 1000,
      isStreaming: false,
      statusPhase: 'idle',
      statusLabel: '',
      isSettingsOpen: false,
      isMemoryOpen: false,
      mobileTab: 'chat',
      explorerTree: [],
      selectedFilePath: null,
      filePreview: null,
      fileLoading: false,
      error: null,
      setSettings: (partial) =>
        set((state) => ({
          settings: { ...state.settings, ...partial },
        })),
      setProviders: (providers) => set({ providers }),
      setModels: (models) => set({ models }),
      setModelQuery: (modelQuery) => set({ modelQuery }),
      setSettingsOpen: (isSettingsOpen) => set({ isSettingsOpen }),
      setMemoryOpen: (isMemoryOpen) => set({ isMemoryOpen }),
      setMobileTab: (mobileTab) => set({ mobileTab }),
      startStreamingMessage: (messageId) =>
        set((state) => ({
          currentAssistantMessageId: messageId,
          isStreaming: true,
          statusPhase: 'thinking',
          statusLabel: 'thinking....',
          messages: [...state.messages, initialAssistantMessage(messageId)],
          error: null,
          iterationCurrent: 0,
        })),
      addUserMessage: (content) =>
        set((state) => ({
          messages: [
            ...state.messages,
            {
              id: crypto.randomUUID(),
              role: 'user',
              content,
              toolChips: [],
              createdAt: Date.now(),
            },
          ],
        })),
      appendAssistantToken: (messageId, token) =>
        set((state) => ({
          messages: state.messages.map((message) =>
            message.id === messageId
              ? { ...message, content: `${message.content}${token}` }
              : message,
          ),
        })),
      setAssistantStatus: (messageId, phase, label) =>
        set((state) => ({
          statusPhase: phase,
          statusLabel: label,
          messages: state.messages.map((message) =>
            message.id === messageId
              ? { ...message, phase, statusLabel: label }
              : message,
          ),
        })),
      addToolChip: (messageId, chip) =>
        set((state) => ({
          messages: state.messages.map((message) =>
            message.id === messageId
              ? { ...message, toolChips: [...message.toolChips, chip] }
              : message,
          ),
        })),
      resolveToolChip: (messageId, chipId, status, content) =>
        set((state) => ({
          messages: state.messages.map((message) =>
            message.id === messageId
              ? {
                  ...message,
                  toolChips: message.toolChips.map((chip) =>
                    chip.id === chipId ? { ...chip, status, content } : chip,
                  ),
                }
              : message,
          ),
        })),
      completeAssistantMessage: (messageId, content) =>
        set((state) => ({
          isStreaming: false,
          statusPhase: 'idle',
          statusLabel: '',
          currentAssistantMessageId: null,
          messages: state.messages.map((message) =>
            message.id === messageId
              ? {
                  ...message,
                  content: content ?? message.content,
                  streaming: false,
                  phase: 'idle',
                  statusLabel: '',
                }
              : message,
          ),
        })),
      failAssistantMessage: (messageId, error) =>
        set((state) => ({
          isStreaming: false,
          statusPhase: 'error',
          statusLabel: error,
          currentAssistantMessageId: null,
          error,
          messages: state.messages.map((message) =>
            message.id === messageId
              ? {
                  ...message,
                  streaming: false,
                  phase: 'error',
                  statusLabel: error,
                  error,
                }
              : message,
          ),
        })),
      setSessionId: (sessionId) => set({ sessionId }),
      setIteration: (iterationCurrent, iterationMax) => set({ iterationCurrent, iterationMax }),
      setExplorerTree: (explorerTree) => set({ explorerTree }),
      setSelectedFilePath: (selectedFilePath) => set({ selectedFilePath }),
      setFilePreview: (filePreview) => set({ filePreview }),
      setFileLoading: (fileLoading) => set({ fileLoading }),
      setError: (error) => set({ error }),
      resetConversation: () =>
        set({
          messages: [],
          sessionId: null,
          currentAssistantMessageId: null,
          iterationCurrent: 0,
          isStreaming: false,
          statusPhase: 'idle',
          statusLabel: '',
          explorerTree: [],
          selectedFilePath: null,
          filePreview: null,
          error: null,
        }),
    }),
    {
      name: 'ai-sandbox-agent-store',
      partialize: (state) => ({
        settings: state.settings,
        sessionId: state.sessionId,
        messages: state.messages,
        iterationCurrent: state.iterationCurrent,
        iterationMax: state.iterationMax,
        explorerTree: state.explorerTree,
        selectedFilePath: state.selectedFilePath,
        filePreview: state.filePreview,
      }),
    },
  ),
);