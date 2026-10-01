# Phase 3H-2 — talent semantic authority (derived system metadata)

1187 canonical talents (50 homebrew excluded). **1122** receive at least one rule-evidenced tag; **65** have no vocabulary concept in their rule text (MISSING_SEMANTIC_TAGS — an honest outcome, not a gap to fill by guessing).

- 3469 proposed tag instances over 57 vocabulary tags (unused by any talent: none).
- 1168 talents change; 2321 tags added, 8292 legacy tags removed, 31 aliases normalized.
- evidence confidence (tag assignments): {"MEDIUM":1735,"PINNED":150,"HIGH":1584} — MEDIUM = general wording, itemised for owner review.
- removed legacy tags by disposition: {"NON_SEMANTIC_RUNTIME_METADATA":1270,"UNSUPPORTED":3035,"LEGACY_ARCHETYPE_SCORING":2374,"REMOVE_OBSOLETE":1613}.
- `force` pin (executable Force-talent counting): 227 talents disagree with their rule text (150 keep `force` against the text, 77 do not receive it although the text names the Force) — defect candidates for Phase 3I.

## Tag usage

| Tag | Talents |
|---|---:|
| `force` | 357 |
| `support` | 239 |
| `ally_support` | 223 |
| `defense` | 207 |
| `control` | 177 |
| `mobility` | 175 |
| `damage` | 169 |
| `melee` | 159 |
| `ranged` | 156 |
| `use_the_force` | 126 |
| `social` | 114 |
| `accuracy` | 106 |
| `force_power` | 91 |
| `droid` | 84 |
| `lightsaber` | 75 |
| `vehicle` | 75 |
| `persuasion` | 68 |
| `survivability` | 66 |
| `leadership` | 60 |
| `stealth` | 54 |
| `pilot` | 45 |
| `dark_side` | 44 |
| `perception` | 44 |
| `area_damage` | 43 |
| `deception` | 42 |
| `mechanics` | 42 |
| `medical` | 40 |
| `tech` | 38 |
| `ability_dex` | 30 |
| `healing` | 26 |
| `knowledge` | 26 |
| `fieldcraft` | 25 |
| `starship` | 22 |
| `ability_str` | 21 |
| `initiative` | 21 |
| `ability_cha` | 19 |
| `use_computer` | 18 |
| `pistol` | 17 |
| `rifle` | 17 |
| `lightsaber_form` | 16 |
| `ability_wis` | 13 |
| `gather_information` | 12 |
| `ability_int` | 11 |
| `ride` | 10 |
| `advanced_melee` | 9 |
| `equipment` | 9 |
| `heavy_weapon` | 5 |
| `jump` | 5 |
| `climb` | 3 |
| `finesse` | 3 |
| `ability_con` | 2 |
| `hacking` | 2 |
| `sniper` | 2 |
| `survival` | 2 |
| `swim` | 2 |
| `endurance` | 1 |
| `force_training` | 1 |

Per-talent evidence (matched snippets, removed-tag audit, alias normalization, pins) is in `data/audits/talent-phase-3h-semantic-authority.json`.
