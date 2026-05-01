import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

export interface FirefoxArtworkState {
  artworkUrl: string;
  emittedAt: string;
  pageUrl: string;
  source: 'spotify-web';
  title?: string;
}

export function firefoxArtworkStatePath(homeDirectory: string | undefined): string {
  if (!homeDirectory) {
    throw new Error('HOME is not set.');
  }

  return join(homeDirectory, '.cache', 'kubuntu-icon-switcher', 'firefox-artwork.json');
}

export async function readFirefoxArtworkState(path: string): Promise<FirefoxArtworkState> {
  const content = await readFile(path, 'utf8');
  const parsed: unknown = JSON.parse(content);

  if (!isFirefoxArtworkState(parsed)) {
    throw new Error(`Invalid Firefox artwork state file: ${path}`);
  }

  return parsed;
}

export async function writeFirefoxArtworkState(
  path: string,
  state: FirefoxArtworkState,
): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
}

function isFirefoxArtworkState(value: unknown): value is FirefoxArtworkState {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<FirefoxArtworkState>;
  return (
    typeof candidate.artworkUrl === 'string' &&
    typeof candidate.emittedAt === 'string' &&
    typeof candidate.pageUrl === 'string' &&
    candidate.source === 'spotify-web'
  );
}
