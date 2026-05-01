#!/usr/bin/env node
import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { buildPhase1Plan, type IconOverridePlan } from './iconOverride.js';
import { refreshKdeServiceCache } from './kde.js';
import { readSpotifyAlbumArt } from './spotify.js';

type Command = 'phase1' | 'spotify-art' | 'help';

async function main(): Promise<void> {
  const [command = 'help', ...rest] = process.argv.slice(2);

  if (!isCommand(command)) {
    throw new Error(`Unknown command: ${command}`);
  }

  if (command === 'help') {
    printHelp();
    return;
  }

  if (command === 'phase1') {
    const options = parsePhase1Options(rest);
    const plan = await buildPhase1Plan({
      iconPath: resolve(options.icon),
      desktopId: options.desktopId,
      homeDirectory: process.env.HOME,
      xdgDataHome: process.env.XDG_DATA_HOME,
    });

    await applyPlan(plan, options.dryRun);
    return;
  }

  const albumArt = await readSpotifyAlbumArt();
  console.log(albumArt ?? 'Spotify album art is not currently available.');
}

function parsePhase1Options(args: string[]): {
  desktopId?: string;
  dryRun: boolean;
  icon: string;
} {
  const parsed = parseArgs({
    args,
    options: {
      'desktop-id': { type: 'string' },
      'dry-run': { type: 'boolean', default: false },
      icon: { type: 'string' },
    },
  });

  if (!parsed.values.icon) {
    throw new Error('Missing required --icon path.');
  }

  return {
    desktopId: parsed.values['desktop-id'],
    dryRun: parsed.values['dry-run'],
    icon: parsed.values.icon,
  };
}

async function applyPlan(plan: IconOverridePlan, dryRun: boolean): Promise<void> {
  console.log(`Source desktop entry: ${plan.sourceDesktopPath}`);
  console.log(`User desktop entry: ${plan.targetDesktopPath}`);
  console.log(`Icon target: ${plan.targetIconPath}`);

  if (dryRun) {
    console.log('Dry run complete. No files changed.');
    return;
  }

  await access(plan.sourceDesktopPath);
  await access(plan.sourceIconPath);
  await mkdir(dirname(plan.targetDesktopPath), { recursive: true });
  await mkdir(dirname(plan.targetIconPath), { recursive: true });

  const sourceDesktop = await readFile(plan.sourceDesktopPath, 'utf8');
  const updatedDesktop = plan.rewriteDesktopEntry(sourceDesktop);
  const sourceIcon = await readFile(plan.sourceIconPath);

  await writeFile(plan.targetDesktopPath, updatedDesktop, 'utf8');
  await writeFile(plan.targetIconPath, sourceIcon);

  const refreshResult = await refreshKdeServiceCache();
  console.log(refreshResult);
}

function isCommand(value: string): value is Command {
  return value === 'phase1' || value === 'spotify-art' || value === 'help';
}

function printHelp(): void {
  console.log(`Usage:
  kubuntu-icon-switcher phase1 --icon assets/firefox-dog.png [--desktop-id firefox.desktop] [--dry-run]
  kubuntu-icon-switcher spotify-art
`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
});
