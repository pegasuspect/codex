# To-Do Kubuntu

## Purpose

A Kubuntu-native task program explored through ten deliberately different
iterations before implementation.

## Status

Implemented.

## Architecture

`todoctl` is a TypeScript Node CLI for Kubuntu. It refuses to run when
`/etc/os-release` and the desktop session do not look like Kubuntu with KDE
Plasma.

Tasks use auto-incrementing numeric IDs. Commands can target the number or the
case-insensitive beginning of the task title. Numeric input only matches a
numeric ID. Commas target more than one task for `start`, `hold`, `done`,
`drop`, and `purge`.

Held tasks can record why they are blocked with `todoctl hold <target> --reason
"waiting on parts"`. The reason appears only while the task is currently held.

When a task newly transitions to `done`, `todoctl` sends a desktop notification
through `notify-send`.

`todoctl status` writes a systemd user unit and starts it with
`systemctl --user restart todoctl-status.service`. The service runs a KDE
system tray icon with the current incomplete todo count drawn directly on the
icon, and refreshes as the task log changes. It registers a KDE
StatusNotifierItem over the user D-Bus session. `todoctl status install`
enables the systemd user service for future logins, and
`todoctl status uninstall` disables and removes that service. The tray icon
right-click menu also includes `Exit` and `Uninstall`; `Uninstall` removes the
generated unit, legacy autostart entry, PID file, icon cache files, and resets
the related systemd user service state.

Data is stored as append-only JSON lines at:

```text
$XDG_DATA_HOME/to-do-kubuntu/events.jsonl
```

or, when `XDG_DATA_HOME` is not set:

```text
~/.local/share/to-do-kubuntu/events.jsonl
```

## Commands

```text
npm install
npm run build
todoctl add "write service notes" --tag docs
todoctl list
todoctl start <target>
todoctl hold <target> --reason "waiting on parts"
todoctl done 1,2,write
todoctl status install
todoctl status
todoctl --help
```

Install zsh completion with:

```text
npm install
npm run build
npm link
mkdir -p ~/.local/share/zsh/site-functions
todoctl completion zsh > ~/.local/share/zsh/site-functions/_todoctl
```

Make sure `~/.local/share/zsh/site-functions` is in your zsh `fpath`, then
start a new shell or run `compinit` again. After that, pressing tab after
`todoctl` shows the available commands with descriptions.

If `todoctl` is an alias instead of a command installed on `PATH`, add an
explicit completion binding after the completion file is installed:

```text
autoload -Uz _todoctl
compdef _todoctl todoctl
```

## Testing

Run TypeScript verification:

```text
npm run typecheck
```

Run a build before manual CLI checks:

```text
npm run build
```

Manual testing should exercise add, list, start, hold, done, status install,
status, status uninstall, drop, and purge against a temporary `XDG_DATA_HOME`.

## Deployment

This project deploys as a local CLI and optional systemd user service for the
KDE tray status icon. Build with `npm run build`, install or link the package,
then run `todoctl status install` from a Kubuntu Plasma session when tray
integration is desired.

## Security

The CLI stores task data under the user's XDG data directory and writes only
user-level systemd service files for the tray status feature. It does not
require root permissions.

## Plan

<details>
<summary>Decision: Todoctl for Kubuntu</summary>

### Goal

Implement a Kubuntu-native task program that feels like a local Unix utility
instead of a generic productivity app.

### Decisions

- Gate startup on Kubuntu and KDE Plasma environment checks.
- Store task state as append-only JSON lines under the user's XDG data
  directory.
- Use package-like verbs: add, list, start, hold, done, drop, and purge.
- Add a KDE system tray status service through user-level systemd rather than a
  heavier Plasma widget.
- Keep earlier design iterations in collapsible records so the README documents
  the explored options without burying the implemented program.

### Changes

- Implemented the `todoctl` TypeScript Node CLI.
- Added shell completion output for zsh.
- Added desktop notifications for newly completed tasks.
- Added `todoctl status` service management and KDE tray status behavior.

### Verification

- Run `npm run typecheck`.
- Run `npm run build`.
- Manually exercise CLI state transitions against a temporary `XDG_DATA_HOME`.
- Test `todoctl status install`, `todoctl status`, and
  `todoctl status uninstall` from a Kubuntu Plasma session.

### Result

Implemented as the current project direction after the ten design iterations
below.

</details>

<details>
<summary>Iteration 1 - Plasma Pinboard</summary>

Tasks are not rows. They are small "plasmoids" grouped by the KDE surface they
belong to: panel, launcher, desktop, terminal, browser, and files.

### Pseudocode

```text
read tasks
detect current KDE surface
group tasks by surface
show the current surface first
when user completes a task:
  mark done
  log the surface that helped finish it
```

### Summary

This starts from Kubuntu's workspace metaphor instead of a generic inbox.

### Why It Is Unique

The task list behaves like a memory of the Plasma desktop, not a calendar,
Kanban board, or plain checklist.

</details>

<details>
<summary>Iteration 2 - Apt Errand Ledger</summary>

Tasks are modeled like local package operations: wanted, started, held,
removed, and purged.

### Pseudocode

```text
read tasks
map status to package-like state
print apt-style table
when user starts a task:
  move wanted to started
when user abandons a task:
  move started to removed
when user deletes a task:
  purge it from storage
```

### Summary

