# Project Checkpoint

Use this file at the start of a new chat session to quickly rebuild context for
this workspace.

## Workspace

This repository is a root workspace for independent TypeScript projects under
`projects/`.

Current active project:

- `projects/kubuntu-icon-switcher`

The root docs define the workspace standards:

- `docs/architecture.md`
- `docs/typescript-standards.md`
- `docs/security.md`
- `docs/testing-deployment.md`
- `docs/project-template.md`

## Current Project Story

The active project is **Kubuntu Icon Switcher**, a local TypeScript CLI and
Firefox bridge for changing KDE/Plasma launcher icons without editing system
files.

The original goal was to replace Firefox's Kubuntu launcher icon with a custom
image. That became phase 1. The project then expanded toward a Spotify-driven
mode where Firefox's launcher icon can show the currently playing album art.

Because Spotify MPRIS metadata can be unavailable or inconsistent, the project
also gained a Firefox WebExtension bridge. The extension runs on Spotify Web
Player, detects artwork URLs, sends state through a native messaging host, and
the local watcher applies or restores the Firefox launcher icon based on playback
state.

## Implemented Behavior

Phase 1:

- Finds a Firefox `.desktop` entry from common KDE/Linux Firefox package names.
- Copies the desktop entry into the user-local XDG applications directory.
- Stores the selected icon under
  `~/.local/share/icons/codex-kubuntu-icon-switcher`.
- Rewrites the copied desktop entry's `Icon=` field.
- Refreshes KDE's service cache with `kbuildsycoca6` or `kbuildsycoca5` when
  available.

Phase 2:

- Reads Spotify's current album art over MPRIS with `qdbus6` or `qdbus`.
- Resolves local or remote `mpris:artUrl` values.
- Caches album art under `~/.cache/kubuntu-icon-switcher`.
- Applies the cached album art to the Firefox launcher icon.

Firefox bridge:

- WebExtension lives in `extension/` with TypeScript source in `extension-src/`.
- Content script runs on `https://open.spotify.com/*`.
- Background script sends artwork and playback state to native host
  `codex_kubuntu_icon_switcher`.
- Native host writes latest state to
  `~/.cache/kubuntu-icon-switcher/firefox-artwork.json`.
- `watch-firefox` watches that file and applies album art while playback is
  active.
- When playback stops, Firefox disconnects, or the watcher exits from `SIGINT`
  or `SIGTERM`, the watcher restores the original Firefox desktop entry.

Packaging and review:

- The Firefox bridge can be packaged as an XPI.
- A Mozilla source-review zip workflow is documented in the project README.
- The extension manifest declares no data collection.
- The project is proprietary and has `LICENSE.md`.

## Important Files

- `projects/kubuntu-icon-switcher/README.md` - main project documentation.
- `projects/kubuntu-icon-switcher/package.json` - commands and toolchain.
- `projects/kubuntu-icon-switcher/src/cli.ts` - CLI entry point.
- `projects/kubuntu-icon-switcher/src/iconOverride.ts` - desktop-entry planning.
- `projects/kubuntu-icon-switcher/src/firefoxWatcher.ts` - watcher and restore
  behavior.
- `projects/kubuntu-icon-switcher/src/albumArt.ts` - album-art cache and URL
  resolution.
- `projects/kubuntu-icon-switcher/src/spotify.ts` - MPRIS/qdbus Spotify reader.
- `projects/kubuntu-icon-switcher/src/nativeHost.ts` - Firefox native messaging
  host.
- `projects/kubuntu-icon-switcher/src/nativeManifest.ts` - native host manifest
  installer.
- `projects/kubuntu-icon-switcher/extension-src/` - Firefox extension source.
- `projects/kubuntu-icon-switcher/test/` - Vitest unit tests.
- `projects/kubuntu-icon-switcher/assets/firefox-dog.png` - generated phase-1
  icon.

Generated or packaged outputs currently present:

- `projects/kubuntu-icon-switcher/dist/`
- `projects/kubuntu-icon-switcher/extension/dist/`
- `projects/kubuntu-icon-switcher/release/kubuntu-icon-switcher-artwork-bridge.xpi`
- `projects/kubuntu-icon-switcher/release/kubuntu-icon-switcher-source-review.zip`

## Commands

Run from `projects/kubuntu-icon-switcher`:

```bash
npm install
npm run lint
npm run typecheck
npm test
npm run build
npm audit
```

Phase 1:

```bash
npm run phase1:dry-run
npm run phase1
```

Phase 2 through Spotify MPRIS:

```bash
npm run spotify-art
npm run phase2:dry-run
npm run phase2
```

Firefox bridge:

```bash
npm run install-firefox-host
npm run package:firefox
npm run watch-firefox
npm run watch-firefox:dry-run
```

## Last Known Verification

As of the checkpoint creation, the repo was clean on branch `main`.

These checks passed in `projects/kubuntu-icon-switcher`:

```bash
npm test
npm run typecheck
npm run lint
```

The test suite had 4 passing test files and 9 passing tests.

Recent git history included work for:

- documenting the Mozilla source-review zip alias
- adding a proprietary license
- updating Firefox data consent compatibility
- declaring no Firefox extension data collection
- packaging the Firefox bridge as an XPI
- restoring the Firefox icon when playback stops
- preferring now-playing Spotify artwork
- adding the Firefox artwork bridge

## Notes for Future Sessions

Start by reading this file, then read:

1. `README.md`
2. `projects/kubuntu-icon-switcher/README.md`
3. `projects/kubuntu-icon-switcher/package.json`
4. `projects/kubuntu-icon-switcher/src/cli.ts`
5. `projects/kubuntu-icon-switcher/src/firefoxWatcher.ts`

Then check the current state:

```bash
git status --short --branch
git log --oneline -8
```

The normal command sandbox may fail in this environment with a `bwrap` loopback
setup error. If that happens, rerun local inspection or project commands with
the approved escalated execution flow.
