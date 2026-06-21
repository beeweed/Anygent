import { ROUTES } from '@/app/routers/route';
import type { ProviderDefinition, ProviderId, ProviderModel, SettingsState } from '@/types';

export async function fetchProviders(): Promise<ProviderDefinition[]> {
  const response = await fetch(ROUTES.providers);
  if (!response.ok) {
    throw new Error('Failed to fetch providers');
  }

  const payload = await response.json();
  return payload.providers;
}

export async function fetchModels(args: {
  provider: ProviderId;
  apiKey: string;
  baseUrl?: string;
}): Promise<ProviderModel[]> {
  const response = await fetch(ROUTES.providerModels, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      provider: args.provider,
      api_key: args.apiKey,
      base_url: args.baseUrl,
    }),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({ error: { message: 'Failed to fetch models' } }));
    throw new Error(payload.error?.message ?? 'Failed to fetch models');
  }

  const payload = await response.json();
  return payload.models;
}

export async function fetchSandboxTree(sessionId: string) {
  const url = new URL(ROUTES.sandboxTree);
  url.searchParams.set('session_id', sessionId);
  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error('Failed to fetch sandbox tree');
  }
  return response.json();
}

export async function fetchSandboxFile(sessionId: string, path: string) {
  const url = new URL(ROUTES.sandboxFile);
  url.searchParams.set('session_id', sessionId);
  url.searchParams.set('path', path);
  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error('Failed to fetch file preview');
  }
  return response.json();
}

export async function resetSession(sessionId: string) {
  const response = await fetch(ROUTES.sessionReset, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_id: sessionId }),
  });

  if (!response.ok) {
    throw new Error('Failed to reset session');
  }

  return response.json();
}

export function buildChatPayload(message: string, sessionId: string | null, settings: SettingsState) {
  return {
    session_id: sessionId,
    message,
    provider: settings.provider,
    model: settings.model,
    openrouter_api_key: settings.openrouterApiKey || undefined,
    nvidia_api_key: settings.nvidiaApiKey || undefined,
    nvidia_base_url: settings.nvidiaBaseUrl || undefined,
    e2b_api_key: settings.e2bApiKey || undefined,
    e2b_template_id: settings.e2bTemplateId || undefined,
  };
}