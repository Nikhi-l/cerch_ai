import { expect, test } from '../fixtures';
import { artifactKinds, documentHandlersByArtifactKind } from '@/lib/artifacts/server';

test.describe('people/company artifact registration', () => {
  test('artifactKinds includes people and company', async () => {
    expect(artifactKinds).toContain('people');
    expect(artifactKinds).toContain('company');
  });

  test('document handlers include people and company handlers', async () => {
    const hasPeople = documentHandlersByArtifactKind.some((h) => h.kind === 'people');
    const hasCompany = documentHandlersByArtifactKind.some((h) => h.kind === 'company');
    expect(hasPeople).toBeTruthy();
    expect(hasCompany).toBeTruthy();
  });
});

