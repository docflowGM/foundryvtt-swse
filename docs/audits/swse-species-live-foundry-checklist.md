# Species overhaul — live Foundry v13 validation checklist (PR #1037)

Status: **not performed.** Everything below is `OFFLINE_TESTED` at best; none of it is `FOUNDRY_TESTED`. Run on a throwaway world, record the result per row, and report failures against the owning module. Do not merge the PR before this pass.

## 1. Character creation (Chargen shell)
- [ ] Core-only species (e.g. Human, Wookiee, Gamorrean): ability mods, size, speed, languages (Wookiee/Gamorrean Basic is understand-only), starting proficiencies.
- [ ] Bulk-hydrated species with one published profile: variant selector hidden, sole snapshot applied.
- [ ] Multi-publication species (Bith, Chadra-Fan, Chagrian, Chiss, Krevaaki, Neimoidian, Yuuzhan Vong, Barabel): explicit publication selection required; no silent default.
- [ ] Species with an ability-score choice (exclusive modifier sets): Attribute step enforces exactly the printed choice; forged/missing choice rejected.
- [ ] Republic Clone: printed fixed array plus exactly +2 to one score; house-rule setting off by default (RD-017).
- [ ] Held species (Lugubraa, Dashade, Shard, Replica Droid, O'reenian): confirm they do not apply an unverified snapshot.

## 2. Species switching / reselection
- [ ] Switch A→B: A's items, flags, languages, movement, natural weapons and conditional-feat manifest are removed; B's applied; no duplicates.
- [ ] Switch back; re-run finalization twice (idempotent).
- [ ] Legacy actor with a superseded legacy variant (e.g. Devaronian, Pau'an, Elom): sheet opens, stored configuration restored, new selection hides the legacy variant.

## 3. Proficiency grants
- [ ] "Primitive"/"restricted to simple weapons" species lose the printed starting weapon proficiencies and nothing else.
- [ ] Natural-weapon proficiency riders do not grant general proficiency.

## 4. Conditional feats
- [ ] Skill-trained / ability-minimum / BAB-minimum / feat-owned requirements: grant appears only when met, with the species grant key stamped.
- [ ] Adding or removing a qualifying feat on an owned actor (createItem/deleteItem hooks) behaves as described in the status report; rapid add/remove does not double-grant.
- [ ] Missing canonical feat document fails closed (pending reason shown, no partial grant).

## 5. Natural weapons
- [ ] Barabel and other hydrated species: attacks appear as weapon items, dice and printed damage type correct, no provoke-opportunity rider where printed.
- [ ] Species switch removes them; reselection does not duplicate.

## 6. Movement
- [ ] Walkers unaffected.
- [ ] Celegian: no walk speed (null, not 0), fly 6 hover and swim 10 displayed; speed overrides ignore it; token/"move" behavior recorded for RD-018.
- [ ] Bought/derived speed modifiers still apply to species with a printed walk speed.

## 7. Regression pass
- [ ] Sheet open/edit/tab switching, level-up, store/transaction, and combat actions unaffected on a species-bearing actor.

Open owner items affecting this pass: RD-015, RD-016, RD-018 (gameplay), RD-020, plus earlier RD-002…RD-014.
