import { Artifact } from '@/components/create-artifact';
import { DocumentSkeleton } from '@/components/document-skeleton';
import { MessageIcon, RedoIcon } from '@/components/icons';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

interface DashboardMetadata {
  charts: Array<{ title: string; data: Array<{ label: string; value: number }> }>;
  stats: Array<{ label: string; value: string; change?: string }>;
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

    const trafficChart = charts[0];
    const visitorsCard = stats[0];
    const widgets = stats.slice(1, 5);

    return (
      <div className="grid gap-4 md:grid-cols-2 h-full">
        <div className="flex flex-col gap-4">
          {trafficChart ? (
            <Card className="h-64">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  {trafficChart.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {trafficChart.data?.map((d) => (
                  <div key={d.label} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span>{d.label}</span>
                      <span>{d.value}%</span>
                    </div>
                    <div className="h-2 w-full rounded bg-muted">
                      <div
                        className="h-2 rounded bg-primary"
                        style={{ width: `${d.value}%` }}
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : null}

          {visitorsCard ? (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  {visitorsCard.label}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {visitorsCard.value}
                </div>
                {visitorsCard.change ? (
                  <p className="text-xs text-muted-foreground">
                    {visitorsCard.change}
                  </p>
                ) : null}
              </CardContent>
            </Card>
          ) : null}
        </div>

        <div className="flex flex-col gap-4 h-full">
          <Card className="flex flex-col flex-1">
            <CardContent className="flex flex-col flex-1 p-0">
              <div className="flex-1 overflow-auto p-4 space-y-2">
                {messages.map((m) => (
                  <div
                    key={`${m.role}-${m.content}`}
                    className="p-2 rounded-md bg-muted text-sm"
                  >
                    {m.content}
                  </div>
                ))}
              </div>
              <div className="p-4 border-t mt-auto">
                <Input placeholder="How can I help you today?" />
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 gap-4">
            {widgets.map((w) => (
              <Card key={w.label}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-medium">
                    {w.label}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-bold">{w.value}</div>
                </CardContent>
              </Card>
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
