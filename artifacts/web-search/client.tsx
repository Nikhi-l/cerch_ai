import { Artifact } from '@/components/create-artifact';
import { CopyIcon, RedoIcon, UndoIcon, ExternalLinkIcon } from '@/components/icons';
import { WebsetTable } from '@/components/webset-table';
import { parse, unparse } from 'papaparse';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';

type Metadata = {
  statusText?: string;
  errorMessage?: string;
};

/**
 * Get badge variant based on source type
 */
function getSourceBadgeVariant(source: string): 'default' | 'secondary' | 'outline' {
  switch (source) {
    case 'news':
      return 'default';
    case 'scholar-articles':
    case 'scholar-articles-enriched':
    case 'scholar-author':
      return 'secondary';
    default:
      return 'outline';
  }
}

/**
 * Get display name for source
 */
function getSourceDisplayName(source: string): string {
  switch (source) {
    case 'news':
      return 'News';
    case 'web':
      return 'Web';
    case 'scholar-articles':
      return 'Scholar';
    case 'scholar-articles-enriched':
      return 'Scholar+';
    case 'scholar-author':
      return 'Author';
    default:
      return source;
  }
}

export const webSearchArtifact = new Artifact<'web-search', Metadata>({
  kind: 'web-search',
  description: 'Useful for displaying web search results from news, web, and academic sources.',
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
      setMetadata((m: Metadata | undefined) => ({
        ...(m || {}),
        statusText: String(streamPart.content || ''),
      }));
    } else if (streamPart.type === 'error') {
      const errorMsg = String(streamPart.content || 'Failed to fetch search results');
      setArtifact((draftArtifact) => ({
        ...draftArtifact,
        status: 'idle',
        isVisible: true,
      }));
      try {
        toast.error(errorMsg);
      } catch {}
      setMetadata((m: Metadata | undefined) => ({
        ...(m || {}),
        statusText: '',
        errorMessage: errorMsg,
      }));
    } else if (streamPart.type === 'finish') {
      setMetadata((m: Metadata | undefined) => ({
        ...(m || {}),
        statusText: '',
      }));
    }
  },
  content: ({ content, status, metadata, onSaveContent }) => {
    // Check if content contains an error
    const isError = content?.startsWith('ERROR\n');
    const errorContent = isError
      ? content.substring(6).replace(/^"|"$/g, '').replace(/""/g, '"')
      : null;

    // Parse CSV to enhance URL display
    const parsed = content && !isError
      ? parse<string[]>(content, { skipEmptyLines: true })
      : null;

    return (
      <div className="flex flex-col gap-2">
        {status === 'streaming' && (
          <div className="text-sm text-muted-foreground">
            {metadata?.statusText || 'Searching the web...'}
          </div>
        )}

        {/* Error display from metadata */}
        {metadata?.errorMessage && !isError && (
          <div className="rounded-lg border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950 p-4">
            <div className="flex items-start gap-3">
              <div className="text-red-600 dark:text-red-400 mt-0.5">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-medium text-red-800 dark:text-red-300 mb-1">
                  Search Error
                </h3>
                <p className="text-sm text-red-700 dark:text-red-400 whitespace-pre-wrap">
                  {metadata.errorMessage}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Error display from CSV content */}
        {isError && (
          <div className="rounded-lg border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950 p-4">
            <div className="flex items-start gap-3">
              <div className="text-red-600 dark:text-red-400 mt-0.5">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-medium text-red-800 dark:text-red-300 mb-1">
                  Search Error
                </h3>
                <p className="text-sm text-red-700 dark:text-red-400 whitespace-pre-wrap">
                  {errorContent}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Results table */}
        {content && !isError && (
          <WebsetTable
            csv={content}
            variant="webset"
            autoHideEmptyColumns
            onSaveContent={onSaveContent}
            customRenderers={{
              url: (value: string) => (
                <a
                  href={value}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 max-w-[300px] truncate"
                  title={value}
                >
                  <span className="truncate">{value}</span>
                  <ExternalLinkIcon size={12} className="flex-shrink-0" />
                </a>
              ),
              source: (value: string) => (
                <Badge variant={getSourceBadgeVariant(value)}>
                  {getSourceDisplayName(value)}
                </Badge>
              ),
              snippet: (value: string) => (
                <div
                  className="text-sm text-muted-foreground max-w-[400px] line-clamp-2"
                  title={value}
                >
                  {value}
                </div>
              ),
            }}
          />
        )}
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
        return currentVersionIndex === 0;
      },
    },
    {
      icon: <RedoIcon size={18} />,
      description: 'View Next version',
      onClick: ({ handleVersionChange }) => {
        handleVersionChange('next');
      },
      isDisabled: ({ isCurrentVersion }) => {
        return isCurrentVersion;
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
