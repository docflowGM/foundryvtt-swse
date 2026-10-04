# Feat Tags — Pass 2 / Production Handoff

Status: Pass 1 integrated as **PASS1_COMPLETE / INPUT_TO_PASS2**. It is **not production-final**. No production feat record, pack, or tag was changed.

## What the Pass 1 authority is

`data/audits/feat-tags-semantic-authority.json` (with `docs/audits/feat-tags-semantic-authority.md` and the checkpoint `docs/audits/feat-tags-pass1-complete.md`) is the owner/ChatGPT Pass 1 export, stored byte-for-byte: 353 canonical feat identities, 353 certified semantic assignments (`finalTags`), 15 source groups, 187 approved shared tags, 0 pending, 0 ontology-gap candidates. The JSON is the deterministic input for validation and reports. Its authority chain is: correct identity → canonical rules text → provenance → semantic tags → automation/consumers. Existing production tags are not authority; prerequisites, names, and publication category are not semantic behavior.

## Why it is not production-final

Pass 2 (family/chain consistency, owner/ChatGPT), Pass 3 (talent/feat convergence), and Pass 4 (global QA) may still revise assignments. Production application is Pass 5 (consumer safety, production dry-run, then controlled application). **No `finalTags` may be written to production feat records before Pass 5.**

## The 187-tag vocabulary

The certified 181-tag talent ontology (`data/audits/talent-phase-12-final-ontology-adjudication.json`, `vocabulary.finalVocabulary`) plus six owner-authorized skill tags: `acrobatics`, `climb`, `endurance`, `gather_information`, `jump`, `swim`. Retired tags (`skill-mastery`, `balance`, `natural_weapon`, `entangle`) are not allowed. Spelling is exact; the validator never normalizes. The authority export does not embed the vocabulary list, so the validator derives it from the certified talent ontology file in this repo.

`ability_enhancement`, `acrobatics`, `action_economy`, `alchemy`, `ally-trigger`, `ally_support`, `ambush`, `ambush_defense`, `anti-force`, `armor`, `attack_of_opportunity`, `awareness`, `battlefield_control`, `beast`, `beast_companion`, `biotech`, `block`, `burst_damage`, `climb`, `command`, `concealment`, `condition_removal`, `control`, `counterattack`, `cover`, `crafting`, `critical_hit`, `critical_success`, `damage`, `damage_bonus`, `damage_reduction`, `damage_threshold`, `dark_side`, `dark_side_score`, `deception`, `defense`, `deflect`, `detection`, `double_weapon`, `droid`, `dual_wield`, `durability`, `empowerment`, `endurance`, `equipment`, `evasion`, `exotic_weapon`, `exploration`, `fear`, `feint`, `fighting_defensively`, `flanking`, `followers`, `force`, `force-point`, `force_capacity`, `force_control`, `force_defense`, `force_multiplier`, `force_offense`, `force_point_spend`, `force_power`, `force_power_synergy`, `force_support`, `force_training`, `full_attack`, `galactic_lore`, `gather_information`, `grab`, `grapple`, `healing`, `heavy_weapon`, `illusion`, `implant`, `improvised_weapon`, `infiltration`, `initiative`, `intimidation`, `intrigue`, `investigation`, `jump`, `jury_rig`, `knowledge`, `leadership`, `light_side`, `lightsaber`, `lightsaber_polearm`, `manipulation`, `martial_arts`, `mechanics`, `medical`, `medicine`, `meditation`, `melee`, `melee_defense`, `mind-affecting`, `minion`, `mobility`, `modification`, `morale`, `mount`, `move_action`, `movement`, `nature`, `network`, `nonlethal`, `offense_melee`, `offense_ranged`, `once-per-encounter`, `opposed_check`, `overwatch`, `perception`, `persuasion`, `pilot`, `pistol`, `planning`, `poison`, `positioning`, `power_systems`, `precision`, `precision_damage`, `precognition`, `pursuit`, `ranged`, `ranged_defense`, `reaction`, `recon`, `recovery`, `reliability`, `repair`, `reroll`, `resilience`, `resource_recovery`, `resource_spend`, `resources`, `restrain`, `ride`, `rider`, `scaling`, `science`, `search_your_feelings`, `self_repair`, `senses`, `sensors`, `setup`, `shields`, `skill_mastery`, `skill_substitution`, `skills`, `slicing`, `sniper`, `social`, `social_network`, `space`, `spellcasting`, `standard_action`, `stealth`, `stun`, `support`, `surprise_round`, `survivability`, `survival`, `sustained_damage`, `swift_action`, `swim`, `tactics`, `talisman`, `target-designation`, `targeting`, `teamwork`, `tech`, `telekinesis`, `telepath`, `telepathy`, `temporary-talent`, `tracking`, `trap`, `treat_injury`, `unarmed`, `use_computer`, `use_the_force`, `vehicle`, `visions`, `weapon_empowerment`, `weapon_specialization`, `weapon_training`, `will_defense`

## Skill-completeness rule

If mechanically operative rules text (Benefit, Special, Normal, or other operative text) directly uses, modifies, substitutes for, rerolls, accelerates, resists, or otherwise interacts with a specific SWSE skill, that skill is semantically represented. Prerequisite-only mentions do not qualify; generic all/any-skill mechanics use `skills`; named applications inherit their parent skill (Intimidate and Change Attitude → `persuasion`; Sleight of Hand → `stealth`); bounded skill families expand to each affected skill. `tools/audit-feat-tags-skill-completeness.mjs` is a report-only aid: it scans operative text and lists 7 possible unrepresented interactions as "possible skill interaction not represented — owner review required". It never edits tags.

