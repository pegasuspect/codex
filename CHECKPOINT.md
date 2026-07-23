# Workspace Checkpoint

Use this file at the start of a new chat session to quickly rebuild context for
this workspace.

## Workspace State

This repository is a root workspace for independent TypeScript projects under
`projects/`. The workspace has been organized, documented, pushed to GitHub, and
cleaned up so each project owns its own detailed README.

Current projects:

- `projects/kubuntu-icon-switcher`
- `projects/print-page-plugin-for-brave-based-on-list-of-links`
- `projects/to-do-kubuntu`

Root navigation and standards:

- `README.md` - root workspace index and rules.
- `projects/README.md` - concise project index.
- `docs/architecture.md` - architecture principles.
- `docs/typescript-standards.md` - TypeScript standards.
- `docs/security.md` - security and vulnerability scanning guidance.
- `docs/testing-deployment.md` - testing and deployment guidance.
- `docs/project-template.md` - required project README shape.

## Documentation Direction

The root README and project index should stay concise. Project-specific
implementation details, commands, testing notes, release steps, and planning
history belong in each project's own `README.md`.

Each project README should follow this section order:

1. `Purpose`
2. `Status`
3. `Architecture`
4. `Commands`
5. `Testing`
6. `Deployment`
7. `Security`
8. `Plan`

The `Plan` section is used for design history, iterations, implementation
phases, and major decisions. Long planning records should use HTML `<details>`
and `<summary>` blocks with decision-oriented subsections such as `Goal`,
`Decisions`, `Changes`, `Verification`, and `Result`.

## Completed Project Summaries

### Kubuntu Icon Switcher

Kubuntu Icon Switcher is a TypeScript Node CLI, Firefox WebExtension bridge, and
KDE user-session integration for changing Firefox's KDE/Plasma launcher icon
without editing system files.

Implemented behavior includes:

- User-local `.desktop` overrides for Firefox launcher icons.
- Custom Firefox dog icon phase.
- Spotify MPRIS album-art mode.
- Firefox WebExtension artwork bridge for Spotify Web Player.
- Native messaging host and watcher for applying or restoring album art.
- User-level systemd service installation for the watcher.
- Firefox XPI packaging and Mozilla source-review archive documentation.

Important docs:

- `projects/kubuntu-icon-switcher/README.md`
- `projects/kubuntu-icon-switcher/SERVICE.md`
- `projects/kubuntu-icon-switcher/LICENSE.md`

Common checks from that project:

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm audit
```

### Link Batch Downloader

Link Batch Downloader is a Brave/Chromium Manifest V3 extension that accepts a
pasted list of URLs and saves each valid page as a PDF under a grouped
`~/Downloads/<most-frequent-host>/` folder.

Implemented behavior includes:

- Popup UI with link input.
- Parsing for comma, newline, whitespace, or mixed separators.
- Valid and invalid entry reporting.
- Background tab loading and Chromium `Page.printToPDF`.
- Grouped download folder naming from the most frequent URL host.
- Documentation of Brave download prompt and debugger permission behavior.

Important docs:

- `projects/print-page-plugin-for-brave-based-on-list-of-links/README.md`
- `projects/print-page-plugin-for-brave-based-on-list-of-links/plan.md`

Common checks from that project:

```bash
node --check popup.js
node -e "JSON.parse(require('fs').readFileSync('manifest.json','utf8')); console.log('manifest ok')"
```

### To-Do Kubuntu

To-Do Kubuntu is a Kubuntu-gated TypeScript Node CLI named `todoctl`. It stores
tasks as append-only JSON events and exposes package-like task verbs.

Implemented behavior includes:

- Kubuntu and KDE Plasma environment checks.
- Append-only JSONL event storage under the user's XDG data directory.
- Task commands for add, list, start, hold, done, drop, and purge.
- Numeric and title-prefix task targeting.
- Zsh completion generation.
- Desktop notifications for newly completed tasks.
- KDE StatusNotifierItem tray status service managed through systemd user units.

Important docs:

- `projects/to-do-kubuntu/README.md`

Common checks from that project:

```bash
npm run typecheck
npm run build
```

## Current Repository History

Recent workspace-level commits include:

- `Simplification` - removed project-specific details from root and index docs.
- `Update project documentation template` - added the project README template
  `Plan` section and normalized project README formats.
- `add initial prompt` - earlier workspace and project work.

The GitHub remote is:

```text
https://github.com/pegasuspect/codex.git
```

## Start Here Next Time

Begin with:

```bash
git status --short --branch
git log --oneline -8
```

Then read:

1. `README.md`
2. `projects/README.md`
3. `docs/project-template.md`
4. The specific project README for the task at hand.

The normal command sandbox may fail in this environment with a `bwrap` loopback
setup error. If that happens, rerun local inspection or project commands with
the approved escalated execution flow.
