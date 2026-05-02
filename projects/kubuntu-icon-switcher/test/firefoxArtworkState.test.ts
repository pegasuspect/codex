import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, describe, expect, it } from 'vitest';
import { readFirefoxArtworkState, writeFirefoxArtworkState } from '../src/firefoxArtworkState.js';

let tempDirectory: string | null = null;

afterEach(async () => {
  if (tempDirectory) {
    await rm(tempDirectory, { recursive: true, force: true });
    tempDirectory = null;
  }
});

describe('Firefox artwork state', () => {
  it('writes and reads artwork state JSON', async () => {
    tempDirectory = await mkdtemp(join(tmpdir(), 'kubuntu-icon-switcher-'));
    const statePath = join(tempDirectory, 'nested', 'state.json');

    await writeFirefoxArtworkState(statePath, {
      artworkUrl: 'https://i.scdn.co/image/example',
      emittedAt: '2026-05-01T00:00:00.000Z',
      isPlaying: true,
      pageUrl: 'https://open.spotify.com/track/example',
      source: 'spotify-web',
      title: 'Example',
    });

    await expect(readFirefoxArtworkState(statePath)).resolves.toEqual({
      artworkUrl: 'https://i.scdn.co/image/example',
      emittedAt: '2026-05-01T00:00:00.000Z',
      isPlaying: true,
      pageUrl: 'https://open.spotify.com/track/example',
      source: 'spotify-web',
      title: 'Example',
    });
    await expect(readFile(statePath, 'utf8')).resolves.toContain('"artworkUrl"');
  });
});
