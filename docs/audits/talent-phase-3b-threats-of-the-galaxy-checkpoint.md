# Talent Canonicalization Phase 3B — Threats of the Galaxy WIP Checkpoint

**Status:** IN PROGRESS  
**Date:** 2026-09-28  
**Branch:** `audit/talent-phase-3a-canonical-authority`  
**Starting HEAD:** `dfe4340336af025ec90c08fe099dcc89d9237b45`  
**Production mutation:** NONE

## Purpose

Checkpoint the start of the Threats of the Galaxy Phase 3B reconciliation so work can resume from a pushed state.

## Certified Phase 2 scope

- Sourcebook: `Threats of the Galaxy`
- Certified publication claims: **11**
- Origin publication claims: **10**
- Expansion publication claims: **1**
- Repository records mapped in Phase 2: **11**
- Missing Phase 2 repository records: **0**

## Current Phase 3B finding

All 11 certified publication claims currently have an existing production record candidate from the Phase 2 mapping. No CREATE disposition has been certified at this checkpoint.

The book is small enough that the remaining work is primarily:

- verify canonical identity against production tree membership;
- compare canonical rules text against current production `system.benefit` and `system.description`;
- compare printed prerequisites;
- populate canonical `system.summary`, `system.source`, and `system.page`;
- distinguish content repair from metadata-only repair;
- certify exact Phase 3B dispositions;
- emit the deterministic Threats manifest and Claude execution instructions.

## Known Phase 2 discrepancy types in this book

The Phase 2 certified dataset already identifies examples of:

- incomplete descriptions/mechanics;
- shorthand source-aligned text;
- mechanics errors;
- prerequisite errors;
- display-name normalization for Teräs Käsi records.

These are evidence only. They are not yet final Phase 3B mutation dispositions.

## Guardrails

- Identity remains `canonicalTreeKey + talent name`; never name alone.
- Preserve existing production IDs when an identity is confirmed.
- Do not create new records unless Phase 3B identity reconciliation proves a distinct canonical identity is missing.
- Preserve runtime/automation metadata unless a later certified repair explicitly targets it.
- Do not mutate `packs/talents.db` or `packs/talent_trees.db` during Phase 3B.

## Next step

Finish the 11-record production reconciliation, generate the deterministic Threats Phase 3B manifest/checker, update the Claude handoff, and push the completed book checkpoint before moving to the next-smallest sourcebook.
