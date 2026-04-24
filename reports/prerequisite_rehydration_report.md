# Prerequisite Rehydration Report

Generated from the uploaded canon files `feats.txt` and `talents.txt`.

## Canon counts
- Feat rows parsed: 354
- Unique feat names: 352
- Talent blocks parsed: 1015
- Unique talent names: 993

## Authority files
- `scripts/data/prerequisite-authority.js`

## Pack updates
- `packs/feats.db` text fields changed: 446
- `packs/talents.db` text fields changed: 576

## Ambiguous duplicate canon names
These names appeared multiple times in the canon text with differing prerequisite or description text, so pack text was not blindly overwritten for them.

### Feats
- Echani Training
- Staggering Attack

### Talents
- Ambush
- Armor Mastery
- Blend In
- Combined Fire
- Commanding Presence
- Force Treatment
- Get Into Position
- Keep Them Reeling
- Keep it Together
- Lead by Example
- Master Manipulator
- Mobile Combatant
- Multiattack Proficiency (Advanced Melee Weapons)
- Multiattack Proficiency (Rifles)
- Notorious
- Out of Harm's Way
- Ruthless
- Seize the Moment
- Sith Alchemy
- Slip By
- Stay in the Fight

## Notes
- Feat stable IDs were backfilled into `flags.swse.id` when missing.
- Pack prerequisite text was updated only for unambiguous canon name matches.
- Description backfill was conservative: blank or obviously corrupted descriptions were replaced from canon.
