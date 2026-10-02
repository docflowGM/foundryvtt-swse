# Feat Phase 0 → Phase 1 Handoff

Checkpoints: audit persistence (`2a9f244`) followed by an authority-metadata correction. Audit artifacts only. No production feat data, domain guard, validity registry, prerequisite authority, or runtime file was modified.

## Persisted artifacts

| File | Role |
| --- | --- |
| `data/audits/feat-phase-0-canonical-census.json` | Machine-readable Phase 0 authority (`1.1-phase0-authority-corrected-after-persistence-readback`; initially persisted as `1.0-phase0-complete-canonical-census-frozen`). |
| `docs/audits/feat-phase-0-canonical-census.md` | Human-readable Phase 0 authority (v1.1 header and correction section applied). |
| `docs/audits/feat-phase-0-phase-1-handoff.md` | This note. |

Baseline: `4159f29f83b45c83a8b3c0eaecd36466614b0f8d` (`audit/feat-phase-0-enumeration` pointed here before this checkpoint).

## Frozen acceptance values (verified against the persisted JSON)

- Canonical feat identities: 353 (per-subphase primary identities sum to 353)
- Unique normalized display names: 352
- Full feat publications: 355; confirmed full reprints: 2 (Tech Specialist, Echani Training)
- Current repo feat records: 390 = 351 canonical represented + 6 implementation derivatives + 33 noncanonical/wrong-domain/legacy
- Missing canonical identities: Recall (TFU p.35), Staggering Attack (Scum and Villainy p.24)
- Wiki seed rows: 285 (per-book counts match); TXT candidate claims: 360 (per-book counts match)
- `repoOutsideCanonicalCorpus`: 39 entries, all 39 IDs resolve in `data/feat-catalog.json`

## Authority defects found at persistence readback — all RESOLVED (authority v1.1)

Applied in the authority-correction checkpoint (commit following `2a9f244`). The frozen census and every source ruling are unchanged.

1. **RESOLVED — truncated repo IDs.** Subphase `0A` now carries Extra Rage `c01f64239af7705d` and Pin `c238f3f722689a3a` (previously one hex digit short).
2. **RESOLVED — stale MD header.** Header now reads `Version: 1.1 — Phase 0 complete, persistence-readback corrections applied` / `Status: PHASE 0 COMPLETE — canonical census frozen; authority corrected after persistence readback`. The provisional 360-claim parser count is labelled historical, superseded by the frozen closeout.
3. **RESOLVED — name-only records.** All 48 Rebellion Era Species Feats (`0J`) and all 20 Galaxy at War Martial Arts/Team records (`0K`) now carry their unique catalog `repoId`. Every canonical record in the authority now has a `repoId` except the two genuinely missing identities (Recall — TFU p.35; Staggering Attack — Scum and Villainy p.24).
4. **RESOLVED — mojibake.** `Flèche`, `Teräs Käsi Training` and the “Long Haft Form” cross-reference note are normalized. Phase 1A should still define a normalized identity key before using display names for matching.

JSON `version`: `1.1-phase0-authority-corrected-after-persistence-readback`; the correction ledger is stored under `authorityCorrections`.

## Next (not started here)

- 1A — canonical identity manifest and stable-ID design (new IDs for Recall and Scum Staggering Attack)
- 1B — deterministic repository reconciliation design (39 outside-corpus dispositions, domain-guard redesign)
- 1C — scope/tier/family structural audit (including the six Weapon Proficiency derivatives)
