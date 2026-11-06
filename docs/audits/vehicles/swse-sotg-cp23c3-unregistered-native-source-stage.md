# Starships of the Galaxy — CP23-C3 staged native source pack (unregistered)

## Status

The repository now contains **15 deterministic, unarmed, source-backed Actor JSON staging records** with stable source IDs and Git-pinned staging file bytes. These are deliberately **not registered native compendiums** or released playable actors.

The owner-approved CP21 printed conflicts and 15 effective rule interpretations continue to be projected through the single CP22 authority path; CP23-B provides the scalar proposals and original weapon evidence. CP23-C3 serializes those proposal actors verbatim into an isolated source staging directory with Foundry's `_key` namespace for native LevelDB compilation.

This checkpoint **does not issue GM-controlled provenance receipts, authenticate world installations, change production packs, or certify any physical weapon mount**. The existing zero-entry stock attack trust registry remains unchanged.

| Gate | Current state |
|---|---:|
| Owner-approved CP21 identities | 15/15 |
| Staged source Actor JSON documents | 15/15 |
| Pinned per-document native source bytes | 15/15 |
| Old legacy vehicle pack entries modified | 0 |
| Source pack registered in `system.json` | No |
| Source-pack production release | No |
| Verified in-world installations | 0 |
| Durable outside-Actor GM receipts | 0 |
| Physically certified installed weapons | 0 |
| Trusted stock attack groups | 0 |

## Staged source documents

| Order | Publication record | Draft/native ID | Page | Source weapon attack rows (not installed) |
|---:|---|---|---:|---:|
| 1 | Advanced V-19 Torrent Starfighter | `sotgcp23b0000001` | 59 | 2 |
| 2 | Recusant-class Light Destroyer | `sotgcp23b0000002` | 72 | 5 |
| 3 | Kuat Drive Yards Pellaeon-class Star Destroyer | `sotgcp23b0000003` | 99 | 5 |
| 4 | Immobilizer 418 Interdictor-class Heavy Cruiser | `sotgcp23b0000004` | 100 | 2 |
| 5 | Junker TYE-wing | `sotgcp23b0000005` | 104 | 1 |
| 6 | Koensayr Manufacturing BTL-58 K-wing | `sotgcp23b0000006` | 105 | 5 |
| 7 | Sienar Technologies Marauder Corvette | `sotgcp23b0000007` | 110 | 2 |
| 8 | Mon Calamari Star Defender | `sotgcp23b0000008` | 116 | 6 |
| 9 | Eclipse | `sotgcp23b0000009` | 139 | 6 |
| 10 | Theta-class Shuttle | `sotgcp23b0000010` | 141 | 2 |
| 11 | Sienar Fleet Systems TIE Bomber | `sotgcp23b0000011` | 143 | 2 |
| 12 | Incom T-65XJ3 X-wing Starfighter | `sotgcp23b0000012` | 152 | 2 |
| 13 | Incom/Subpro ARC-170 Starfighter | `sotgcp23b0000013` | 61 | 3 |
| 14 | Alliance A-wing Starfighter | `sotgcp23b0000014` | 63 | 3 |
| 15 | Baudo-class Star Yacht | `sotgcp23b0000015` | 65 | 1 |

Every file is a single JSON source Actor document with `_id`, `name`, `type: vehicle`, `img`, an owner-adjudicated `system` projection and `_key`. All `system.weapons` arrays are empty. Printed attack rows remain separately in the CP23-B audit manifest, not installed weapon Item records. No editable `stockSourceEntryKey` is inserted.

## Implementation

- `data/audits/vehicles/sotg-cp23c3-native-source-stage/`: fifteen individual stable-ID native source records, **audit staging only**.
- `data/audits/vehicles/swse-sotg-cp23c3-unregistered-native-stage.json`: full source-to-staged-document manifest, with each identity linked to its pinned Git blob SHA and the CP23-B parent source blob.
- `tools/audits/vehicles/build_sotg_cp23c3_native_stage.mjs`: rebuilds exact staging files from pinned CP23-B proposals; `--check` confirms all 15 bytes, file names, source identities, Git hashes, empty installed weapons, no source-binding flags and explicit lack of registration. `--write` writes **audit-only paths**; it has no release or Actor installation mode.
- `tools/audits/vehicles/verify_sotg_cp23c3_native_roundtrip.mjs`: uses pinned official Foundry CLI 3.0.5, compiles and re-extracts the staged JSON into an operating-system temporary directory, checks all 15 identities and full Actor `system` parity, and deletes all temporary LevelDB records. It does not install this compendium into Foundry.
- `tests/phase2c_cp23c3_native_source_stage.test.mjs`: tests order, source identity, per-record parity, source immutability, registration refusal, immutable stock-attack denial and source version pinning.
- `.github/workflows/sotg-strict-certification-cp17.yml`: adds dedicated exact-HEAD stages to test the source JSON bytes and native round-trip using the preinstalled CP23-B pinned official Foundry CLI.

### Why registration remains blocked

This code establishes source-to-native **serialization parity**. It does not validate official Foundry V13 runtime actor hydration, actor-schema compatibility of every optional field, the source-to-target ActorEngine transaction, Pure/Modified configuration invalidation, durable GM-world receipt semantics, or installed weapon topology. Public or player-editable Actor metadata must never supply that missing proof.

## Next stage — authenticated native registration and receipt authority

1. Independently approve a **versioned, non-combat source pack** registration plan and test the registered pack under real Foundry V13, including system release-build inclusion/exclusion controls.
2. Pin the actual compiled LevelDB pack bytes and source pack document ID/version. The present staging Git blobs are source document identity pins, not runtime pack authentication.
3. Build an ActorEngine-controlled world import with post-update readback. Require replace mode, an exact pinned source document, actor membership, and a GM authority context.
4. Store outside-Actor durable receipts with transaction/version and world/Actor/source identity, enforce serialized GM writes, compare receipt+configuration at **every read**, and invalidate on all configuration-affecting actor and embedded Item changes, migration, clone, pack changes and Pure/Modified mutations.
5. Treat current HP, temp HP and shields as narrowly permitted gameplay-state transitions. They do not authenticate provenance.
6. Run actual Foundry V13 live-world E2E tests before source-installation receipts can be recognized. **Do not enable stock attacks without separately certified physical mount, geometry, crew and weapon semantics.**

The protected vehicle foundation branch and all CP16–CP23 source certificates remain untouched.
