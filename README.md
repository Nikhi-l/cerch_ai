<a href="https://cerch.ai/">
  <img alt="Cerch Ai - Next.js 14 and App Router-ready AI chatbot." src="app/(chat)/opengraph-image.png">
  <h1 align="center">Cerch Ai</h1>
</a>

<p align="center">
    Chat SDK is a free, open-source template built with Next.js and the AI SDK that helps you quickly build powerful chatbot applications.
</p>

<p align="center">
  <a href="https://chat-sdk.dev"><strong>Read Docs</strong></a> ·
  <a href="#features"><strong>Features</strong></a> ·
  <a href="#model-providers"><strong>Model Providers</strong></a> ·
  <a href="#running-locally"><strong>Running locally</strong></a>
</p>
<br/>

## Features

- [Next.js](https://nextjs.org) App Router
  - Advanced routing for seamless navigation and performance
  - React Server Components (RSCs) and Server Actions for server-side rendering and increased performance
- [AI SDK](https://sdk.vercel.ai/docs)
  - Unified API for generating text, structured objects, and tool calls with LLMs
  - Hooks for building dynamic chat and generative user interfaces
  - Supports xAI (default), OpenAI, Fireworks, and other model providers
- [shadcn/ui](https://ui.shadcn.com)
  - Styling with [Tailwind CSS](https://tailwindcss.com)
  - Component primitives from [Radix UI](https://radix-ui.com) for accessibility and flexibility
- Data Persistence
  - [Neon Serverless Postgres](https://vercel.com/marketplace/neon) for saving chat history and user data
  - [Vercel Blob](https://vercel.com/storage/blob) for efficient file storage
- [Auth.js](https://authjs.dev)
  - Simple and secure authentication

## Model Providers

This template ships with [OpenAI](https://openai.com) `gpt-4o-mini` as the default chat model. However, with the [AI SDK](https://sdk.vercel.ai/docs), you can switch LLM providers to [Anthropic](https://anthropic.com), [Cohere](https://cohere.com/), and [many more](https://sdk.vercel.ai/providers/ai-sdk-providers) with just a few lines of code.

In the chat header you can enter your own OpenAI API key, which will be used for chat responses and artifact generation.

## Running locally

You will need to use the environment variables [defined in `.env.example`](.env.example) to run Next.js AI Chatbot. It's recommended you use [Vercel Environment Variables](https://vercel.com/docs/projects/environment-variables) for this, but a `.env` file is all that is necessary.

> Note: You should not commit your `.env` file or it will expose secrets that will allow others to control access to your various AI and authentication provider accounts.

1. Install Vercel CLI: `npm i -g vercel`
2. Link local instance with Vercel and GitHub accounts (creates `.vercel` directory): `vercel link`
3. Download your environment variables: `vercel env pull`

```bash
pnpm install
pnpm dev
```

Your app template should now be running on [localhost:3000](http://localhost:3000).

## Webset artifact

The `webset` artifact focuses on people and company profiles. It renders CSV data in a sleek, responsive table with search, per-column filters, sorting, column visibility, sticky headers, and CSV export. Recommended columns include: name, title, company, industry, website/company_url, linkedin_url, location, size, funding, description.

## LLM Flow (GPT-5)

- Provider: `lib/ai/providers.ts` maps logical model ids to OpenAI models. `chat-model`, `artifact-model`, and `title-model` use `gpt-5`; `chat-model-reasoning` uses `gpt-5-reasoning` with reasoning traces extracted via `<think>` tags.
- System prompts: `lib/ai/prompts.ts` selects prompts per model. Non-reasoning chat includes the Artifacts instructions so GPT-5 knows when/how to call tools.
- Tools/Artifacts: `app/(chat)/api/chat/route.ts` wires tools for weather, document create/update, suggestions, Gmail. Artifact servers in `artifacts/*/server.ts` stream typed outputs (text/code/sheet/webset) to the UI.
- API key: Users set an OpenAI API key in Settings overlay (stored as `openai-api-key` cookie). If empty, `OPENAI_API_KEY` env var is used.
- Model selection: UI exposes a model selector (`components/model-selector.tsx`) constrained by entitlements. Selection is stored as `chat-model` cookie and used by the chat API.
