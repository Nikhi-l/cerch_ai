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
      title: 'Find CTOs',
      label: 'at fintech companies in SF Bay Area',
      action:
        "Create a people artifact of CTOs at fintech companies in the San Francisco Bay Area. Columns: name, title, company, region, linkedin_url, profile_image_url.",
    },
    {
      title: 'Product leaders',
      label: 'who recently changed jobs (NYC)',
      action:
        "Create a people artifact of product managers who started their current role after 2023-01-01 in New York City. Columns: name, title, company, region, linkedin_url.",
    },
    {
      title: 'B2B SaaS companies',
      label: 'USA • 50–500 headcount • >2015',
      action:
        "Create a company artifact of B2B SaaS companies in the USA with LinkedIn headcount between 50 and 500, founded after 2015-01-01. Columns: name, industry, company_url, linkedin_url, size, year_founded, description.",
    },
    {
      title: 'AI tooling startups',
      label: 'California • <100 headcount',
      action:
        "Create a company artifact of AI tooling startups in California with LinkedIn headcount under 100. Columns: name, company_url, linkedin_url, size, funding, description.",
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
