# Kubuntu Icon Switcher

## Purpose

Replace Kubuntu/KDE Plasma launcher icons with custom images without editing
system files.

Phase 1 replaces Firefox's launcher icon with a Firefox-colored dog image.
Phase 2 will replace the Firefox launcher icon with the album art currently
playing in Spotify.

## Status

Active scaffold.

## License

This project is proprietary and all rights are reserved. Review
[LICENSE.md](./LICENSE.md) before copying, modifying, distributing, or submitting
this software anywhere.

## Architecture

The project is a TypeScript CLI. It uses user-local XDG paths so it can change
launcher metadata without touching `/usr/share/applications` or system icon
themes.

Phase 1 flow:

1. Find the system Firefox `.desktop` entry.
2. Copy it into `~/.local/share/applications`.
3. Store the custom icon under `~/.local/share/icons/codex-kubuntu-icon-switcher`.
4. Change the copied desktop entry's `Icon=` field to the custom image path.
5. Refresh KDE's service cache when `kbuildsycoca5` or `kbuildsycoca6` exists.

Phase 2 flow:

1. Read Spotify's current track metadata over MPRIS.
2. Resolve the `mpris:artUrl` album art path or URL.
3. Copy or download the art into the user-local icon folder.
4. Repoint Firefox's user-local desktop entry to that album art.
5. Refresh KDE's service cache.

## Commands

```bash
npm install
npm run lint
npm run typecheck
npm test
npm run build
npm audit
```

Phase 1 command after build:

```bash
node dist/src/cli.js phase1 --icon assets/firefox-dog.png
```

Dry run:

```bash
node dist/src/cli.js phase1 --icon assets/firefox-dog.png --dry-run
```

The easier commands build first, then run the CLI:

```bash
npm run phase1:dry-run
npm run phase1
```

Phase 2 commands:

```bash
npm run spotify-art
npm run phase2:dry-run
npm run phase2
```

`phase2` requires Spotify to be running and exposing current track metadata over
MPRIS. It reads the current `mpris:artUrl`, caches the image under
`~/.cache/kubuntu-icon-switcher`, then points the user-local Firefox desktop
entry at the cached album art. The CLI tries `qdbus6` first, then `qdbus`.

Firefox bridge commands:

```bash
npm run install-firefox-host
npm run package:firefox
npm run watch-firefox
npm run watch-firefox:dry-run
```

The Firefox bridge is the preferred path when Spotify MPRIS is unavailable.

Architecture:

1. The WebExtension in `extension/` runs on `https://open.spotify.com/*`.
2. Its content script detects Spotify artwork image URLs.
3. Its background script sends the latest artwork URL and playback state to the
   native messaging host `codex_kubuntu_icon_switcher`.
4. The native host writes the latest state file to
   `~/.cache/kubuntu-icon-switcher/firefox-artwork.json`.
5. `watch-firefox` watches that state file, caches the artwork image, and
   applies the same user-local Firefox desktop-entry icon override used by
   phase 1.

Setup:

```bash
npm run build
npm run install-firefox-host
npm run package:firefox
```

The package command creates:

```text
release/kubuntu-icon-switcher-artwork-bridge.xpi
```

For local development, load `extension/manifest.json` in Firefox through
`about:debugging` as a temporary add-on. For persistent install, install the XPI
in a Firefox build/profile that accepts unsigned local extensions, or submit the
XPI for Mozilla signing and install the signed build in standard Firefox.

Start the watcher:

```bash
npm run watch-firefox
```

Open Spotify Web Player in Firefox. When the extension emits new artwork, the
watcher updates the Firefox launcher icon to the cached image.

The watcher keeps the album-art icon only while Spotify Web Player reports that
music is playing. It restores the original Firefox desktop entry when playback
stops, when Firefox disconnects from the native host, or when the watcher exits
from `SIGINT` or `SIGTERM`.

## Testing

Unit tests cover desktop-entry parsing and icon override planning. End-to-end
testing should run only on demand against a disposable user profile or VM.

## Deployment

This project deploys as a local CLI. Deployment testing should be on demand:
create a temporary Linux/KDE test user or VM, run the CLI, verify the launcher
icon, and destroy the environment.

The runtime has near-zero idle cost because it only runs when the user invokes
the command. It can scale vertically by moving from one-shot CLI execution to a
long-running watcher with configurable polling, larger image cache, structured
logs, and stricter process supervision.

## Security

The CLI writes only to user-local XDG application and icon directories. It does
not require root permissions.

Run dependency vulnerability checks before release and on a scheduled cadence:

```bash
npm audit
```

## Notes

Panel launchers may need to be unpinned and pinned again if Plasma has cached a
specific desktop-entry identity. The first implementation avoids editing panel
configuration directly because that is more fragile across Plasma versions.
