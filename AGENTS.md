# Agent guidelines

Development guide for coding agents working on `@cellbytes/react-openseadragon`.
For what this project is and how to use it (the public API, components, hooks,
plugin mechanism), read [README.md](README.md) first; this file only covers how
to develop on it.

## What this repo is, in one line

A thin, declarative React wrapper around OpenSeadragon, published as an npm
package and consumed by the Cellbytes `app` client. It is a library, not an app.

## Toolchain

- Node (see [.nvmrc](.nvmrc)); npm for dependencies (`package-lock.json`).
- Build: Vite + `tsgo` (TypeScript native preview) for types.
- Lint/format: `oxlint` + `oxfmt` (configured in `.oxlintrc.json` / `.oxfmtrc.json`).
- Tests: Vitest (`vitest.setup.ts`); test utilities in `src/testUtils.tsx`.
- Git hooks: `lefthook` (installed via the `prepare` script) runs lint, format
  check, and typecheck on commit; `commitlint` enforces conventional commits.

## Common commands

| Command              | Purpose                                              |
| -------------------- | ---------------------------------------------------- |
| `npm install`        | Install dependencies (also installs lefthook hooks). |
| `npm run build`      | Build the library and emit type declarations.        |
| `npm run typecheck`  | Type-check with `tsgo --noEmit`.                     |
| `npm run lint`       | `oxlint .` + `oxfmt --check .`.                      |
| `npm run format`     | Auto-format with `oxfmt`.                            |
| `npm test`           | Run the Vitest suite once.                           |
| `npm run test:watch` | Vitest in watch mode.                                |

## Conventions

- Only use ASCII characters in code and comments. No em-dashes, en-dashes,
  unicode arrows, or other special characters.
- Keep the wrapper thin: do not hide OpenSeadragon's imperative API, keep it in
  sync with React state. New surface area belongs behind a hook or component
  that mirrors an existing pattern in `src/`.
- Prefer a functional style; avoid classes.

## Before finishing a change

Ensure the working tree has no lint, format, or type errors and tests pass:

```sh
npm run format && npm run lint && npm run typecheck && npm test
```

Commit messages must be conventional commits (enforced by commitlint); releases
are automated via semantic-release (`.releaserc.json`).
