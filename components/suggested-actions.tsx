'use client';

import { motion } from 'framer-motion';
import { Button } from './ui/button';
import { memo, useState } from 'react';
import type { UIMessage } from 'ai';
import { generateUUID } from '@/lib/utils';
import type { UseChatHelpers } from '@ai-sdk/react';
import type { VisibilityType } from './visibility-selector';

interface SuggestedActionsProps {
  chatId: string;
  append: UseChatHelpers['append'];
  setMessages?: UseChatHelpers['setMessages'];
  selectedVisibilityType: VisibilityType;
}

import { useArtifact } from '@/hooks/use-artifact';
import { LoaderIcon } from './icons';

function PureSuggestedActions({ chatId, append, setMessages, selectedVisibilityType }: SuggestedActionsProps) {
  const { setArtifact, setMetadata } = useArtifact();
  const suggestedActions = [
    {
      title: 'Software developers at Google (Bengaluru)',
      label: 'People • Sales sourcing example',
      type: 'people-demo',
      query: 'Find 150 software developers currently working at Google in Bengaluru. Include name, title, company, location, and LinkedIn URL.',
      payload: {
        title: 'Developers at Google in Bengaluru',
        baseQuery: 'software developers working at Google in Bengaluru',
        filters: { region: 'Bengaluru', title: 'Software Developer|Software Engineer', company: 'Google', minConnections: 50 },
      },
    },
    {
      title: 'Security engineers at top fintechs (NYC)',
      label: 'People • GTM outreach example',
      type: 'people-demo',
      query: 'Find 100 security engineers at leading fintech companies in New York City. Include name, title, company, location, and LinkedIn URL.',
      payload: {
        title: 'Security engineers at fintech (NYC)',
        baseQuery: 'security engineers at fintech companies in New York',
        filters: { region: 'New York', title: 'Security Engineer', industry: 'FinTech' },
      },
    },
    {
      title: 'Marketing managers in healthcare (London)',
      label: 'People • Account-based marketing',
      type: 'people-demo',
      query: 'Find 100 marketing managers working in healthcare companies in London. Include name, title, company, location, and LinkedIn URL.',
      payload: {
        title: 'Marketing managers in healthcare (London)',
        baseQuery: 'marketing managers in healthcare companies in London',
        filters: { region: 'London', title: 'Marketing Manager', industry: 'Healthcare' },
      },
    },
    {
      title: 'AI/ML engineers with Python skills (SF Bay)',
      label: 'People • Technical recruiting',
      type: 'people-demo',
      query: 'Find 150 AI and machine learning engineers with Python skills in San Francisco Bay Area. Include name, title, company, location, and LinkedIn URL.',
      payload: {
        title: 'AI/ML engineers with Python (SF Bay)',
        baseQuery: 'AI ML machine learning engineers Python San Francisco Bay Area',
        filters: { region: 'San Francisco', title: 'AI Engineer|ML Engineer|Machine Learning Engineer', skills: 'Python' },
      },
    },
  ];
  const [loadingKey, setLoadingKey] = useState<string | null>(null);

  return (
    <div
      data-testid="suggested-actions"
      className="grid sm:grid-cols-2 gap-2 w-full"
    >
      {suggestedActions.map((suggestedAction, index) => (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ delay: 0.05 * index }}
          key={`suggested-action-${suggestedAction.title}-${index}`}
          className={index > 1 ? 'hidden sm:block' : 'block'}
        >
          <Button
            variant="ghost"
            onClick={async () => {
              window.history.replaceState({}, '', `/chat/${chatId}`);
              setLoadingKey(`${suggestedAction.title}-${index}`);

              // All suggestions are now people-demo type
              try {
                const res = await fetch('/api/cerch/people', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ chatId, ...suggestedAction.payload, userMessage: suggestedAction.query }),
                });
                const json = await res.json();
                if (json?.ok) {
                  // Add both user message and assistant tool-result to chat
                  if (setMessages) {
                    const userMsg: UIMessage = {
                      id: generateUUID(),
                      role: 'user',
                      content: '',
                      parts: [{ type: 'text', text: suggestedAction.query } as any],
                    } as any;
                    const toolMsg: UIMessage = {
                      id: generateUUID(),
                      role: 'assistant',
                      content: '',
                      parts: [
                        {
                          type: 'tool-invocation',
                          toolInvocation: {
                            toolName: 'createDocument',
                            toolCallId: generateUUID(),
                            state: 'result',
                            result: { id: json.id, title: json.title, kind: 'people' },
                          },
                        },
                      ],
                    } as any;
                    setMessages((msgs) => [...msgs, userMsg, toolMsg]);
                  }
                  setArtifact({
                    documentId: json.id,
                    kind: 'people',
                    title: json.title,
                    content: '',
                    isVisible: true,
                    status: 'idle',
                    boundingBox: { top: 0, left: 0, width: 320, height: 48 },
                  });
                  // Set metadata with cursor and spec for Load More functionality
                  setMetadata({ cursor: json.cursor ?? null, spec: json.spec, limit: 50 });
                  setLoadingKey(null);
                  return;
                } else {
                  // API returned error, fall back to normal chat flow with AI
                  setLoadingKey(null);
                  await append({
                    role: 'user',
                    content: suggestedAction.query,
                  });
                  return;
                }
              } catch {
                // Network error, fall back to normal chat flow with AI
                setLoadingKey(null);
                await append({
                  role: 'user',
                  content: suggestedAction.query,
                });
                return;
              }
            }}
            className="group text-left border rounded-xl px-4 py-3.5 text-sm flex-1 gap-1 sm:flex-col w-full h-auto justify-start items-start hover:text-white"
            disabled={loadingKey === `${suggestedAction.title}-${index}`}
          >
            <span className="font-medium flex items-center gap-2 group-hover:text-white">
              {loadingKey === `${suggestedAction.title}-${index}` && (
                <span className="animate-spin"><LoaderIcon /></span>
              )}
              {suggestedAction.title}
            </span>
            <span className="text-muted-foreground group-hover:text-white">
              {suggestedAction.label}
            </span>
          </Button>
        </motion.div>
      ))}
    </div>
  );
}

export const SuggestedActions = memo(
  PureSuggestedActions,
  (prevProps, nextProps) => {
    if (prevProps.chatId !== nextProps.chatId) return false;
    if (prevProps.selectedVisibilityType !== nextProps.selectedVisibilityType)
      return false;

    return true;
  },
);
