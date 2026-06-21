import * as ScrollArea from '@radix-ui/react-scroll-area';
import * as Tooltip from '@radix-ui/react-tooltip';
import { MessageSquare, Plus, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { useAgentStore } from '@/store/use-agent-store';
import { cn } from '@/lib/utils';

export function ChatHistorySidebar() {
  const isSidebarOpen = useAgentStore((s) => s.isSidebarOpen);
  const setSidebarOpen = useAgentStore((s) => s.setSidebarOpen);
  const chatHistories = useAgentStore((s) => s.chatHistories);
  const activeChatId = useAgentStore((s) => s.activeChatId);
  const createNewChat = useAgentStore((s) => s.createNewChat);
  const switchToChat = useAgentStore((s) => s.switchToChat);
  const deleteChatHistory = useAgentStore((s) => s.deleteChatHistory);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  if (!isSidebarOpen) return null;

  function handleDelete(e: React.MouseEvent, chatId: string) {
    e.stopPropagation();
    if (confirmDeleteId === chatId) {
      deleteChatHistory(chatId);
      setConfirmDeleteId(null);
    } else {
      setConfirmDeleteId(chatId);
    }
  }

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
        onClick={() => { setSidebarOpen(false); setConfirmDeleteId(null); }}
      />
      <aside className="fixed left-0 top-0 z-50 flex h-full w-[280px] flex-col border-r border-white/6 bg-[#191919] shadow-[4px_0_40px_rgba(0,0,0,0.4)] animate-fade-in">
        <div className="flex items-center justify-between border-b border-white/6 px-4 py-3">
          <h2 className="text-sm font-semibold text-white">Chat History</h2>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => { createNewChat(); setConfirmDeleteId(null); }}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-white/5 hover:text-white"
            >
              <Plus className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => { setSidebarOpen(false); setConfirmDeleteId(null); }}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-white/5 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <ScrollArea.Root className="min-h-0 flex-1 overflow-hidden">
          <ScrollArea.Viewport className="h-full px-2 py-3">
            <div className="space-y-1">
              {chatHistories.length === 0 ? (
                <div className="px-3 py-8 text-center text-xs text-zinc-500">
                  No chat history yet.
                  <br />
                  Start a new conversation.
                </div>
              ) : (
                chatHistories.map((chat) => (
                  <div
                    key={chat.id}
                    className={cn(
                      'flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition',
                      chat.id === activeChatId
                        ? 'bg-indigo-500/12 text-indigo-200'
                        : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200',
                    )}
                    onClick={() => {
                      if (confirmDeleteId) { setConfirmDeleteId(null); return; }
                      switchToChat(chat.id);
                      setSidebarOpen(false);
                    }}
                  >
                    <MessageSquare className="h-4 w-4 shrink-0 opacity-70" />
                    <span className="flex-1 truncate">{chat.name}</span>
                    <Tooltip.Root open={confirmDeleteId === chat.id ? false : undefined}>
                      <Tooltip.Trigger asChild>
                        <button
                          type="button"
                          onClick={(e) => handleDelete(e, chat.id)}
                          className={cn(
                            'flex h-7 w-7 items-center justify-center rounded-lg transition',
                            confirmDeleteId === chat.id
                              ? 'bg-rose-500/20 text-rose-300'
                              : 'text-zinc-500 hover:bg-white/8 hover:text-rose-400',
                          )}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </Tooltip.Trigger>
                      <Tooltip.Portal>
                        <Tooltip.Content className="z-50 rounded-xl border border-white/8 bg-[#1d1d1d] px-3 py-2 text-xs text-zinc-200 shadow-2xl" sideOffset={6}>
                          {confirmDeleteId === chat.id ? 'Click again to confirm' : 'Delete chat'}
                        </Tooltip.Content>
                      </Tooltip.Portal>
                    </Tooltip.Root>
                  </div>
                ))
              )}
            </div>
          </ScrollArea.Viewport>
          <ScrollArea.Scrollbar className="flex w-2 touch-none select-none bg-transparent p-[2px]" orientation="vertical">
            <ScrollArea.Thumb className="relative flex-1 rounded-full bg-white/12" />
          </ScrollArea.Scrollbar>
        </ScrollArea.Root>
      </aside>
    </>
  );
}
