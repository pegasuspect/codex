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
