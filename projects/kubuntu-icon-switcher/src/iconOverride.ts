import { access } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { setDesktopEntryIcon } from './desktopEntry.js';

const DEFAULT_FIREFOX_DESKTOP_IDS = [
  'firefox.desktop',
  'org.mozilla.firefox.desktop',
  'firefox_firefox.desktop',
];

export interface BuildPhase1PlanInput {
  desktopId?: string;
  homeDirectory?: string;
  iconPath: string;
  xdgDataHome?: string;
}

export interface IconOverridePlan {
  rewriteDesktopEntry: (content: string) => string;
  sourceDesktopPath: string;
  sourceIconPath: string;
  targetDesktopPath: string;
  targetIconPath: string;
}

export async function buildPhase1Plan(input: BuildPhase1PlanInput): Promise<IconOverridePlan> {
  const homeDirectory = requireHome(input.homeDirectory);
  const xdgDataHome = input.xdgDataHome ?? join(homeDirectory, '.local', 'share');
  const desktopId = input.desktopId ?? (await findFirefoxDesktopId(DEFAULT_FIREFOX_DESKTOP_IDS));
  const sourceDesktopPath = join('/usr/share/applications', desktopId);
  const targetDesktopPath = join(xdgDataHome, 'applications', desktopId);
  const targetIconPath = join(
    xdgDataHome,
    'icons',
    'codex-kubuntu-icon-switcher',
    basename(input.iconPath),
  );

  return {
    rewriteDesktopEntry: (content) => setDesktopEntryIcon(content, targetIconPath),
    sourceDesktopPath,
    sourceIconPath: input.iconPath,
    targetDesktopPath,
    targetIconPath,
  };
}

async function findFirefoxDesktopId(candidates: string[]): Promise<string> {
  for (const candidate of candidates) {
    const path = join('/usr/share/applications', candidate);

    try {
      await access(path);
      return candidate;
    } catch {
      // Try the next known Firefox packaging variant.
    }
  }

  throw new Error(
    `Could not find a Firefox desktop entry. Pass --desktop-id with one of: ${candidates.join(
      ', ',
    )}`,
  );
}

function requireHome(homeDirectory: string | undefined): string {
  if (!homeDirectory) {
    throw new Error('HOME is not set.');
  }

  return homeDirectory;
}

