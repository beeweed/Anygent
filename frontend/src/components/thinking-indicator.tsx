import { cn } from '@/lib/utils';

type ThinkingIndicatorProps = {
  label: string;
  variant?: 'thinking' | 'creating_sandbox';
};

export function ThinkingIndicator({ label, variant = 'thinking' }: ThinkingIndicatorProps) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white/6 bg-[rgba(54,54,56,0.45)] px-4 py-3">
      <div
        className={cn(
          'relative flex h-9 w-9 items-center justify-center rounded-2xl overflow-hidden border border-white/10',
          variant === 'creating_sandbox'
            ? 'bg-[linear-gradient(135deg,rgba(34,211,238,0.18),rgba(99,102,241,0.26))]'
            : 'bg-[linear-gradient(135deg,rgba(99,102,241,0.18),rgba(34,211,238,0.18))]',
        )}
      >
        <span className="absolute inset-0 shimmer-surface" />
        <span className="relative flex gap-1">
          <span className="thinking-dot" />
          <span className="thinking-dot" />
          <span className="thinking-dot" />
        </span>
      </div>
      <div className="flex min-w-0 flex-col gap-1">
        <span className="shimmer-text text-sm font-semibold text-white/92">{label}</span>
        <span className="text-xs text-zinc-500">
          {variant === 'creating_sandbox'
            ? 'Preparing a live E2B environment before tool execution.'
            : 'Streaming live tokens and pausing for native tool calls when needed.'}
        </span>
      </div>
    </div>
  );
}