import { Artifact } from '@/components/create-artifact';
import { CopyIcon, RedoIcon, UndoIcon } from '@/components/icons';
import { WebsetTable } from '@/components/webset-table';
import { parse, unparse } from 'papaparse';
import { toast } from 'sonner';

type Metadata = any;

export const companyArtifact = new Artifact<'company', Metadata>({
  kind: 'company',
  description: 'Useful for exploring company results in a table.',
  initialize: async () => {},
  onStreamPart: ({ setArtifact, setMetadata, streamPart }) => {
    if (streamPart.type === 'sheet-delta') {
      setArtifact((draftArtifact) => ({
        ...draftArtifact,
        content: streamPart.content as string,
        isVisible: true,
        status: 'streaming',
      }));
    } else if (streamPart.type === 'status') {
      setArtifact((draftArtifact) => ({
        ...draftArtifact,
        isVisible: true,
        status: 'streaming',
      }));
      setMetadata((m: any) => ({ ...(m || {}), statusText: String(streamPart.content || '') }));
    } else if (streamPart.type === 'error') {
      setArtifact((draftArtifact) => ({
        ...draftArtifact,
        status: 'idle',
        isVisible: true,
      }));
      try { toast.error(String(streamPart.content || 'Failed to fetch company results')); } catch {}
      setMetadata((m: any) => ({ ...(m || {}), statusText: '' }));
    } else if (streamPart.type === 'finish') {
      setMetadata((m: any) => ({ ...(m || {}), statusText: '' }));
    }
  },
  content: ({ content, status, metadata }) => {
    return (
      <div className="flex flex-col gap-2">
        {status === 'streaming' && (
          <div className="text-sm text-muted-foreground">
            {metadata?.statusText || 'Scanning companies and preparing your list…'}
          </div>
        )}
        <WebsetTable
          csv={content}
          variant="company"
          autoHideEmptyColumns
          hideImageUrlColumns
        />
      </div>
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
  toolbar: [],
});
