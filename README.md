# Project Index

This workspace is the root for multiple independent TypeScript projects. Each
project lives under `projects/`, owns its own `README.md`, and may define its own
testing, build, deployment, and end-to-end workflow.

## Pages

- [Projects](./projects/README.md)
- [Architecture Principles](./docs/architecture.md)
- [TypeScript Standards](./docs/typescript-standards.md)
- [Security and Vulnerability Scanning](./docs/security.md)
- [Testing and Deployment](./docs/testing-deployment.md)
- [Project Template](./docs/project-template.md)

## Workspace Rules

- All application and library code is TypeScript.
- Every project documents its purpose, architecture, commands, and deployment
  model in its own `README.md`.
- Projects use clean-code-friendly ESLint and Prettier settings.
- Security checks are run regularly enough to catch up with newly disclosed
  known vulnerabilities.
- Deployment tests run on demand and keep idle cost near zero.
- Projects are designed to start small, then scale vertically in compute,
  storage, networking, observability, and operational controls.

## Current Project Outline

See [projects/README.md](./projects/README.md) for the project index. Each
project README owns its implementation notes, commands, testing details, release
steps, and planning history.
