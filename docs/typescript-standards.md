# TypeScript Standards

All project source code should be TypeScript.

## Defaults

- Use strict TypeScript settings.
- Prefer explicit domain types over broad `any` or loosely shaped objects.
- Keep functions small and named by intent.
- Keep side effects at the edges of a module.
- Use async boundaries deliberately and handle failures explicitly.
- Prefer dependency injection for external services and clocks in testable code.

## Formatting

Use Prettier for formatting and ESLint for correctness and maintainability.

Recommended baseline:

```json
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100
}
```

## Linting

Recommended ESLint baseline:

- `@eslint/js`
- `typescript-eslint`
- `eslint-config-prettier`

Each project may add framework-specific rules, but should keep the shared goals:

- No unused code.
- No implicit `any`.
- No floating promises.
- No unsafe assignment or member access where type information is available.
- Clear import ordering if the project grows enough to need it.

