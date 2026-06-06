import { Sparkles } from 'lucide-react'

import type { StreamStatus } from '@/types/chat'

const LABELS: Record<Exclude<StreamStatus, 'idle' | 'complete' | 'error'>, string> = {
  thinking: 'thinking....',
  creating_sandbox: 'creating sandbox...',
  streaming: 'thinking....',
}

export function ThinkingIndicator({ status }: { status: StreamStatus }) {
  if (status === 'idle' || status === 'complete' || status === 'error') {
    return null
  }

  return (
    <div className="flex items-center gap-3 py-2 text-sm text-zinc-300">
      <div className="thinking-orb flex h-8 w-8 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10 text-cyan-200">
        <Sparkles className="h-4 w-4" />
      </div>
      <div className="thinking-shine inline-flex items-center gap-2 rounded-full border border-white/8 bg-white/[0.03] px-4 py-2 text-zinc-200">
        <span>{LABELS[status]}</span>
        <span className="thinking-dots">
          <span />
          <span />
          <span />
        </span>
      </div>
    </div>
  )
}