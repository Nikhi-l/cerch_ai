# Components Catalog

This catalog lists the primary components under `components/` and their purpose. For detailed props and behavior, open the referenced file paths.

## Core Chat
- `components/chat.tsx`: Top-level chat container; wires `useChat`, messages list, multimodal input, and the Artifact overlay.
- `components/messages.tsx`: Virtualized list of chat messages with loading, pagination, and vote/display state.
- `components/message.tsx`: Renders a single message with Markdown, attachments, tool calls/results, editing, and actions.
- `components/chat-header.tsx`: Header with sidebar toggle, new-chat action, and visibility selector.
- `components/chat-settings.tsx`: Chat-level settings UI.

## Artifact System
- `components/artifact.tsx`: Full-screen overlay for viewing/editing artifacts; handles versions, diffs, toolbar, and streaming updates.
- `components/artifact-actions.tsx`: Controls for artifact versions, diff toggle, and mode switches.
- `components/artifact-close-button.tsx`: Closes the artifact overlay.
- `components/artifact-messages.tsx`: Displays artifact-related system messages and suggestions.
- `components/create-artifact.tsx`: UI to trigger artifact creation via tool calls.
- `components/data-stream-handler.tsx`: Client helper to consume and route streamed artifact updates.
- `components/document-preview.tsx`: Shows a compact preview of documents created/updated by tools.
- `components/document.tsx`: Tool call/result components that open artifacts or show progress.
- `components/diffview.tsx`: Diff viewer for comparing artifact versions.
- `components/document-skeleton.tsx`: Skeleton/loading states for document previews.
- `components/version-footer.tsx`: Footer with current version metadata and navigation.

## Editors & Renderers
- `components/text-editor.tsx`: Text artifact editor/view.
- `components/code-editor.tsx`: Code artifact editor with formatting utilities.
- `components/image-editor.tsx`: Image artifact viewer/editor.
- `components/sheet-editor.tsx`: Sheet/CSV artifact editor (renders in `WebsetTable` when applicable).
- `components/markdown.tsx`: Markdown renderer used in messages and editors.
- `components/code-block.tsx`: Renders syntax-highlighted code blocks in Markdown.
- `components/webset-table.tsx`: Table component used for tabular artifact content.

## Inputs & Actions
- `components/multimodal-input.tsx`: Chat input with attachments, submit/stop, and model/api key handling.
- `components/message-editor.tsx`: Inline message editor for user messages.
- `components/message-actions.tsx`: Per-message actions (vote, copy, retry, etc.).
- `components/preview-attachment.tsx`: Previews image/file attachments within messages.
- `components/visibility-selector.tsx`: Public/private selector for chats.
- `components/api-key-input.tsx`: Input for setting a per-session API key.
- `components/gmail-button.tsx`: Helper to trigger Gmail tool flows.
- `components/suggested-actions.tsx`: Contextual action suggestions surfaced below messages.
- `components/suggestion.tsx`: Individual suggested action item renderer.
- `components/model-selector.tsx`: Model selection dropdown for chat.
- `components/toolbar.tsx`: Inline toolbar shown with the artifact for follow-up prompts/actions.

## Sidebar & Navigation
- `components/app-sidebar.tsx`: App-level sidebar layout wrapper.
- `components/sidebar-history.tsx`: Chat history list with pagination and search.
- `components/sidebar-history-item.tsx`: Single chat history item.
- `components/sidebar-user-nav.tsx`: User menu and account controls.
- `components/sidebar-toggle.tsx`: Toggles the sidebar open/closed.

## Display & Misc
- `components/greeting.tsx`: Landing greeting component for empty chats.
- `components/console.tsx`: Developer/debug console view.
- `components/icons.tsx`: Central icon set used across the app.
- `components/message-reasoning.tsx`: Displays model reasoning traces.
- `components/submit-button.tsx`: Reusable submit button for forms.
- `components/theme-provider.tsx`: Theme context provider.
- `components/toast.tsx`: Toast notifications (hooks into `sonner`).
- `components/weather.tsx`: Inline weather widget for the demo tool.

## UI Primitives (`components/ui/*`)
- `button.tsx`, `input.tsx`, `textarea.tsx`, `select.tsx`, `tooltip.tsx`, `avatar.tsx`, `badge.tsx`, `card.tsx`, `dropdown-menu.tsx`, `separator.tsx`, `sheet.tsx`, `sidebar.tsx`, `table.tsx`, `skeleton.tsx`, `alert-dialog.tsx`, `popover.tsx`.
- Role: Low-level, reusable UI building blocks used throughout the app.

## Auth
- `components/auth-form.tsx`: Auth form used in auth pages.
- `components/sign-out-form.tsx`: Sign-out action component.

Notes
- For artifact-specific UI, see `artifacts/<kind>/client.tsx` which provides the content component used by `components/artifact.tsx`.
- When adding new components, prefer colocating generic building blocks in `components/ui/` and feature-specific components at the top level.
