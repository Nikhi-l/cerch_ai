# AI Chatbot Agents

This repository implements a Next.js based AI chatbot. The codebase is organized around the following top‑level folders:

- **`app/`** – Next.js App Router routes and pages for chat and auth.
- **`components/`** – Reusable React components including the chat UI and artifact editors.
- **`artifacts/`** – Client/server code for code, text, image and spreadsheet artifacts.
- **`lib/`** – Server utilities, AI provider configuration and database helpers.
- **`hooks/`** – Custom React hooks used across the UI.
- **`tests/`** – Playwright end‑to‑end and API tests.

## Architecture

The project uses the Next.js App Router with React Server Components and Server Actions for performance. The AI SDK provides a unified API for generating text, structured data and tool calls. Styling is handled by the shadcn/ui library with Tailwind CSS and Radix primitives.

Data is stored using Neon Postgres and file uploads use Vercel Blob. Authentication is handled by Auth.js.

Local development:
```bash
pnpm install
pnpm dev
```
from README lines 58‑62.【F:README.md†L58-L62】

## AI Models and Providers

Available chat models are defined in `lib/ai/models.ts`:
```ts
export const chatModels: Array<ChatModel> = [
  { id: 'chat-model', name: 'Chat model', description: 'Primary model for all-purpose chat' },
  { id: 'chat-model-reasoning', name: 'Reasoning model', description: 'Uses advanced reasoning' },
];
```
【F:lib/ai/models.ts†L9-L20】

Model providers are configured in `lib/ai/providers.ts` and default to xAI models:
```ts
export const myProvider = isTestEnvironment
  ? customProvider({ languageModels: { 'chat-model': chatModel, 'chat-model-reasoning': reasoningModel, 'title-model': titleModel, 'artifact-model': artifactModel } })
  : customProvider({
      languageModels: {
        'chat-model': xai('grok-2-vision-1212'),
        'chat-model-reasoning': wrapLanguageModel({ model: xai('grok-3-mini-beta'), middleware: extractReasoningMiddleware({ tagName: 'think' }) }),
        'title-model': xai('grok-2-1212'),
        'artifact-model': xai('grok-2-1212'),
      },
      imageModels: { 'small-model': xai.image('grok-2-image') },
    });
```
【F:lib/ai/providers.ts†L15-L37】

## Core Components

- **Chat Component** – `components/chat.tsx` uses the `useChat` hook to manage messages and communication with the models. Lines 34‑84 show the main hook setup and handlers.【F:components/chat.tsx†L34-L84】
- **Artifact System** – `components/artifact.tsx` defines supported artifact types (text, code, image, sheet) and manages document content.【F:components/artifact.tsx†L30-L37】
- **Prompts** – System prompts and artifact instructions are defined in `lib/ai/prompts.ts`. Lines 4‑32 describe the artifact mode and guidelines.【F:lib/ai/prompts.ts†L4-L32】

## Testing

Playwright tests live under `tests/`, covering chat flows and artifact behavior. Run `pnpm test` to execute them (may require network access for dependencies).

---
