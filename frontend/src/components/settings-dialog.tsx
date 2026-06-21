import * as Dialog from '@radix-ui/react-dialog';
import * as ScrollArea from '@radix-ui/react-scroll-area';
import * as Select from '@radix-ui/react-select';
import { CheckIcon, ChevronDownIcon, Cross2Icon, MagnifyingGlassIcon } from '@radix-ui/react-icons';
import { Loader2, RefreshCcw, Sparkles } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';
import { useAgentStore } from '@/store/use-agent-store';
import type { ProviderId } from '@/types';

type SettingsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRefreshModels: (provider?: ProviderId) => Promise<void>;
  loadingModels: boolean;
};

export function SettingsDialog({ open, onOpenChange, onRefreshModels, loadingModels }: SettingsDialogProps) {
  const { settings, setSettings, models, modelQuery, setModelQuery, providers } = useAgentStore();
  const [refreshError, setRefreshError] = useState<string | null>(null);

  const filteredModels = useMemo(() => {
    const query = modelQuery.toLowerCase().trim();
    if (!query) return models;
    return models.filter((model) => `${model.name} ${model.id}`.toLowerCase().includes(query));
  }, [modelQuery, models]);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/70 backdrop-blur-md" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[min(92vw,720px)] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[28px] border border-white/8 bg-[#2d2d2d] shadow-[0_30px_120px_rgba(0,0,0,0.45)] outline-none">
          <div className="flex items-center justify-between border-b border-white/8 px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,rgba(99,102,241,0.26),rgba(34,211,238,0.18))] text-indigo-200">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <Dialog.Title className="text-lg font-semibold text-white">Settings</Dialog.Title>
                <Dialog.Description className="text-xs text-zinc-500">
                  Configure provider keys, sandbox access, and model selection.
                </Dialog.Description>
              </div>
            </div>
            <Dialog.Close className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-zinc-500 transition hover:bg-white/5 hover:text-white">
              <Cross2Icon className="h-5 w-5" />
            </Dialog.Close>
          </div>

          <ScrollArea.Root className="max-h-[70vh] overflow-hidden">
            <ScrollArea.Viewport className="space-y-6 p-6">
              <div className="grid gap-5 md:grid-cols-2">
                <Field label="Provider">
                  <Select.Root value={settings.provider} onValueChange={(value) => setSettings({ provider: value as ProviderId, model: '' })}>
                    <Select.Trigger className="settings-input flex items-center justify-between">
                      <Select.Value placeholder="Select provider" />
                      <ChevronDownIcon className="h-4 w-4 text-zinc-500" />
                    </Select.Trigger>
                    <Select.Portal>
                      <Select.Content position="popper" className="z-[60] min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-2xl border border-white/10 bg-[#2b2b2b] p-1 shadow-2xl">
                        <Select.Viewport>
                          {providers.map((provider) => (
                            <Select.Item
                              key={provider.id}
                              value={provider.id}
                              className="relative flex cursor-pointer items-center rounded-xl px-9 py-3 text-sm text-zinc-200 outline-none data-[highlighted]:bg-white/6"
                            >
                              <Select.ItemText>{provider.name}</Select.ItemText>
                              <Select.ItemIndicator className="absolute left-3">
                                <CheckIcon className="h-4 w-4 text-indigo-300" />
                              </Select.ItemIndicator>
                            </Select.Item>
                          ))}
                        </Select.Viewport>
                      </Select.Content>
                    </Select.Portal>
                  </Select.Root>
                </Field>

                <Field label="Selected model">
                  <div className="settings-input flex items-center gap-2 text-sm text-white/90">
                    <span className="truncate">{settings.model || 'No model selected yet'}</span>
                  </div>
                </Field>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <Field label="OpenRouter API key">
                  <input
                    className="settings-input"
                    type="password"
                    placeholder="sk-or-v1-..."
                    value={settings.openrouterApiKey}
                    onChange={(event) => setSettings({ openrouterApiKey: event.target.value })}
                  />
                </Field>
                <Field label="NVIDIA API key">
                  <input
                    className="settings-input"
                    type="password"
                    placeholder="nvapi-..."
                    value={settings.nvidiaApiKey}
                    onChange={(event) => setSettings({ nvidiaApiKey: event.target.value })}
                  />
                </Field>
                <Field label="NVIDIA base URL">
                  <input
                    className="settings-input"
                    placeholder="https://integrate.api.nvidia.com"
                    value={settings.nvidiaBaseUrl}
                    onChange={(event) => setSettings({ nvidiaBaseUrl: event.target.value })}
                  />
                </Field>
                <Field label="E2B API key">
                  <input
                    className="settings-input"
                    type="password"
                    placeholder="e2b_..."
                    value={settings.e2bApiKey}
                    onChange={(event) => setSettings({ e2bApiKey: event.target.value })}
                  />
                </Field>
              </div>

              <Field label="Custom sandbox template id">
                <input
                  className="settings-input"
                  placeholder="Optional E2B template id"
                  value={settings.e2bTemplateId}
                  onChange={(event) => setSettings({ e2bTemplateId: event.target.value })}
                />
              </Field>

              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-white">Model catalogue</p>
                    <p className="text-xs text-zinc-500">Search and select available models from the active provider.</p>
                  </div>
                  <button
                    className="inline-flex items-center gap-2 rounded-xl border border-white/8 bg-white/[0.04] px-4 py-2 text-xs font-medium text-white transition hover:border-indigo-400/40 hover:bg-indigo-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={loadingModels}
                    onClick={async () => {
                      setRefreshError(null);
                      try {
                        await onRefreshModels();
                      } catch (error) {
                        setRefreshError(error instanceof Error ? error.message : 'Failed to fetch models');
                      }
                    }}
                    type="button"
                  >
                    {loadingModels ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
                    Refresh models
                  </button>
                </div>

                <div className="relative">
                  <MagnifyingGlassIcon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                  <input
                    className="settings-input pl-11"
                    placeholder="Search models..."
                    value={modelQuery}
                    onChange={(event) => setModelQuery(event.target.value)}
                  />
                </div>

                {refreshError ? <p className="text-xs text-rose-400">{refreshError}</p> : null}

                <div className="overflow-hidden rounded-[20px] border border-white/8 bg-[#363638]">
                  <ScrollArea.Root className="h-[300px]">
                    <ScrollArea.Viewport className="space-y-1 p-2">
                      {filteredModels.length === 0 ? (
                        <div className="flex h-[260px] items-center justify-center text-sm text-zinc-500">
                          No models loaded yet.
                        </div>
                      ) : (
                        filteredModels.map((model) => {
                          const selected = settings.model === model.id;
                          return (
                            <button
                              key={model.id}
                              type="button"
                              onClick={() => setSettings({ model: model.id })}
                              className={cn(
                                'flex w-full items-start justify-between gap-4 rounded-2xl px-4 py-3 text-left transition',
                                selected ? 'border border-indigo-400/35 bg-indigo-500/12' : 'border border-transparent hover:bg-white/5',
                              )}
                            >
                              <div className="min-w-0">
                                <div className="truncate text-sm font-semibold text-white">{model.name}</div>
                                <div className="truncate text-[11px] text-zinc-500">{model.id}</div>
                                <div className="mt-1 flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-zinc-600">
                                  <span>{model.supports_tools ? 'Tool calling' : 'Text only'}</span>
                                  {model.context_length ? <span>{model.context_length.toLocaleString()} ctx</span> : null}
                                </div>
                              </div>
                              {selected ? <CheckIcon className="mt-1 h-4 w-4 shrink-0 text-indigo-300" /> : null}
                            </button>
                          );
                        })
                      )}
                    </ScrollArea.Viewport>
                  </ScrollArea.Root>
                </div>
              </div>
            </ScrollArea.Viewport>
            <ScrollArea.Scrollbar className="flex w-2.5 touch-none select-none bg-transparent p-[2px]" orientation="vertical">
              <ScrollArea.Thumb className="relative flex-1 rounded-full bg-white/12" />
            </ScrollArea.Scrollbar>
          </ScrollArea.Root>

          <div className="flex items-center justify-between border-t border-white/8 bg-[#252525] px-6 py-4">
            <p className="text-xs text-zinc-500">Keys and preferences are persisted locally in your browser.</p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="rounded-xl px-4 py-2 text-sm font-medium text-zinc-400 transition hover:bg-white/5 hover:text-white"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="rounded-xl bg-indigo-500 px-5 py-2 text-sm font-semibold text-white shadow-[0_10px_30px_rgba(99,102,241,0.28)] transition hover:bg-indigo-400"
              >
                Save changes
              </button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="space-y-2.5">
      <span className="text-sm font-medium text-zinc-200">{label}</span>
      {children}
    </label>
  );
}