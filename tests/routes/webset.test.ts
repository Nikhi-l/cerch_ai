import { expect, test } from '../fixtures';
import { artifactKinds } from '@/lib/artifacts/constants';

// Ensure webset artifact is registered

test.describe('webset artifact registration', () => {
  test('artifactKinds includes webset', async () => {
    expect(artifactKinds).toContain('webset');
  });
});
