import * as Dialog from '@radix-ui/react-dialog';
import * as ScrollArea from '@radix-ui/react-scroll-area';
import { Cross2Icon } from '@radix-ui/react-icons';
import { Brain, Code2, Files, TimerReset, Zap } from 'lucide-react';
import type { ComponentType } from 'react';

import { useAgentStore } from '@/store/use-agent-store';
import type { FileTreeNode } from '@/types';

export function MemoryDrawer({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { iterationCurrent, iterationMax, messages, explorerTree } = useAgentStore();
  const assistantMessages = messages.filter((message) => message.role === 'assistant');
  const toolCallCount = assistantMessages.reduce((count, message) => count + message.toolChips.length, 0);
  const fileCount = countFiles(explorerTree);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" />
        <Dialog.Content className="fixed right-0 top-0 z-50 flex h-full w-full max-w-[520px] flex-col border-l border-white/8 bg-[#2d2d2d] shadow-[0_0_120px_rgba(0,0,0,0.45)] outline-none">
          <div className="border-b border-white/8 bg-[#232323] px-6 py-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,rgba(99,102,241,0.22),rgba(34,211,238,0.12))] text-indigo-200">
                  <Brain className="h-5 w-5" />
                </div>
                <div>
                  <Dialog.Title className="text-lg font-semibold text-white">Agent Memory</Dialog.Title>
                  <Dialog.Description className="text-xs text-zinc-500">
                    Complete chat timeline, tool activity, and current workspace state.
                  </Dialog.Description>
                </div>
              </div>
              <Dialog.Close className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-zinc-500 transition hover:bg-white/5 hover:text-white">
                <Cross2Icon className="h-5 w-5" />
              </Dialog.Close>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <MetricCard icon={Zap} label="Iterations" value={`${iterationCurrent}/${iterationMax}`} />
              <MetricCard icon={Files} label="Files" value={`${fileCount}`} accent="emerald" />
              <MetricCard icon={Code2} label="Tool calls" value={`${toolCallCount}`} accent="sky" />
              <MetricCard icon={TimerReset} label="Messages" value={`${messages.length}`} accent="amber" />
            </div>
          </div>

          <ScrollArea.Root className="flex-1 overflow-hidden">
            <ScrollArea.Viewport className="space-y-3 p-4">
              {messages.length === 0 ? (
                <div className="flex h-full items-center justify-center rounded-[24px] border border-dashed border-white/10 bg-white/[0.02] p-8 text-center text-sm text-zinc-500">
                  Memory will populate after the first conversation turn.
                </div>
              ) : (
                messages.map((message) => (
                  <div key={message.id} className="rounded-[22px] border border-white/8 bg-[#363638] p-4">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-500">{message.role}</span>
                      <span className="text-[11px] text-zinc-600">{new Date(message.createdAt).toLocaleTimeString()}</span>
                    </div>
                    <p className="whitespace-pre-wrap text-sm leading-6 text-zinc-100">{message.content || message.statusLabel || 'No text emitted yet.'}</p>
                    {message.toolChips.length > 0 ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {message.toolChips.map((chip) => (
                          <span
                            key={chip.id}
                            className="rounded-full border border-white/8 bg-black/20 px-3 py-1 text-xs text-zinc-300"
                          >
                            {chip.label}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ))
              )}
            </ScrollArea.Viewport>
            <ScrollArea.Scrollbar className="flex w-2.5 touch-none select-none bg-transparent p-[2px]" orientation="vertical">
              <ScrollArea.Thumb className="relative flex-1 rounded-full bg-white/12" />
            </ScrollArea.Scrollbar>
          </ScrollArea.Root>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  accent = 'indigo',
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
  accent?: 'indigo' | 'emerald' | 'sky' | 'amber';
}) {
  const accents = {
    indigo: 'from-indigo-500/14 to-indigo-600/4 border-indigo-400/20 text-indigo-200',
    emerald: 'from-emerald-500/14 to-emerald-600/4 border-emerald-400/20 text-emerald-200',
    sky: 'from-sky-500/14 to-sky-600/4 border-sky-400/20 text-sky-200',
    amber: 'from-amber-500/14 to-amber-600/4 border-amber-400/20 text-amber-200',
  } as const;

  return (
    <div className={`rounded-[20px] border bg-gradient-to-br p-4 ${accents[accent]}`}>
      <div className="mb-2 flex items-center gap-2 text-[11px] uppercase tracking-[0.24em] text-zinc-500">
        <Icon className="h-4 w-4" />
        {label}
      </div>
      <div className="text-2xl font-semibold text-white">{value}</div>
    </div>
  );
}

function countFiles(nodes: FileTreeNode[]): number {
  return nodes.reduce((total, node) => {
    if (node.type !== 'dir') return total + 1;
    return total + countFiles(node.children ?? []);
  }, 0);
}