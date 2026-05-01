import { createWriteStream } from 'node:fs';
import { access, copyFile, mkdir } from 'node:fs/promises';
import { get as httpGet } from 'node:http';
import { get as httpsGet } from 'node:https';
import { basename, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export interface ResolveAlbumArtInput {
  artUrl: string;
  cacheDirectory: string;
}

export async function resolveAlbumArt(input: ResolveAlbumArtInput): Promise<string> {
  await mkdir(input.cacheDirectory, { recursive: true });

  if (input.artUrl.startsWith('file://')) {
    const sourcePath = fileURLToPath(input.artUrl);
    return copyLocalAlbumArt(sourcePath, plannedAlbumArtPath(sourcePath, input.cacheDirectory));
  }

  if (input.artUrl.startsWith('/')) {
    return copyLocalAlbumArt(input.artUrl, plannedAlbumArtPath(input.artUrl, input.cacheDirectory));
  }

  if (input.artUrl.startsWith('https://') || input.artUrl.startsWith('http://')) {
    const targetPath = plannedAlbumArtPath(input.artUrl, input.cacheDirectory);
    await downloadAlbumArt(input.artUrl, targetPath);
    return targetPath;
  }

  throw new Error(`Unsupported Spotify album art URL: ${input.artUrl}`);
}

export function plannedAlbumArtPath(artUrl: string, cacheDirectory: string): string {
  if (artUrl.startsWith('file://')) {
    return join(cacheDirectory, `spotify-album-art${extensionFromPath(fileURLToPath(artUrl))}`);
  }

  if (artUrl.startsWith('/')) {
    return join(cacheDirectory, `spotify-album-art${extensionFromPath(artUrl)}`);
  }

  if (artUrl.startsWith('https://') || artUrl.startsWith('http://')) {
    return join(cacheDirectory, `spotify-album-art${extensionFromUrl(artUrl)}`);
  }

  throw new Error(`Unsupported Spotify album art URL: ${artUrl}`);
}

async function copyLocalAlbumArt(sourcePath: string, targetPath: string): Promise<string> {
  await access(sourcePath);

  await copyFile(sourcePath, targetPath);
  return targetPath;
}

function extensionFromPath(path: string): string {
  return extname(path) || '.png';
}

function extensionFromUrl(url: string): string {
  const parsed = new URL(url);
  const extension = extname(basename(parsed.pathname));

  if (extension && extension.length <= 5) {
    return extension;
  }

  return '.jpg';
}

function downloadAlbumArt(url: string, targetPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const getter = url.startsWith('https://') ? httpsGet : httpGet;
    const request = getter(url, (response) => {
      if (
        response.statusCode &&
        response.statusCode >= 300 &&
        response.statusCode < 400 &&
        response.headers.location
      ) {
        response.resume();
        downloadAlbumArt(new URL(response.headers.location, url).toString(), targetPath)
          .then(resolve)
          .catch(reject);
        return;
      }

      if (response.statusCode !== 200) {
        response.resume();
        const statusCode =
          response.statusCode === undefined ? 'unknown' : String(response.statusCode);
        reject(new Error(`Album art download failed with HTTP ${statusCode}.`));
        return;
      }

      const file = createWriteStream(targetPath);
      response.pipe(file);
      file.on('finish', () => {
        file.close((error) => {
          if (error) {
            reject(error);
            return;
          }

          resolve();
        });
      });
      file.on('error', reject);
    });

    request.on('error', reject);
  });
}

export function albumArtCacheDirectory(homeDirectory: string | undefined): string {
  if (!homeDirectory) {
    throw new Error('HOME is not set.');
  }

  return join(homeDirectory, '.cache', 'kubuntu-icon-switcher');
}
