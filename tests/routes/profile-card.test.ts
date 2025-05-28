import { expect, test } from '../fixtures';
import { artifactKinds, documentHandlersByArtifactKind } from '@/lib/artifacts/server';

test.describe('profile_card artifact registration', () => {
  test('artifactKinds includes profile_card', async () => {
    expect(artifactKinds).toContain('profile_card');
  });

  test('document handlers include profile_card handler', async () => {
    const hasHandler = documentHandlersByArtifactKind.some(h => h.kind === 'profile_card');
    expect(hasHandler).toBeTruthy();
  });
});
