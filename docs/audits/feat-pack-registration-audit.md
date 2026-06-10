# Feats Compendium Registration Audit

**Scope:** Static + filesystem audit only. No source files, packs, or `system.json` were modified. No packs rebuilt, renamed, or deleted.
**Repo audited:** `foundryvtt-swse` (working tree on branch `main`)
**Date:** 2026-06-10
**Question:** Why does Foundry v13 not register the feats pack as `foundryvtt-swse.feats` while adjacent packs (species, classes, talents, etc.) register correctly?

---

## A. Executive summary

The feats data and its manifest entry are **not** the defect. `packs/feats.db` is valid line-delimited JSON with 414 well-formed `type:"feat"` documents, every one carrying a valid 16-char `_id`, `name`, and `system`. Its `system.json` entry is byte-for-byte structurally identical to the working packs (`species`, `classes`, `talents`). The two resolver modules (`FeatRegistry`, `FeatureIndex`) are correct, agree on the same source of truth, and contain **no** forbidden browser fetch and **no** active emergency-mirror logic. Both correctly report that *Foundry never registered the pack* — i.e., the failure is upstream of the system's JavaScript.

The decisive structural finding: **every pack in the repo is a legacy NeDB `.db` text file, and there are zero LevelDB directories anywhere in `packs/`.** Foundry v12+ (this manifest claims `compatibility.verified: "14"`) does not load NeDB `.db` packs directly — it reads LevelDB pack *directories*. The repo also contains **no pack-compilation tooling** (no `package.json`, no `@foundryvtt/foundryvtt-cli`, no `classic-level`/`compilePacks`). This means the packs that "register correctly" in the running game are almost certainly being loaded from a **migrated LevelDB store that lives in Foundry's user-data directory, not in this repo**. `feats.db` is the only content pack left stale (mtime Jun 7) while essentially every other `.db` was refreshed Jun 10, and it was hand-dropped as raw NeDB per `README.txt`. The most likely failure is therefore that the feats LevelDB store in the served install was never (re)built/migrated, so `foundryvtt-swse.feats` is absent from `game.packs`.

The user's specific suspicion — "`system.json` says `packs/feats.db` while working v13 packs are directories" — is **half right**: at the *repo* level the working packs are also `.db` files, so feats is not formatted differently from its neighbors *in the repo*. But the absence of any LevelDB directory in a repo whose packs demonstrably register at runtime is itself the proof that the runtime pack store is elsewhere (a migrated copy), and that feats's store in that copy is missing/empty.

A secondary, concrete repo defect was also found: a phantom **`feats-restored`** pack entry in `system.json` whose backing file `packs/feats-restored.db` **does not exist** and is untracked in git. It does not, by ordering, explain the primary failure, but it is real manifest pollution and `FeatRegistry` even wastes candidate lookups on it.

---

## B. Evidence from console log

**No console log file was provided with this run** (the session upload area was empty). The audit was therefore conducted entirely from the repository and filesystem, which is the stronger evidence in any case. The prior-investigation "known facts" supplied in the task brief were treated as claims to corroborate against the repo, not as ground truth:

| Known-fact claim | Repo corroboration |
|---|---|
| `foundryvtt-swse.feats` absent from `game.packs` | Consistent with findings; both resolvers explicitly log this state. |
| Many adjacent packs register (species, classes, talents, etc.) | Those `.db` files exist and are valid; consistent. |
| FeatRegistry & FeatureIndex end with 0 feats | Confirmed by code: both bail with a warning when `game.packs.get(...)` returns nothing. |
| Raw fetch of `/systems/.../packs/feats.db` → 403 | Expected behavior in Foundry v12+; not diagnostic. The fetch path is now a disabled no-op in code. |
| Uploaded `feats.db` parsed as 414 NeDB docs | Confirmed: 414 valid `feat` documents. |
| Mirror-pack fix did not help | Consistent: the `feats-restored` mirror file is missing and the entry is inert. |

When you re-run with a live console log, the lines to grep for are `FeatRegistry`, `FeatureIndex`, `Compendium pack not registered`, and any Foundry-level `pack` / `LevelDB` / `ClassicLevel` errors emitted during `setup`/`ready`.

---

## C. Manifest findings (`system.json`)

