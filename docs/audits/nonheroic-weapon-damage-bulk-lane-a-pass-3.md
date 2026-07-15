# Nonheroic Weapon Damage: Bulk Lane A Promotion, Pass 3

## What this is

The third controlled promotion pass using `tools/promote-nonheroic-damage-
profile-candidates.mjs` (introduced pass 1, generalized with CLI flags in
pass 2). Pass 1 promoted 10 rows, pass 2 promoted 25, this pass promotes 50
-- the largest batch so far, still entirely allowlist-driven with no change
to the tool's fail-loud guarantees.

Promoted records live in a new file,
`data/nonheroic/nonheroic-weapon-damage-profiles.bulk-lane-a-pass-3.json`,
driven by a new allowlist,
`data/nonheroic/generated/nonheroic-profile-promotion-allowlist.pass-3.json`.
Pass 1 and pass 2's allowlists and output files are untouched (re-verified:
both still idempotent at 10 and 25 records respectively after this pass ran).

No tool changes were needed this pass -- the `--allowlist`/`--output`/
`--report-json`/`--report-md`/`--max` flags added in pass 2 already cover
this batch size; this run just passes `--max 50`.

## Selection rules applied

Only `safe-ordinary-weapon-candidate` and `safe-ordinary-weapon-with-delta`
candidates were considered. Before building the allowlist, every actor
already covered by pass 1, pass 2, or any of the 5 existing canonical
`nh1`-`nh5` profile files was excluded up front (70 actor slugs total).
Lightsabers were excluded by name. Weapon families targeted (all with
healthy remaining supply after exclusions): Blaster Pistol, Heavy Blaster
Pistol, Vibroblade, Hold-Out Blaster Pistol, Blaster Carbine, Vibrodagger,
Bowcaster, and (new this pass) Stun Baton -- an ordinary weapon family with
existing canonical precedent (NH-4's `vagaari-infiltrator-stun-baton`
uses the same `typeOverride: "stun"` convention applied here).

Primarily sourced from `packs/nonheroic.db`; **2 of the 50 rows** (`varan-
cormin-hold-out-blaster-pistol`, `naxy-screeger-hold-out-blaster-pistol`)
came from `packs/npc.db` because `nonheroic.db` only had one actor left
with an exact-base-formula Hold-Out Blaster Pistol row after exclusions and
this pass wanted a mix of `base` and `base-plus-delta` rows per weapon
family rather than all-delta. This is a deliberate, minor deviation from
pass 2's "nonheroic.db only" preference -- flagged here rather than done
silently.

