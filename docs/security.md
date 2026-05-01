# Security and Vulnerability Scanning

Projects should scan for known vulnerabilities at a pace that can catch up with
new disclosures without blocking normal development.

## Minimum Checks

- Run dependency audit checks before release.
- Run dependency audit checks in scheduled automation.
- Keep lockfiles committed for reproducible vulnerability reports.
- Treat critical and high vulnerabilities as release blockers unless a documented
  exception exists.
- Document accepted risks in the project `README.md` or a project security note.

## Suggested Cadence

- Pull request: lint, typecheck, tests, and dependency audit when practical.
- Scheduled: at least weekly dependency audit.
- Release: full dependency audit and build verification.

## Common Commands

Projects may choose their package manager, but the audit command must be
documented.

Examples:

```bash
npm audit
pnpm audit
yarn npm audit
```

