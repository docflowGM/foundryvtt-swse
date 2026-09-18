# V2 Math Integrity Freeze — Mechanical Authority Ledger

Effective start of the Math Integrity Freeze. No feature expansion, no new
mechanics, no new automation until the domains below are certified per
Phase 14 of the freeze charter (see PR description).

## Freeze start record

| Field | Value |
|---|---|
| Starting branch | `claude/ability-schema-authority-migration` (PR #971) |
| Starting SHA | `91e37e37b90c41318ee8230c54096c5fb2899765` |
| Working tree state at start | Clean (no uncommitted changes) |
| New branch | `claude/v2-math-integrity-freeze` |
| Parent PR / base | #971 (`claude/ability-schema-authority-migration`), which is itself based on #970's commit history while targeting `main` |

This branch includes #970's and #971's commits until both merge, exactly
as #971 currently includes #970's. See #971's own PR description for the
verified-ancestry note; the same relationship applies here one level
deeper.

## Governing requirement

> If a player sees a number in a character sheet box, weapon card,
> tooltip, roll dialog, or chat result, we must be able to prove exactly
> why that number exists.

Target shape: `persisted inputs → ONE domain authority → contribution
ledger → derived/static result → sheet/tooltip/roll consumer`.

## Site classification key

- **A** — canonical calculation authority
- **B** — legitimate consumer
- **C** — legitimate contextual resolver
- **D** — duplicate/reimplemented formula
- **E** — compatibility fallback
- **F** — dead/unreachable
- **G** — UI reconstruction
- **H** — unknown / needs tracing

## Status

**Phase 0 (no-code-changes audit) — in progress.** This document is being
filled in as the audit proceeds. See the "First Report" section at the
bottom for the point-in-time summary required before any broad edits
begin.

---

## Domain: Abilities / Ability Modifiers

Covered by PR #971 (V2 Ability Schema Authority Migration) — see
`docs/audits/ability-schema-authority-migration-phase3-ledger.md` for the
full ledger. Canonical authority: `SchemaAdapters.getAbilityScore()` /
`getAbilityMod()` (`scripts/utils/schema-adapters.js`). All 33 known
Category C sites (reads that got the fallback order wrong) are fixed as
of that PR. This freeze does not duplicate that work — see this
document's later domains for places that still need to be confirmed
clean of legacy `system.abilities` reads specifically in the context of
BAB/defenses/skills/grapple/attack.

*(Remaining domains to be filled in as the Phase 0 audit completes.)*
