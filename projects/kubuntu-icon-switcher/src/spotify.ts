import { spawn } from 'node:child_process';

const SPOTIFY_SERVICE = 'org.mpris.MediaPlayer2.spotify';
const SPOTIFY_PATH = '/org/mpris/MediaPlayer2';
const SPOTIFY_METADATA_PROPERTY = 'org.mpris.MediaPlayer2.Player.Metadata';

export async function readSpotifyAlbumArt(): Promise<string | null> {
  const output = await readSpotifyMetadata();

  return parseMprisArtUrl(output);
}

export function parseMprisArtUrl(output: string): string | null {
  const artKeyIndex = output.indexOf('mpris:artUrl');

  if (artKeyIndex === -1) {
    return null;
  }

  const outputAfterArtKey = output.slice(artKeyIndex);
  const urlMatch = /(file:\/\/[^\s'")]+|https?:\/\/[^\s'")]+)/.exec(outputAfterArtKey);
  return urlMatch?.[1] ?? null;
}

async function readSpotifyMetadata(): Promise<string> {
  const errors: string[] = [];

  for (const command of ['qdbus6', 'qdbus']) {
    try {
      return await runQdbus(command, [SPOTIFY_SERVICE, SPOTIFY_PATH, SPOTIFY_METADATA_PROPERTY]);
    } catch (error) {
      errors.push(formatError(command, error));
    }
  }

  throw new Error(`Could not read Spotify MPRIS metadata.\n${errors.join('\n')}`);
}

function runQdbus(command: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];

    child.stdout.on('data', (chunk: Buffer) => stdout.push(chunk));
    child.stderr.on('data', (chunk: Buffer) => stderr.push(chunk));
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) {
        resolve(Buffer.concat(stdout).toString('utf8'));
        return;
      }

      const exitCode = code === null ? 'null' : String(code);
      reject(new Error(Buffer.concat(stderr).toString('utf8') || `qdbus exited with ${exitCode}`));
    });
  });
}

function formatError(command: string, error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return `${command}: ${message.trim()}`;
}
