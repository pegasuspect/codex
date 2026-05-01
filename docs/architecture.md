# Architecture Principles

Projects in this workspace should be small at rest and scalable under load.

## Baseline

- Keep each project independently understandable and runnable.
- Prefer simple TypeScript modules with explicit boundaries.
- Put shared behavior behind stable interfaces before reusing it across projects.
- Avoid idle infrastructure cost by default.
- Make on-demand environments reproducible from documented commands.

## Vertical Scalability

Each project should be designed so these dimensions can grow without a rewrite:

- Compute: larger instances, more memory, higher CPU limits, or faster runtimes.
- Storage: higher IOPS, larger volumes, managed backups, and retention controls.
- Database: larger tiers, connection pooling, indexes, and migration discipline.
- Queueing: higher concurrency, larger workers, and dead-letter handling.
- Observability: logs, traces, metrics, alerts, and audit records.
- Security: secret rotation, dependency scanning, least privilege, and patch flow.

Horizontal scaling can be added when the project actually needs it, but the first
architecture target is a low-cost system that can be run only during tests or
real use.