- **`id`**: `foundryvtt-swse`
- **`title`**: Star Wars Saga Edition · **`version`**: `3.0.4`
- **`compatibility`**: `{ minimum: "12", verified: "14" }` — i.e., targets the LevelDB-pack era of Foundry.
- **`esmodules`**: `["index.js"]` (single entry module). No `scripts`.
- **Total packs declared:** 60.

**Feats / talent / class / species / background / language / force entries** (all share identical shape — `type`, `system`, `path` keys):

```json
{"name":"species","type":"Item","system":"foundryvtt-swse","path":"packs/species.db"}
{"name":"classes","type":"Item","system":"foundryvtt-swse","path":"packs/classes.db"}
{"name":"talent_trees","type":"Item","system":"foundryvtt-swse","path":"packs/talent_trees.db"}
{"name":"talents","type":"Item","system":"foundryvtt-swse","path":"packs/talents.db"}
{"name":"feats","type":"Item","system":"foundryvtt-swse","path":"packs/feats.db"}
{"name":"feats-restored","label":"Feats (Restored Mirror)","type":"Item","system":"foundryvtt-swse","path":"packs/feats-restored.db"}
{"name":"forcepowers","type":"Item","system":"foundryvtt-swse","path":"packs/forcepowers.db"}
{"name":"backgrounds","type":"Item","system":"foundryvtt-swse","path":"packs/backgrounds.db"}
{"name":"languages","type":"Item","system":"foundryvtt-swse","path":"packs/languages.db"}
```

- **Exact feats entry:** `{"name":"feats","label":"Feats","type":"Item","system":"foundryvtt-swse","path":"packs/feats.db"}` — schema-identical to working packs. **No anomaly.**
- **Duplicate pack names:** none.
- **Duplicate pack paths:** none.
- **Schema shape vs working packs:** identical (`feats` uses the same key set and `type:"Item"` as `species`/`classes`/`talents`).
- **Path existence:**
  - `packs/feats.db` → **exists** (1,585,244 bytes).
  - `packs/feats-restored.db` → **DOES NOT EXIST**. The `feats-restored` entry is a phantom: it references a file that is absent from disk and untracked in git. This is the only manifest-level defect in the feats neighborhood.

---

## D. Filesystem findings (`packs/`)

Every pack is a **single NeDB JSONL `.db` file** (`file` reports "JSON data"). **No pack is a directory. No LevelDB store (`CURRENT`/`MANIFEST-*`/`*.ldb`) exists anywhere in the repo.**

| Pack | FS object | Size | Format | Manifest path matches? |
|---|---|---|---|---|
| `feats.db` | file | 1,585,244 B | NeDB JSONL | yes (`packs/feats.db`) |
| `feats-restored.db` | **MISSING** | — | — | **no (manifest references nonexistent file)** |
| `classes.db` | file | 82,662 B | NeDB JSONL | yes |
| `talents.db` | file | 2,589,891 B | NeDB JSONL | yes |
| `talent_trees.db` | file | 80,884 B | NeDB JSONL | yes |
| `species.db` | file | 568,339 B | NeDB JSONL | yes |
| `backgrounds.db` | file | 50,340 B | NeDB JSONL | yes |
| `languages.db` | file | 85,848 B | NeDB JSONL | yes |
| `forcepowers.db` | file | 87,920 B | NeDB JSONL | yes |

Supporting observations:
- `find packs -type d` returns nothing → **no LevelDB directories in the repo.**
- No `package.json`, no `@foundryvtt/foundryvtt-cli`, no `classic-level`, no `compilePack`/`extractPack` tooling found → **no LevelDB build pipeline in the repo.**
- `.gitattributes` declares `*.db text eol=lf`. This is harmless for NeDB (text), but is a **corruption landmine** if any `.db` ever becomes a binary LevelDB artifact — git would rewrite its bytes. Relevant if a future fix introduces compiled packs under a `.db` name.
- `feats.db` mtime is **Jun 7 19:12** (stale). Almost all other content packs are **Jun 10 01:07–01:08** (freshly rebuilt). `feats.db` and `lightsaberformpowers.db` are the notable Jun-7 holdouts.
- `feats.db` is real content, **not** a Git-LFS pointer (header begins `{"_id":"0053d97632b02e4a",...}`).
- Empty 0-byte packs exist (`npc.db`, `poisons.db`, `talent-enhancements.db`) — unrelated to feats but worth noting.
- `README.txt` documents `packs/feats.db` as a manually generated **"Drop-in file"** built from a scrape + a prior `feats.db` (419 DB docs at generation time). This confirms feats was hand-authored as raw NeDB rather than produced by the same pipeline/migration as the Jun-10 packs.

