import { expect, test } from '../fixtures';
import { artifactKinds, documentHandlersByArtifactKind } from '@/lib/artifacts/server';
import { websetArtifact } from '@/artifacts/webset/client';

// Ensure webset artifact is registered

test.describe('webset artifact registration', () => {
  test('artifactKinds includes webset', async () => {
    expect(artifactKinds).toContain('webset');
  });

  test('document handlers include webset handler', async () => {
    const hasWebset = documentHandlersByArtifactKind.some(h => h.kind === 'webset');
    expect(hasWebset).toBeTruthy();
  });

  test('toolbar includes new actions', async () => {
    const descriptions = websetArtifact.toolbar.map((t) => t.description);
    expect(descriptions).toContain('Get code');
    expect(descriptions).toContain('Add enrichment');
  });
});
