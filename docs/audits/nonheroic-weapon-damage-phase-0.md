# NH-0 Nonheroic Weapon Damage Audit

## Purpose

This audit starts the nonheroic-first correction pass for inaccurate NPC/beast/heroic/nonheroic weapon damage. It is intentionally **audit-only**: no runtime behavior, actor data, item data, or compendium pack contents are changed in this phase.

The goal is to establish the source-backed scope and build the tooling needed for later book-by-book correction phases.

## Scope for NH-0

NH-0 covers nonheroic and nonheroic-adjacent sources first:

- `data/nonheroic/nonheroic_templates.json`
- `data/nonheroic-templates.json`
- `packs/nonheroic.db`
- `packs/droids.db`
- `packs/beasts.db`
- `packs/npc.db`
- `scripts/engine/import/npc-template-importer-engine.js`
- `system.json` pack registration

Heroic NPCs are deliberately deferred until after the nonheroic/droid/beast pass, because heroic statblocks have more class/talent/feat-driven damage modifiers and need their own audit bucket.

## Sourcebook authority used for this phase

The later correction phases should be backed by the printed/sourcebook statblocks whenever a statblock exists. For NH-0, the following sourcebook-backed rules are already material enough to shape the audit:

### 1. Statblock damage is authoritative for Play Mode imports

Imported NPCs are intentionally created with `sourceAuthority: 'statblock'` and `useProgression: false`. That means statblock weapon damage should not be recomputed from legality/progression unless the statblock lacks damage.

This matters because a nonheroic miner or guard statblock might include Power Attack, Mighty Swing, autofire, stun, or other options already baked into the listed attack line. Later corrections should preserve the printed attack-line damage first and only derive values as a fallback.

### 2. Sourcebook statblocks include exact damage formulas and option-specific rows

Example from *Galaxy of Intrigue*: the Corporate Sector Mine Guard has both a normal blaster carbine line and an autofire line, while the Corporate Sector Miner has a club line that explicitly includes Power Attack and a second line with Mighty Swing. Those are not generic item damage values; they are statblock attack entries with option-specific damage.

This means the migration must preserve each attack row as a distinct statblock-backed weapon/action profile, not collapse the NPC to a single item damage formula.

### 3. Beasts must use natural-weapon rules, not humanoid weapon assumptions

The *Unknown Regions* creature generator instructs the GM to select one to three natural weapons and determine melee attack and damage with those natural weapons. It also points back to the Saga Edition Core Rulebook natural weapon rules. Beast damage must therefore remain natural-weapon-backed, with delivery `natural`, not generic `weapon`.

The same book provides additional natural weapon guidance, such as tail attack damage by size and tail slam behavior, and many beast special qualities add extra damage or conditional riders. Those must become separate metadata/rider audits rather than being mixed into the base natural weapon dice.

### 4. Area/special attacks need attack-shape metadata

Several nonheroic/droid/beast statblocks have attacks that are not single-target weapon hits:

- plasma jets with line/area behavior,
- trample attacks that deal damage or half damage on a miss,
- electroshock area attacks,
- ink cloud/poison/condition-track riders,
- autofire rows.

These need `attackShape`, `area`, and `riders` metadata in the later schema, not just a flat damage formula.

## Structural findings from the repo

### Finding A — nonheroic JSON source has raw statblock text, not parsed weapon damage

`data/nonheroic/nonheroic_templates.json` contains many entries sourced from books or Wookieepedia-style pages. The first inspected records show fields such as `possessions`, `notes`, ability scores, and raw source text, including sourcebook names.

This is useful for audit discovery, but it is not yet a normalized weapon-damage source of truth.

### Finding B — starter nonheroic templates mostly have no weapons

`data/nonheroic-templates.json` has starter humanoid templates such as Guard, Scout/Pathfinder, and Laborer/Worker with `equipment: []`. These are not directly wrong weapon formulas; they are template shells with no weapon data.

### Finding C — starter beast templates use symbolic ability-token damage

The starter Wolf and Bear templates include natural weapons using symbolic formulas such as:

- `1d6+Str`
- `1d8+Str`
- `1d10+Str`

They do include explicit damage type fields (`piercing` for Bite, `slashing` for Claw), which is good, but the damage formula shape is not yet canonical for roll execution. Later phases should convert these to packet components that preserve the ability contribution explicitly instead of leaving a loose text token.

### Finding D — importer currently creates statblock weapons as reference-only items

The NPC template importer currently parses `Melee Weapons` and `Ranged Weapons`, but `_parseWeapons()` creates item data with only:

- the raw attack text as `name`,
- `system.weaponType`,
- `system.description`,
- `sourceAuthority: 'statblock'`,
- `playModeReference: true`,
- `flags.swse.import.raw`.

