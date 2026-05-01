import { spawn } from 'node:child_process';

export async function readSpotifyAlbumArt(): Promise<string | null> {
  const output = await runQdbus([
    'org.mpris.MediaPlayer2.spotify',
    '/org/mpris/MediaPlayer2',
    'org.freedesktop.DBus.Properties.Get',
    'org.mpris.MediaPlayer2.Player',
    'Metadata',
  ]);

  return parseMprisArtUrl(output);
}

export function parseMprisArtUrl(output: string): string | null {
  const lines = output.split(/\r?\n/);
  const artLine = lines.find((line) => line.includes('mpris:artUrl'));

  if (!artLine) {
    return null;
  }

  const urlMatch = /(file:\/\/\S+|https?:\/\/\S+)/.exec(artLine);
  return urlMatch?.[1] ?? null;
}

function runQdbus(args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn('qdbus', args, { stdio: ['ignore', 'pipe', 'pipe'] });
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
