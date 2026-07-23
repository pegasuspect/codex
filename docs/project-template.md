# Project Template

Use this as the starting point for each project `README.md`.

~~~markdown
# Project Name

## Purpose

Describe what this project does and who it serves.

## Status

Planned | Active | Paused | Archived

## Architecture

Describe the main modules, runtime, external dependencies, and data flow.

## Commands

```bash
npm install
npm run lint
npm run typecheck
npm test
npm run build
npm audit
```

## Testing

Describe unit, integration, end-to-end, and deployment tests.

## Deployment

Describe the deployment target, on-demand test environment, teardown process, and
vertical scaling path.

## Security

Describe vulnerability scanning cadence, secrets handling, and known accepted
risks.

## Plan

Use this section for design history, iterations, implementation phases, and
major decisions. Keep long planning records in collapsible blocks so the README
stays useful as project documentation.

Each planning block should use this shape:

```html
<details>
<summary>Phase 1: Short Title</summary>

### Goal

Describe the intended outcome.

### Decisions

- List meaningful product, architecture, security, and testing decisions.
- Include rejected paths when they explain the current implementation.

### Changes

- List the user-visible or code-level changes.

### Verification

- List the checks, commands, manual tests, or review steps used.

### Result

Summarize whether the phase is planned, implemented, tested, approved, or
deferred.

</details>
```
~~~
