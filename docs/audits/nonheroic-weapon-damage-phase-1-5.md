# NH-1.5 NPC Source Attribution Audit

## Purpose

NH-1.5 sits between the first droid-heavy profile seed pass and the later book-by-book damage corrections.

The goal is to identify every heroic and nonheroic-adjacent NPC actor in the compendiums and normalize each one to a source book bucket before formulas are appended or corrected. This lets later phases answer:

- Which actors from *Scum and Villainy* have weapons?
- Which *Galaxy of Intrigue* NPCs need attack-row damage profiles?
- Which beast or droid entries lack source attribution?
- Which rows should stay manual because their source authority is missing or conflicting?

This is audit/source-map work only. It does not mutate compendium actors.

## Covered sources

The audit tool scans these Actor packs:

- `packs/heroic.db`
- `packs/nonheroic.db`
- `packs/droids.db`
- `packs/beasts.db`
- `packs/npc.db`

It also scans template JSON sources:

- `data/nonheroic/nonheroic_templates.json`
- `data/nonheroic-templates.json`

## Added tool

```bash
node tools/audit-npc-source-attribution.mjs
```

The tool emits:

```text
 docs/audits/generated/npc-source-attribution-audit.json
 docs/audits/generated/npc-source-attribution-audit.md
```

## What the tool extracts

For each actor/source row, it records:

- actor name,
- normalized actor slug,
- actor kind/bucket,
- pack/source path,
- compendium id where available,
- level/CL where available,
- embedded weapon count,
- normalized source book,
- source status,
- evidence paths that supported the attribution.

## Source status values

### `attributed`

Exactly one source book was found and normalized.

### `missing-source`

No source book was found in the actor/system/flags/raw statblock metadata.

### `conflicting-source`

Multiple different source books were found. These rows should stay manual until the conflict is resolved.

### `parse-error`

A compendium JSONL row could not be parsed. This should be fixed before source attribution can be trusted.

## Normalized source books

The tool normalizes common source names into stable book buckets:

- `Saga Edition Core Rulebook`
- `Threats of the Galaxy`
- `Scum and Villainy`
- `Galaxy of Intrigue`
- `Galaxy at War`
- `Clone Wars Campaign Guide`
- `Force Unleashed Campaign Guide`
- `Knights of the Old Republic Campaign Guide`
- `Jedi Academy Training Manual`
- `Scavenger's Guide to Droids`
- `The Unknown Regions`
- `Starships of the Galaxy`
- `Web Enhancements`
- `Unknown / missing source`

## Why this matters before damage fixes

Damage correction phases should be book-filtered rather than repository-wide. A statblock from *Galaxy of Intrigue* and a droid from *Scavenger's Guide to Droids* can both have a blaster, but their attack rows may include different baked-in options, footnotes, riders, or area rules.

NH-1.5 makes that source grouping explicit so later damage passes can:

1. filter by book,
2. inspect only actors with weapon rows,
3. append missing source metadata first,
4. apply statblock-specific attack profiles,
5. keep unknown/conflicting rows manual.

## Recommended usage in later phases

Before each book pass, run:

```bash
node tools/audit-npc-source-attribution.mjs
```

Then filter the generated JSON by:

```js
record.sourceBook === '<Book Name>' && record.weaponCount > 0
```

That becomes the worklist for that book's formula/type/profile correction pass.

## Non-goals

- No compendium actor rewrite.
- No runtime importer change.
- No damage formula correction.
- No heroic damage correction yet.
- No nonheroic damage correction in this phase.
- No sourcebook text copying beyond normalized attribution names.

## Acceptance criteria

NH-1.5 is complete when:

- the source attribution audit tool exists,
- the tool scans heroic and nonheroic-adjacent compendium actor packs,
- the tool emits JSON and Markdown reports,
- the report includes source book/status/weapon-count fields,
- missing/conflicting rows can be separated before damage correction starts.
