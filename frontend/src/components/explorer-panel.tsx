import * as ScrollArea from '@radix-ui/react-scroll-area';
import * as Tabs from '@radix-ui/react-tabs';
import { ChevronDown, ChevronRight, FileCode2, Folder, FolderOpen, RefreshCcw } from 'lucide-react';
import { useMemo, useState } from 'react';

import { cn } from '@/lib/utils';
import { useAgentStore } from '@/store/use-agent-store';
import type { FileTreeNode } from '@/types';

type ExplorerPanelProps = {
  onRefresh: () => Promise<void>;
  onOpenFile: (path: string) => Promise<void>;
};

export function ExplorerPanel({ onRefresh, onOpenFile }: ExplorerPanelProps) {
  const { explorerTree, selectedFilePath, filePreview, fileLoading } = useAgentStore();
  const [expandedPaths, setExpandedPaths] = useState<Record<string, boolean>>({
    '/home': true,
    '/home/user': true,
    '/home/user/project': true,
  });

  const editorTitle = useMemo(() => {
    if (!selectedFilePath) return 'Sandbox Preview';
    return selectedFilePath.split('/').filter(Boolean).at(-1) ?? selectedFilePath;
  }, [selectedFilePath]);

  return (
    <section className="flex h-full overflow-hidden rounded-[28px] border border-white/6 bg-[#1e1e1e] shadow-[0_16px_80px_rgba(0,0,0,0.28)]">
      <div className="hidden w-64 shrink-0 border-r border-white/6 bg-[#232323] md:flex md:flex-col lg:w-72">
        <ExplorerSidebar
          expandedPaths={expandedPaths}
          explorerTree={explorerTree}
          onOpenFile={onOpenFile}
          onRefresh={onRefresh}
          selectedFilePath={selectedFilePath}
          toggle={(path) => setExpandedPaths((state) => ({ ...state, [path]: !state[path] }))}
        />
      </div>

      <div className="flex min-w-0 flex-1 flex-col bg-[#1e1e1e]">
        <div className="flex h-10 items-center gap-1 border-b border-white/6 px-2">
          <div className="flex items-center gap-2 rounded-t-xl border-t-2 border-t-indigo-400 bg-[#272727] px-3 py-1.5">
            <FileCode2 className="h-4 w-4 text-sky-300" />
            <span className="text-xs font-medium text-white">{editorTitle}</span>
          </div>
        </div>
        <div className="flex h-7 items-center border-b border-white/6 px-4 text-[11px] text-zinc-500">
          {selectedFilePath || 'No file selected yet'}
        </div>
        <div className="flex min-h-0 flex-1 flex-col md:flex-row">
          <div className="border-b border-white/6 md:hidden">
            <Tabs.Root defaultValue="files" className="w-full">
              <Tabs.List className="grid h-14 grid-cols-2 bg-[#232323]">
                <Tabs.Trigger value="files" className="data-[state=active]:bg-indigo-500/12 data-[state=active]:text-indigo-200 text-sm text-zinc-500">
                  Files
                </Tabs.Trigger>
                <Tabs.Trigger value="preview" className="data-[state=active]:bg-indigo-500/12 data-[state=active]:text-indigo-200 text-sm text-zinc-500">
                  Preview
                </Tabs.Trigger>
              </Tabs.List>
              <Tabs.Content value="files" className="h-[280px]">
                <ExplorerSidebar
                  expandedPaths={expandedPaths}
                  explorerTree={explorerTree}
                  onOpenFile={onOpenFile}
                  onRefresh={onRefresh}
                  selectedFilePath={selectedFilePath}
                  toggle={(path) => setExpandedPaths((state) => ({ ...state, [path]: !state[path] }))}
                />
              </Tabs.Content>
              <Tabs.Content value="preview" className="min-h-[280px]">
                <CodePreview fileLoading={fileLoading} filePreview={filePreview} />
              </Tabs.Content>
            </Tabs.Root>
          </div>
          <div className="hidden min-h-0 flex-1 md:block">
            <CodePreview fileLoading={fileLoading} filePreview={filePreview} />
          </div>
        </div>
        <footer className="flex h-6 items-center justify-between border-t border-white/6 bg-[#232323] px-3 text-[10px] text-zinc-500">
          <div className="flex items-center gap-4">
            <span>TypeScript React</span>
            <span>UTF-8</span>
          </div>
          <div className="flex items-center gap-4">
            <span>Sandbox</span>
            <span>Agent Workspace</span>
          </div>
        </footer>
      </div>
    </section>
  );
}

