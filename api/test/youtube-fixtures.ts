import * as files from 'node:fs/promises';

// The managed macOS checkout permits unlink but denies rmdir, even on new fixtures.
// Simulate only that final directory removal; production rm and file-cleanup assertions remain intact.
export function allowRestrictedFixtureCleanup() {
  const original = files.rm;
  return jest.spyOn(files, 'rm').mockImplementation(async (path, options) => {
    try {
      await original(path, options);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EPERM' || (await files.readdir(path)).length)
        throw error;
    }
  });
}
