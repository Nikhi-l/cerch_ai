import { Artifact } from '@/components/create-artifact';
import {
  CopyIcon,
  LineChartIcon,
  PlusIcon,
  RedoIcon,
  SparklesIcon,
  UndoIcon,
  CodeIcon,
} from '@/components/icons';
import { WebsetTable } from '@/components/webset-table';
import { parse, unparse } from 'papaparse';
import { toast } from 'sonner';

export interface WebsetMetadata {
  filters: Record<string, string>;
  sortedColumn: string | null;
  sortDirection: 'asc' | 'desc';
}

export const websetArtifact = new Artifact<'webset', WebsetMetadata>({
  kind: 'webset',
  description: 'Useful for exploring company and people data',
  initialize: async ({ setMetadata }) => {
    setMetadata({
      filters: {},
      sortedColumn: null,
      sortDirection: 'asc',
    });
  },
  onStreamPart: ({ setArtifact, streamPart }) => {
    if (streamPart.type === 'sheet-delta') {
      setArtifact((draftArtifact) => ({
        ...draftArtifact,
        content: streamPart.content as string,
        isVisible: true,
        status: 'streaming',
      }));
    }
  },
  content: ({ content, metadata, setMetadata }) => {
    return (
      <WebsetTable
        csv={content}
        filters={metadata?.filters || {}}
        sortedColumn={metadata?.sortedColumn || null}
        sortDirection={metadata?.sortDirection || 'asc'}
        onFiltersChange={(filters) =>
          setMetadata((m) => ({ ...m, filters }))
        }
        onSortedColumnChange={(column) =>
          setMetadata((m) => ({ ...m, sortedColumn: column }))
        }
        onSortDirectionChange={(direction) =>
          setMetadata((m) => ({ ...m, sortDirection: direction }))
        }
      />
    );
  },
  actions: [
    {
      icon: <UndoIcon size={18} />,
      description: 'View Previous version',
      onClick: ({ handleVersionChange }) => {
        handleVersionChange('prev');
      },
      isDisabled: ({ currentVersionIndex }) => {
        if (currentVersionIndex === 0) {
          return true;
        }

        return false;
      },
    },
    {
      icon: <RedoIcon size={18} />,
      description: 'View Next version',
      onClick: ({ handleVersionChange }) => {
        handleVersionChange('next');
      },
      isDisabled: ({ isCurrentVersion }) => {
        if (isCurrentVersion) {
          return true;
        }

        return false;
      },
    },
    {
      icon: <CopyIcon />,
      description: 'Copy as .csv',
      onClick: ({ content }) => {
        const parsed = parse<string[]>(content, { skipEmptyLines: true });

        const nonEmptyRows = parsed.data.filter((row) =>
          row.some((cell) => cell.trim() !== ''),
        );

        const cleanedCsv = unparse(nonEmptyRows);

        navigator.clipboard.writeText(cleanedCsv);
        toast.success('Copied csv to clipboard!');
      },
    },
  ],
  toolbar: [
    {
      description: 'Format and clean data',
      icon: <SparklesIcon />,
      onClick: ({ appendMessage }) => {
        appendMessage({
          role: 'user',
          content: 'Can you please format and clean the data?',
        });
      },
    },
    {
      description: 'Analyze and visualize data',
      icon: <LineChartIcon />,
      onClick: ({ appendMessage }) => {
        appendMessage({
          role: 'user',
          content:
            'Can you please analyze and visualize the data by creating a new code artifact in python?',
        });
      },
    },
    {
      description: 'Get code',
      icon: <CodeIcon />,
      onClick: ({ appendMessage }) => {
        appendMessage({
          role: 'user',
          content: 'Generate code to reproduce this webset.',
        });
      },
    },
    {
      description: 'Add enrichment',
      icon: <PlusIcon />,
      onClick: ({ appendMessage }) => {
        appendMessage({
          role: 'user',
          content: 'Please add enrichment to this webset.',
        });
      },
    },
  ],
});