---

## E. Working-pack comparison table

| Property | classes | talents | species | **feats** |
|---|---|---|---|---|
| Manifest `path` | `packs/classes.db` | `packs/talents.db` | `packs/species.db` | `packs/feats.db` |
| Manifest shape | standard | standard | standard | **identical to others** |
| FS object | `.db` file | `.db` file | `.db` file | `.db` file |
| Storage format | NeDB JSONL | NeDB JSONL | NeDB JSONL | NeDB JSONL |
| LevelDB dir present? | no | no | no | no |
| Doc count | 37 | 1,005 | 161 | 414 |
| All docs valid JSON | yes | yes | yes | **yes** |
| `_id` validity | 16-char ✓ | mostly 32-char hex (non-standard) | **all `species-…` (non-standard)** | **all 16-char ✓** |
| `type` field | `class` | `talent` | `species` | `feat` |
| mtime | Jun 10 | Jun 10 | Jun 10 | **Jun 7 (stale)** |
| Registers in game.packs (per brief) | **yes** | **yes** | **yes** | **NO** |

**Key inference:** Feats is *more* spec-compliant than species (whose `_id`s are non-standard slugs yet still register). Nothing about the feats file or entry distinguishes it negatively from a working pack. The only material differences are (a) feats was not refreshed in the Jun-10 batch, and (b) the runtime store the working packs load from is not present in this repo at all (no LevelDB dirs), which means it lives in the served install — where feats's store is evidently missing/empty.

---

## F. Feats candidate table

| Candidate path | Exists? | File/Dir | Valid? | Docs | `_id`/`name`/`type:"feat"`/`system`? | Notes |
|---|---|---|---|---|---|---|
| `packs/feats.db` | **yes** | file | valid NeDB JSONL | 414 | all present; 414/414 valid 16-char `_id`; 0 dupes; 0 missing fields | Healthy. mtime Jun 7. |
| `packs/feats` (dir) | no | — | — | — | — | No LevelDB directory. |
| `packs/feats-restored.db` | **no** | — | — | — | — | Referenced by manifest `feats-restored`; missing; untracked in git. |
| `packs/feats-restored` (dir) | no | — | — | — | — | Absent. |
| other `feats*` | none | — | — | — | — | `ls feats*` returns only `feats.db`. |

No corruption, no malformed records, no missing required fields in `feats.db`. (Per audit rules, nothing was modified.)

---

## G. Registry / FeatureIndex code-path findings

**`scripts/registries/feat-registry.js`** (`FeatRegistry`)
- Pack keys tried (in order), via `_getPackCandidateKeys()`:
  `foundryvtt-swse.feats`, `foundryvtt-swse.feats-restored`, `foundryvtt-swse.feat` (plus `${systemId}.`-prefixed duplicates, deduped).
- Resolution: `game.packs.get(key)` for each candidate, then a metadata scan matching `/feats/` on name/label/path/collection.
- **Forbidden browser fetch:** none active. `_loadJsonlFallback()` is an explicit disabled no-op returning `[]`; comments document that `packs/feats.db` fetch returns 403 and must not be used.
- **Emergency mirror logic:** vestigial only — it lists `feats-restored` as a candidate key, but does no fetching/mirroring.
- On miss it logs: *"Compendium pack not registered by Foundry … This is a pack-store/install issue (the LevelDB pack at packs/feats is missing or empty); rebuild the compendium on disk."* The code itself attributes the failure to **Foundry not registering the pack / a missing-or-empty LevelDB store**, not to resolver logic.

**`scripts/engine/progression/engine/feature-index.js`** (`FeatureIndex`)
- `_resolvePack("feats")`: tries `${systemId}.feats` → `foundryvtt-swse.feats` → scan by `metadata.name === "feats"`.
- Loads via `pack.getDocuments()`; warns when the pack is missing and when 0 entries load, dumping available SWSE pack keys.
- No browser fetch, no mirror logic.