function ExplorerSidebar({
  explorerTree,
  expandedPaths,
  selectedFilePath,
  onRefresh,
  onOpenFile,
  toggle,
}: {
  explorerTree: FileTreeNode[];
  expandedPaths: Record<string, boolean>;
  selectedFilePath: string | null;
  onRefresh: () => Promise<void>;
  onOpenFile: (path: string) => Promise<void>;
  toggle: (path: string) => void;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-white/6 px-3 py-3">
        <span className="text-[11px] font-semibold uppercase tracking-[0.26em] text-zinc-500">Explorer</span>
        <button
          type="button"
          onClick={() => void onRefresh()}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-white/5 hover:text-white"
        >
          <RefreshCcw className="h-4 w-4" />
        </button>
      </div>
      <ScrollArea.Root className="min-h-0 flex-1 overflow-hidden">
        <ScrollArea.Viewport className="h-full px-2 py-2">
          {explorerTree.length === 0 ? (
            <div className="flex h-full items-center justify-center rounded-[20px] border border-dashed border-white/10 bg-white/[0.02] p-5 text-center text-sm text-zinc-500">
              Files generated in the sandbox will appear here.
            </div>
          ) : (
            explorerTree.map((node) => (
              <TreeNode
                key={node.path}
                depth={0}
                expandedPaths={expandedPaths}
                node={node}
                onOpenFile={onOpenFile}
                selectedFilePath={selectedFilePath}
                toggle={toggle}
              />
            ))
          )}
        </ScrollArea.Viewport>
        <ScrollArea.Scrollbar className="flex w-2.5 touch-none select-none bg-transparent p-[2px]" orientation="vertical">
          <ScrollArea.Thumb className="relative flex-1 rounded-full bg-white/12" />
        </ScrollArea.Scrollbar>
      </ScrollArea.Root>
    </div>
  );
}

function TreeNode({
  node,
  depth,
  expandedPaths,
  selectedFilePath,
  onOpenFile,
  toggle,
}: {
  node: FileTreeNode;
  depth: number;
  expandedPaths: Record<string, boolean>;
  selectedFilePath: string | null;
  onOpenFile: (path: string) => Promise<void>;
  toggle: (path: string) => void;
}) {
  const isDirectory = node.type === 'dir';
  const isExpanded = expandedPaths[node.path] ?? depth < 2;
  const isSelected = selectedFilePath === node.path;

  return (
    <div>
      <button
        type="button"
        onClick={() => {
          if (isDirectory) {
            toggle(node.path);
            return;
          }
          void onOpenFile(node.path);
        }}
        className={cn(
          'flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[13px] transition',
          isSelected ? 'bg-indigo-500/14 text-indigo-200' : 'text-zinc-300 hover:bg-white/5',
        )}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
      >
        {isDirectory ? (
          isExpanded ? <ChevronDown className="h-3.5 w-3.5 text-zinc-500" /> : <ChevronRight className="h-3.5 w-3.5 text-zinc-500" />
        ) : (
          <span className="h-3.5 w-3.5" />
        )}
        {isDirectory ? (
          isExpanded ? <FolderOpen className="h-4 w-4 text-amber-300" /> : <Folder className="h-4 w-4 text-amber-300" />
        ) : (
          <FileCode2 className="h-4 w-4 text-sky-300" />
        )}
        <span className="truncate">{node.name}</span>
      </button>
      {isDirectory && isExpanded
        ? node.children.map((child) => (
            <TreeNode
              key={child.path}
              depth={depth + 1}
              expandedPaths={expandedPaths}
              node={child}
              onOpenFile={onOpenFile}
              selectedFilePath={selectedFilePath}
              toggle={toggle}
            />
          ))
        : null}
    </div>
  );
}

function CodePreview({
  filePreview,
  fileLoading,
}: {
  filePreview: { path: string; content: string; language: string } | null;
  fileLoading: boolean;
}) {
  return (
    <ScrollArea.Root className="h-full overflow-hidden">
      <ScrollArea.Viewport className="h-full bg-[#1e1e1e] p-4 font-[var(--font-mono)] text-[13px] leading-7 text-zinc-300">
        {fileLoading ? (
          <div className="space-y-3">
            <div className="h-5 w-40 rounded-full bg-white/6 shimmer-surface" />
            <div className="h-5 w-full rounded-full bg-white/6 shimmer-surface" />
            <div className="h-5 w-[88%] rounded-full bg-white/6 shimmer-surface" />
            <div className="h-5 w-[72%] rounded-full bg-white/6 shimmer-surface" />
          </div>
        ) : filePreview ? (
          <pre className="whitespace-pre-wrap break-words text-zinc-300">{filePreview.content}</pre>
        ) : (
          <div className="flex h-full min-h-[320px] items-center justify-center rounded-[24px] border border-dashed border-white/10 bg-white/[0.02] p-8 text-center text-sm text-zinc-500">
            Select a file from the explorer to inspect sandbox output.
          </div>
        )}
      </ScrollArea.Viewport>
      <ScrollArea.Scrollbar className="flex w-2.5 touch-none select-none bg-transparent p-[2px]" orientation="vertical">
        <ScrollArea.Thumb className="relative flex-1 rounded-full bg-white/12" />
      </ScrollArea.Scrollbar>
    </ScrollArea.Root>
  );
}