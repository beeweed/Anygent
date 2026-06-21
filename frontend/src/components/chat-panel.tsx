import * as ScrollArea from '@radix-ui/react-scroll-area';
import * as Tooltip from '@radix-ui/react-tooltip';
import { Code2, HardDrive, RotateCcw, SendHorizontal, Settings2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';

import { useAgentStore } from '@/store/use-agent-store';
import { cn } from '@/lib/utils';
import { ThinkingIndicator } from '@/components/thinking-indicator';

type ChatPanelProps = {
  onOpenSettings: () => void;
  onOpenMemory: () => void;
  onReset: () => Promise<void>;
  onSend: (message: string) => Promise<void>;
};

export function ChatPanel({ onOpenSettings, onOpenMemory, onReset, onSend }: ChatPanelProps) {
  const [draft, setDraft] = useState('');
  const { messages, iterationCurrent, iterationMax, isStreaming, settings } = useAgentStore();

  const blockingMessage = useMemo(() => {
    const providerKey = settings.provider === 'openrouter' ? settings.openrouterApiKey : settings.nvidiaApiKey;
    if (!providerKey) return 'Add a provider API key in settings.';
    if (!settings.model) return 'Select a model in settings.';
    if (!settings.e2bApiKey) return 'Add an E2B API key to enable sandbox creation.';
    return null;
  }, [settings]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextMessage = draft.trim();
    if (!nextMessage || isStreaming || blockingMessage) return;
    setDraft('');
    await onSend(nextMessage);
  }

  return (
    <section className="flex h-full flex-col rounded-[28px] border border-white/6 bg-[#1e1e1e] shadow-[0_16px_80px_rgba(0,0,0,0.28)]">
      <header className="flex items-center justify-between border-b border-white/6 bg-[#252525] px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,rgba(99,102,241,0.92),rgba(59,130,246,0.68))] shadow-[0_10px_30px_rgba(99,102,241,0.32)]">
            <Code2 className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-white">Vibe Coder</h1>
            <p className="text-[11px] text-zinc-500">Autonomous AI Agent</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <HeaderIconButton label="Open session memory" onClick={onOpenMemory}>
            <HardDrive className="h-4.5 w-4.5" />
          </HeaderIconButton>
          <HeaderIconButton label="Reset session" onClick={() => void onReset()}>
            <RotateCcw className="h-4.5 w-4.5" />
          </HeaderIconButton>
          <HeaderIconButton label="Open settings" onClick={onOpenSettings}>
            <Settings2 className="h-4.5 w-4.5" />
          </HeaderIconButton>
        </div>
      </header>

      <ScrollArea.Root className="min-h-0 flex-1 overflow-hidden">
        <ScrollArea.Viewport className="h-full px-5 py-5">
          <div className="space-y-5">
            <div className="inline-flex items-center gap-2 rounded-xl border border-indigo-400/20 bg-indigo-500/10 px-3 py-2">
              <span className="h-2 w-2 rounded-full bg-indigo-400 shadow-[0_0_12px_rgba(129,140,248,0.8)]" />
              <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-indigo-200">
                Iteration {iterationCurrent}/{iterationMax}
              </span>
            </div>

            {messages.length === 0 ? (
              <div className="rounded-[24px] border border-dashed border-white/10 bg-white/[0.02] p-6 text-sm text-zinc-400">
                Configure your keys, select a model, and ask the agent to create or edit files inside an E2B sandbox.
              </div>
            ) : null}

            {messages.map((message) => (
              <article key={message.id} className={cn('animate-fade-in', message.role === 'user' ? 'flex justify-end' : 'flex gap-3')}>
                {message.role === 'assistant' ? (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[linear-gradient(135deg,rgba(99,102,241,0.18),rgba(34,211,238,0.15))] text-indigo-200">
                    <Code2 className="h-4 w-4" />
                  </div>
                ) : null}

                <div className={cn('max-w-[88%]', message.role === 'assistant' ? 'flex-1' : '')}>
                  {message.role === 'assistant' ? <span className="mb-2 block text-xs font-medium text-zinc-500">Vibe Coder</span> : null}

                  {message.role === 'user' ? (
                    <div className="rounded-[22px] rounded-tr-md bg-indigo-500 px-4 py-3 text-sm text-white shadow-[0_12px_40px_rgba(99,102,241,0.22)]">
                      {message.content}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {message.content ? (
                        <div className="space-y-3 text-[15px] leading-7 text-zinc-100">
                          {message.content.split('\n').map((line, index) => (
                            <p key={`${message.id}-${index}`}>{line || <>&nbsp;</>}</p>
                          ))}
                        </div>
                      ) : null}

                      {message.toolChips.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {message.toolChips.map((chip) => (
                            <span
                              key={chip.id}
                              className={cn(
                                'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium',
                                chip.status === 'pending' && 'border-indigo-400/20 bg-indigo-500/12 text-indigo-200',
                                chip.status === 'success' && 'border-emerald-400/20 bg-emerald-500/12 text-emerald-200',
                                chip.status === 'error' && 'border-rose-400/20 bg-rose-500/12 text-rose-200',
                              )}
                            >
                              <span className="h-1.5 w-1.5 rounded-full bg-current opacity-90" />
                              {chip.label}
                            </span>
                          ))}
                        </div>
                      ) : null}

                      {message.streaming && message.phase && message.statusLabel ? (
                        <ThinkingIndicator
                          label={message.statusLabel}
                          variant={message.phase === 'creating_sandbox' ? 'creating_sandbox' : 'thinking'}
                        />
                      ) : null}

                      {message.error ? <p className="text-sm text-rose-400">{message.error}</p> : null}
                    </div>
                  )}
                </div>
              </article>
            ))}
          </div>
        </ScrollArea.Viewport>
        <ScrollArea.Scrollbar className="flex w-2.5 touch-none select-none bg-transparent p-[2px]" orientation="vertical">
          <ScrollArea.Thumb className="relative flex-1 rounded-full bg-white/12" />
        </ScrollArea.Scrollbar>
      </ScrollArea.Root>

      <form onSubmit={handleSubmit} className="border-t border-white/6 bg-[#252525] p-4">
        <div className="rounded-[24px] border border-white/8 bg-[#323234] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition focus-within:border-indigo-400/40">
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Describe what you want the agent to build inside the sandbox..."
            rows={4}
            disabled={isStreaming}
            className="min-h-[110px] w-full resize-none bg-transparent px-2 py-1 text-sm leading-6 text-white placeholder:text-zinc-500 focus:outline-none"
          />
          <div className="mt-3 flex items-center justify-between gap-3 px-2 pb-1">
            <div className="text-xs text-zinc-500">
              {blockingMessage ?? 'Native tool calling is enabled and streamed in real time.'}
            </div>
            <button
              type="submit"
              disabled={Boolean(blockingMessage) || isStreaming || !draft.trim()}
              className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-500 text-white shadow-[0_10px_30px_rgba(99,102,241,0.28)] transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-500"
            >
              <SendHorizontal className="h-5 w-5" />
            </button>
          </div>
        </div>
      </form>
    </section>
  );
}

function HeaderIconButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>
        <button
          type="button"
          onClick={onClick}
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-zinc-500 transition hover:bg-white/5 hover:text-white"
        >
          {children}
        </button>
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content className="z-50 rounded-xl border border-white/8 bg-[#1d1d1d] px-3 py-2 text-xs text-zinc-200 shadow-2xl" sideOffset={8}>
          {label}
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}