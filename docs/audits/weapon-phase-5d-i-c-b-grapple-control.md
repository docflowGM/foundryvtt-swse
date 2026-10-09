# Phase 5D-I-C-B — weapon control: grab / grapple / restrain / net / snare / tractor / hurl

Baseline: `main` @ `4a2a5e22331fb4b2f306d5b1f61f4f315842ab27` (merge of #1016, Phase 5D-I-C-A). Branch `audit/weapon-phase-5d-i-c-b-grapple-control`.
Scope: connect the canonical weapon's control mechanics to the **existing** grab / grapple / Pin / Trip machinery. Block / Deflect / reactions / disarm /
return-on-reaction (I-C-C) and stealth, concealment, slots, durability, upgrades and the general poison-coating question (I-D) are **not** touched.

## 1. What was built (and what was deliberately not)

One coherent path:

```
canonical weapon control declaration  (control-rules.controlDeclarationOf — structured fields only)
  → existing grapple legality / gates   (size gate, range gate, maneuver legality)
  → authoritative control state          (GrappleStateEngine state effect carrying the control record)
  → legal maneuvers + escape             (SWSEGrappling reads the record; uniform escape-options contract)
  → control-bound recurring effects      (existing combatTurn hook, idempotent per control/effect/turn slot)
  → clean termination                    (explicit end reasons; state and record end together)
```

Not created: no `WeaponGrappleEngine`, no `CanonicalGrappleEngine`, no `WeaponRestraintStore`, no second grapple state, no timer, no custom hook,
no feat Items for the Amphistaff entitlement. Nothing reads a census, manifest or ledger at runtime.

New files: `scripts/items/weapon-runtime/control-rules.js` (pure declaration / gates), `scripts/engine/combat/weapon-control-effects.js`
(executor: records → state, recurring processor, control actions), `scripts/engine/combat/falling-object-rules.js` (falling-object authority),
`tools/lib/weapon-phase-5d-i-c-b-ledger.mjs`, `tools/census-weapon-phase-5d-i-c-b-inputs.mjs`, `data/audits/weapon-phase-5d-i-c-b-input-manifest.json`,
`tests/weapon-phase-5d-i-c-b-grapple-control.test.mjs`, this document.

## 2. Audit of the existing grapple architecture (reused as-is)

| Piece | Role | I-C-B use |
|---|---|---|
| `GrappleStateEngine` | state = ActiveEffect with `flags.swse.grappleState`; `advancePair`, `clearPair`, `setState` | control record rides on the same effect; `advancePair` now inherits it across grab → grapple → pin |
| `grapple-state-query.js` (leaf) | pure state lookup | `getControlRecords` added (pure, no project imports) |
| `GrappleLegalityEngine` | ordinary size / reach / free-limb legality | untouched; ordinary grabs still use it |
| `SWSEGrappling` | roll / UI adapter: grab, opposed check, Pin, Trip, Throw, Crush, escape, release | gates maneuvers by the control record, identity-first feat ownership, DC escape routes, Pin/Trip entitlement option |
| `swseGrabAttackPenalty` | Grabber 0 / Entangler −2 / −5 | one rule (`control-rules.grabAttackPenalty`) by canonical ability identity, name only as legacy fallback |
| `handleGrappleActionButton` (chat bridge) | grapple card buttons | `control-*` actions (swift shock, tractor move / hurl) added before the grapple legality dialog |
| I-C-A rider stage | receipts, prompts, status effects, lifecycle | new record kind `weapon-control`; restraint reuses `statusEffectData` / `EffectIntentEngine` (fixed `{rounds:N}` duration added) |

## 3. State model

`grabbed`, `grappled`, `pinned` stay three distinct states. An **equipment restraint** (Adhesive Grenade) is a status effect (`immobilized`), never a
grapple state. A control record holds: `id, state, controllerId, targetId, source{identityKey, weaponId, profileId, workflowId, delegatedFrom},
constraints, maneuvers{allowed, prohibited}, escape[], lockWeapon, shock, recurring[], tractor, processed[], ended/endReason`. It lives on the state effect,
so it cannot outlive the state. Records survive the workflow serializer (`role`, `rangeBand` whitelisted; empty arrays are dropped in transit and every
reader tolerates their absence).

## 4. Per-weapon results

| Weapon | Result |
|---|---|
| Lightwhip | hit initiates a grab (grapple via the ordinary opposed check, control inherited); Pin/Trip allowed, Crush/Throw prohibited even for feat holders; DC 15 Acrobatics escape; **end of the held target's turn**: raw base `2d4` only (no Strength, half level, other modifiers, critical) |
| Amphistaff (whip-pin / whip-trip) | Pin / Trip without owning the feat: weapon declaration + canonical proficiency, whip profiles only, no feat Item; the ordinary "both grappled" precondition and opposed check still apply |
| Garrote | attack treated as a grab (identity preserved, grab penalty by canonical Grabber / Entangler), two hands; **start of the grabbed target's turn**: base `1d6` and −1 CT in addition to the grab; cancelled with the grab |
| Shock Whip | optional free second attack at the normal bonus (no −5), target ≤ 1 size larger (generic size gate); Trip substitution only with the canonical Trip feat; swift `2d6` once per turn, no attack roll; weapon locked to the held target until the control ends |
| Snare Pistol / Rifle | ranged grab capped at **Short** (Rifle value is a source-cited backfill); the 1d4 / 1d6 stun is the weapon's own native-stun damage (never rolled twice); Acrobatics 15 / Strength 20; Pin/Trip allowed, Crush/Throw disallowed |
| Net | ranged grab; Pin/Trip allowed, Crush/Throw disallowed; Acrobatics 15 / Strength 20 |
| Electronet | grabs "as with a normal net" (delegation to Net: maneuvers + escapes); 3d8 stun is the ordinary card damage; **beginning of the ATTACKER's turn** while trapped: 3d8 stun, no modifiers; ends on escape |
| Stokhli Spray Stick | `webbingFunctionsAsNet` delegates to the Net declaration (nothing cloned) |
| Adhesive Grenade | per target: grapple check vs the attacker's ranged attack roll (equals-or-exceeds); failure ⇒ `immobilized` for 3 rounds; attacker not grappling; no further check |
| Tactical Tractor Beam | Huge-or-smaller gate; acquisition = hit vs Reflex then opposed grapple check; maintenance at the controller's turn start; move ≤ 10 squares (structured intent); hurl ≤ 10 squares via a **new** ranged attack vs Reflex; damage from the falling-object authority (see §7) |

## 5. Uniform escape contract

`escapeOptionsFor(actor)` — the opposed grapple check is always legal (Core); a control adds its declared DC routes (Acrobatics 15, Strength 20).
`SWSEGrappling.escapeGrapple` resolves a declared route against its DC; ending the state ends the record.

## 6. Recurring effects and cleanup

Processed through the existing `combatTurn` hook (`handleControlTurnChange`: outgoing combatant ends its turn via `combat.previous`, incoming starts).
Idempotent: the slot id `control:effect:round:actor:point` is recorded **before** damage (at-most-once). A controller or source weapon that is gone
ends the control (`controller-removed`, `weapon-removed`). End reasons are an explicit vocabulary (`CONTROL_END_REASONS`).

## 7. Data findings

* **DATA_COMPLETENESS (backfilled in the canonical SSOT amendments `5D-I-C-B-control-structure-backfill`, source-cited, logged; generated packs never hand-edited):**
  Snare Rifle `maximumGrabRangeIncrement` (Scum and Villainy p.51); Adhesive Grenade `blastEffect.structure` (KotOR CG p.67); Stokhli `treatControlAs`
  (FUCG p.100); Electronet `treatControlAs` (Scum and Villainy p.51); Tractor Beam `tractorControl` (Galaxy at War p.42 / Core p.174).
* **DATA_COMPLETENESS (not fixable from the repo):** the Core falling-object damage table (Table 14-2) — its damage column is illegible in the repo's OCR text
  layer. `FALLING_OBJECT_TABLE` is `null`; `fallingObjectDamage` refuses with `falling-object-table-uncertified`. The beam's hurl therefore refuses *before
  rolling anything* (control kept) until the PDF-certified table is supplied. Owner: final certification. The mechanism is tested with an injected fixture.
* **CONSUMER_DEFECT fixed:** the 5D-H duplicate mapping of `allowedFeats` / `disallowedFeats` to the multi-shot PROHIBITED relation is wrong for their only
  carriers (the snares, where they are grapple maneuver lists); they are now read by the control declaration. `Bone Crusher` (Pistol) is kept as data.
* **CONSUMER_DEFECT fixed:** `ActorAbilityBridge.getFeats` matches feats by registry name, so a canonical feat merely *named* "Pin" impersonated Pin. Feat
  ownership in the grapple adapter is now identity-first (canonical identity decides; name remains the legacy fallback only for items without identity).
* **Uncertainties (documented, not automated further):** the Garrote entry does not state whether Strength / other modifiers apply to the repeated damage —
  base dice only. The −5 grab penalty is applied to the Garrote (explicit `attackTreatedAs: grab`); the ranged Net/Snare "normal grab rules" penalty is not
  asserted by the structured data and is not applied.
* **Open item carried forward — I-C-A poison-coating discrepancy.** The general question of how a *poison coating* selected on a weapon interacts with
  weapons whose canonical entry states different poison handling remains unresolved. It is **not** solved here; owner: **I-D / final certification**.

## 8. Counters

Special-mechanic census: deferred 25 → 10 (I-C-B 15 → 0; remaining I-C-C 7, I-D 3). Closure census: unique unconsumed operation keys 109 → 88, raw
occurrences 144 → 115, operation families without consumer 14 → 12, deferred relation families 7 → 6; `grab-grapple-restrain` 14 unconsumed → 0.
I-C-B manifest: 48 inputs (25 operation keys, 22 special mechanics, 1 relation) — 44 implemented, 3 duplicates, 1 data-completeness, 0 deferred, 0 blocked,
`I_C_B_UNCLASSIFIED = 0`.

## 9. Foundry smoke checklist (prepared — **not** claimed as run)

1. Lightwhip: hit, Apply Damage → grabbed; Grapple check; Pin; Crush/Throw buttons absent/refused; Acrobatics DC 15 escape; end-of-turn base damage.
2. Garrote with one hand refused; two hands: grab −5; GM start-of-turn damage and −1 CT on the grabbed token; escape stops it.
3. Shock Whip: free grab prompt, second roll, size refusal on a 2-size-larger token, Trip substitution with a Trip feat, swift shock button, weapon lock message.
4. Snare Pistol / Rifle at Medium range refused; Short grabs; Strength DC 20 / Acrobatics DC 15 escape buttons on the control card.
5. Net / Electronet / Stokhli: effect-only card, grab, electronet stun at the attacker's turn start, escape ends it.
6. Adhesive Grenade multi-target apply: independent checks, 3-round immobilized, no grapple state.
7. Amphistaff whip-pin / whip-trip without the feats (proficient vs not).
8. Tractor Beam: Gargantuan refused, acquisition, move button (≤ 10), maintenance on the operator's turn, hurl refusal while the table is uncertified.

## 10. Remaining scope

* **I-C-C:** Block / Deflect / reaction / defense interactions / return-on-reaction (7 deferred mechanics).
* **I-D:** stealth & sensing consumption, concealment, weapon-object durability, slots, upgrades, activation empowerment (3 deferred mechanics), the
  poison-coating discrepancy, and the certified falling-object table (final certification).
