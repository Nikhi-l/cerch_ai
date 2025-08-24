'use client';

import { motion } from 'framer-motion';
import { Button } from './ui/button';
import { memo } from 'react';
import type { UseChatHelpers } from '@ai-sdk/react';
import type { VisibilityType } from './visibility-selector';

interface SuggestedActionsProps {
  chatId: string;
  append: UseChatHelpers['append'];
  selectedVisibilityType: VisibilityType;
}

function PureSuggestedActions({
  chatId,
  append,
  selectedVisibilityType,
}: SuggestedActionsProps) {
  const suggestedActions = [
    {
      category: 'Sales',
      title: 'Find customers',
      label: 'Source the perfect companies and people to sell to',
      action:
        'Find customers and source the perfect companies and people to sell to.',
    },
    {
      category: 'Market research',
      title: 'Analyze competitors',
      label: 'Find competitors and know everything about them',
      action:
        'Analyze competitors by finding competitors and learning everything about them.',
    },
    {
      category: 'Recruiting',
      title: 'Source talent',
      label: 'Find the exact profiles you need for your business',
      action:
        'Source talent and find the exact profiles you need for your business.',
    },
    {
      category: 'Academic research',
      title: 'Find research papers',
      label:
        'Search for papers on a topic with summaries, citations, and more',
      action:
        'Find research papers on a topic with summaries, citations, and more.',
    },
  ];

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

              append({
                role: 'user',
                content: suggestedAction.action,
              });
            }}
            className="text-left border rounded-xl px-4 py-3.5 text-sm flex-1 gap-1 sm:flex-col w-full h-auto justify-start items-start"
          >
            {'category' in suggestedAction && (
              <span className="text-xs text-muted-foreground">
                {suggestedAction.category}
              </span>
            )}
            <span className="font-medium">{suggestedAction.title}</span>
            <span className="text-muted-foreground">
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
