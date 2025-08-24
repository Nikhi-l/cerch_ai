'use client';

import { motion } from 'framer-motion';
import { Button } from './ui/button';
import { memo } from 'react';
import type { UseChatHelpers } from '@ai-sdk/react';
import type { VisibilityType } from './visibility-selector';
import { generateUUID } from '@/lib/utils';
import { useArtifact } from '@/hooks/use-artifact';

interface SuggestedActionsProps {
  chatId: string;
  append: UseChatHelpers['append'];
  setMessages: UseChatHelpers['setMessages'];
  selectedVisibilityType: VisibilityType;
}

function PureSuggestedActions({
  chatId,
  append,
  setMessages,
  selectedVisibilityType,
}: SuggestedActionsProps) {
  const { setArtifact, setMetadata } = useArtifact();

  const dashboardData = {
    charts: [
      {
        title: 'Traffic source',
        data: [
          { label: 'Direct', value: 45 },
          { label: 'Organic', value: 30 },
          { label: 'Referral', value: 25 },
        ],
      },
    ],
    stats: [
      { label: 'Visitors this month', value: '12,345', change: '+5%' },
      { label: 'Bounce rate', value: '40%' },
      { label: 'Avg. session', value: '3m 12s' },
      { label: 'New users', value: '1,200' },
      { label: 'Conversions', value: '120' },
    ],
    messages: [],
  };

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
      title: 'Show dashboard',
      label: 'traffic analytics',
      onSelect: () => {
        const id = generateUUID();
        setArtifact({
          documentId: id,
          title: 'Traffic dashboard',
          kind: 'dashboard',
          content: JSON.stringify(dashboardData),
          isVisible: true,
          status: 'idle',
          boundingBox: { top: 0, left: 0, width: 0, height: 0 },
        });
        setMetadata({
          charts: dashboardData.charts,
          stats: dashboardData.stats,
          messages: [],
        });
        setMessages((prev) => [
          ...prev,
          {
            id: generateUUID(),
            role: 'user',
            content: 'Show traffic analytics dashboard.',
          },
          {
            id: generateUUID(),
            role: 'assistant',
            content: 'Here is the traffic analytics dashboard.',
          },
        ]);
      },
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

              if ('onSelect' in suggestedAction && suggestedAction.onSelect) {
                suggestedAction.onSelect();
              } else if ('action' in suggestedAction && suggestedAction.action) {
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