It does **not** parse or set `system.damage`, `system.damageFormula`, `system.damageType`, attack-shape metadata, or canonical damage packet profile data. This is the immediate technical reason imported nonheroic weapon damage can be wildly inaccurate or unusable at roll time.

### Finding E — actor packs to audit are explicitly registered

`system.json` registers these relevant Actor packs:

- `heroic` → `packs/heroic.db`
- `nonheroic` → `packs/nonheroic.db`
- `npc` → `packs/npc.db`
- `droids` → `packs/droids.db`
- `beasts` → `packs/beasts.db`

For nonheroic-first work, `nonheroic`, `droids`, `beasts`, and generic `npc` are in scope. `heroic` should be a later pass.

## New audit tooling

This phase adds:

```bash
node tools/audit-nonheroic-weapon-damage.mjs
```

The tool scans:

- JSON statblock source files,
- starter nonheroic/beast templates,
- nonheroic/droid/beast/generic NPC actor packs,
- embedded weapon items,
- raw statblock attack lines preserved on import flags.

It emits:

- `docs/audits/generated/nonheroic-weapon-damage-audit.json`
- `docs/audits/generated/nonheroic-weapon-damage-audit.md`

The generated report classifies each weapon-like row as:

- `candidate-verified`
- `needs-review`
- `needs-correction`
- `informational`

It also assigns flags such as:

- `missing-damage-formula`
- `missing-damage-type`
- `symbolic-ability-token`
- `embedded-weapon-missing-system-damage`
- `embedded-weapon-missing-system-damage-type`
- `autofire-review`
- `area-or-explosive-review`
- `rider-review`
- `footnote-modifier-review`
- `no-weapon-data-on-template`

## Correction policy for later phases

Later phases should use these rules:

1. **Printed statblock wins.** If the statblock says `club +2 (1d6+6)` and footnotes that it includes Power Attack, the correction stores that printed damage as the statblock attack profile.
2. **Item base damage is secondary.** The weapon compendium can identify base weapon dice and damage type, but it must not erase statblock-specific modifiers.
3. **One printed attack row becomes one attack profile.** A normal blaster line and an autofire line are distinct profiles.
4. **Natural weapons use natural delivery.** Beast claw/bite/gore/slam/tail attacks must not be flattened into normal humanoid weapons.
5. **Riders stay riders.** Poison, condition-track movement, immobilization, stun, and similar effects do not belong inside the base damage formula.
6. **Area attacks carry shape metadata.** Autofire, cone/line/burst, plasma jets, trample, splash, and similar attacks need `attackShape` and `area` metadata.
7. **Unknown-source rows stay manual.** If the sourcebook cannot be recovered, do not mark the profile verified.

## Recommended book-by-book follow-up phases

The later phases should be done by book/source family:

### NH-1 — Scum and Villainy / droid-heavy source pass

Rationale: the inspected nonheroic JSON starts with several droid records, including entries sourced to *Scum and Villainy*. Droids frequently have integrated tools, plasma jets, saws, probes, and nonstandard attack riders, so this source family should establish the droid damage profile pattern first.

### NH-2 — Galaxy of Intrigue nonheroics

Rationale: inspected *Galaxy of Intrigue* statblocks demonstrate exactly why statblock authority matters: guards, technicians, and miners have explicit printed attack rows, autofire rows, footnoted Power Attack damage, and option-specific formulas.

### NH-3 — Threats of the Galaxy nonheroics/droids

Rationale: this source family likely contributes many hostile NPC and droid statblocks and should be corrected after the parser pattern is stable.

### NH-4 — The Unknown Regions beasts/mounts

Rationale: this should be the first pure beast/natural weapon batch. Use the creature generator and natural weapon rules to normalize natural attacks, special qualities, trample, poison, electroshock, and other riders.

### NH-5 — Remaining sourcebooks

Batch Clone Wars, Force Unleashed, KOTOR, Jedi Academy, Galaxy at War, Starships-adjacent nonvehicle actors, and any smaller source families.

### NH-6 — Unknown/web/homebrew/manual bucket

Rows without recoverable sourcebook authority should remain manual. These can still be made playable, but they should not be stamped `sourcebook-verified`.

## Non-goals

- No compendium rewrite in NH-0.
- No runtime damage behavior changes.
- No heroic NPC corrections yet.
- No vehicle/starship weapon corrections.
- No poison implementation.
- No token geometry.
- No inferred/manual rows marked as verified.

## Acceptance criteria for NH-0

NH-0 is complete when:

- the audit document exists,
- the audit tool exists,
- the tool is able to scan the known nonheroic/droid/beast/generic NPC sources in a local checkout,
- the tool emits JSON and Markdown reports,
- the next correction phases are book-scoped and source-backed.
