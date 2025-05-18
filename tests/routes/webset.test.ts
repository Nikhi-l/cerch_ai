import { expect, test } from '../fixtures';
import { artifactKinds, documentHandlersByArtifactKind } from '@/lib/artifacts/server';

// Ensure webset artifact is registered

test.describe('webset artifact registration', () => {
  test('artifactKinds includes webset', async () => {
    expect(artifactKinds).toContain('webset');
  });

  test('document handlers include webset handler', async () => {
    const hasWebset = documentHandlersByArtifactKind.some(h => h.kind === 'webset');
    expect(hasWebset).toBeTruthy();
  });
});
