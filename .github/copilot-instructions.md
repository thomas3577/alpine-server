# Copilot Instructions for alpine-server

## Project Context

- This is a Deno + TypeScript library for running secure Oak-based Alpine.js servers.
- Keep changes small, composable, and production-safe.
- Prioritize backward compatibility for the public API exported from `mod.ts`.

## Tech Stack and Tooling

- Runtime: Deno
- Language: TypeScript (ES module style)
- HTTP framework: Oak (`@oak/oak`)
- Tests: Deno built-in test runner (`Deno.test`)
- Formatting/Linting: `deno fmt`, `deno lint`

Use these project tasks:

- `deno task check` for format/lint checks
- `deno task test` for tests

## Repository Structure

- `src/`: main runtime library code
- `src/middleware/`: reusable Oak middleware
- `src/routes/`: built-in routes
- `src/services/`: service-level logic (e.g. vendor cache, file watch)
- `cli/`: scaffolding/create commands and parser logic
- `docs/`: user-facing docs
- `mod.ts`: public exports

When adding features, place code in the appropriate layer instead of growing unrelated files.

## Coding Conventions

- Follow existing style in this repo:
- 2-space indentation
- single quotes
- semicolons
- concise but meaningful JSDoc on exported APIs
- Prefer explicit types for public interfaces and return types where clarity matters.
- Keep helper functions focused and side-effect aware.
- Avoid introducing non-ASCII characters unless already used in the file.

## Configuration and Safety Rules

- Respect runtime configuration defaults from `src/config.ts`.
- Do not allow path traversal or escaping `Deno.cwd()` for static file serving.
- Preserve secure defaults in headers and error handling.
- Never relax CSP/HSTS/security headers without explicit justification in code comments and docs.
- Keep production behavior safe by default; dev-only behavior must be guarded by config flags.

## Middleware and Routing Expectations

- Maintain the established middleware order in `src/app.ts` unless there is a strong reason to change it.
- User middleware should still run before user routes.
- Internal routes (updater/static/sse/views) should remain predictable and non-breaking.

## Testing Expectations

- Add or update tests for every behavior change.
- Place tests next to related modules using `*.test.ts`.
- Follow existing test style (`Deno.test` with `t.step` where useful).
- Cover both success and failure/edge cases, especially for:
- config parsing and defaults
- path and file safety
- middleware error handling
- security header behavior

## Dependencies and Imports

- Prefer existing `deno.json` imports.
- Add new dependencies only when necessary and keep them minimal.
- Use `@std/*` modules where suitable before introducing third-party packages.

## Documentation and Public API

- If behavior or configuration changes, update:
- `docs/USAGE.md` for usage-level changes
- `docs/CONFIGURATION.md` for config surface changes
- `README.md` for important public-facing changes
- If exports change, update `mod.ts` and tests accordingly.

## Change Quality Checklist

Before finalizing a change:

1. Run `deno task check`.
2. Run `deno task test`.
3. Ensure new/changed behavior has tests.
4. Ensure docs are updated when user-facing behavior changed.
5. Keep diffs focused and avoid unrelated refactors.
