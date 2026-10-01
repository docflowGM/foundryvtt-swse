# Phase 3F-3 — tree identity normalization dry-run

Status: **DRY_RUN_CERTIFIED** · 71 talents (`system.treeId`) · 12 trees (name + label) · 12 registry entries · 0 changes outside the targets. **No pack has been written.**

## Verification

- PASS manifest scope is exactly 71 talents and 12 trees
- PASS every talent change is exactly the `system.treeId` leaf, and the new value is the `_id` of a tree that contains the talent
- PASS every tree change is exactly `name` and the mirrored `system.talent_tree` label (old -> canonical), nothing else
- PASS zero changes outside the 71 talents and the 12 trees
- PASS no talent id / name / text / source / page / tag / flag / effect change; no tree id / member list change
- PASS talent and tree counts unchanged (1,187 / 177); tree ids and talent ids preserved
- PASS reconciler on the projected packs: STALE_TREE_ID_SLUG 0, TREE_DISPLAY_NAME_DRIFT 0, every blocking finding 0
- PASS registry: only the 12 trees change, and only their `id` (slug) / `displayName`; membership, counts and classAccess identical
- PASS registry slug ids change only for the six trees whose runtime id changes (case-only renames keep id and slug)
- PASS no runtime-id collision, and every other tree keeps its runtime id
- PASS the registry generator (as invoked here) reproduces the on-disk registry from the CURRENT packs byte-for-byte
- PASS second run is a zero diff
- PASS serialization is surgical: 71 talent lines and 12 tree lines change

## Talent `system.treeId` (by slug family)

| Change | Talents |
|---|---|
| `armor-specialist → 17cec542331cb4e4` | 1 |
| `dark-side-devotee → 96ef43a3054dcb58` | 6 |
| `jedi-guardian → 10c843cef8ce2798` | 16 |
| `jedi-sentinel → 36f18f3e974feb33` | 2 |
| `lightsaber-combat → 2359c05ff13f3feb` | 11 |
| `lightsaber-forms → 2bc2572e852832e4` | 12 |
| `beastwarden → ed899f9f41fc1391` | 5 |
| `bando-gora-captain → b7fb2b10740923f6` | 4 |
| `believer-disciple → 92c32621101a11f9` | 5 |
| `iron-knight → a7dc5adf97fd6a67` | 5 |
| `order-of-shasa → d2e4cd882822dcf2` | 4 |

## Tree display names

| Tree `_id` | Before | After | Leaves |
|---|---|---|---|
| `a212850887fe41da` | 1stdegree Droid | First-Degree Droid | name, system.talent_tree |
| `ad499981ddb8450e` | 2nddegree Droid | Second-Degree Droid | name, system.talent_tree |
| `af077700c1b8433f` | 3rddegree Droid | Third-Degree Droid | name, system.talent_tree |
| `73814706c00849c6` | 4thdegree Droid | Fourth-Degree Droid | name, system.talent_tree |
| `c4e48efaad1f49af` | 5thdegree Droid | Fifth-Degree Droid | name, system.talent_tree |
| `754907ded50d4f46` | Agent Of Ossus | Agent of Ossus | name, system.talent_tree |
| `f8e7edab5f234e27` | Aingtii Monk | Aing-Tii Monk | name, system.talent_tree |
| `d20682671d035cef` | Bothan Spynet | Bothan SpyNet | name, system.talent_tree |
| `4da769d7c5f44232` | Disciple Of Twilight | Disciple of Twilight | name, system.talent_tree |
| `c6eee4889411411b` | Ember Of Vahl | Ember of Vahl | name, system.talent_tree |
| `0ffc37dac946477d` | Master Of Intrigue | Master of Intrigue | name, system.talent_tree |
| `899038f739294c81` | Warden Of The Sky | Warden of the Sky | name, system.talent_tree |

## Registry entries

| Tree `_id` | Id before → after | displayName before → after |
|---|---|---|
| `a212850887fe41da` | `1stdegree-droid` → `first-degree-droid` | 1stdegree Droid → First-Degree Droid |
| `ad499981ddb8450e` | `2nddegree-droid` → `second-degree-droid` | 2nddegree Droid → Second-Degree Droid |
| `af077700c1b8433f` | `3rddegree-droid` → `third-degree-droid` | 3rddegree Droid → Third-Degree Droid |
| `73814706c00849c6` | `4thdegree-droid` → `fourth-degree-droid` | 4thdegree Droid → Fourth-Degree Droid |
| `c4e48efaad1f49af` | `5thdegree-droid` → `fifth-degree-droid` | 5thdegree Droid → Fifth-Degree Droid |
| `754907ded50d4f46` | `agent-of-ossus` → `agent-of-ossus` | Agent Of Ossus → Agent of Ossus |
| `f8e7edab5f234e27` | `aingtii-monk` → `aing-tii-monk` | Aingtii Monk → Aing-Tii Monk |
| `d20682671d035cef` | `bothan-spynet` → `bothan-spynet` | Bothan Spynet → Bothan SpyNet |
| `4da769d7c5f44232` | `disciple-of-twilight` → `disciple-of-twilight` | Disciple Of Twilight → Disciple of Twilight |
| `c6eee4889411411b` | `ember-of-vahl` → `ember-of-vahl` | Ember Of Vahl → Ember of Vahl |
| `0ffc37dac946477d` | `master-of-intrigue` → `master-of-intrigue` | Master Of Intrigue → Master of Intrigue |
| `899038f739294c81` | `warden-of-the-sky` → `warden-of-the-sky` | Warden Of The Sky → Warden of the Sky |
