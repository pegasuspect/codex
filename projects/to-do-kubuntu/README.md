# To-Do Kubuntu

A Kubuntu-native task program explored through ten deliberately different
iterations before implementation.

## Iteration 1 - Plasma Pinboard

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

## Iteration 2 - Apt Errand Ledger

Tasks are modeled like local package operations: wanted, installed, held,
removed, and purged.

### Pseudocode

```text
read tasks
map status to package-like state
print apt-style table
when user starts a task:
  move wanted to installed
when user abandons a task:
  move installed to removed
when user deletes a task:
  purge it from storage
```

### Summary

This replaces desktop geography with Debian package lifecycle language.

### Why It Is Unique

It borrows Kubuntu's underlying system vocabulary, so the list feels like a
personal `apt` database rather than a productivity app.

## Iteration 3 - Dolphin Breadcrumb Queue

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

## Iteration 4 - KRunner Sparks

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

## Iteration 5 - Konsole Scrollback Oath

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

## Iteration 6 - System Settings Matrix

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

## Iteration 7 - Notification Shade Treaty

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

## Iteration 8 - Muon Archive Garden

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

It treats deferred work like installed resources that can be packed and unpacked
without pretending everything belongs in today's list.

## Iteration 9 - Journalctl Promise Stream

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

## Iteration 10 - Todoctl for Kubuntu

The final design is `todoctl`: a Kubuntu-gated Unix-style task utility with two
faces. The CLI and terminal UI call the same command table. Tasks are stored as
append-only JSON events under the user's config directory. User verbs are
package-like: add, list, done, hold, drop, purge, and ui.

### Pseudocode

```text
start program
detect Kubuntu from /etc/os-release and KDE session variables
if not Kubuntu:
  print error and exit 1

load event log from XDG data path
fold events into current tasks
parse mode:
  if cli:
    run command handler
  if ui:
    open terminal screen
    send every key action through same command handler
write new event when state changes
print or render the same task projection
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
`apt`, `journalctl`, and `systemctl --user`. The same task engine powers both
interfaces, so the CLI and UI have matching functionality. The Kubuntu check is
part of startup rather than documentation, which makes the environment contract
real. The event log is simple, inspectable, and durable. The package verbs make
tasks feel installed, held, removed, or purged from a user's working system,
which embeds the idea in Kubuntu's Debian foundation.
