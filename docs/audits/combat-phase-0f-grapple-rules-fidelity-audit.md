# Combat Phase 0F — Grapple / Grab / Pin Rules Fidelity Audit

Audit only. No runtime files were changed.

## Scope

This pass audits the current grapple stack against the baseline three-state SWSE flow:

- **Grabbed**
- **Grappled**
- **Pinned**

It also accounts for the live code paths that appear to exist in this repo snapshot:

- `scripts/combat/systems/grappling-system.js`
- `scripts/houserules/houserule-grapple.js`
- `data/combat-actions.json`
- `data/feat-combat-actions.json`
- `packs/feats.db`
- `packs/talents.db`
- derived grapple display paths in sheet context/resources

## Executive finding

The repo has a useful grapple skeleton, but it is **not yet a trustworthy RAW implementation**. The problem is not absence of grapple code. The problem is mismatch between:

1. the rules flow,
2. the combat action database,
3. the enhanced `SWSEGrappling` runtime system,
4. the house-rule `GrappleMechanics` helper,
5. feat/talent metadata, and
6. visible sheet action routing.

Current classification: **good skeleton, unsafe fidelity, unclear live routing**.

## Rule baseline used for this audit

### Grab attempt

- Standard Action.
- Make an unarmed melee attack against target Reflex Defense.
- Untrained grabbers take a `-5` penalty.
- Characters with the correct grapple training gate can avoid that penalty and may immediately try to improve the Grab into a Grapple.
- If the attack hits, the target becomes **Grabbed**.

### Grabbed state

- Target cannot move from its square.
- Target takes `-2` to attacks unless using a natural weapon or light weapon.
- Target remains Grabbed until escape, release, or upgrade to Grappled.
- Escaping a Grab is a Standard Action and automatic, up to a number of grabs equal to character level.

### Grapple upgrade

- A trained attacker may improve a successful Grab into a Grapple as part of the same Standard Action.
- Both sides make opposed Grapple checks.
- Attacker succeeds on meet-or-beat, unless a specific rule says otherwise.
- If the attacker wins, defender becomes **Grappled**.
- If the defender wins the opposed check, the special follow-up fails; the target does not necessarily escape the existing Grab.

### Grappled state

- Same baseline restrictions as Grabbed: cannot move, `-2` attacks unless natural/light weapon.
- Escape is harder: Standard Action, Acrobatics check against the attacker's last opposed Grapple check result.
- Grappled state enables Pin, Trip, light/natural weapon damage, Crush-style effects, and similar feats.

### Pinned state

- Requires Pin feat.
- A Pinned target is also Grappled.
- Target cannot move or take any actions.
- Target loses Dexterity bonus to Reflex Defense.
- Pin lasts until the attacker's next turn unless maintained.
- Maintaining Pin uses an opposed Grapple check; no new melee attack roll is needed.

### Trip from grapple

- Requires Trip feat.
- On successful opposed Grapple check, target falls Prone and is no longer Grappled.

## Current code inventory

### `scripts/combat/systems/grappling-system.js`

This is the strongest grapple file. It provides:

- `SWSEGrappling.attemptGrab(attacker, target)`
- `SWSEGrappling.grappleCheck(attacker, defender, options)`
- `SWSEGrappling.attemptPin(attacker, defender)`
- `SWSEGrappling.escapeGrapple(escaper, grappler)`
- `_applyState(actor, state, sourceActor)` for Grabbed/Grappled/Pinned Active Effects
- `_rollGrappleBonus(actor, context)`
- chat card creation for grab and grapple check results

Good skeleton pieces:

- Grab is modeled as an attack vs Reflex.
- Grab uses a virtual unarmed weapon.
- Attack-vs-Reflex uses meet-or-beat.
- Grapple bonus uses BAB + Strength + size modifier + species grapple bonus.
- Grapple Resistance support is partially integrated.
- Pin has a direct method and feat gate.
- Grapple states are stored as Active Effects with `flags.swse.grapple`.

Unsafe seams:

