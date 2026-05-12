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
