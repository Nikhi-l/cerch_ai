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
  const { setArtifact } = useArtifact();
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
      title: 'Seed‑stage AI startups (UK)',
      label: 'Companies • VC dealflow example',
      type: 'company-demo',
      query: 'List seed‑stage AI startups in the UK. Include name, industry, website, LinkedIn, size, and description.',
      payload: { title: 'Seed‑stage AI startups in the UK' },
    },
    {
      title: 'Fintech companies in SF (50–500 employees)',
      label: 'Companies • Account planning example',
      type: 'company-demo',
      query: 'Find fintech companies in San Francisco with 50–500 employees. Include name, industry, website, LinkedIn, size, and description.',
      payload: { title: 'Fintech in SF with 50–500 employees' },
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
              // First, write the user's natural query into chat
              if (suggestedAction.query && setMessages) {
                const userMsg: UIMessage = {
                  id: generateUUID(),
                  role: 'user',
                  content: '',
                  parts: [{ type: 'text', text: suggestedAction.query } as any],
                } as any;
                setMessages((msgs) => [...msgs, userMsg]);
              }

              if (suggestedAction.type === 'people-demo') {
                try {
                  const res = await fetch('/api/cerch/people', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ chatId, ...suggestedAction.payload, userMessage: suggestedAction.query }),
                  });
                  const json = await res.json();
                  if (json?.ok) {
                    // Optimistically append assistant tool-result to chat
                    if (setMessages) {
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
                      setMessages((msgs) => [...msgs, toolMsg]);
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
                    setLoadingKey(null);
                    return;
                  }
                } catch {}
              } else if (suggestedAction.type === 'company-demo') {
                try {
                  const res = await fetch('/api/cerch/company', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ chatId, ...suggestedAction.payload, userMessage: suggestedAction.query }),
                  });
                  const json = await res.json();
                  if (json?.ok) {
                    if (setMessages) {
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
                              result: { id: json.id, title: json.title, kind: 'company' },
                            },
                          },
                        ],
                      } as any;
                      setMessages((msgs) => [...msgs, toolMsg]);
                    }
                    setArtifact({
                      documentId: json.id,
                      kind: 'company',
                      title: json.title,
                      content: '',
                      isVisible: true,
                      status: 'idle',
                      boundingBox: { top: 0, left: 0, width: 320, height: 48 },
                    });
                    setLoadingKey(null);
                    return;
                  }
                } catch {}
              }
              // No LLM fallback; keep chat clean if background route fails
              setLoadingKey(null);
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