- Opposed grapple uses strict `>` instead of meet-or-beat.
- A tie returns without success, but RAW attacker should usually win if attacker equals/exceeds defender in this flow.
- Grab penalty relief checks `Grabber` and `Entangler`, not the baseline Pin/Trip training gate.
- Grappled is applied to both attacker and defender.
- Grabbed/Grappled effects apply Reflex penalties, which is not the baseline Grabbed/Grappled rule.
- Pinned applies `system.defenses.reflex.bonus = -10` and condition-track override; RAW is “lose Dex bonus to Reflex” and “cannot take actions,” not generic -10 or forced CT bottom.
- Escape Grapple is modeled as another opposed grapple check, but RAW escape differs by state: Grabbed automatic, Grappled Acrobatics vs last grapple result, Pinned escape on attacker's turn by opposed check.
- `grappleCheck` does not appear to persist the attacker’s last grapple result for later escape DC.
- Trip flow is not implemented as a state transition in this file.
- Crush/Throw/Rancor Crush/Bone Crusher-style effects are not visibly integrated into the state machine.

### `scripts/houserules/houserule-grapple.js`

This file defines `GrappleMechanics`, a separate grapple helper:

- `getGrappleDC(target)`
- `canGrapple(actor)`
- `performGrappleCheck(grappler, target)`

It appears to model a house-rule DC approach rather than the enhanced state machine.

Risk:

- It reads settings through `CombatRules` and computes a DC based on target BAB.
- It does not model Grabbed/Grappled/Pinned state transitions.
- It does not appear to call `SWSEGrappling`.
- It may coexist as a parallel implementation rather than a rules adapter.

Classification: **parallel house-rule helper, not canonical RAW state machine**.

### `data/combat-actions.json`

The `Grapple / Grab` combat action exists and is listed as Standard Action. It says:

- unarmed attack to grab at `-5`
- if hit, make opposed grapple checks
- Grapple uses STR or DEX + BAB + size
- Grappled target denied movement and `-2` attack unless light weapon

Gaps:

- The action database compresses Grab and Grapple into one action card.
- It says STR or DEX + BAB + size, while `SWSEGrappling._rollGrappleBonus()` appears to use Strength only.
- It does not encode Pin/Trip feat gates for immediate grapple upgrade.
- It does not describe Grabbed vs Grappled vs Pinned as separate states.
- It does not expose route metadata saying whether it should call `SWSEGrappling.attemptGrab()`.

### `data/feat-combat-actions.json`

The following feat-action entries exist:

- `pin`
- `trip`
- `improved-grapple`

Gaps:

- `pin` says “immobilize a grappled opponent,” but RAW Pin prevents all actions and removes Dex bonus to Reflex.
- `trip` says “make attack roll vs Reflex Defense,” but the grapple-specific Trip flow is opposed Grapple after grapple success.
- `improved-grapple` exists even though this is not a normal SWSE Core feat in the same way D&D uses it. It may be from imported/expanded content and should be kept separate from RAW Pin/Trip gating.

## Feat/talent crosswalk findings

### Feats found in `packs/feats.db`

| Name | Current description intent | Grapple dependency |
|---|---|---|
| Pin | Opposed Grapple success pins target | Requires correct Grappled/Pinned state and Dex-loss-to-Reflex modeling |
| Trip | Opposed Grapple success makes target Prone and no longer Grappled | Requires grapple check state transition |
| Crush | Damage after successful Pin | Requires Pin resolution hook |
| Rancor Crush | CT movement after Pin + Crush | Requires Pin+Crush hook and CT shift |
| Throw | Adds throw/prone/damage after Trip | Requires Trip resolution hook |
| Bone Crusher | CT shift when damaging a Grappled opponent | Requires damage context `targetIsGrappled` |
| Pincer | Maintain Pin beyond 1 round, swift follow-up checks, apply Crush | Requires Pin duration and maintenance model |
| Grappling Strike | After melee hit, initiate grapple as free action | Requires post-hit action hook into grab/grapple flow |
| Multi-Grab | Grab two adjacent targets as Standard Action | Requires multi-target grab UI/manual GM target handling |
| Grab Back | Reaction Grab after enemy misses Grab/Grapple | Requires reaction hook and detection of incoming Grab/Grapple miss |
| Grapple Resistance | +5 Reflex vs Grab/Grapple and +5 opposed checks | Partially integrated in `attemptGrab` and `_rollGrappleBonus` |

### Talents found in `packs/talents.db`

| Name | Current description intent | Grapple dependency |
|---|---|---|
| Grabber | No `-5` penalty when using Grab | Integrated as a penalty reducer in `swseGrabAttackPenalty()` |
| Entangler | Grab at `-2`; grabbed target takes `-5` attack penalty including natural/light weapons | Integrated as penalty reducer, but target attack penalty not modeled visibly |
| Strong Grab | Target needs Full-Round Action to break Grab | Requires Grabbed escape flow; current escape method does not model automatic Grab escape |
| Expert Grappler | +2 competence bonus on Grapple attacks | Metadata appears present; `swseTalentGrappleBonus()` can consume `abilityMeta.grappleRules` if normalized correctly |
| Unbalance Strike | Grappled opponent loses Strength bonus to melee attacks against you | Requires target-specific grapple relationship context |

