# Galactic Profiles v3 — unified contract

**One runtime contract for all 41 profiles** (23 heroic `actor`, 8 `nonheroic`, 2 `beast`, 8 custom heroic `droid`).
`subtype` equals the V2 `ProgressionSubtypeAdapter` id; unknown subtypes are rejected.

| File | Role |
|---|---|
| `galactic-profiles.json` | **Runtime.** `catalog` + `choices` + `extension` + `provenance` + `certification` per profile. Loaded once by the registry. |
| `galactic-profiles.catalog.json` | Generated browse catalog (single definition). |
| `galactic-profiles.evidence.json` | Original authored records, verbatim. CI/audit only — **never loaded at runtime, never an authority**. |
| `galactic-profiles.schema.json` | The one schema (`$defs` + `if/then` per subtype). |
| `SWSE_Galactic_Profiles_v3.json`, `droids/SWSE_Eight_Droid_Galactic_Profiles_v3.json` | Frozen authoring **sources** the generator reads. |
| `SWSE_Galactic_Profiles_Source_Archive.json`, `…Migration_Report.json` | Historical provenance of the original 33 legacy records. |

Regenerate with `node tools/build-galactic-profiles.mjs` (`--check` fails on drift; the schema test runs the same comparison).

Profiles are **intent, not authority**. Class grants, attribute modifiers, entitlements, prerequisites, droid
quotation/installation, equipment and credits are derived by canonical V2 authorities through the Galactic
Profile compiler. Schema validity is structural only. All profiles remain `publishableAsReadyToPlay: false`
until individually certified.

`choices.wallet` is an **exact final balance** (all grants included; 0 is a valid resolved value). It is never
added to, recomputed from, or topped up with class credits or Wealth.

`choices.attributes.basis`: `base` (committed as the player's base array), `droidPreModifier` (degree + size are
applied by V2 exactly once), or `unresolved` (blocked unless the species has no V2 ability modifiers).
