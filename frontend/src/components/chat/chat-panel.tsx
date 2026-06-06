import * as ScrollArea from '@radix-ui/react-scroll-area'
import * as Tooltip from '@radix-ui/react-tooltip'
import { Bot, FolderTree, Settings2, User2 } from 'lucide-react'

import { MessageComposer } from '@/components/chat/message-composer'
import { ThinkingIndicator } from '@/components/chat/thinking-indicator'
import { Button } from '@/components/ui/button'
import { useAppStore } from '@/store/app-store'
import { useSettingsStore } from '@/store/settings-store'

export function ChatPanel() {
  const messages = useAppStore((state) => state.messages)
  const status = useAppStore((state) => state.status)
  const iteration = useAppStore((state) => state.iteration)
  const maxIterations = useAppStore((state) => state.maxIterations)
  const error = useAppStore((state) => state.error)
  const setSettingsOpen = useSettingsStore((state) => state.setSettingsOpen)
  const setMobileFilesOpen = useAppStore((state) => state.setMobileFilesOpen)

  return (
    <div className="flex h-full min-h-0 flex-col rounded-[30px] border border-white/8 bg-[linear-gradient(180deg,rgba(27,27,30,0.95),rgba(12,12,14,0.96))] shadow-[0_35px_120px_rgba(0,0,0,0.45)]">
      <div className="flex items-center justify-between border-b border-white/6 px-4 py-4 sm:px-5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[radial-gradient(circle_at_top,rgba(102,254,255,0.38),rgba(89,61,255,0.18)_55%,rgba(255,255,255,0.02))] text-cyan-100 shadow-[0_0_40px_rgba(59,130,246,0.18)]">
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-white">Sandbox Agent Studio</h1>
            <p className="text-xs text-zinc-500">OpenRouter + E2B coding agent</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden rounded-full border border-cyan-400/15 bg-cyan-400/10 px-3 py-1 text-xs font-medium text-cyan-200 sm:block">
            Iteration {iteration}/{maxIterations}
          </div>
          <Tooltip.Root>
            <Tooltip.Trigger asChild>
              <button
                type="button"
                onClick={() => setMobileFilesOpen(true)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/8 bg-white/[0.03] text-zinc-300 transition hover:bg-white/[0.07] lg:hidden"
              >
                <FolderTree className="h-4 w-4" />
              </button>
            </Tooltip.Trigger>
            <Tooltip.Portal>
              <Tooltip.Content sideOffset={8} className="rounded-xl border border-white/8 bg-zinc-950 px-3 py-2 text-xs text-white">
                Files
              </Tooltip.Content>
            </Tooltip.Portal>
          </Tooltip.Root>
          <Button
            type="button"
            variant="outline"
            className="h-10 rounded-2xl border-white/8 bg-white/[0.03] text-zinc-200 hover:bg-white/[0.07]"
            onClick={() => setSettingsOpen(true)}
          >
            <Settings2 className="h-4 w-4" />
            <span className="hidden sm:inline">Settings</span>
          </Button>
        </div>
      </div>

      <ScrollArea.Root className="flex-1 overflow-hidden">
        <ScrollArea.Viewport className="h-full px-4 py-5 sm:px-5">
          <div className="space-y-6">
            {messages.map((message) => (
              <article key={message.id} className="space-y-3">
                {message.role === 'user' ? (
                  <div className="flex justify-end gap-3">
                    <div className="max-w-[85%] rounded-[24px] rounded-tr-lg bg-cyan-300 px-4 py-3 text-sm font-medium text-zinc-950 shadow-lg shadow-cyan-500/15">
                      {message.content}
                    </div>
                    <div className="flex h-9 w-9 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10 text-cyan-100">
                      <User2 className="h-4 w-4" />
                    </div>
                  </div>
                ) : (
                  <div className="grid gap-3">
                    <div className="flex items-center gap-3 text-xs uppercase tracking-[0.24em] text-zinc-500">
                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-2xl border border-indigo-400/10 bg-indigo-400/10 text-indigo-100">
                        <Bot className="h-4 w-4" />
                      </span>
                      Agent output
                    </div>
                    {message.content ? (
                      <div className="agent-copy whitespace-pre-wrap text-[15px] leading-7 text-zinc-100">
                        {message.content}
                      </div>
                    ) : null}
                    {message.toolEvents.length ? (
                      <div className="flex flex-wrap gap-2">
                        {message.toolEvents.map((toolEvent) => (
                          <div
                            key={toolEvent.id}
                            className={`inline-flex max-w-full items-center gap-2 rounded-full border px-3 py-1.5 text-xs ${
                              toolEvent.isError
                                ? 'border-rose-400/20 bg-rose-500/10 text-rose-200'
                                : 'border-white/10 bg-white/[0.04] text-zinc-200'
                            }`}
                          >
                            <span className="font-medium">{toolEvent.label}</span>
                            {toolEvent.result ? (
                              <span className="max-w-[20rem] truncate text-zinc-400">{toolEvent.result}</span>
                            ) : (
                              <span className="text-zinc-500">running</span>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                )}
              </article>
            ))}
            <ThinkingIndicator status={status} />
            {error ? <p className="rounded-2xl border border-rose-400/15 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">{error}</p> : null}
          </div>
        </ScrollArea.Viewport>
        <ScrollArea.Scrollbar orientation="vertical" className="w-2.5 p-0.5">
          <ScrollArea.Thumb className="rounded-full bg-white/10" />
        </ScrollArea.Scrollbar>
      </ScrollArea.Root>

      <MessageComposer />
    </div>
  )
}