**Agreement on source of truth:** Yes. Both modules treat the registered Foundry compendium `foundryvtt-swse.feats` (with the same fallbacks) as the single source. Neither can succeed unless Foundry first registers the pack.

**Other feat-registry files present** (not the resolvers in use here, flagged as a maintenance smell, not edited): `scripts/engine/registries/feat-registry.js`, `scripts/engine/progression/feats/feat-registry.js`, `scripts/engine/progression/feats/class-feat-registry.js`, `scripts/engine/progression/feats/feat-registry-ui.js`. Multiple registries with similar names invite source-of-truth drift but are not the cause of non-registration.

**Verdict:** The runtime failure is **not** caused by resolver code. It is caused by Foundry not registering `foundryvtt-swse.feats` before the resolvers run.

---

## H. Installed-system ambiguity findings

- Repo root: `foundryvtt-swse` working tree, branch `main` (`git status` shows only `data/combat-actions.json` and `index.js` modified).
- System `id` from manifest: `foundryvtt-swse`.
- Only **one** `system.json` exists in the repo (no stale duplicates inside the tree).
- **Strong indirect signal that the repo is NOT the folder Foundry serves:** the working packs demonstrably register at runtime, yet this repo contains **no LevelDB pack directories** — only NeDB `.db` files. Foundry v12+ would either (a) refuse NeDB outright, or (b) migrate `.db`→LevelDB *in place*, which would leave `packs/<name>/` directories beside the `.db` files. Neither matches a repo that is all-`.db`-no-dirs while packs still load. The coherent explanation is that Foundry loads a **separate, already-migrated copy** in its user-data directory (`Data/systems/foundryvtt-swse/packs/<name>/` as LevelDB), and this repo is the dev/source tree. Edits made here (e.g., the Jun-10 `.db` refresh, the dropped-in `feats.db`) would not reach Foundry unless re-installed/re-migrated.
- This could not be *proven* from inside the repo — the audit cannot read Foundry's user-data directory. It is verifiable in two minutes from the running client (see Section J).

---

## I. Ranked root-cause candidates

> Note: the brief's candidates #1 (manifest path/format mismatch), #2 (NeDB vs LevelDB), and #4 (different system copy) are, on this repo's evidence, **three faces of one mechanism** and are ranked together at the top.

### 1. Feats LevelDB store missing/empty in the served (migrated) install — NeDB-vs-LevelDB + install-copy mechanism — **~70%**
**For:** No LevelDB dirs and no build tooling in a repo whose packs nonetheless register → runtime store is a migrated copy elsewhere. `feats.db` is the lone stale (Jun 7), hand-dropped pack while the rest were refreshed Jun 10; if migration/rebuild ran on the others but not feats, only feats would be absent. The resolver's own diagnostic names "LevelDB pack at packs/feats is missing or empty." Explains every symptom at once (others register, feats doesn't, 403 on raw `.db`, 0 feats in both registries).
**Against:** Cannot directly inspect the served `Data/systems/...` store from the repo to confirm the feats LevelDB dir is the specific thing missing/empty; needs the one client-side check in Section J.

### 2. Pure manifest path/format mismatch for feats specifically — **~10%**
**For:** It's the user's headline suspicion; `system.json` does point at `packs/feats.db`.
**Against:** The feats entry is *identical* in shape and `.db` convention to the working packs in this repo. There is no feats-specific path or format difference. Largely **ruled out** as a standalone cause.

### 3. Feats restored to wrong filename/folder — **~8%**
**For:** A `feats-restored` entry exists; README shows manual drop-in workflow; feats.db is stale. A prior restore may have written to a name Foundry doesn't migrate, or the restored content never got compiled into the served LevelDB store.
**Against:** The canonical `packs/feats.db` is present and valid at the manifest-declared path; the misplacement (if any) is in the served store, which folds into candidate #1.

### 4. Phantom `feats-restored` entry breaking registration — **~5%**
**For:** It references a missing file; a manifest pack pointing at a nonexistent store is a real error condition.
**Against:** It is ordered *after* `feats`, and packs both before and after it register fine, so it does not abort the registration loop. Real defect, but not the cause of feats non-registration. Should still be removed.

