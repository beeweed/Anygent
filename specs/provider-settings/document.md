# Provider settings and model selection

## Overview
Build a settings experience that lets the user provide OpenRouter and E2B credentials, choose an OpenRouter model, and configure an optional custom E2B template id.

## Goals
- Keep secret entry simple and clear.
- Fetch OpenRouter models after the API key is entered.
- Make provider integration extensible for future providers.

## Scope / non-goals
### In scope
- Settings modal.
- OpenRouter API key input.
- E2B API key input.
- Sandbox template id input.
- OpenRouter model fetching and selection.
### Non-goals
- Persisting secrets to a database.
- OAuth/provider account linking.

## User flows / UX / design notes
- User clicks settings in the top bar.
- User enters OpenRouter API key and can trigger model refresh.
- User enters E2B API key and optional template id.
- User selects a model from a searchable dropdown grouped by provider family when practical.
- Errors appear inline if model fetch fails or keys are invalid.

## Functional requirements
- Store settings in runtime frontend state only.
- Never write secrets to logs.
- Fetch available models from OpenRouter using the provided key.
- Populate model picker with useful metadata including name, id, context length, and pricing summary.
- Support an abstraction that can later add more providers without redesigning UI state.

## Data model / schema
- `ProviderKind`: `openrouter`
- `ProviderSettings`: provider, apiKey, modelId
- `SandboxSettings`: apiKey, templateId, timeoutSeconds=3600
- `ModelOption`: id, name, description, contextLength, pricing, supportsTools

## API contracts
- `POST /api/providers/openrouter/models`
  - Body: `{ apiKey: string }`
  - Response: `{ data: ModelOption[] }`
- `GET /api/providers`
  - Response: currently OpenRouter metadata only, structured for future expansion.

## Edge cases / failure modes
- Invalid OpenRouter API key.
- Empty model list or provider outage.
- Model selected but lacks reliable tool calling support.
- Settings changed mid-stream.

## Acceptance criteria
- User can save keys locally in runtime state and fetch models.
- Model list loads from OpenRouter using the live API.
- UI remains ready to support another provider through the same store/service shape.

## Test plan / test cases
- Fetch models with valid key.
- Fetch models with invalid key and verify error.
- Change selected model and verify chat request uses it.
- Refresh models repeatedly without duplicate state corruption.

## Implementation notes
- Backend service should normalize OpenRouter model payload to a frontend-friendly shape.
- Frontend env file exposes backend base URL only; secrets come from user input.

## Status / open questions
- Status: done
- Open questions: none.