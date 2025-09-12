# PRD: Python Code Execution Flow (Code Artifact)

## Context
- Users can ask the assistant to generate runnable Python code (e.g., “create a snake game in python”). The app opens an Artifact overlay, streams code into a code editor, and shows a Run control. When the user clicks Run, a console opens and displays program output (including images for plots).
- This PRD documents the end-to-end flow, the execution environment (client vs server), key files, and constraints. It clarifies that Python execution occurs in the browser via Pyodide, not on Vercel “Fluid Compute” or server-side functions.

## Goals / Non-goals
- Goals
  - Explain the step-by-step flow from chat → artifact creation → code streaming → run execution → console output.
  - Identify where compute happens and list the files/modules involved.
  - Provide validation steps and risks/mitigations.
- Non-goals
  - Implement remote/server execution.
  - Support non-Python languages or multi-file projects.

## Scope & Assumptions
- Scope: Code artifacts only; Python-only execution path.
- Assumptions: Network access is available to load Pyodide and packages from the CDN. The chat and artifact systems are functioning as implemented.

## Approach (System Overview)
- Chat streaming and tools run on the server (Next.js API route), driving artifact creation and versioning.
- The code editing UI and the “Run” execution happen entirely client-side in the browser using Pyodide (Python compiled to WebAssembly).
- Console output is captured in the UI and displayed below the editor; plots are emitted as base64 images.

## Step-by-Step Flow

- Prompt to Artifact Creation
  - Entry: `app/(chat)/api/chat/route.ts` handles the chat POST request and wires AI tools (`streamText`). Tools enabled include `createDocument`, `updateDocument`, etc.
  - Tool call: The model chooses `createDocument` with `kind: 'code'` and a `title`.
    - `lib/ai/tools/create-document.ts` writes stream parts for `kind`, `id`, `title`, and `clear`, then calls the document handler for the selected kind.
  - Code generation stream:
    - `artifacts/code/server.ts` uses `streamObject` with `codePrompt` and schema `{ code: string }`. It streams `code-delta` chunks via `dataStream.writeData` as the model generates code.
  - Client stream handling:
    - `components/data-stream-handler.tsx` listens to `useChat({ id })` data stream and routes deltas to the correct artifact client by `kind`.
    - For code deltas, `artifacts/code/client.tsx` updates artifact content and marks `status: 'streaming'`. A small heuristic makes the artifact visible once content length crosses a threshold.
  - UI overlay and editor:
    - `components/artifact.tsx` selects `codeArtifact` and renders `CodeEditor`.
    - `components/code-editor.tsx` initializes a Python-mode CodeMirror editor and handles debounced saving.
  - Versioning & persistence:
    - `components/artifact.tsx` fetches and appends versions via `/api/document?id=...`.
    - The server route `app/(chat)/api/document/route.ts` handles GET/POST/DELETE for document versions.

- Running Python Code (Client-side via Pyodide)
  - Pyodide load:
    - `app/(chat)/layout.tsx` includes `<Script src="https://cdn.jsdelivr.net/pyodide/v0.23.4/full/pyodide.js" strategy="beforeInteractive" />`, exposing `globalThis.loadPyodide`.
  - Run action:
    - In `artifacts/code/client.tsx`, the “Run” action loads a Pyodide instance: `await globalThis.loadPyodide({ indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.23.4/full/' })`.
    - Stdout capture is configured via `currentPyodideInstance.setStdout({ batched })` and appended into console state. Output type is inferred (`text` vs base64 `image`).
    - Package resolution: `loadPackagesFromImports(content, { messageCallback })` auto-installs Pyodide-available packages referenced by imports in the code (from the CDN).
    - Matplotlib support: if the code imports matplotlib (or uses `plt.`), a small prelude injects a custom `plt.show()` that renders to a PNG and prints a `data:image/png;base64,...` URL. This is then displayed as an image in the console.
    - Execution: `await currentPyodideInstance.runPythonAsync(content)` runs the user’s code in the WASM sandbox.
  - Console rendering:
    - `components/console.tsx` shows a resizable console with a per-run status: `in_progress` → `loading_packages` → `completed`/`failed`.
    - Outputs are appended as text or images. Closing the artifact clears console outputs.

## Compute Environment
- Code execution is client-side
  - Python runs in the browser via Pyodide (WASM). No server-side/Node/Vercel execution is used for running user code.
  - The app fetches `pyodide.js` and packages from the JSDelivr CDN.
- Vercel Fluid Compute
  - Not used for Python execution in this flow. The only server-side work is chat streaming, tool orchestration, and document persistence.
- Server responsibilities
  - `app/(chat)/api/chat/route.ts` streams model outputs and tool calls.
  - `app/(chat)/api/document/route.ts` persists/fetches document versions.

## Impacted Areas (Files & Modules)
- Chat & Tools
  - `app/(chat)/api/chat/route.ts` — chat POST/GET; tool registration; resumable streams.
  - `lib/ai/tools/create-document.ts` — emits artifact metadata and invokes handler.
  - `artifacts/code/server.ts` — streams `code-delta` for code artifact create/update.
  - `lib/ai/prompts.ts` — `codePrompt` guiding Python generation.
- Artifact UI
  - `components/data-stream-handler.tsx` — routes stream deltas to the right artifact client.
  - `components/artifact.tsx` — overlay, versions, toolbar wiring.
  - `components/code-editor.tsx` — Python editor (CodeMirror) and save/debounce.
  - `components/console.tsx` — resizable console; output rendering.
  - `artifacts/code/client.tsx` — code artifact client: stream handling, Run action (Pyodide), Matplotlib capture.
- Document API & Persistence
  - `app/(chat)/api/document/route.ts` — GET/POST/DELETE versions.
  - `lib/db/schema.ts`, `lib/db/queries.ts` — document types and operations.
- Pyodide bootstrap
  - `app/(chat)/layout.tsx` — loads `pyodide.js` before interactive.

## Risks & Mitigations
- Heavy/malicious code can freeze the UI
  - Mitigation: Keep snippets short in `codePrompt`; consider adding client timeouts or a cancel mechanism for long-running code.
- Package availability and CDN outages
  - Mitigation: Surface errors clearly; consider local caching or fallbacks; allow retries.
- Memory limits for plots/images
  - Mitigation: The Matplotlib prelude reduces DPI and clears figures after show; continue tuning size guards as needed.
- No server isolation (client-only execution)
  - Note: This is intentional for safety and simplicity. Future work may add optional remote compute with stricter sandboxing and quotas.

## Validation (Test Plan)
- Generation
  - Prompt: “Create a snake game in python.” Ensure a code artifact opens and streams code into the editor.
  - Verify versions are saved under `/api/document?id=<docId>`.
- Run behavior
  - Click Run and validate:
    - Console shows “Initializing…” then package loading messages (if imports present).
    - Text output appears for prints; image output renders for Matplotlib.
    - Failures display error messages.
  - Close the artifact and confirm console clears.
- Persistence
  - Edit code; observe debounced POST to `/api/document?id=<docId>`; verify a new version appears.

## Rollout / Rollback
- Rollout: Documentation-only. No runtime changes.
- Rollback: Remove this PRD file if needed.

## Links
- Architecture & Components: `docs/repo-structure.md`, `docs/components.md`
- Core files: See Impacted Areas

## Future Work (Optional)
- Add an optional server execution path (e.g., containerized or Vercel Fluid Compute) behind a feature flag with sandboxing, timeout, and resource quotas.
- Add a visible “Stop” control to cancel long runs.
- Pre-warm a shared Pyodide instance and cache packages to reduce startup latency.
