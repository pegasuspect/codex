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

Started the new project at
[projects/kubuntu-icon-switcher](./projects/kubuntu-icon-switcher/README.md).

What's in place:

- TypeScript CLI scaffold for replacing Firefox's KDE/Plasma launcher icon
  through user-local `.desktop` overrides.
- Phase 1 implementation path: copy Firefox desktop entry, replace `Icon=`,
  store custom icon under user-local XDG icon paths, refresh KDE service cache.
- Phase 2 starting point: Spotify MPRIS album-art reader via `qdbus`, with
  parsing tests.
- Generated phase-1 dog icon assets:
  - [firefox-dog.png](./projects/kubuntu-icon-switcher/assets/firefox-dog.png)
  - [firefox-dog-source.png](./projects/kubuntu-icon-switcher/assets/firefox-dog-source.png)
- Project docs, linting, Prettier, strict TypeScript, Vitest tests, audit
  script, and `.gitignore`.
- Updated [projects/README.md](./projects/README.md) with the new project entry.

Verified:

```bash
npm run typecheck
npm test
npm run lint
npm run build
npm audit
```

All passed. `npm audit` found `0 vulnerabilities`. One note: local Node is
`v18.19.1`, and one ESLint dependency warns it prefers newer Node, but the
installed toolchain still runs successfully.

## Firefox XPI Submission

Build the Firefox extension package for a new version submission:

```bash
cd projects/kubuntu-icon-switcher
npm run package:firefox
```

The XPI is written to:

```text
projects/kubuntu-icon-switcher/release/kubuntu-icon-switcher-artwork-bridge.xpi
```

If Mozilla asks for source code, create the source review archive from the
project directory:

```bash
mkdir -p release
zip -r -9 release/kubuntu-icon-switcher-source-review.zip \
  .prettierrc.json LICENSE.md README.md assets eslint.config.js extension extension-src \
  package-lock.json package.json src test tsconfig.extension.json tsconfig.json \
  -x "extension/dist/*" "dist/*" "node_modules/*" "release/*"
```

Upload the `.xpi` as the new extension version package and the source review zip
when Mozilla requests review source.
