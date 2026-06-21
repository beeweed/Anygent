# Provider Settings and Model Discovery

## Overview
Create the settings experience and backend support for entering provider credentials, discovering available models, and preparing the chat runtime to call the selected provider.

## Goals
- Support OpenRouter API key, NVIDIA API key, E2B API key, custom E2B template id, and model selection.
- Fetch available models after keys are entered.
- Make providers extensible.

## Scope / non-goals
- In scope: provider registry, model fetch endpoints, client settings modal, local persistence.
- Out of scope: encrypting keys on a server, multi-user secret vaults.

## User flows / UX / design notes
- User opens settings from top bar.
- User enters keys and chooses provider/model.
- Models list supports search and highlights the active selection.
- Settings save instantly to localStorage and are used for the next request.

## Functional requirements
- OpenRouter provider uses `GET https://openrouter.ai/api/v1/models` with bearer auth.
- OpenRouter chat uses `/api/v1/chat/completions` with `stream: true` and native `tools`.
- NVIDIA NIM provider uses OpenAI-compatible endpoints, configurable base URL, and `/v1/models` for discovery.
- UI must allow future providers to be added by extending a registry object.
- Frontend persists settings locally and exposes missing-key validation in the composer.

## Data model / schema
- ProviderSettings: provider, model, openrouterApiKey, nvidiaApiKey, nvidiaBaseUrl, e2bApiKey, e2bTemplateId.
- ProviderModel: id, name, description, contextLength, supportsTools, provider, metadata.

## API contracts
- `GET /api/providers`
- `GET /api/providers/models?provider=...`

## Edge cases / failure modes
- Invalid API key.
- No models returned.
- Slow model list fetch.
- NIM base URL missing or malformed.

## Acceptance criteria
- User can store credentials locally.
- User can fetch and search model lists for OpenRouter and NVIDIA.
- Provider/model selection updates the runtime configuration without reloading.

## Test plan / test cases
- Unit test provider registry lookups.
- Integration test model discovery for OpenRouter mapping.
- Integration test invalid provider key returns clear error.

## Implementation notes
- Do not store provider secrets on disk server-side.
- Pass credentials per request from frontend to backend.

## Status / open questions
- Status: planned
- Open question: NVIDIA cloud base URL default will be configurable, with a sensible starter value in the UI.