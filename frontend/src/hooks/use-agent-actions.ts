import { useCallback } from 'react';

import { buildChatPayload, fetchModels, fetchProviders, fetchSandboxFile, fetchSandboxTree, resetSession } from '@/lib/api';
import { ROUTES } from '@/app/routers/route';
import { useAgentStore } from '@/store/use-agent-store';
import { extractSseEvents } from '@/utils/sse';
import type { FileTreeNode, ProviderId } from '@/types';

export function useAgentActions() {
  const {
    settings,
    sessionId,
    currentAssistantMessageId,
    addUserMessage,
    startStreamingMessage,
    appendAssistantToken,
    setAssistantStatus,
    addToolChip,
    resolveToolChip,
    completeAssistantMessage,
    failAssistantMessage,
    setSessionId,
    setIteration,
    setProviders,
    setModels,
    setExplorerTree,
    setSelectedFilePath,
    setFilePreview,
    setFileLoading,
    setError,
    resetConversation,
  } = useAgentStore();

  const refreshProviders = useCallback(async () => {
    const providers = await fetchProviders();
    setProviders(providers);
  }, [setProviders]);

  const refreshModels = useCallback(
    async (provider: ProviderId = settings.provider) => {
      const apiKey = provider === 'openrouter' ? settings.openrouterApiKey : settings.nvidiaApiKey;
      if (!apiKey) {
        throw new Error(`Missing ${provider === 'openrouter' ? 'OpenRouter' : 'NVIDIA'} API key`);
      }

      const models = await fetchModels({
        provider,
        apiKey,
        baseUrl: provider === 'nvidia' ? settings.nvidiaBaseUrl : undefined,
      });
      setModels(models);
      return models;
    },
    [setModels, settings],
  );

  const openFile = useCallback(
    async (path: string, activeSessionId?: string | null) => {
      const targetSessionId = activeSessionId ?? sessionId;
      if (!targetSessionId) return;
      setSelectedFilePath(path);
      setFileLoading(true);
      try {
        const preview = await fetchSandboxFile(targetSessionId, path);
        setFilePreview(preview);
      } finally {
        setFileLoading(false);
      }
    },
    [sessionId, setSelectedFilePath, setFilePreview, setFileLoading],
  );

  const refreshTree = useCallback(
    async (activeSessionId?: string | null) => {
      const targetSessionId = activeSessionId ?? sessionId;
      if (!targetSessionId) return;
      const payload = await fetchSandboxTree(targetSessionId);
      setExplorerTree(payload.tree);
      if (!useAgentStore.getState().selectedFilePath && payload.tree.length > 0) {
        const firstFile = findFirstFile(payload.tree);
        if (firstFile) {
          setSelectedFilePath(firstFile.path);
          void openFile(firstFile.path, targetSessionId);
        }
      }
    },
    [openFile, sessionId, setExplorerTree, setSelectedFilePath],
  );

  const sendMessage = useCallback(
    async (content: string) => {
      const assistantId = crypto.randomUUID();
      addUserMessage(content);
      startStreamingMessage(assistantId);

      try {
        const response = await fetch(ROUTES.chatStream, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(buildChatPayload(content, sessionId, settings)),
        });

        if (!response.ok || !response.body) {
          throw new Error('Unable to start chat stream');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const parsed = extractSseEvents(buffer);
          buffer = parsed.remaining;

          for (const event of parsed.events) {
            const payload = event.data as Record<string, unknown>;
            const payloadSessionId = asString(payload.session_id);
            switch (event.event) {
              case 'session':
                if (payloadSessionId) {
                  setSessionId(payloadSessionId);
                }
                break;
              case 'assistant_start':
                break;
              case 'status':
                setAssistantStatus(
                  assistantId,
                  asStatusPhase(payload.phase),
                  asString(payload.label) ?? 'thinking....',
                );
                break;
              case 'iteration':
                setIteration(asNumber(payload.current), asNumber(payload.max, 1000));
                break;
              case 'token':
                appendAssistantToken(assistantId, asString(payload.token) ?? '');
                break;
              case 'tool_call':
                addToolChip(assistantId, {
                  id: asString(payload.tool_call_id) ?? crypto.randomUUID(),
                  label: asString(payload.label) ?? 'tool',
                  tool: asString(payload.tool) ?? 'tool',
                  status: 'pending',
                });
                break;
              case 'tool_result':
                resolveToolChip(
                  assistantId,
                  asString(payload.tool_call_id) ?? '',
                  payload.is_error ? 'error' : 'success',
                  asString(payload.content),
                );
                if (payload.refresh_files) {
                  void refreshTree(payloadSessionId ?? useAgentStore.getState().sessionId);
                }
                break;
              case 'files_updated':
                void refreshTree(payloadSessionId ?? useAgentStore.getState().sessionId);
                break;
              case 'complete':
                completeAssistantMessage(assistantId, asString(payload.content) ?? '');
                if (payloadSessionId) {
                  setSessionId(payloadSessionId);
                  void refreshTree(payloadSessionId);
                }
                break;
              case 'error': {
                const errorMessage =
                  asString(getNestedValue(payload.error, 'message')) ?? asString(payload.raw) ?? 'Unknown error';
                failAssistantMessage(assistantId, errorMessage);
                setError(errorMessage);
                break;
              }
              default:
                break;
            }
          }
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        failAssistantMessage(assistantId, message);
        setError(message);
      }
    },
    [
      addToolChip,
      addUserMessage,
      appendAssistantToken,
      completeAssistantMessage,
      failAssistantMessage,
      refreshTree,
      resolveToolChip,
      sessionId,
      setAssistantStatus,
      setError,
      setIteration,
      setSessionId,
      settings,
      startStreamingMessage,
    ],
  );

  const clearSession = useCallback(async () => {
    if (sessionId) {
      await resetSession(sessionId).catch(() => undefined);
    }
    resetConversation();
  }, [resetConversation, sessionId]);

  return {
    currentAssistantMessageId,
    openFile,
    refreshModels,
    refreshProviders,
    refreshTree,
    sendMessage,
    clearSession,
  };
}

function findFirstFile(nodes: FileTreeNode[]): { path: string } | null {
  for (const node of nodes) {
    if (node.type !== 'dir') {
      return { path: node.path };
    }
    if (node.children?.length) {
      const match = findFirstFile(node.children);
      if (match) return match;
    }
  }

  return null;
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' ? value : fallback;
}

function asStatusPhase(value: unknown): 'idle' | 'thinking' | 'creating_sandbox' | 'error' {
  if (value === 'idle' || value === 'thinking' || value === 'creating_sandbox' || value === 'error') {
    return value;
  }
  return 'thinking';
}

function getNestedValue(value: unknown, key: string): unknown {
  if (!value || typeof value !== 'object' || !(key in value)) {
    return undefined;
  }
  return (value as Record<string, unknown>)[key];
}