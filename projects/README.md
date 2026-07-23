# Projects

This folder is the index of project workspaces.

Each project should use this shape:

```text
projects/
  project-name/
    README.md
    package.json
    src/
    test/
```

## Index

- [Kubuntu Icon Switcher](./kubuntu-icon-switcher/README.md) - user-local
  KDE/Plasma launcher icon replacement for Firefox, with Spotify album-art
  modes. Status: active scaffold. Runtime: TypeScript Node CLI, Firefox
  WebExtension, and KDE user session.
- [Link Batch Downloader](./print-page-plugin-for-brave-based-on-list-of-links/README.md) -
  Brave extension that turns a pasted list of links into grouped PDF downloads.
  Status: implemented and documented. Runtime: Brave/Chromium Manifest V3
  extension.
- [To-Do Kubuntu](./to-do-kubuntu/README.md) - Kubuntu-native `todoctl`
  task CLI with append-only JSON event storage, package-like task states, and a
  KDE system tray status service. Status: implemented. Runtime: TypeScript Node
  CLI and KDE/systemd user session.

When a project is added, include:

- Name and short purpose.
- Link to the project `README.md`.
- Current status.
- Primary runtime or deployment target.
