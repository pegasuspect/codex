import { existsSync, watchFile } from 'node:fs';
import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { albumArtCacheDirectory, plannedAlbumArtPath, resolveAlbumArt } from './albumArt.js';
import { firefoxArtworkStatePath, readFirefoxArtworkState } from './firefoxArtworkState.js';
import { buildIconOverridePlan } from './iconOverride.js';
import { refreshKdeServiceCache } from './kde.js';

export interface WatchFirefoxArtworkInput {
  desktopId?: string;
  dryRun: boolean;
  homeDirectory?: string;
  once: boolean;
  statePath?: string;
  xdgDataHome?: string;
}

export async function watchFirefoxArtwork(input: WatchFirefoxArtworkInput): Promise<void> {
  const statePath = input.statePath ?? firefoxArtworkStatePath(input.homeDirectory);
  let lastAppliedArtworkUrl: string | null = null;

  const applyLatestState = async (): Promise<void> => {
    if (!existsSync(statePath)) {
      console.log(`Waiting for Firefox artwork state: ${statePath}`);
      return;
    }

    const state = await readFirefoxArtworkState(statePath);

    if (state.artworkUrl === lastAppliedArtworkUrl) {
      return;
    }

    const cacheDirectory = albumArtCacheDirectory(input.homeDirectory);
    const artworkPath = input.dryRun
      ? plannedAlbumArtPath(state.artworkUrl, cacheDirectory)
      : await resolveAlbumArt({
          artUrl: state.artworkUrl,
          cacheDirectory,
        });
    const plan = await buildIconOverridePlan({
      desktopId: input.desktopId,
      homeDirectory: input.homeDirectory,
      iconPath: artworkPath,
      xdgDataHome: input.xdgDataHome,
    });

    await applyFirefoxArtworkPlan(plan, input.dryRun);
    lastAppliedArtworkUrl = state.artworkUrl;
  };

  await applyLatestState();

  if (input.once) {
    return;
  }

  watchFile(statePath, { interval: 1_000 }, () => {
    applyLatestState().catch((error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      console.error(message);
    });
  });
  console.log(`Watching Firefox artwork state: ${statePath}`);
}

async function applyFirefoxArtworkPlan(
  plan: {
    rewriteDesktopEntry: (content: string) => string;
    sourceDesktopPath: string;
    sourceIconPath: string;
    targetDesktopPath: string;
    targetIconPath: string;
  },
  dryRun: boolean,
): Promise<void> {
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
