# Starships of the Galaxy — CP23-C1 source-draft integrity and mutation invalidation preflight

## Scope and result

**15 of 15** CP23-B isolated, unarmed source-backed Actor drafts now have deterministic, reproducible structural drift anchors and a shared **fail-closed** pure comparator exposed through the vehicle evidence-authority module.

This is deliberately **not the completion of CP23-C authenticated source-to-Actor installation**. CP23-B drafts are not registered native Foundry compendiums; there is no authentic native source-to-world transaction to certify, no GM-owned durable world receipt, and no live Foundry V13 mutation-hook certification. Claiming an installed stock Actor now would contradict the actual evidence.

| Measure | CP23-C1 state |
|---|---:|
| Pinned CP23-B source draft identities | 15 |
| Deterministic structural parity anchors | 15 |
| Alteration coverage | Name, _id, type, image, all system keys, nested values, ordering, embedded Items |
| Source-to-world installations authenticated | 0 |
| Durable GM world receipts created | 0 |
| Physical mount certificates | 0 |
| Stock attack grants | 0 |
| Production pack/Actor writes | 0 |
| Pure/Modified installation integration | Pending |
| Live Foundry V13 E2E | Pending |

## Mechanism

- `scripts/domain/vehicles/vehicle-cp23c-source-integrity.js`: browser-safe, pure **full-field conservative** comparison. It accepts a vetted, externally versioned CP23-B proposal and an Actor-shaped candidate. It refuses unreviewed or armed drafts, unsafe shapes, type changes, source key spoofing, and unknown values. All statuses explicitly deny source installation, hydration, mechanical mount approval and attack trust.
- `scripts/domain/vehicles/vehicle-evidence-authority.js`: exposes the pure comparator in the existing source-evidence read facade. This does not change ActorEngine, the Pure/Modified pipeline or the existing production vehicle combat authority.
- `data/audits/vehicles/swse-sotg-cp23c-source-draft-parity-anchors.json`: 15 ordered source identity anchors, each tied to the immutable **CP23-B JSON Git blob** and its draft Actor identity. The UTF-16 FNV64 fingerprint is strictly a deterministic **drift indicator**; it is **not cryptographic authentication**, a signature, a player authorization or a trusted stock source identifier.
- `tools/audits/vehicles/build_sotg_cp23c_integrity_anchors.mjs`: independently regenerates the exact anchors from the pinned CP23-B artifact, with `--check` and `--write`; no production output.
- `tests/phase2c_cp23c_source_draft_integrity.test.mjs`: source parity, hostile metadata/field changes, actor identity edits, item insertion, nested configuration modifications, missing-key and invalid-type rejection, and source-byte drift testing.
- `.github/workflows/sotg-strict-certification-cp17.yml`: CP23-C1 reproducibility and negative tests appended to the existing CP17–CP23 regression suite.

## Invalidation policy — deliberately conservative

Any change to the Actor name, image, identity, `system` payload or owned Items immediately invalidates this pre-installation parity proof. For example, a change to hull HP or current shields also invalidates parity; this is **overinclusive but safe** for a source-draft parity test, and it should not become the eventual live system's whole gameplay-state invalidation policy.

The baseline is an isolated draft, **not an actual installed stock Actor**. A caller cannot introduce an editable `stockSourceEntryKey`, `mountId`, `stockAttackTrusted`, or authorization flag to turn parity into a trusted physical mount. Source-book attack rows remain evidence, not serialized installed weapon mounts.

## Next distinct CP23-C2 work

1. Stage independently approved, canonical native source compendiums (no production deployment), preserving CP23-B source identities through LevelDB compile/extract.
2. Build a governed, authenticated world import transaction that reads the exact registered native source document and verifies target identity at the end of ActorEngine's mutation/recompute lifecycle.
3. Persist **GM-owned, outside-Actor** provenance with transaction identity and source-version pins. Do not accept editable Actor flags as source authority.
4. Refine the conservative parity fingerprint into separate **stock configuration / gameplay state** domains; HP, consumables, shields, current crew assignments and ordinary state changes must be classified and tested rather than silently bypassed.
5. Invalidate trust both on Actor updates and embedded document/weapon replacements, Pure/Modified changes, pack-source version changes, actor reordering/clone and failed/rolled-back imports. Verify at read-time, not just via hooks.
6. Test Foundry V13 world replacement, concurrent readers/writers and client ownership; only then individually certify physical mount geometry/crew rights and consider enabling stock attack authority.

**No live source-to-world receipt or production stock attack authority is granted by CP23-C1.**
