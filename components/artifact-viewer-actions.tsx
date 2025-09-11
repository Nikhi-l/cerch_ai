"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { MessageSquare, Copy, ChevronLeft } from 'lucide-react';
import { toast } from '@/components/toast';

export function ArtifactViewerActions({
  chatId,
  artifactId,
  containerId,
  content,
  showBackIcon,
  backHref,
}: {
  chatId: string | null;
  artifactId: string;
  containerId: string;
  content: string;
  showBackIcon?: boolean;
  backHref: string;
}) {
  const href = chatId ? `/chat/${chatId}?artifact=${artifactId}` : `/chat?artifact=${artifactId}`;

  const copyContent = async () => {
    try {
      await navigator.clipboard.writeText(content || '');
      toast({ type: 'success', description: 'Copied to clipboard' });
    } catch {
      toast({ type: 'error', description: 'Failed to copy' });
    }
  };

  return (
    <div className="flex items-center gap-2">
      {showBackIcon && (
        <Link href={backHref} aria-label="Back">
          <Button variant="outline" size="sm" className="p-2 text-[0.8rem]">
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </Link>
      )}

      <Link href={href}>
        <Button size="sm" variant="default" className="text-[0.8rem] px-2.5 py-1.5">
          <MessageSquare className="h-4 w-4 mr-2" /> Return to Chat
        </Button>
      </Link>

      <Button size="sm" variant="outline" className="text-[0.8rem] px-2.5 py-1.5" onClick={copyContent}>
        <Copy className="h-4 w-4 mr-2" /> Copy
      </Button>
    </div>
  );
}
