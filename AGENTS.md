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

## TypeScript language server for coding agents

Coding agents get tsgo diagnostics and navigation in-session, from a Claude Code
plugin this repo carries under `.claude/`. There is no devcontainer here to
register it on create: inside the unified dev-env container this repo's
TypeScript is already served by the plugin the `app` repo carries, and opening
it standalone means running these once by hand:

```sh
claude plugin marketplace add <repo root>/.claude
claude plugin install tsgo-lsp@cellbytes-react-openseadragon
```

`.claude/lsp/tsgo-bridge.py` is a vendored copy owned by the `dev-env` repo -
read its README for what the bridge does and why tsgo needs one. Change it
there and re-run that repo's `make sync-lsp-plugins`; do not edit the copy here.

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

Docs-only commits (nothing but Markdown or other documentation changed) carry
`[skip ci]` in the commit message body. There is nothing for CI to verify, and
the run would otherwise cut a release and bump the version for a change that
ships no new behaviour.

GitHub reads `[skip ci]` from the tip commit of a push and skips that whole
push, not just the one commit. Only use it when every commit being pushed is
docs-only: a docs commit stacked on top of code commits silently skips CI for
the code as well.