This replaces desktop geography with Debian package lifecycle language.

### Why It Is Unique

It borrows Kubuntu's underlying system vocabulary, so the list feels like a
personal `apt` database rather than a productivity app.

</details>

<details>
<summary>Iteration 3 - Dolphin Breadcrumb Queue</summary>

Every task has a path, such as `home/life/taxes/scan-receipts`; focus moves by
folder-like breadcrumbs.

### Pseudocode

```text
read tasks
split each task path by slash
build breadcrumb tree
show sibling tasks near the selected path
when user enters a segment:
  narrow view to that branch
when user completes branch:
  bubble progress upward
```

### Summary

This discards package states and turns work into navigable file-manager space.

### Why It Is Unique

It makes task organization feel like Dolphin traversal, where location is the
main interaction primitive.

</details>

<details>
<summary>Iteration 4 - KRunner Sparks</summary>

Tasks are tiny commands that can be searched, previewed, and fired like KRunner
matches.

### Pseudocode

```text
read tasks
index title, tags, command, and note
wait for query
rank fuzzy matches
show best action for each match
when user accepts a match:
  run the task action
  update task state
```

### Summary

This replaces path navigation with fast command discovery.

### Why It Is Unique

The app is less a list and more a local command palette for obligations.

</details>

<details>
<summary>Iteration 5 - Konsole Scrollback Oath</summary>

Tasks are treated like shell history lines with an oath: anything entered must
either be replayed, commented out, or resolved.

### Pseudocode

```text
read task log in append order
render each task as a command line
when user adds a task:
  append a new command
when user completes it:
  append a resolved comment
when user views history:
  replay the log into current state
```

### Summary

This moves from searchable actions to an append-only terminal history model.

### Why It Is Unique

The task database becomes an auditable shell scrollback instead of mutable app
state.

</details>

<details>
<summary>Iteration 6 - System Settings Matrix</summary>

Tasks are arranged like settings modules: appearance, network, hardware,
accounts, updates, and behavior.

### Pseudocode

```text
read tasks
load module names
assign each task to one module
show module health from open counts
when user opens a module:
  list its unresolved settings
when user toggles a task:
  recalculate module health
```

### Summary

This trades terminal history for a control-center model.

### Why It Is Unique

It treats personal work as a configurable operating environment, not a stream
of commands or files.

</details>

<details>
<summary>Iteration 7 - Notification Shade Treaty</summary>

Tasks expire into quiet, normal, or urgent lanes, mirroring desktop notification
pressure without using alarms as the main feature.

### Pseudocode

```text
read tasks
compare task age with chosen pressure
sort quiet below normal below urgent
when task is ignored:
  raise pressure one level
when task is completed:
  clear pressure history
```

### Summary

This drops module organization and focuses on attention pressure.

### Why It Is Unique

It uses the emotional rhythm of KDE notifications, but turns that rhythm into
task ordering instead of popups.

</details>

<details>
<summary>Iteration 8 - Muon Archive Garden</summary>

Tasks are bundled into named archives that can be unpacked for a day and packed
away again when inactive.

### Pseudocode

```text
read archives
read active task bundle
when user unpacks archive:
  merge archive tasks into active view
when user packs archive:
  move inactive tasks back into archive
when user lists tasks:
  show active bundle then packed bundles
```

### Summary

This abandons notification pressure for archive movement.

### Why It Is Unique

It treats deferred work like local resources that can be packed and unpacked
without pretending everything belongs in today's list.

</details>

<details>
<summary>Iteration 9 - Journalctl Promise Stream</summary>

Every task is an event. The app reads the event stream and prints current
truth, much like `journalctl` reads logs and filters units.

### Pseudocode

```text
read event lines
fold events into task records
when user adds a task:
  append task.created event
when user completes a task:
  append task.done event
when user filters:
  print matching folded records
```

### Summary

This changes archives into a log-native design with derived state.

### Why It Is Unique

The current list is never the source of truth; the promise stream is. That
makes it feel like a small user-space Unix service.

</details>

<details>
<summary>Iteration 10 - Todoctl for Kubuntu</summary>

The final design is `todoctl`: a Kubuntu-gated Unix-style task utility. Tasks
are stored as append-only JSON events under the user's config directory. User
verbs are package-like: add, list, done, hold, drop, and purge.

### Pseudocode

```text
start program
detect Kubuntu from /etc/os-release and KDE session variables
if not Kubuntu:
  print error and exit 1

load event log from XDG data path
fold events into current tasks
parse mode:
  run command handler
write new event when state changes
print the task projection
```

### Summary

This final iteration keeps the Unix-service flavor of iteration 9, borrows the
clear verbs from iteration 2, and uses the terminal-first discipline of
iteration 5. It leaves behind the designs that need heavier graphics, search
indexes, timers, or desktop widgets.

### Why It Is Unique

I will start implementing this because it answers the original request most
fully: it is unique without being decorative, Kubuntu-native without becoming a
fragile Plasma plugin, and Unix-like enough to feel as if it belongs beside
`apt`, `journalctl`, and `systemctl --user`. The Kubuntu check is part of
startup rather than documentation, which makes the environment contract real.
The event log is simple, inspectable, and durable. The package-like verbs make
tasks feel started, held, removed, or purged from a user's working system,
which embeds the idea in Kubuntu's Debian foundation.

</details>
