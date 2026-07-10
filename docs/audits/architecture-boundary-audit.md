# Architecture Boundary Audit

**Tool:** `tools/check-architecture-boundaries.mjs`
**Status:** report-only (warning) — no CI/check-runner exists in this repo yet.

## Purpose

A simple, line/regex-based static scan that surfaces architecture-boundary
violations **not already covered** by `scripts/tools/mutation-lint.js`. It
complements — does not replace — mutation-lint. It gives one consolidated
picture of the four boundaries the hardening pass cares about.

## What it flags

| Category | Meaning | Canonical fix |
|----------|---------|---------------|
| `direct-actor-mutation` | `actor.update()` / `*EmbeddedDocuments()` outside the mutation gateway | Route through `ActorEngine` |
| `derived-write` | Write to `system.derived.*` (quoted payload key or `.system.derived.x =`) outside DerivedCalculator / ActorEngine derived-apply | `system.derived.*` is owned by `DerivedCalculator` |
| `broad-system-payload` | `system:` object literal handed to an `.update(`/`.apply(` call outside adoption/migration/finalization/normalization | Prefer leaf dot-path updates |
| `progression-registry-bypass` | `scripts/engine/progression/**` importing a low-level content registry directly | Read via `ProgressionContentAuthority` |

## Allowlists

Each category has a narrow, inline-documented allowlist in the script. Notable:

- **`derived-write`** intentionally does **not** allowlist `ModifierEngine`, which
  the ActorEngine responsibility audit documents as impure — surfacing it is the point.
- **`progression-registry-bypass`** exempts the seam itself
  (`progression-content-authority.js`), the documented legacy adapter
  (`class-data-loader.js`, `class-resolution.js`), and any registry/registrar file.

## Usage

```bash
node tools/check-architecture-boundaries.mjs                     # report-only
node tools/check-architecture-boundaries.mjs --strict            # exit 1 on findings
node tools/check-architecture-boundaries.mjs --json              # machine output
node tools/check-architecture-boundaries.mjs --category=derived-write
```

## Suppression

Add `// @architecture-exception` (or the existing `// @mutation-exception`) on the
line to exempt an intentional, reviewed case.

## Baseline (2026-07-09)

| Category | Count |
|----------|-------|
| `direct-actor-mutation` | 6 |
| `progression-registry-bypass` | 28 |
| `derived-write` | 0 |
| `broad-system-payload` | 0 |

The `progression-registry-bypass` findings are informational: they mark
progression consumers that still read registries directly rather than through
`ProgressionContentAuthority`. These are migration candidates, not runtime bugs.
The `direct-actor-mutation` findings are the higher-signal set (legacy pipelines,
a few feat/normalization and app call sites).
