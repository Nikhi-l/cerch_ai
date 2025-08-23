import { expect, test } from '../fixtures';
import { artifactKinds, documentHandlersByArtifactKind } from '@/lib/artifacts/server';

test.describe('dashboard artifact registration', () => {
  test('artifactKinds includes dashboard', async () => {
    expect(artifactKinds).toContain('dashboard');
  });

  test('document handlers include dashboard handler', async () => {
    const hasDashboard = documentHandlersByArtifactKind.some(
      (h) => h.kind === 'dashboard',
    );
    expect(hasDashboard).toBeTruthy();
  });
});
