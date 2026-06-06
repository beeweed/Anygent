import * as Dialog from '@radix-ui/react-dialog'
import * as Select from '@radix-ui/react-select'
import { Check, ChevronDown, KeyRound, Settings2, Sparkles, X } from 'lucide-react'

import { apiUrl, safeJson } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { useSettingsStore } from '@/store/settings-store'
import type { ModelOption } from '@/types/chat'

export function SettingsDialog() {
  const {
    settingsOpen,
    openrouterApiKey,
    e2bApiKey,
    templateId,
    selectedModel,
    models,
    modelsLoading,
    modelsError,
    setSettingsOpen,
    setField,
    setModels,
    setModelsLoading,
    setModelsError,
  } = useSettingsStore()

  async function refreshModels() {
    if (!openrouterApiKey.trim()) {
      setModelsError('Add an OpenRouter API key first.')
      return
    }

    setModelsLoading(true)
    setModelsError(null)

    try {
      const response = await fetch(apiUrl('/providers/openrouter/models'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_key: openrouterApiKey.trim() }),
      })

      const payload = await safeJson<{ data: ModelOption[] }>(response)
      setModels(payload.data)
    } catch (error) {
      setModelsError(error instanceof Error ? error.message : 'Unable to load models.')
    } finally {
      setModelsLoading(false)
    }
  }

  return (
    <Dialog.Root open={settingsOpen} onOpenChange={setSettingsOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100vw-2rem)] max-w-3xl -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(34,35,40,0.98),rgba(14,14,16,0.98))] shadow-2xl shadow-black/50">
          <div className="flex items-center justify-between border-b border-white/8 px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-cyan-200">
                <Settings2 className="h-5 w-5" />
              </div>
              <div>
                <Dialog.Title className="text-lg font-semibold text-white">Provider & sandbox settings</Dialog.Title>
                <Dialog.Description className="text-sm text-zinc-400">
                  OpenRouter powers the model. E2B provides the file sandbox.
                </Dialog.Description>
              </div>
            </div>
            <Dialog.Close asChild>
              <button className="rounded-full border border-white/10 bg-white/5 p-2 text-zinc-400 transition hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </Dialog.Close>
          </div>

          <div className="grid gap-6 px-6 py-6 lg:grid-cols-[1.15fr_0.85fr]">
            <section className="space-y-5">
              <div className="rounded-3xl border border-white/8 bg-black/20 p-5">
                <div className="mb-4 flex items-center gap-2 text-sm font-medium text-zinc-200">
                  <Sparkles className="h-4 w-4 text-cyan-300" />
                  OpenRouter
                </div>
                <label className="mb-2 block text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">
                  API key
                </label>
                <input
                  type="password"
                  value={openrouterApiKey}
                  onChange={(event) => setField('openrouterApiKey', event.target.value)}
                  placeholder="sk-or-v1-..."
                  className="mb-4 h-12 w-full rounded-2xl border border-white/10 bg-zinc-950/70 px-4 text-sm text-white outline-none transition placeholder:text-zinc-500 focus:border-cyan-400/40"
                />

                <div className="mb-2 flex items-center justify-between">
                  <label className="block text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">
                    Model
                  </label>
                  <Button
                    type="button"
                    size="sm"
                    className="rounded-full bg-cyan-300 px-4 text-xs font-semibold text-zinc-950 hover:bg-cyan-200"
                    onClick={refreshModels}
                    disabled={modelsLoading}
                  >
                    {modelsLoading ? 'Loading...' : 'Fetch models'}
                  </Button>
                </div>

                <Select.Root value={selectedModel} onValueChange={(value) => setField('selectedModel', value)}>
                  <Select.Trigger className="flex h-12 w-full items-center justify-between rounded-2xl border border-white/10 bg-zinc-950/70 px-4 text-sm text-white outline-none data-[placeholder]:text-zinc-500">
                    <Select.Value placeholder="Select a model" />
                    <Select.Icon>
                      <ChevronDown className="h-4 w-4 text-zinc-500" />
                    </Select.Icon>
                  </Select.Trigger>
                  <Select.Portal>
                    <Select.Content position="popper" sideOffset={8} className="z-[60] w-[var(--radix-select-trigger-width)] overflow-hidden rounded-2xl border border-white/10 bg-zinc-950 shadow-2xl shadow-black/60">
                      <Select.Viewport className="max-h-80 p-2">
                        {models.map((model) => (
                          <Select.Item
                            key={model.id}
                            value={model.id}
                            className="relative flex cursor-pointer select-none items-start gap-3 rounded-xl px-10 py-3 text-sm text-zinc-200 outline-none transition hover:bg-white/5 data-[state=checked]:bg-cyan-400/10"
                          >
                            <Select.ItemIndicator className="absolute left-3 top-3.5 text-cyan-300">
                              <Check className="h-4 w-4" />
                            </Select.ItemIndicator>
                            <div>
                              <div className="font-medium text-white">{model.name}</div>
                              <div className="mt-1 text-xs text-zinc-500">{model.id}</div>
                            </div>
                          </Select.Item>
                        ))}
                      </Select.Viewport>
                    </Select.Content>
                  </Select.Portal>
                </Select.Root>
                {modelsError ? <p className="mt-2 text-sm text-rose-300">{modelsError}</p> : null}
              </div>
            </section>

            <section className="space-y-5">
              <div className="rounded-3xl border border-white/8 bg-black/20 p-5">
                <div className="mb-4 flex items-center gap-2 text-sm font-medium text-zinc-200">
                  <KeyRound className="h-4 w-4 text-indigo-300" />
                  E2B sandbox
                </div>
                <label className="mb-2 block text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">
                  API key
                </label>
                <input
                  type="password"
                  value={e2bApiKey}
                  onChange={(event) => setField('e2bApiKey', event.target.value)}
                  placeholder="e2b_..."
                  className="mb-4 h-12 w-full rounded-2xl border border-white/10 bg-zinc-950/70 px-4 text-sm text-white outline-none transition placeholder:text-zinc-500 focus:border-indigo-400/40"
                />
                <label className="mb-2 block text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">
                  Custom template id
                </label>
                <input
                  value={templateId}
                  onChange={(event) => setField('templateId', event.target.value)}
                  placeholder="Optional custom template id"
                  className="h-12 w-full rounded-2xl border border-white/10 bg-zinc-950/70 px-4 text-sm text-white outline-none transition placeholder:text-zinc-500 focus:border-indigo-400/40"
                />
              </div>

              <div className="rounded-3xl border border-dashed border-white/10 bg-white/[0.03] p-5 text-sm text-zinc-400">
                <p className="font-medium text-zinc-200">Runtime-only handling</p>
                <p className="mt-2 leading-6">
                  Keys stay in frontend runtime state only. No database and no browser file storage are used.
                </p>
              </div>
            </section>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}