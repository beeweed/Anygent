import { useMemo, useState } from 'react'
import * as Collapsible from '@radix-ui/react-collapsible'
import * as ScrollArea from '@radix-ui/react-scroll-area'
import { ChevronRight, FileCode2, FolderClosed, FolderOpen, RefreshCcw } from 'lucide-react'

import { Button } from '@/components/ui/button'
import type { FileTreeNode } from '@/types/chat'

interface FileExplorerProps {
  tree: FileTreeNode[]
  selectedPath: string | null
  previewContent: string
  loading: boolean
  onSelectFile: (path: string) => void
  onRefresh: () => void
}

export function FileExplorer({
  tree,
  selectedPath,
  previewContent,
  loading,
  onSelectFile,
  onRefresh,
}: FileExplorerProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ '/home/user': true })

  const hasFiles = useMemo(() => tree.length > 0, [tree])

  function toggle(path: string) {
    setExpanded((current) => ({ ...current, [path]: !current[path] }))
  }

  return (
    <div className="grid h-full min-h-0 grid-cols-[280px_minmax(0,1fr)] overflow-hidden rounded-[30px] border border-white/8 bg-[linear-gradient(180deg,rgba(22,22,24,0.95),rgba(10,10,12,0.96))] shadow-[0_35px_120px_rgba(0,0,0,0.45)]">
      <aside className="border-r border-white/6 bg-black/20">
        <div className="flex items-center justify-between border-b border-white/6 px-4 py-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-zinc-500">Explorer</p>
            <p className="mt-1 text-xs text-zinc-400">Sandbox filesystem</p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="rounded-2xl text-zinc-300 hover:bg-white/[0.06] hover:text-white"
            onClick={onRefresh}
          >
            <RefreshCcw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        <ScrollArea.Root className="h-[calc(100%-73px)] overflow-hidden">
          <ScrollArea.Viewport className="h-full px-2 py-3">
            {hasFiles ? (
              <div className="space-y-1">
                {tree.map((node) => (
                  <TreeNode
                    key={node.path}
                    node={node}
                    depth={0}
                    expanded={expanded}
                    toggle={toggle}
                    selectedPath={selectedPath}
                    onSelectFile={onSelectFile}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-3xl border border-dashed border-white/10 bg-white/[0.03] p-4 text-sm text-zinc-500">
                No sandbox files yet. Ask the agent to create something.
              </div>
            )}
          </ScrollArea.Viewport>
          <ScrollArea.Scrollbar orientation="vertical" className="w-2.5 p-0.5">
            <ScrollArea.Thumb className="rounded-full bg-white/10" />
          </ScrollArea.Scrollbar>
        </ScrollArea.Root>
      </aside>

      <section className="flex min-h-0 flex-col">
        <div className="flex items-center justify-between border-b border-white/6 px-5 py-4">
          <div>
            <p className="text-xs font-medium text-zinc-400">Preview</p>
            <h2 className="mt-1 font-medium text-white">{selectedPath ?? 'Select a file'}</h2>
          </div>
        </div>
        <ScrollArea.Root className="flex-1 overflow-hidden">
          <ScrollArea.Viewport className="h-full p-5">
            <pre className="min-h-full rounded-[28px] border border-white/8 bg-zinc-950/90 p-5 font-mono text-[13px] leading-6 text-zinc-200 shadow-inner shadow-black/30">
              {previewContent || '// Select a file from the explorer to inspect sandbox output.'}
            </pre>
          </ScrollArea.Viewport>
          <ScrollArea.Scrollbar orientation="vertical" className="w-2.5 p-0.5">
            <ScrollArea.Thumb className="rounded-full bg-white/10" />
          </ScrollArea.Scrollbar>
        </ScrollArea.Root>
      </section>
    </div>
  )
}

interface TreeNodeProps {
  node: FileTreeNode
  depth: number
  expanded: Record<string, boolean>
  toggle: (path: string) => void
  selectedPath: string | null
  onSelectFile: (path: string) => void
}

function TreeNode({ node, depth, expanded, toggle, selectedPath, onSelectFile }: TreeNodeProps) {
  if (node.type === 'file') {
    const selected = selectedPath === node.path
    return (
      <button
        type="button"
        onClick={() => onSelectFile(node.path)}
        className={`flex w-full items-center gap-2 rounded-2xl px-3 py-2 text-left text-sm transition ${
          selected ? 'bg-cyan-400/10 text-cyan-100' : 'text-zinc-300 hover:bg-white/[0.05]'
        }`}
        style={{ paddingLeft: `${depth * 14 + 14}px` }}
      >
        <FileCode2 className="h-4 w-4 shrink-0 text-zinc-500" />
        <span className="truncate">{node.name}</span>
      </button>
    )
  }

  const open = expanded[node.path] ?? depth < 1
  return (
    <Collapsible.Root open={open} onOpenChange={() => toggle(node.path)}>
      <Collapsible.Trigger asChild>
        <button
          type="button"
          className="flex w-full items-center gap-2 rounded-2xl px-3 py-2 text-left text-sm text-zinc-200 transition hover:bg-white/[0.05]"
          style={{ paddingLeft: `${depth * 14 + 10}px` }}
        >
          <ChevronRight className={`h-4 w-4 shrink-0 transition ${open ? 'rotate-90' : ''}`} />
          {open ? <FolderOpen className="h-4 w-4 text-amber-300" /> : <FolderClosed className="h-4 w-4 text-amber-300" />}
          <span className="truncate">{node.name}</span>
        </button>
      </Collapsible.Trigger>
      <Collapsible.Content className="space-y-1">
        {node.children.map((child) => (
          <TreeNode
            key={child.path}
            node={child}
            depth={depth + 1}
            expanded={expanded}
            toggle={toggle}
            selectedPath={selectedPath}
            onSelectFile={onSelectFile}
          />
        ))}
      </Collapsible.Content>
    </Collapsible.Root>
  )
}