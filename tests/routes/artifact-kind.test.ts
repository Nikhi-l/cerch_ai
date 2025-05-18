import { artifactDefinitions } from '@/components/artifact';
import { artifactKinds, documentHandlersByArtifactKind } from '@/lib/artifacts/server';
import { expect, test } from '@playwright/test';

test('webset artifact is registered', () => {
  const kinds = Array.from(artifactKinds);
  expect(kinds).toContain('webset');

  const hasDefinition = artifactDefinitions.some((d) => d.kind === 'webset');
  expect(hasDefinition).toBe(true);

  const hasHandler = documentHandlersByArtifactKind.some((h) => h.kind === 'webset');
  expect(hasHandler).toBe(true);
});
