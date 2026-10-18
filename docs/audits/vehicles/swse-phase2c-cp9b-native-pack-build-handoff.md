# Vehicle Phase 2C CP9B — Reproducible Native Compendium Build

## Verified result

**The official Foundry VTT CLI 3.0.5 compiled, extracted, and passed round-trip inspection for two source-controlled vehicle packs in GitHub Actions.** The workflow produced the isolated `swse-cp9b-native-vehicle-packs` artifact, without altering any checked-in JSONL source pack, changing the `system.json` manifest, installing a system in Foundry, or authorizing any weapon.

- **171 total Actors:** 108 `vehicles-space-transports` and 63 `vehicles-capital-ships`.
- **Four strictly source-certified pilot identities:** Action VI, CR70, Ghtroc 720, Consular.
- Source keys and IDs retained, with selected field-and-weapon topology parity checked on the four certified ships.
- Official CLI: `@foundryvtt/foundryvtt-cli@3.0.5`.
- User policy `null`: still only genuinely unknown; explicit no carried craft is `"None"` and printed unarmed ships have `weapons: []`.
- Strict stock attack authorization: **0** registered trusted groups.

## Exact build process

`tools/audits/vehicles/build_phase2c_cp9b_native_packs.mjs`

The builder parses each legacy JSONL source file as a roster, rejects duplicate/missing IDs and unexpected Actor counts, then stages each Actor into its own temporary JSON file. The official compiler requires `_key: "!actors!"+_id`, which is added **only to temporary files**. The initial compilation produced an empty LevelDB because no staging documents had `_key`; the fix was verified through a subsequent successful real CI run. The compiler creates native LevelDB directories in a temporary output directory; `extractPack` then writes source JSON and the verifier compares all IDs/counts and the named canonical field projections for the four pilot ships.

Run on a supported full checkout:

```sh
mkdir -p /tmp/swse-cp9b-cli
npm install --no-save --prefix /tmp/swse-cp9b-cli @foundryvtt/foundryvtt-cli@3.0.5
node tools/audits/vehicles/build_phase2c_cp9b_native_packs.mjs \
  --repo-root . \
  --cli-root /tmp/swse-cp9b-cli/node_modules \
  --out /tmp/swse-cp9b-native-packs
```

The builder rejects writing within the source checkout and refuses to overwrite an existing output location. On failures it deletes only the temporary output it created. The compiled directories are stored in `/tmp/swse-cp9b-native-packs/packs/`, alongside `cp9b-parity-report.json`. They may be copied into a Foundry test installation, but the step is **not** automated or represented as a successful installed runtime test.

## GitHub Actions evidence

Workflow: `.github/workflows/vehicle-phase2c-cp9.yml`.

The run for commit `3240bf5ab725e09f6e9c68058d2110ed4cad7367` completed successfully, compiled both native packs, and uploaded one isolated artifact: [CP9B compiled packs](https://github.com/docflowGM/foundryvtt-swse/actions/runs/39123548118). Later CI changes add Node unit tests covering the 171-record source roster, temporary document-store key, deliberate failure on tampered source stats, and a separate mocked Foundry runtime-probe interface. Those later changes must pass their own CI before claiming the new tests verified.

Read-only Foundry validation: `scripts/domain/vehicles/vehicle-cp9b-runtime-pack-verifier.js` exports `verifyPilotVehiclePacksAtRuntime(game)`. A GM-side console or system caller may import and invoke it once the pack directories have actually been installed and registered, to read exact document IDs and selected stock source fields. This is an **inspection** helper, not an auto-registered hook, updater, or permission mechanism.

## Remaining CP9B-to-CP9C blockers

1. **Full release packaging:** `scripts/build/package-system.js` currently omits all packs from its ZIP input list. CP9B therefore only certifies a 2-pack compiled artifact, NOT a complete installable system. Do not silently append incompatible .db files to release packaging. Verify all declared packs and their build route before changing this legacy packaging script.
2. **Actual Foundry runtime readback:** The Node mocked test is not a running Foundry v13 integration. Need independent `game.packs.get(...).getDocument(id)` readback for all 4 pilots against installed LevelDB directories.
3. **World Actor clone provenance:** Loading a canonical pack document is NOT evidence that any subsequently edited world Actor is an unmodified clone. Do not trust editable actor.system/flags/sourceId/name or caller parameters for stock authority. A controlled, authenticated import and live physical-row match are still required.
4. **Weapon math and targeting:** Validate the Ghtroc's single fixed-forward double-laser emplacement, named/abstract gunner eligibility, vehicle INT rather than gunner DEX, BAB math, printed +1 vs autofire −4, arc/refusal, and pre-cost rollback in real Foundry.
5. **Pure/Modified architecture remains future work.** Preserve D01-D03 approvals, D04 staged deployment denial, and current fail-closed stock gate: `TRUSTED_STOCK_WEAPON_GROUP_COUNT = 0`.

## No overstated certification

What is proven here: exact source roster, temporary native LevelDB compile/extract operation, source-field comparison of four certified pilots, reproducible CI artifact with document IDs. What remains unknown until direct Foundry use: whether the runtime accepts every generated Actor schema and round-trips a true world Actor creation, whether Ghtroc is operational, and whether the existing system release route will include all required compiled packs.
