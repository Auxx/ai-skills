# `init-docs`: bootstrap project documentation

> Status: **Draft**

## Intent

`@hexmode/ai-skills` holds the AI-agent tooling that is reused across personal
projects. The first piece is a CLI, run through `npx`, that performs named
operations. The first operation, `init-docs`, gives a new project the
documentation layout proven in `front-burner` (product, requirements and
architecture docs, plus a `CLAUDE.md` block telling agents where the docs are
and how their IDs work). The output contains no product names and no real
content: it is a starting point.

## Goals

- `npx @hexmode/ai-skills init-docs` run in a project root creates:
  - `docs/product/glossary.md`, `vision.md`, `mvp.md`
  - `docs/requirements/.gitkeep`
  - `docs/architecture/decisions.md`, `non-functional.md`, `overview.md`
  - a block in `CLAUDE.md` between `<!-- @hexmode/ai-skills:start -->` and
    `<!-- @hexmode/ai-skills:end -->`
- Existing files under `docs/` are never overwritten; they are skipped.
- Every created doc starts with `> Status: **Draft**`.
- Running it again is safe: docs are skipped, the `CLAUDE.md` block is
  replaced in place.
- Templates are plain files in this repository, edited without touching code,
  and organised per operation so later operations can add their own.

## Non-goals

- Other operations (only the structure for adding them).
- Publishing to npm (the package will be published later as
  `@hexmode/ai-skills`).
- Templates for individual requirement files.
- Flags such as `--force`, `--dry-run` or a target directory.

## Constraints

- Plain Node, ES modules in `.mjs` files, no runtime dependencies.
- Unit tests with `vitest`, installed as the first step of the work.
- Templates are product-agnostic and keep front-burner's conventions: ID
  schemes `REQ-<AREA>-NNN` / `AC-<AREA>-NNN.N`, `D-x.y`, `NF-x.y`, `A-x.y`, and
  the _(My call.)_ marker.

## Approaches

- **A. Template folder mirrors the output (chosen).** Each operation owns
  `templates/<operation>/files/`, laid out exactly as it lands in the project;
  everything under it is copied, existing files skipped. Adding a template needs
  no code change. Trade-off: what gets created is visible only in the folder.
- **B. Manifest in code.** Each operation lists `{ from, to }` pairs over a flat
  template folder. More explicit, allows renaming, but every template change
  needs a code edit and the list can drift from the files.

Picked A because templates are meant to be edited in this repository without
touching code.

## Design

### Layout

```
bin/ai-skills.mjs                 CLI entry: dispatches by command name
src/operations/init-docs.mjs      the operation: initDocs(projectDir) → report
src/lib/copy-templates.mjs        copy a template tree, skipping existing files
src/lib/managed-block.mjs         insert or replace a marked block in a file
templates/init-docs/
  files/                          mirrored into the project root
    docs/product/{glossary,vision,mvp}.md
    docs/requirements/.gitkeep
    docs/architecture/{decisions,non-functional,overview}.md
  claude-block.md                 content placed between the CLAUDE.md markers
test/…                            vitest unit tests
```

### CLI

- `ai-skills <command>`; commands map to `src/operations/<command>.mjs`.
- No command, `--help` or `-h`: print usage listing commands, exit 0. Unknown
  command: usage on stderr, exit 1.
- Works on the current directory.
- Prints one line per path: `created`, `skipped (exists)`, and for `CLAUDE.md`
  `created`, `updated` or `unchanged`.

### `copy-templates`

- Walks the template tree recursively (dotfiles included, so `.gitkeep`
  copies), creates missing directories, copies files that do not exist, skips
  those that do. Returns the list of created and skipped paths.

### `managed-block`

- Markers are derived from the package name: `<!-- @hexmode/ai-skills:start -->`
  / `<!-- @hexmode/ai-skills:end -->`.
- File missing: create it with only the block.
- File without the block: append the block at the end, separated by one blank
  line.
- File with the block: replace everything between and including the markers;
  the rest of the file is kept byte for byte. If the content is identical,
  report `unchanged` and do not write.
- A start marker without an end marker (or vice versa, or more than one
  block): fail with a clear error and leave the file untouched.

### Templates

Each doc template mirrors the structure of its front-burner counterpart, with
section headings and short HTML-comment guidance on what goes in each section,
and no real content:

- Title without a product name (`# Glossary`, `# Product vision`, `# MVP`,
  `# Architecture decisions`, `# Non-functional requirements`,
  `# Architecture overview`), then `> Status: **Draft**`.
- An intro paragraph saying what the document is for, its ID scheme where it
  has one, and the _(My call.)_ convention where front-burner uses it.
- Skeleton sections, for example: vision: Problem, Users, Goals, Non-goals,
  Open questions; mvp: Purpose, Target user, Goal (with exit criteria), In
  scope, Out of scope, Order of work, Implementation status, Risks, Open
  questions; decisions: an example `## D-1: <title>` stub with `D-1.1`;
  non-functional: `## NF-1: <area>` stub, Consequences for the architecture,
  Open questions; overview: Documents table, `## A-1: Context`, Technology
  stack, Runtime view, Consequences for the requirements, Open questions;
  glossary: a group heading with one example term in the `**Term**` / `: definition`
  form, Open questions.

`claude-block.md` is front-burner's "Always-relevant context" and "Knowledge
base" sections, made generic: `@docs/product/glossary.md` import, then the list
of documents with one-line descriptions and their ID schemes.

### package.json

- `bin: { "ai-skills": "bin/ai-skills.mjs" }`, `files: ["bin", "src",
  "templates"]`, `engines.node: ">=24.22.1"` (the version pinned in `mise.toml`), `test` script runs `vitest run`; the
  placeholder `main: index.js` is removed.

### Tests

- `copy-templates` and `managed-block` against temporary directories, covering
  each case above.
- `initDocs` end to end on an empty directory, on a partly populated one, and
  run twice.
- One CLI smoke test via `child_process` for dispatch, usage and the unknown
  command exit code.

## Calls made while writing (not explicitly discussed)

- Command name `init-docs`, binary name `ai-skills`.
- Block appended at the end of an existing `CLAUDE.md`; malformed markers fail
  instead of guessing.
- No flags in the first version; current directory only.
- Node 24.22.1 (the version in `mise.toml`) as the minimum version.

## Left to the builder

- Exact wording of template guidance and of `claude-block.md`, within the
  structure above.
- Internal function signatures and output formatting details.
