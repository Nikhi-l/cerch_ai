import { codeDocumentHandler } from '@/artifacts/code/server';
import { imageDocumentHandler } from '@/artifacts/image/server';
import { websetDocumentHandler } from '@/artifacts/webset/server';
import { peopleDocumentHandler } from '@/artifacts/people/server';
import { companyDocumentHandler } from '@/artifacts/company/server';
import { sheetDocumentHandler } from '@/artifacts/sheet/server';
import { textDocumentHandler } from '@/artifacts/text/server';
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
        args.dataStream.writeData({
          type: 'error',
          content: `Failed to create ${config.kind} document: ${error?.message || 'unknown error'}`,
        });
        // Do not rethrow to avoid tearing down the main chat stream
        return;
      }

      if (args.session?.user?.id && draftContent) {
        await saveDocument({
          id: args.id,
          title: args.title,
          content: draftContent,
          kind: config.kind,
          userId: args.session.user.id,
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
        args.dataStream.writeData({
          type: 'error',
          content: `Failed to update ${config.kind} document: ${error?.message || 'unknown error'}`,
        });
        return;
      }

      if (args.session?.user?.id && draftContent) {
        await saveDocument({
          id: args.document.id,
          title: args.document.title,
          content: draftContent,
          kind: config.kind,
          userId: args.session.user.id,
        });
      }

      return;
    },
  };
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
];

export const artifactKinds = [
  'text',
  'code',
  'image',
  'sheet',
  'webset',
  'people',
  'company',
] as const;
