import * as Tabs from '@radix-ui/react-tabs';
import { Files, MessageSquare } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Group as PanelGroup, Panel, Separator as PanelResizeHandle } from 'react-resizable-panels';

import { ChatHistorySidebar } from '@/components/chat-history-sidebar';
import { ChatPanel } from '@/components/chat-panel';
import { ExplorerPanel } from '@/components/explorer-panel';
import { MemoryDrawer } from '@/components/memory-drawer';
import { SettingsDialog } from '@/components/settings-dialog';
import { useAgentActions } from '@/hooks/use-agent-actions';
import { useAgentStore } from '@/store/use-agent-store';
import type { ChatHistory } from '@/types';

function App() {
  const [loadingModels, setLoadingModels] = useState(false);
  const [migrated, setMigrated] = useState(false);
  const {
    settings,
    isSettingsOpen,
    isMemoryOpen,
    mobileTab,
    setSettingsOpen,
    setMemoryOpen,
    setMobileTab,
    error,
  } = useAgentStore();
  const { clearSession, openFile, refreshModels, refreshProviders, refreshTree, sendMessage } = useAgentActions();

  useEffect(() => {
    void refreshProviders();
  }, [refreshProviders]);

  useEffect(() => {
    const providerKey = settings.provider === 'openrouter' ? settings.openrouterApiKey : settings.nvidiaApiKey;
    if (!providerKey) return;
    setLoadingModels(true);
    void refreshModels().finally(() => setLoadingModels(false));
  }, [refreshModels, settings.nvidiaApiKey, settings.openrouterApiKey, settings.provider]);

  useEffect(() => {
    if (migrated) return;
    const state = useAgentStore.getState();
    if (state.messages.length > 0 && state.chatHistories.length === 0 && !state.activeChatId) {
      const firstUserMessage = state.messages.find((m) => m.role === 'user');
      const name = firstUserMessage
        ? (firstUserMessage.content.length > 35
            ? firstUserMessage.content.slice(0, 35) + '…'
            : firstUserMessage.content)
        : 'Chat';
      const newChat: ChatHistory = {
        id: crypto.randomUUID(),
        name,
        messages: state.messages,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      useAgentStore.setState({
        chatHistories: [newChat],
        activeChatId: newChat.id,
      });
    }
    setMigrated(true);
  }, [migrated]);

  const desktopLayout = useMemo(
    () => (
      <PanelGroup className="hidden h-full md:flex" id="ai-sandbox-panels" orientation="horizontal">
        <Panel defaultSize={38} minSize={32}>
          <div className="h-full p-3">
            <ChatPanel
              onOpenMemory={() => setMemoryOpen(true)}
              onOpenSettings={() => setSettingsOpen(true)}
              onReset={clearSession}
              onSend={sendMessage}
            />
          </div>
        </Panel>
        <PanelResizeHandle className="group relative hidden w-4 items-center justify-center md:flex">
          <div className="h-full w-px bg-white/6 transition group-hover:bg-indigo-400/30" />
        </PanelResizeHandle>
        <Panel defaultSize={62} minSize={34}>
          <div className="h-full p-3 pl-0">
            <ExplorerPanel onOpenFile={openFile} onRefresh={refreshTree} />
          </div>
        </Panel>
      </PanelGroup>
    ),
    [clearSession, openFile, refreshTree, sendMessage, setMemoryOpen, setSettingsOpen],
  );

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#191919] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(99,102,241,0.08),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(34,211,238,0.06),transparent_28%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.02),transparent_24%)]" />

      <main className="relative h-screen w-screen overflow-hidden">
        <ChatHistorySidebar />
        {desktopLayout}

        <div className="flex h-full flex-col md:hidden">
          <Tabs.Root value={mobileTab} onValueChange={(value) => setMobileTab(value as 'chat' | 'files')} className="flex h-full flex-col">
            <Tabs.Content value="chat" className="mt-0 flex-1 p-3 pb-0 data-[state=inactive]:hidden">
              <ChatPanel
                onOpenMemory={() => setMemoryOpen(true)}
                onOpenSettings={() => setSettingsOpen(true)}
                onReset={clearSession}
                onSend={sendMessage}
              />
            </Tabs.Content>
            <Tabs.Content value="files" className="mt-0 flex-1 p-3 pb-0 data-[state=inactive]:hidden">
              <ExplorerPanel onOpenFile={openFile} onRefresh={refreshTree} />
            </Tabs.Content>
            <Tabs.List className="grid h-14 grid-cols-2 border-t border-white/6 bg-[#232323]">
              <Tabs.Trigger value="chat" className="flex items-center justify-center gap-2 text-sm text-zinc-500 data-[state=active]:bg-indigo-500/12 data-[state=active]:text-indigo-200">
                <MessageSquare className="h-4 w-4" />
                Chat
              </Tabs.Trigger>
              <Tabs.Trigger value="files" className="flex items-center justify-center gap-2 text-sm text-zinc-500 data-[state=active]:bg-indigo-500/12 data-[state=active]:text-indigo-200">
                <Files className="h-4 w-4" />
                Files
              </Tabs.Trigger>
            </Tabs.List>
          </Tabs.Root>
        </div>
      </main>

      <SettingsDialog
        open={isSettingsOpen}
        onOpenChange={setSettingsOpen}
        onRefreshModels={async () => {
          setLoadingModels(true);
          try {
            await refreshModels();
          } finally {
            setLoadingModels(false);
          }
        }}
        loadingModels={loadingModels}
      />
      <MemoryDrawer open={isMemoryOpen} onOpenChange={setMemoryOpen} />

      {error ? (
        <div className="pointer-events-none fixed bottom-4 right-4 z-50 max-w-sm rounded-2xl border border-rose-500/30 bg-[#2d2d2d] px-4 py-3 text-sm text-rose-200 shadow-[0_14px_40px_rgba(0,0,0,0.35)]">
          {error}
        </div>
      ) : null}
    </div>
  );
}

export default App