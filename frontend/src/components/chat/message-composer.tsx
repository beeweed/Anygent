import { useState, type FormEvent } from 'react'
import { ArrowUpRight, StopCircle } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { useChatStream } from '@/hooks/use-chat-stream'
import { useAppStore } from '@/store/app-store'
import { useSettingsStore } from '@/store/settings-store'

export function MessageComposer() {
  const [value, setValue] = useState('')
  const { sendMessage, stop } = useChatStream()
  const isStreaming = useAppStore((state) => state.isStreaming)
  const setError = useAppStore((state) => state.setError)
  const openSettings = useSettingsStore((state) => state.setSettingsOpen)
  const hasRequiredSettings = useSettingsStore(
    (state) => Boolean(state.openrouterApiKey && state.e2bApiKey && state.selectedModel),
  )

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const prompt = value.trim()
    if (!prompt) {
      return
    }

    if (!hasRequiredSettings) {
      openSettings(true)
      return
    }

    try {
      setValue('')
      await sendMessage(prompt)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to send the prompt.')
      useAppStore.getState().setStatus('error')
      useAppStore.getState().setStreaming(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="border-t border-white/6 bg-black/20 px-4 pb-4 pt-3 sm:px-5">
      <div className="rounded-[28px] border border-white/8 bg-zinc-950/90 p-3 shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
        <textarea
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="Describe what you want the agent to build in the E2B sandbox..."
          className="min-h-[96px] w-full resize-none bg-transparent px-2 py-2 text-sm leading-6 text-white outline-none placeholder:text-zinc-500"
          disabled={isStreaming}
        />
        <div className="mt-3 flex items-center justify-between gap-3 border-t border-white/6 px-2 pt-3">
          <p className="text-xs text-zinc-500">
            Native tool calling · SSE streaming · max 1000 iterations
          </p>
          <div className="flex items-center gap-2">
            {isStreaming ? (
              <Button
                type="button"
                variant="outline"
                className="rounded-full border-white/10 bg-white/[0.03] text-zinc-200 hover:bg-white/[0.08]"
                onClick={stop}
              >
                <StopCircle className="h-4 w-4" />
                Stop
              </Button>
            ) : null}
            <Button
              type="submit"
              className="h-11 rounded-full bg-cyan-300 px-5 font-semibold text-zinc-950 shadow-lg shadow-cyan-500/10 hover:bg-cyan-200"
              disabled={!value.trim()}
            >
              <ArrowUpRight className="h-4 w-4" />
              Send
            </Button>
          </div>
        </div>
      </div>
    </form>
  )
}