import * as Dialog from '@radix-ui/react-dialog'
import { FolderTree, X } from 'lucide-react'

import { routes } from '@/app/routes/route'
import { ChatPanel } from '@/components/chat/chat-panel'
import { FileExplorer } from '@/components/explorer/file-explorer'
import { SettingsDialog } from '@/components/settings/settings-dialog'
import { AppProvider } from '@/contexts/app-provider'
import { apiUrl, safeJson } from '@/lib/api'
import { useAppStore } from '@/store/app-store'

function App() {
  const fileTree = useAppStore((state) => state.fileTree)
  const selectedFilePath = useAppStore((state) => state.selectedFilePath)
  const filePreview = useAppStore((state) => state.filePreview)
  const mobileFilesOpen = useAppStore((state) => state.mobileFilesOpen)
  const sessionId = useAppStore((state) => state.sessionId)
  const sandboxReady = useAppStore((state) => state.sandboxReady)
  const setMobileFilesOpen = useAppStore((state) => state.setMobileFilesOpen)
  const setSelectedFilePath = useAppStore((state) => state.setSelectedFilePath)
  const setFilePreview = useAppStore((state) => state.setFilePreview)
  const setFileTree = useAppStore((state) => state.setFileTree)
  const setError = useAppStore((state) => state.setError)

  async function handleSelectFile(path: string) {
    setSelectedFilePath(path)

    try {
      const response = await fetch(`${apiUrl(`/sandbox/${sessionId}/file`)}?path=${encodeURIComponent(path)}`)
      const payload = await safeJson<{ path: string; content: string }>(response)
      setFilePreview(payload)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unable to load the file preview.')
    }
  }

  async function handleRefreshTree() {
    if (!sandboxReady) {
      return
    }

    try {
      const response = await fetch(apiUrl(`/sandbox/${sessionId}/tree`))
      const payload = await safeJson<{ tree: typeof fileTree }>(response)
      setFileTree(payload.tree)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unable to refresh the file tree.')
    }
  }

  return (
    <AppProvider>
      <div className="min-h-screen bg-[#060708] text-white">
        <div className="mx-auto flex min-h-screen max-w-[1800px] flex-col px-3 py-3 sm:px-4 lg:px-5">
          <div className="mb-3 flex items-center justify-between rounded-[26px] border border-white/6 bg-white/[0.02] px-4 py-3 text-sm text-zinc-500 backdrop-blur-xl">
            <span>Route: {routes.home}</span>
            <span className="flex items-center gap-2">
              <FolderTree className="h-4 w-4" />
              Responsive agent workspace
            </span>
          </div>

          <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[minmax(0,0.78fr)_minmax(0,1.22fr)]">
            <ChatPanel />
            <div className="hidden min-h-0 lg:block">
              <FileExplorer
                tree={fileTree}
                selectedPath={selectedFilePath}
                previewContent={filePreview?.content ?? ''}
                loading={false}
                onSelectFile={handleSelectFile}
                onRefresh={handleRefreshTree}
              />
            </div>
          </div>
        </div>

        <Dialog.Root open={mobileFilesOpen} onOpenChange={setMobileFilesOpen}>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 z-40 bg-black/75 backdrop-blur-sm lg:hidden" />
            <Dialog.Content className="fixed inset-x-3 bottom-3 top-24 z-50 rounded-[28px] border border-white/8 bg-[#090a0c] p-2 shadow-2xl shadow-black/50 lg:hidden">
              <div className="mb-2 flex items-center justify-between rounded-[24px] border border-white/6 bg-white/[0.03] px-4 py-3">
                <div>
                  <Dialog.Title className="text-sm font-semibold text-white">Sandbox files</Dialog.Title>
                  <Dialog.Description className="text-xs text-zinc-500">
                    Browse files created inside the current E2B sandbox.
                  </Dialog.Description>
                </div>
                <Dialog.Close asChild>
                  <button className="rounded-full border border-white/10 bg-white/[0.03] p-2 text-zinc-400">
                    <X className="h-4 w-4" />
                  </button>
                </Dialog.Close>
              </div>
              <div className="h-[calc(100%-64px)]">
                <FileExplorer
                  tree={fileTree}
                  selectedPath={selectedFilePath}
                  previewContent={filePreview?.content ?? ''}
                  loading={false}
                  onSelectFile={handleSelectFile}
                  onRefresh={handleRefreshTree}
                />
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>

        <SettingsDialog />
      </div>
    </AppProvider>
  )
}

export default App