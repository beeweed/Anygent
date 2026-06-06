import { create } from 'zustand'

import type { ModelOption } from '@/types/chat'

interface SettingsState {
  settingsOpen: boolean
  openrouterApiKey: string
  e2bApiKey: string
  templateId: string
  selectedModel: string
  models: ModelOption[]
  modelsLoading: boolean
  modelsError: string | null
  setSettingsOpen: (open: boolean) => void
  setField: (field: 'openrouterApiKey' | 'e2bApiKey' | 'templateId' | 'selectedModel', value: string) => void
  setModelsLoading: (loading: boolean) => void
  setModels: (models: ModelOption[]) => void
  setModelsError: (message: string | null) => void
}

export const useSettingsStore = create<SettingsState>((set) => ({
  settingsOpen: true,
  openrouterApiKey: '',
  e2bApiKey: '',
  templateId: '',
  selectedModel: '',
  models: [],
  modelsLoading: false,
  modelsError: null,
  setSettingsOpen: (settingsOpen) => set({ settingsOpen }),
  setField: (field, value) => set({ [field]: value } as Pick<SettingsState, typeof field>),
  setModelsLoading: (modelsLoading) => set({ modelsLoading }),
  setModels: (models) =>
    set((state) => ({
      models,
      selectedModel:
        state.selectedModel && models.some((model) => model.id === state.selectedModel)
          ? state.selectedModel
          : models[0]?.id ?? '',
    })),
  setModelsError: (modelsError) => set({ modelsError }),
}))