## Roles

- **Pass 2 (owner/ChatGPT):** adjudicates family and chain consistency, using the evidence below. Family membership is not semantic proof.
- **Claude Code (deterministic support):** validators, reports, and tests only. It does not adjudicate tags, apply tags, or start Pass 3.

## Commands

```
node tools/validate-feat-tags-semantic-authority.mjs
node tools/audit-feat-tags-skill-completeness.mjs
node tools/report-feat-tags-production-reconciliation.mjs
node tools/report-feat-tags-pass2-family-analysis.mjs
node tests/feat-tags-semantic-authority.test.mjs
node tests/feat-tags-skill-completeness.test.mjs
node tests/feat-tags-production-reconciliation.test.mjs
node tests/feat-tags-pass2-family-analysis.test.mjs
```

The reports are deterministic (no timestamps) and write only under `data/audits/` and `docs/audits/`. Run the reconciliation report before the family analysis, since the analysis reads the reconciliation totals.

## Current reconciliation counts (report-only)

| Item | Value |
| --- | ---: |
| Canonical assignments | 353 |
| Canonical records present in production | 351 |
| Canonical identities missing from production (reported, not created) | 2 (c352f81dde5c9dff, c9c4130a55761330) |
| Implementation derivatives (isolated) | 6 |
| Noncanonical records (isolated) | 33 |
| Production records | 390 |
| Records whose production tags already equal Pass 1 | 0 |
| Records with production tags outside the approved vocabulary | 351 |
| Tags to add (present records) | 1512 |
| Tags to remove | 3073 (2755 outside vocabulary, 318 inside) |
| Tags already matching | 271 |

## Pass 2 support: families and statistics

- 65 candidate families; 8 flagged `PASS2_OWNER_REVIEW`. Kinds: CERTIFIED_TIER_FAMILY 3, NAME_PATTERN_FAMILY 2, OWNER_NAMED_CHAIN 7, PREREQUISITE_PARENT_GROUP 44, PUBLICATION_CATEGORY_FAMILY 5, TEXT_KEYED_FAMILY 4.
- Tags used 153 of 187; zero-use 34; singleton 18; feat-only 6; talent-only 34.
- New skill-tag usage: acrobatics 10, climb 10, endurance 9, gather_information 4, jump 10, swim 10.
- Details: `docs/audits/feat-tags-pass2-family-analysis.md` and `data/audits/feat-tags-pass2-family-analysis.json`.

## Items for owner review (reported, not decided)

1. **Flagged families:** Cleave -> Great Cleave; Grapple family (Pin / Crush / Throw / Trip); Power Attack / Powerful Charge / Bantha Rush; Ranged precision family; Tech Specialist family; Attack of opportunity text; Reroll text; Skill substitution text.
2. **Unresolved owner-named chain member:** Improved Rapid Shot (Rapid Shot / Improved Rapid Shot) is not a canonical feat identity.
3. **Skill audit findings (7):** Vehicular Surge → pilot; Gunnery Specialist → pilot; Slammer → treat_injury; Mounted Defense → pilot; Mission Specialist → use_the_force; Momentum Strike → pilot; Logic Upgrade: Skill Swap → use_the_force.
4. **publicationCategory differs** between the Pass 1 export and the Phase 1A identity manifest for Echani Training (Pass 1: MARTIAL_ARTS_FEAT; manifest: GENERAL) and the three Skill Challenge feats (Pass 1: GENERAL; manifest: SKILL_CHALLENGE_FEAT). Category is not semantic; the validator pins the exact set as informational.
5. **Production tags are a mixed taxonomy:** every one of the 351 present canonical records carries production tags outside the approved vocabulary (feat/general/execution/taxonomy/bucket markers, 2755 in total). A full replacement would remove them; consumer safety for these markers belongs to Pass 5.
6. **Retained source conflict:** Pinpoint Accuracy carries `CERTIFIED_PASS1_SEMANTICS_SOURCE_CONFLICT_NON_TAG_DETERMINATIVE`; its tags capture only semantics common to both readings.
7. **Clone Wars pages:** the Pass 1 export uses the certified pp.28/29/31/32 map; the identity manifest on this base still holds the stale map until the provenance closeout (PR #999) merges. Canonical IDs are identical.
8. **Text coverage:** per-feat rules text for the 21 Unknown Regions feats is not embedded in the content authority on this base (the provenance authority in PR #999 embeds it); those feats are scanned against the Pass 1 mechanic summary only.
9. **Phase 1B builder:** on this base `tools/build-feat-phase-1b-reconciliation-authority.mjs` fails closed on an unclassified reference path in `tools/verify-feat-content-authority.mjs` (a hard-coded derivative ID). PR #999 removes that reference. The reconciliation report here reads the committed Phase 1B JSON and is unaffected.

## Boundaries

No production feat record, `packs/feats.db`, `data/feat-catalog.json`, description, prerequisite, automation, class bonus-feat binding, or progression behavior was changed. The two missing canonical identities were not created; the six derivatives and 33 noncanonical records were not touched. Pass 3 was not started.
