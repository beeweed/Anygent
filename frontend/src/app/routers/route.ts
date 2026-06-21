const backendUrl = import.meta.env.VITE_BACKEND_URL;

if (!backendUrl) {
  throw new Error('Missing VITE_BACKEND_URL in frontend/.env');
}

export const API_BASE_URL = backendUrl.replace(/\/$/, '');

export const ROUTES = {
  health: `${API_BASE_URL}/api/health`,
  providers: `${API_BASE_URL}/api/providers`,
  providerModels: `${API_BASE_URL}/api/providers/models`,
  chatStream: `${API_BASE_URL}/api/chat/stream`,
  sandboxTree: `${API_BASE_URL}/api/sandbox/tree`,
  sandboxFile: `${API_BASE_URL}/api/sandbox/file`,
  sessionReset: `${API_BASE_URL}/api/session/reset`,
};