### 5. Resolver code bug (FeatRegistry / FeatureIndex) — **~2%**
**For:** Multiple competing feat-registry files exist (drift risk).
**Against:** The active resolvers are correct, fetch nothing forbidden, agree on the source of truth, and only fail because `game.packs.get("foundryvtt-swse.feats")` returns nothing. **Effectively ruled out.**

### 6. Other (LFS pointer / `.gitattributes` byte rewrite / world-cached pack flags) — **~5%**
**For:** `.gitattributes` `*.db text eol=lf` would corrupt a binary LevelDB `.db`; if the served install was deployed via a Git checkout without LFS or with text normalization, a pack store could be mangled. World-level pack ownership/visibility flags could also hide a pack.
**Against:** In *this* repo `feats.db` is intact NeDB text, not an LFS pointer; no evidence of binary `.db`. Plausible only in the deployment pipeline, not the repo.

---

## J. Exact recommended next fix (DO NOT APPLY YET) and validation

### Recommended fix (single, surgical, pending confirmation of Section J diagnostics)
1. **First confirm where Foundry actually loads the system from** (Section J commands below). This determines whether you fix the repo or the served install.
2. If, as expected, Foundry uses LevelDB stores in its user-data directory: **compile `packs/feats.db` (NeDB) into a LevelDB pack directory `packs/feats/`** using the official Foundry CLI (`@foundryvtt/foundryvtt-cli` → `fvtt package pack` / `compilePack`), exactly matching how the other working packs exist in the served install, then reinstall/refresh the system so Foundry rebuilds the feats store. Do this the *same way* the Jun-10 packs were produced.
3. **Remove the phantom `feats-restored` entry** from `system.json` (or create its backing store) — it references a nonexistent file.
4. Do **not** rename `feats`, do **not** reintroduce a browser-fetch fallback, do **not** add mirror packs.

### Post-fix validation — browser console
```js
game.packs.has("foundryvtt-swse.feats")              // expect: true
game.packs.get("foundryvtt-swse.feats")              // expect: a CompendiumCollection
await game.packs.get("foundryvtt-swse.feats")?.getIndex()  // expect: Index of ~414 entries
SWSE.FeatRegistry?.getAll?.()?.length                // expect: ~414
```

### Project-specific validation (better signal for this codebase)
```js
// Confirm Foundry registered the pack and its size
game.packs.get("foundryvtt-swse.feats")?.index?.size

// Force the resolvers to re-run and report
await SWSE.FeatRegistry?.initialize?.();
SWSE.FeatRegistry?.count?.();                         // expect ~414, not 0
SWSE.FeatRegistry?.isInitialized?.();                 // expect true

// FeatureIndex agreement
SWSE.FeatureIndex?.feats?.size;                       // expect ~414

// List all registered SWSE pack keys (look for "foundryvtt-swse.feats")
[...game.packs.keys()].filter(k => k.startsWith("foundryvtt-swse."));

// Confirm the phantom mirror is gone / harmless
game.packs.has("foundryvtt-swse.feats-restored");     // expect false after removal

// CONFIRM SERVED INSTALL LOCATION (run BEFORE fixing — settles Section H)
game.system.id;
game.system.version;                                  // compare to repo 3.0.4
// Compare the count above against repo: packs/feats.db has 414 docs.
// If a different pack loads with a different count, you are editing the wrong copy.
```

If `game.packs.has("foundryvtt-swse.feats")` is already `false` while `...classes`/`...species` are `true`, and the served `game.system.version`/pack counts differ from this repo, that confirms candidate #1: fix the served LevelDB store, not the repo `.db`.

---

## Appendix — commands run (all read-only)

Directory listings (`ls -la`), `file` type probes, a read-only Python pass over `feats.db`/`classes.db`/`species.db`/`talents.db`/`backgrounds.db` (JSON validity, doc counts, `_id`/`name`/`type`/`system` presence, duplicate-id and id-format checks), `git --no-pager log`/`status`, `grep` of the resolver modules, and `find` for LevelDB directories/artifacts. No file under `packs/`, `system.json`, `feat-registry.js`, or `feature-index.js` was written, renamed, or deleted. The only file created is this report.