**A real data-quality issue was caught before it became a tool failure:**
four candidate rows in the initial selection draft (`rodian-black-sun-vigo`
Heavy Blaster Pistol, `pirate-captain` Vibroblade, `storm-commando` Blaster
Carbine, `ship-captain` Vibrodagger) each have **two identical-looking raw
rows** for the same actor/weapon/formula combination in
`packs/nonheroic.db`'s candidate extraction. Promoting either would have
made the corresponding allowlist entry match 2 candidates instead of 1 --
exactly the ambiguous-match condition the promotion tool aborts the whole
run on. All four were caught during selection (by checking match count per
candidate before writing the allowlist, not by hitting the tool's abort)
and swapped for alternates. This is worth a closer look in a future pass:
it suggests a handful of actors are duplicated in the source pack data
itself, not a promotion-tool bug.

## The 50 promoted records

| Slug | Actor | Weapon | Mode |
|---|---|---|---|
| `elite-wing-security-guard-blaster-pistol` | Elite Wing Security Guard | Blaster Pistol +5 (3d6) | base |
| `imperial-navy-trooper-blaster-pistol` | Imperial Navy Trooper | Blaster Pistol +3 (3d6) | base |
| `mon-calamari-resistance-member-blaster-pistol` | Mon Calamari Resistance Member | Blaster Pistol +4 (3d6) | base |
| `bureaucrat-blaster-pistol` | Bureaucrat | Blaster Pistol +2 (3d6) | base |
| `wing-security-guard-blaster-pistol` | Wing Security Guard | Blaster Pistol +4 (3d6) | base |
| `hired-muscle-blaster-pistol` | Hired Muscle | Blaster Pistol +3 (3d6) | base |
| `death-star-trooper-blaster-pistol` | Death Star Trooper | Blaster Pistol +5 (3d6) | base |
| `soldier-commander-blaster-pistol` | Soldier Commander | Blaster Pistol +10 (3d6+2) | base-plus-delta |
| `star-destroyer-officer-blaster-pistol` | Star Destroyer Officer | Blaster Pistol +5 (3d6+2) | base-plus-delta |
| `dug-fringer-blaster-pistol` | Dug Fringer | Blaster Pistol +4 (3d6+1) | base-plus-delta |
| `elite-death-star-trooper-blaster-pistol` | Elite Death Star Trooper | Blaster Pistol +10 (3d6+4) | base-plus-delta |
| `clone-fighter-pilot-blaster-pistol` | Clone Fighter Pilot | Blaster Pistol +8 (3d6+2) | base-plus-delta |
| `specforce-elite-soldier-blaster-pistol` | SpecForce Elite Soldier | Blaster Pistol +15 (3d6+6) | base-plus-delta |
| `detention-block-guard-blaster-pistol` | Detention Block Guard | Blaster Pistol +7 (3d6+3) | base-plus-delta |
| `krath-warrior-heavy-blaster-pistol` | Krath Warrior | Heavy Blaster Pistol +4 (3d8) | base |
| `imperial-sovereign-protector-heavy-blaster-pistol` | Imperial Sovereign Protector | Heavy Blaster Pistol +18 (3d8+6) | base-plus-delta |
| `core-fleet-covert-agent-heavy-blaster-pistol` | Core Fleet Covert Agent | Heavy Blaster Pistol +4 (3d8+2) | base-plus-delta |
| `specforce-heavy-weapons-specialist-heavy-blaster-pistol` | SpecForce Heavy Weapons Specialist | Heavy Blaster Pistol +9 (3d8+1) | base-plus-delta |
| `rodian-thief-heavy-blaster-pistol` | Rodian Thief | Heavy Blaster Pistol +10 (3d8+4) | base-plus-delta |
| `imperial-shadow-guard-initiate-heavy-blaster-pistol` | Imperial Shadow Guard Initiate | Heavy Blaster Pistol +11 (3d8+4) | base-plus-delta |
| `trandoshan-elite-mercenary-heavy-blaster-pistol` | Trandoshan Elite Mercenary | Heavy Blaster Pistol +15 (3d8+5) | base-plus-delta |
| `isb-informant-heavy-blaster-pistol` | ISB Informant | Heavy Blaster Pistol +7 (3d8+3) | base-plus-delta |
| `specforce-officer-vibroblade` | SpecForce Officer | Vibroblade +8 (2d6+5) | base-plus-delta |
| `imperial-dungeoneer-vibroblade` | Imperial Dungeoneer | Vibroblade +11 (2d6+5) | base-plus-delta |
| `first-order-specialist-vibroblade` | First Order Specialist | Vibroblade +7 (2d6+2) | base-plus-delta |
| `mandalorian-scout-vibroblade` | Mandalorian Scout | Vibroblade +5 (2d6+4) | base-plus-delta |
| `commando-strike-leader-vibroblade` | Commando Strike Leader | Vibroblade +7 (2d6+2) | base-plus-delta |
| `core-fleet-commando-vibroblade` | Core Fleet Commando | Vibroblade +12 (2d6+8) | base-plus-delta |
| `mandalorian-commando-vibroblade` | Mandalorian Commando | Vibroblade +9 (2d6+6) | base-plus-delta |
| `mandalorian-trooper-vibroblade` | Mandalorian Trooper | Vibroblade +7 (2d6+2) | base-plus-delta |
| `trader-hold-out-blaster-pistol` | Trader | Hold-Out Blaster Pistol +3 (3d4) | base |
| `varan-cormin-hold-out-blaster-pistol` | Varan Cormin | Hold-Out Blaster Pistol +3 (3d4) | base |
| `naxy-screeger-hold-out-blaster-pistol` | Naxy Screeger | Hold-Out Blaster Pistol +1 (3d4) | base |
| `gambler-hold-out-blaster-pistol` | Gambler | Hold-Out Blaster Pistol +5 (3d4+2) | base-plus-delta |
| `trandoshan-slaver-hold-out-blaster-pistol` | Trandoshan Slaver | Hold-Out Blaster Pistol +7 (3d4+2) | base-plus-delta |
| `sith-mage-hold-out-blaster-pistol` | Sith Mage | Hold-Out Blaster Pistol +6 (3d4+4) | base-plus-delta |
| `isb-tactical-agent-blaster-carbine` | ISB Tactical Agent | Blaster Carbine +12 (3d8+4) | base-plus-delta |
| `army-soldier-blaster-carbine` | Army Soldier | Blaster Carbine +5 (3d8+1) | base-plus-delta |
| `mandalorian-supercommando-blaster-carbine` | Mandalorian Supercommando | Blaster Carbine +19 (3d8+8) | base-plus-delta |
| `radtrooper-blaster-carbine` | Radtrooper | Blaster Carbine +8 (3d8+1) | base-plus-delta |
| `mercenary-commander-blaster-carbine` | Mercenary Commander | Blaster Carbine +7 (3d8+1) | base-plus-delta |
| `specforce-urban-guerrilla-blaster-carbine` | SpecForce Urban Guerrilla | Blaster Carbine +7 (3d8+2) | base-plus-delta |
| `commando-pathfinder-vibrodagger` | Commando Pathfinder | Vibrodagger +6 (2d4+5) | base-plus-delta |
| `saboteur-vibrodagger` | Saboteur | Vibrodagger +3 (2d4+5) | base-plus-delta |
| `commando-squad-leader-vibrodagger` | Commando Squad Leader | Vibrodagger +16 (2d4+6) | base-plus-delta |
| `noghri-assassin-vibrodagger` | Noghri Assassin | Vibrodagger +10 (2d4+8) | base-plus-delta |
| `wookiee-berserker-bowcaster` | Wookiee Berserker | Bowcaster +7 (3d10) | base |
| `wookiee-freedom-fighter-bowcaster` | Wookiee Freedom Fighter | Bowcaster +3 (3d10+1) | base-plus-delta |
| `core-craft-sentry-stun-baton` | Core Craft Sentry | Stun Baton +7 (2d6+5) | base-plus-dice |
| `csa-trooper-stun-baton` | CSA Trooper | Stun Baton +7 (2d6+2) | base-plus-dice |

11 rows are plain `base`; 37 are `base-plus-delta`; 2 (`core-craft-sentry-
stun-baton`, `csa-trooper-stun-baton`) are `base-plus-dice` -- the first
`base-plus-dice` rows promoted across all three passes. Neither pass 1 nor
pass 2 happened to select any; the tool and generator have always supported
this mode identically.

`Blaster Carbine`, `Vibrodagger`, and `Vibroblade` in this pass skew almost
entirely `base-plus-delta` rather than `base`: the remaining unclaimed
actors for these weapon families (after excluding the 70 already-covered
actors) simply didn't have many exact-base rows left. No selection bias was
applied beyond the per-weapon-family target counts and the base/delta mix
attempted per family -- pass 2 already claimed most of the easy `base` rows
for these families.

## What was excluded

Same hard-excluded statuses as passes 1 and 2 (never reachable through this
tool): `ordinary-weapon-special-mode`, `area-autofire-grenade-special`,
`rider-or-condition`, `formula-unclear`, `natural-or-unarmed`, `no-
compendium-match`, `ambiguous-compendium-match`, `already-profiled`.
`printed-override` remains unreachable through the candidate pipeline
entirely. Lightsabers were excluded by name; nothing else exotic (ARC-9965
Blaster, Sith Tremor Sword, Massassi Lanvarok, etc.) was considered --
supply for the 8 targeted ordinary-weapon families was more than sufficient
to reach 50 without reaching for single-digit-supply exotics.

## Confidence and runtime hydration

Identical policy to passes 1 and 2: every record keeps `confidence:
"manualRequired"`, outside the hydrator's `WIREABLE_CONFIDENCE` set
(`verified` / `sourcebookVerified`). `data/nonheroic/nonheroic-weapon-
damage-profiles.bulk-lane-a-pass-3.json` is **not** added to `scripts/
engine/import/nonheroic-damage-profile-hydrator.js`'s `PROFILE_FILES` list
(re-checked directly after this pass -- still only the original 5 nh1-nh5
files). No runtime hydration occurs from this pass.

## Known limitations / drift (carried over, not fixed here)

- `match.rawIncludes` weapon-name-only limitation: unchanged from passes 1-2.
- `tools/validate-nonheroic-damage-profiles.mjs` staleness: unchanged.
- `nonheroic-weapon-damage-profiles.schema.json`'s `confidence` enum still
  omits `sourcebookVerified`: unchanged.
- **New this pass:** at least 4 actors in `packs/nonheroic.db` have
  duplicate raw candidate rows for the same weapon/formula (see "A real
  data-quality issue" above). Not fixed here -- selection simply avoided
  them. Worth a dedicated look before a much larger future pass, since at
  50-per-pass scale it was still easy to catch by hand; it won't stay that
  way indefinitely.

## Validation performed

```bash
node --check tools/promote-nonheroic-damage-profile-candidates.mjs

node tools/promote-nonheroic-damage-profile-candidates.mjs \
  --allowlist data/nonheroic/generated/nonheroic-profile-promotion-allowlist.pass-3.json \
  --output data/nonheroic/nonheroic-weapon-damage-profiles.bulk-lane-a-pass-3.json \
  --report-json docs/audits/generated/nonheroic-profile-promotion-pass-3.json \
  --report-md docs/audits/generated/nonheroic-profile-promotion-pass-3.md \
  --max 50
# dry run: 50 promoted, 0 skipped, 0 errors, target file NOT created

node tools/promote-nonheroic-damage-profile-candidates.mjs --write \
  --allowlist data/nonheroic/generated/nonheroic-profile-promotion-allowlist.pass-3.json \
  --output data/nonheroic/nonheroic-weapon-damage-profiles.bulk-lane-a-pass-3.json \
  --report-json docs/audits/generated/nonheroic-profile-promotion-pass-3.json \
  --report-md docs/audits/generated/nonheroic-profile-promotion-pass-3.md \
  --max 50
# created target file, 50 records

# re-run --write again: 0 promoted, 50 skipped-already-covered, 0 errors (idempotency)

# regression: pass-1 default invocation and pass-2 explicit-flag invocation
# both re-run after pass-3 existed -- both still 0 promoted / all-already-
# covered (10 and 25 respectively), confirming pass-3 didn't disturb them

node tools/audit-nonheroic-profile-weapon-uuids.mjs
# all 50 new records report "already-valid"; profileFileCount 8, recordCount 142
# (57 nh1-5 + 10 pass-1 + 25 pass-2 + 50 pass-3)
```

All touched/generated JSON files were parsed with `JSON.parse`, and all 5
canonical files plus all 3 bulk pass files were re-parsed to confirm
nothing was disturbed. All 50 new records were manually checked
field-by-field against `nonheroic-weapon-damage-profiles.schema.json`
(required fields, enum values, no duplicate slugs) -- no violations found.

## Boundaries respected

- No actor pack, compendium pack, or existing canonical profile file
  (including pass-1 and pass-2 bulk files) was modified.
- No runtime combat code was touched.
- Exactly 50 rows promoted (`--max 50`, matching this pass's stated cap).
- No record's `confidence` was set to `verified`.
- No `ordinary-weapon-special-mode` row was promoted.
