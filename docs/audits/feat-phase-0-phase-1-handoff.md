# Feat Phase 0 → Phase 1 Handoff

Checkpoint: audit persistence only. No production feat data, domain guard, validity registry, prerequisite authority, or runtime file was modified.

## Persisted artifacts

| File | Role |
| --- | --- |
| `data/audits/feat-phase-0-canonical-census.json` | Machine-readable Phase 0 authority (`1.0-phase0-complete-canonical-census-frozen`). Persisted verbatim from the owner-produced file. |
| `docs/audits/feat-phase-0-canonical-census.md` | Human-readable Phase 0 authority. Persisted verbatim from the owner-produced file. |
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

## Observations for the owner (authority files were NOT altered)

1. **Two truncated repo IDs in the JSON.** In subphase `0A`, `Extra Rage` is recorded as `c01f64239af7705` and `Pin` as `c238f3f722689a3`. The catalog IDs are `c01f64239af7705d` and `c238f3f722689a3a` (final hex digit dropped in the authority). Each name resolves to exactly one catalog record, so identity is unambiguous. Phase 1A should key on the catalog ID, not the truncated string.
2. **MD header is stale.** The MD still reads `Version: 0.12 — Phase 0K Galaxy at War Certified` / `Status: ACTIVE rolling plan`, although its body contains the 0L–0O and 0-QA sections and the JSON reports `1.0`. The JSON `version`/`status` is authoritative.
3. **Species/Martial Arts/Team records carry no `repoId`.** Subphases `0J` (48 Species Feats) and `0K` (20 Martial Arts/Team feats plus Echani Training lookup) resolve by exact name; Phase 1A/1B should resolve and pin their IDs from the catalog.
4. **Mojibake preserved verbatim.** `FlÃ¨che`, `TerÃ¤s KÃ¤si Training`, and the `âLong Haft Formâ` note are reproduced exactly as supplied. Phase 1A should define a normalized identity key before using these names.

## Next (not started here)

- 1A — canonical identity manifest and stable-ID design (new IDs for Recall and Scum Staggering Attack)
- 1B — deterministic repository reconciliation design (39 outside-corpus dispositions, domain-guard redesign)
- 1C — scope/tier/family structural audit (including the six Weapon Proficiency derivatives)
