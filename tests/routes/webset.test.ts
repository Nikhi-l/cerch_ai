import { expect, test } from '../fixtures';
import { artifactKinds, documentHandlersByArtifactKind } from '@/lib/artifacts/server';
import { generateBangaloreCSV } from '@/lib/data/bangalore-startups';

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

test.describe('bangalore startups dataset', () => {
  test('csv includes at least 20 profiles', async () => {
    const csv = generateBangaloreCSV();
    const lines = csv.trim().split('\n');
    expect(lines.length - 1).toBeGreaterThanOrEqual(20);
  });
});
