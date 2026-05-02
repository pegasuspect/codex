#!/usr/bin/env node
import { access, mkdir, rm } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { join, resolve } from 'node:path';

const ADDON_NAME = 'kubuntu-icon-switcher-artwork-bridge';

export async function packageFirefoxAddon(projectDirectory = process.cwd()): Promise<string> {
  const extensionDirectory = resolve(projectDirectory, 'extension');
  const releaseDirectory = resolve(projectDirectory, 'release');
  const xpiPath = join(releaseDirectory, `${ADDON_NAME}.xpi`);

  await access(join(extensionDirectory, 'manifest.json'));
  await access(join(extensionDirectory, 'dist', 'background.js'));
  await access(join(extensionDirectory, 'dist', 'content.js'));
  await mkdir(releaseDirectory, { recursive: true });
  await rm(xpiPath, { force: true });

  await zipExtension(extensionDirectory, xpiPath);
  return xpiPath;
}

function zipExtension(extensionDirectory: string, xpiPath: string): Promise<void> {
  return new Promise((resolvePromise, reject) => {
    const child = spawn('zip', ['-r', '-9', xpiPath, 'manifest.json', 'dist'], {
      cwd: extensionDirectory,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const stderr: Buffer[] = [];

    child.stderr.on('data', (chunk: Buffer) => stderr.push(chunk));
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) {
        resolvePromise();
        return;
      }

      const exitCode = code === null ? 'null' : String(code);
      reject(new Error(Buffer.concat(stderr).toString('utf8') || `zip exited with ${exitCode}`));
    });
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  packageFirefoxAddon()
    .then((xpiPath) => {
      console.log(`Packaged Firefox add-on: ${xpiPath}`);
    })
    .catch((error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      console.error(message);
      process.exitCode = 1;
    });
}
