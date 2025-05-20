'use client';

import { motion } from 'framer-motion';
import { Button } from './ui/button';
import { memo, useState } from 'react';
import type { UseChatHelpers } from '@ai-sdk/react';
import type { VisibilityType } from './visibility-selector';
import { WebsetSearch } from './webset-search';

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
  const [showSearch, setShowSearch] = useState(false);
  const suggestedActions = [
    {
      title: 'Show a webset',
      label: 'of top tech companies',
      action: 'Show a webset of top tech companies',
    },
    {
      title: 'Create a webset',
      label: 'of ExampleCorp employees',
      action: 'Create a webset of ExampleCorp employees',
    },
    {
      title: 'Find people named',
      label: 'Jane Doe',
      action: 'Find people named Jane Doe and display a webset',
    },
    {
      title: 'List companies',
      label: 'founded after 2015',
      action: 'List companies founded after 2015 in a webset',
    },
  ];

  return (
    <div
      data-testid="suggested-actions"
      className="grid sm:grid-cols-2 gap-2 w-full"
    >
      {showSearch && (
        <div className="col-span-2">
          <WebsetSearch />
        </div>
      )}
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
              if (index === 1) {
                setShowSearch(true);
              } else {
                append({
                  role: 'user',
                  content: suggestedAction.action,
                });
              }
            }}
            className="text-left border rounded-xl px-4 py-3.5 text-sm flex-1 gap-1 sm:flex-col w-full h-auto justify-start items-start"
          >
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
