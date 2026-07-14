# Nonheroic Profile Weapon UUID Metadata

`data/nonheroic/nonheroic-weapon-damage-profiles.*.json` records can carry a
`weapon.uuid` (plus `baseSlug`/`basePack`/`baseFormula`/`baseType`/
`baseFormulaPolicy`) pointing at a compendium weapon item, produced or
audited by `tools/audit-nonheroic-profile-weapon-uuids.mjs`.

Policy:

- **UUID/base fields are metadata, not authority.** They identify which
  compendium weapon item a printed statblock row corresponds to, for
  reference and future tooling. They do not drive combat math.
- **`formula.printed` remains authoritative.** The printed statblock
  formula is what the damage profile represents; the compendium base
  formula is only used to classify the delta (`base`, `base-plus-delta`,
  `base-plus-dice`) between the printed value and the reusable item's base
  damage, per `formula.deltaSource: "printed-statblock"`.
- **`printedAttack` remains metadata-only.** Printed attack bonuses are
  never hydrated into `item.system.attackBonus`; `printedAttack.hydratePolicy`
  stays `metadata-only` or `manual-review`.
- **No sourcebook interpretation was done by the audit tool.** Matching is
  purely mechanical: normalized `weapon.printedName` string matching against
  compendium item names in `packs/weapons*.db`, plus straightforward dice
  delta classification. It does not infer rules, does not resolve
  ambiguous or missing matches on its own, and never assigns a UUID to
  natural/unarmed/special/custom rows.
- Ambiguous matches (for example, an item name that exists identically in
  both a category pack like `weapons-pistols` and the catch-all `weapons`
  pack under the same item id) are resolved to the category-specific pack,
  matching prior curated precedent in this dataset. Genuinely distinct
  ambiguous candidates are left unmatched and reported instead of guessed.

See `docs/audits/generated/nonheroic-profile-weapon-uuid-audit.md` for the
latest audit report (applied matches, already-valid UUIDs, ambiguous
candidates, missing compendium items, stale/invalid UUIDs, and
intentionally skipped custom/natural/unarmed/special rows).

Run `node tools/audit-nonheroic-profile-weapon-uuids.mjs` for a report-only
pass, or add `--write` to apply only unambiguous, exact-name safe matches.
