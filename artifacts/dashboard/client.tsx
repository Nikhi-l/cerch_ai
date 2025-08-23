import { Artifact } from '@/components/create-artifact';
import { DocumentSkeleton } from '@/components/document-skeleton';
import { MessageIcon, RedoIcon } from '@/components/icons';

interface DashboardMetadata {
  charts: Array<{ title: string }>;
  stats: Array<{ label: string; value: string }>;
  messages: Array<{ role: 'assistant' | 'user'; content: string }>;
}

export const dashboardArtifact = new Artifact<'dashboard', DashboardMetadata>({
  kind: 'dashboard',
  description: 'Displays AI generated charts, statistics and related messages.',
  initialize: async ({ setMetadata }) => {
    setMetadata({ charts: [], stats: [], messages: [] });
  },
  onStreamPart: ({ streamPart, setArtifact, setMetadata }) => {
    if (streamPart.type === 'dashboard-delta') {
      setArtifact((draft) => {
        const updatedContent = draft.content + (streamPart.content as string);
        try {
          const parsed = JSON.parse(updatedContent);
          setMetadata((meta) => ({
            ...meta,
            charts: parsed.charts ?? meta.charts,
            stats: parsed.stats ?? meta.stats,
          }));
        } catch {}
        return {
          ...draft,
          content: updatedContent,
          isVisible: true,
          status: 'streaming',
        };
      });
    }

    if (streamPart.type === 'chat-message') {
      setMetadata((meta) => ({
        ...meta,
        messages: [
          ...meta.messages,
          { role: 'assistant', content: streamPart.content as string },
        ],
      }));
    }
  },
  content: ({ content, isLoading, metadata }) => {
    if (isLoading) {
      return <DocumentSkeleton artifactKind="dashboard" />;
    }

    let parsed: any = {};
    try {
      parsed = JSON.parse(content);
    } catch {}

    const charts = metadata?.charts ?? parsed.charts ?? [];
    const stats = metadata?.stats ?? parsed.stats ?? [];
    const messages = metadata?.messages ?? [];

    return (
      <div className="flex h-full">
        <div className="flex-1 overflow-auto p-4 space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {charts.map((chart, idx) => (
              <div
                key={idx}
                className="h-48 border rounded flex items-center justify-center text-muted-foreground"
              >
                {chart.title ?? `Chart ${idx + 1}`}
              </div>
            ))}
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {stats.map((stat, idx) => (
              <div key={idx} className="border rounded p-4 text-center">
                <div className="text-2xl font-bold">{stat.value}</div>
                <div className="text-xs text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="w-64 border-l p-4 flex flex-col">
          <div className="flex-1 overflow-auto space-y-2">
            {messages.map((m, idx) => (
              <div key={idx} className="p-2 rounded bg-muted">
                {m.content}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  },
  actions: [
    {
      icon: <RedoIcon size={18} />,
      description: 'Refresh dashboard',
      onClick: ({ handleVersionChange }) => {
        handleVersionChange('latest');
      },
    },
  ],
  toolbar: [
    {
      icon: <MessageIcon />,
      description: 'Request new metrics',
      onClick: ({ appendMessage }) => {
        appendMessage({
          role: 'user',
          content: 'Please refresh the dashboard with new metrics.',
        });
      },
    },
  ],
});
