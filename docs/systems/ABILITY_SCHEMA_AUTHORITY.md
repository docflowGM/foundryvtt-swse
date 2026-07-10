# Ability Schema Authority

## Decision

Persistent/editable ability scores are authoritative on:

```txt
system.attributes.<ability>.{base,racial,enhancement,temp}
```

Computed ability totals and modifiers are authoritative on:

```txt
system.derived.attributes.<ability>.{base,racial,enhancement,temp,total,mod}
```

`system.abilities` is retained only as a legacy compatibility mirror/fallback. New v2 code must not write to it directly, bind editable form fields to it, or treat it as the persistent source of truth.

## Why

The live v2 character sheet form schema already accepts ability edits through `system.attributes.*`, and `DerivedCalculator` computes the canonical derived ability snapshot into `system.derived.attributes.*`. Treating `system.abilities` as writable creates two persistent ability stores and makes level-up, species modifiers, prerequisite checks, skill math, and roll math vulnerable to drift.

## Rules

1. UI form fields for ability editing must use `system.attributes.*`.
2. Progression and ActorEngine mutation plans must write ability changes to `system.attributes.*`.
3. Sheets, rolls, prerequisites, and engine code should read computed totals/modifiers through `SchemaAdapters` or `system.derived.attributes.*`.
4. `system.abilities` may be read only as a compatibility fallback while older actors migrate.
5. Any direct write to `system.abilities.*` requires an explicit migration/adoption reason and should be temporary.

## Guardrail

Run:

```bash
node tools/check-ability-schema-authority.mjs --strict
```

The check flags likely write/bind sites for `system.abilities.*` so new code does not reintroduce the old competing authority.