## Meets-beats finding

`attemptGrab()` uses meet-or-beat against Reflex:

```js
const hit = (total >= reflex) || natural20;
```

`grappleCheck()` uses strict greater-than:

```js
const attackerWins = atkRoll.total > defRoll.total;
```

This is a direct rules-fidelity seam. Any opposed check where the attacker should succeed by equaling or exceeding the defender should use `>=` or an explicit tie policy.

## State modeling findings

### Grabbed

Current implementation:

- Active Effect with `flags.swse.grapple = 'grabbed'`.
- Adds `system.defenses.reflex.bonus = -5`.

Expected baseline:

- Cannot move.
- `-2` to attacks unless natural/light weapon.
- No generic Reflex penalty.
- Escape is automatic Standard Action.

Severity: **high**.

### Grappled

Current implementation:

- Active Effect with `flags.swse.grapple = 'grappled'`.
- Adds `system.defenses.reflex.bonus = -5`.
- Applied to both attacker and defender on successful check.

Expected baseline:

- Defender remains unable to move.
- Defender has `-2` attack penalty unless natural/light weapon.
- No generic Reflex penalty.
- Attacker may have constrained actions, but applying the same mechanical debuff to both actors is risky unless the effect is purely descriptive.

Severity: **high**.

### Pinned

Current implementation:

- Active Effect with `flags.swse.grapple = 'pinned'`.
- Adds `system.defenses.reflex.bonus = -10`.
- Overrides `system.conditionTrack.current = 5`.

Expected baseline:

- Cannot move or take actions.
- Loses Dexterity bonus to Reflex.
- Still Grappled.
- Pin duration should expire at the correct point unless maintained.
- Should not force bottom of condition track by itself.

Severity: **critical** if this path is live.

## Live routing uncertainty

I found the enhanced grapple system, but this audit did not prove that the visible combat-tab `Grapple / Grab` button reliably calls `SWSEGrappling.attemptGrab()`. The action database lacks a route key such as:

```json
{
  "resolutionMode": "grapple",
  "handler": "SWSEGrappling.attemptGrab"
}
```

Until live event routing is traced in a later call-path audit, this remains:

> Grapple code exists, but live sheet access is unclear.

## Automation boundary recommendation

Grapple should be **assisted automation**, not full tactical automation.

Automate:

- attack roll for Grab
- penalty based on Pin/Trip/Grabber/Entangler/etc.
- opposed Grapple check
- meet-or-beat result
- state application when player/GM confirms
- attack penalty while Grabbed/Grappled
- Dex-to-Reflex removal while Pinned
- action block while Pinned
- state display in Summary/Combat

Assist/GM-managed:

- whether target is physically reachable
- whether a target has appropriate anatomy
- exact occupied square/path implications
- whether unusual weapons count as light/natural
- multi-target grab adjacency
- net edge cases
- release/forced movement edge cases

## Recommended future implementation shape

Do not preserve two parallel grapple systems as peers.

Recommended direction:

1. Make `SWSEGrappling` the canonical state-machine engine.
2. Convert `GrappleMechanics` into a house-rule adapter or retire it from live routing.
3. Split the UI into explicit state-aware actions:
   - Grab
   - Improve to Grapple
   - Pin
   - Trip
   - Maintain Pin
   - Escape Grab
   - Escape Grapple
   - Release
4. Make effects semantic instead of generic defense penalties:
   - `flags.swse.combatState.grabbed`
   - `flags.swse.combatState.grappled`
   - `flags.swse.combatState.pinned`
   - derived attack penalties/defense changes resolve from state
5. Store `lastGrappleCheckTotal` for escape DC.
6. Make feat/talent hooks consume the state transition events.

## Top 0F grapple seams

1. **Pinned applies condition-track bottom instead of action lock + Dex loss.**
2. **Grabbed/Grappled apply Reflex penalties that do not match baseline rules.**
3. **Opposed grapple uses strict `>` instead of meet-or-beat.**
4. **Escape logic does not distinguish Grabbed, Grappled, and Pinned.**
5. **Pin/Trip training gate is not aligned with immediate upgrade flow.**
6. **Trip, Throw, Crush, Rancor Crush, Bone Crusher, and Pincer need state-transition hooks.**
7. **Visible combat action routing to the enhanced system is unclear.**
