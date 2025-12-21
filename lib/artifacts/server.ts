import { codeDocumentHandler } from '@/artifacts/code/server';
import { imageDocumentHandler } from '@/artifacts/image/server';
import { websetDocumentHandler } from '@/artifacts/webset/server';
import { peopleDocumentHandler } from '@/artifacts/people/server'; // Now uses improved version with progressive streaming
import { companyDocumentHandler } from '@/artifacts/company/server'; // Now uses improved version with progressive streaming
import { sheetDocumentHandler } from '@/artifacts/sheet/server';
import { textDocumentHandler } from '@/artifacts/text/server';
import { webSearchDocumentHandler } from '@/artifacts/web-search/server';
import type { ArtifactKind } from '@/components/artifact';
import type { DataStreamWriter } from 'ai';
import type { Document } from '../db/schema';
import { saveDocument } from '../db/queries';
import type { Session } from 'next-auth';

export interface SaveDocumentProps {
  id: string;
  title: string;
  kind: ArtifactKind;
  content: string;
  userId: string;
}

export interface CreateDocumentCallbackProps {
  id: string;
  title: string;
  dataStream: DataStreamWriter;
  session: Session;
  apiKey?: string;
}

export interface UpdateDocumentCallbackProps {
  document: Document;
  description: string;
  dataStream: DataStreamWriter;
  session: Session;
   apiKey?: string;
}

export interface DocumentHandler<T = ArtifactKind> {
  kind: T;
  onCreateDocument: (args: CreateDocumentCallbackProps) => Promise<void>;
  onUpdateDocument: (args: UpdateDocumentCallbackProps) => Promise<void>;
}

/**
 * Enhanced document handler factory with better error handling and async saving
 */
export function createDocumentHandler<T extends ArtifactKind>(config: {
  kind: T;
  onCreateDocument: (params: CreateDocumentCallbackProps) => Promise<string>;
  onUpdateDocument: (params: UpdateDocumentCallbackProps) => Promise<string>;
}): DocumentHandler<T> {
  return {
    kind: config.kind,
    onCreateDocument: async (args: CreateDocumentCallbackProps) => {
      let draftContent = '';

      try {
        draftContent = await config.onCreateDocument({
          id: args.id,
          title: args.title,
          dataStream: args.dataStream,
          session: args.session,
          apiKey: args.apiKey,
        });
      } catch (error: any) {
        console.error('[ARTIFACTS] onCreateDocument error', error?.message || error);

        // More detailed error messages based on error type
        let errorMessage = `Failed to create ${config.kind} document`;

        if (error?.status === 401 || error?.status === 403) {
          errorMessage = 'Authentication error. Please check your API credentials in settings.';
        } else if (error?.status === 402) {
          errorMessage = 'Insufficient credits. Please upgrade your plan to continue.';
        } else if (error?.status === 429) {
          errorMessage = 'Rate limit exceeded. Please wait a moment and try again.';
        } else if (error?.message) {
          errorMessage = error.message;
        } else {
          errorMessage += ': Unknown error occurred. Please try again.';
        }

        args.dataStream.writeData({
          type: 'error',
          content: errorMessage,
        });

        // Do not rethrow to avoid tearing down the main chat stream
        return;
      }

      // Save document asynchronously to not block the stream
      if (args.session?.user?.id && draftContent) {
        // Fire and forget - don't await
        saveDocumentAsync({
          id: args.id,
          title: args.title,
          content: draftContent,
          kind: config.kind,
          userId: args.session.user.id,
          dataStream: args.dataStream,
        }).catch((error) => {
          console.error('[ARTIFACTS] Failed to save document:', error);
          args.dataStream.writeData({
            type: 'error',
            content: 'Document generated but failed to save. Please try again.',
          });
        });
      }

      return;
    },
    onUpdateDocument: async (args: UpdateDocumentCallbackProps) => {
      let draftContent = '';

      try {
        draftContent = await config.onUpdateDocument({
          document: args.document,
          description: args.description,
          dataStream: args.dataStream,
          session: args.session,
          apiKey: args.apiKey,
        });
      } catch (error: any) {
        console.error('[ARTIFACTS] onUpdateDocument error', error?.message || error);

        // More detailed error messages
        let errorMessage = `Failed to update ${config.kind} document`;

        if (error?.status === 401 || error?.status === 403) {
          errorMessage = 'Authentication error. Please check your API credentials in settings.';
        } else if (error?.status === 402) {
          errorMessage = 'Insufficient credits. Please upgrade your plan to continue.';
        } else if (error?.status === 429) {
          errorMessage = 'Rate limit exceeded. Please wait a moment and try again.';
        } else if (error?.message) {
          errorMessage = error.message;
        } else {
          errorMessage += ': Unknown error occurred. Please try again.';
        }

        args.dataStream.writeData({
          type: 'error',
          content: errorMessage,
        });

        return;
      }

      // Save document asynchronously
      if (args.session?.user?.id && draftContent) {
        saveDocumentAsync({
          id: args.document.id,
          title: args.document.title,
          content: draftContent,
          kind: config.kind,
          userId: args.session.user.id,
          dataStream: args.dataStream,
        }).catch((error) => {
          console.error('[ARTIFACTS] Failed to save document:', error);
          args.dataStream.writeData({
            type: 'error',
            content: 'Document updated but failed to save. Please try again.',
          });
        });
      }

      return;
    },
  };
}

/**
 * Async document saving with retry logic
 */
async function saveDocumentAsync(props: SaveDocumentProps & { dataStream?: DataStreamWriter }) {
  const maxRetries = 3;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      await saveDocument({
        id: props.id,
        title: props.title,
        content: props.content,
        kind: props.kind,
        userId: props.userId,
      });

      // Success
      return;
    } catch (error: any) {
      lastError = error;
      console.error(`[ARTIFACTS] Save attempt ${attempt + 1}/${maxRetries} failed:`, error);

      if (attempt < maxRetries - 1) {
        // Wait before retry with exponential backoff
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  // All retries failed
  throw lastError || new Error('Failed to save document after multiple attempts');
}

/*
 * Use this array to define the document handlers for each artifact kind.
 */
export const documentHandlersByArtifactKind: Array<DocumentHandler> = [
  textDocumentHandler,
  codeDocumentHandler,
  imageDocumentHandler,
  sheetDocumentHandler,
  websetDocumentHandler,
  peopleDocumentHandler,
  companyDocumentHandler,
  webSearchDocumentHandler,
];

export const artifactKinds = [
  'text',
  'code',
  'image',
  'sheet',
  'webset',
  'people',
  'company',
  'web-search',
] as const;
