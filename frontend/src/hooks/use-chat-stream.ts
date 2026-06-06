import { useCallback, useRef } from 'react'

import { apiUrl, safeJson } from '@/lib/api'
import { useAppStore } from '@/store/app-store'
import { useSettingsStore } from '@/store/settings-store'
import type { StreamEnvelope } from '@/types/chat'
import { parseSseBuffer } from '@/utils/sse'

export function useChatStream() {
  const abortRef = useRef<AbortController | null>(null)

  const sendMessage = useCallback(async (content: string) => {
    const appState = useAppStore.getState()
    const settingsState = useSettingsStore.getState()

    if (appState.isStreaming) {
      return
    }

    if (!settingsState.openrouterApiKey || !settingsState.selectedModel || !settingsState.e2bApiKey) {
      useAppStore.getState().setError('OpenRouter API key, model, and E2B API key are required before chatting.')
      useAppStore.getState().setStatus('error')
      return
    }

    useAppStore.getState().addUserMessage(content)

    const conversation = useAppStore
      .getState()
      .messages.filter((message) => (message.role === 'user' || message.role === 'assistant') && Boolean(message.content))
      .map((message) => ({ role: message.role, content: message.content }))

    useAppStore.getState().beginAssistantMessage()
    useAppStore.getState().resetForPrompt()

    const controller = new AbortController()
    abortRef.current = controller

    const response = await fetch(apiUrl('/chat/stream'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: useAppStore.getState().sessionId,
        messages: conversation,
        provider: {
          provider: 'openrouter',
          api_key: settingsState.openrouterApiKey,
          model_id: settingsState.selectedModel,
        },
        sandbox: {
          api_key: settingsState.e2bApiKey,
          template_id: settingsState.templateId || null,
          timeout_seconds: 3600,
        },
      }),
      signal: controller.signal,
    })

    if (!response.ok || !response.body) {
      const payload = await safeJson<{ detail?: string }>(response)
      throw new Error(payload.detail || 'Unable to start the agent stream.')
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) {
        break
      }

      buffer += decoder.decode(value, { stream: true })
      const parsed = parseSseBuffer(buffer)
      buffer = parsed.remainder

      for (const event of parsed.events) {
        applyEvent(event)
      }
    }

    useAppStore.getState().setStreaming(false)
  }, [])

  const stop = useCallback(() => {
    abortRef.current?.abort()
    useAppStore.getState().setStreaming(false)
    useAppStore.getState().setStatus('complete')
  }, [])

  return { sendMessage, stop }
}

function applyEvent(event: StreamEnvelope) {
  const appState = useAppStore.getState()

  switch (event.type) {
    case 'status': {
      const value = String(event.data.value || 'idle') as Parameters<typeof appState.setStatus>[0]
      appState.setStatus(value)
      break
    }
    case 'iteration': {
      appState.setIteration(Number(event.data.current || 0), Number(event.data.max || 1000))
      break
    }
    case 'token': {
      appState.appendAssistantToken(String(event.data.value || ''))
      break
    }
    case 'tool_call': {
      appState.addToolEvent({
        id: String(event.data.id || crypto.randomUUID()),
        name: String(event.data.name || 'tool'),
        label: String(event.data.label || event.data.name || 'tool'),
      })
      break
    }
    case 'tool_result': {
      appState.updateToolResult(String(event.data.id || ''), {
        result: String(event.data.result || ''),
        isError: Boolean(event.data.is_error),
        touchedPaths: Array.isArray(event.data.touched_paths)
          ? event.data.touched_paths.map((path) => String(path))
          : [],
      })
      break
    }
    case 'sandbox': {
      appState.setSandboxReady(true)
      if (Array.isArray(event.data.tree)) {
        appState.setFileTree(event.data.tree as typeof appState.fileTree)
      }
      break
    }
    case 'file_tree': {
      if (Array.isArray(event.data.tree)) {
        appState.setFileTree(event.data.tree as typeof appState.fileTree)
      }
      break
    }
    case 'done': {
      appState.completeAssistantMessage(String(event.data.message || ''))
      break
    }
    case 'error': {
      appState.setError(String(event.data.message || 'Streaming failed.'))
      appState.setStatus('error')
      appState.setStreaming(false)
      break
    }
    default:
      break
  }
}