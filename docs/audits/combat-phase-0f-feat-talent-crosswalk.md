# Combat Phase 0F — Grapple and Ion Feat/Talent Crosswalk

Audit only. No runtime files were changed.

## Grapple-family feats

| Feat | Found source | Runtime dependency | Current concern |
|---|---|---|---|
| Pin | `packs/feats.db` | Opposed Grapple success, Pinned state, action lock, Dex-loss-to-Reflex | Current Pinned effect appears to use generic -10 Reflex and CT override |
| Trip | `packs/feats.db` | Opposed Grapple success, Prone state, clear Grappled state | Current feat action says attack vs Reflex, not the grapple transition |
| Crush | `packs/feats.db` | Pin success hook and unarmed/claw damage roll | Not clearly wired to Pin result |
| Rancor Crush | `packs/feats.db` | Pin + Crush success and CT shift | Not clearly wired to Pin/Crush result |
| Throw | `packs/feats.db` | Trip success hook, prone placement, damage, clear Grappled | Not clearly wired to Trip result |
| Bone Crusher | `packs/feats.db` | Damage to Grappled target triggers CT movement | Requires damage context to know target is Grappled |
| Pincer | `packs/feats.db` | Pin maintenance beyond 1 round and Swift follow-up checks | Requires Pin duration/maintenance engine |
| Grappling Strike | `packs/feats.db` | Post-melee-hit hook into grapple flow as free action | Requires attack-card follow-up action hook |
| Multi-Grab | `packs/feats.db` | Two-target Grab action | Requires multi-target/GM-assisted target picker |
| Grab Back | `packs/feats.db` | Reaction to missed enemy Grab/Grapple | Requires incoming attack context and reaction hook |
| Grapple Resistance | `packs/feats.db` | +5 Reflex vs Grab/Grapple and +5 opposed Grapple | Partially integrated; needs live routing validation |
| Improved Grapple | `packs/feats.db` / data metadata | +5 grapple checks/no AoO | May be imported expanded content; should not replace Pin/Trip RAW gate |

## Grapple-family talents

| Talent | Found source | Runtime dependency | Current concern |
|---|---|---|---|
| Grabber | `packs/talents.db` | Remove Grab `-5` penalty | Integrated in `swseGrabAttackPenalty()` |
| Entangler | `packs/talents.db` | Grab penalty becomes `-2`; target attack penalty worsens | Penalty reducer exists; target attack penalty not confirmed |
| Strong Grab | `packs/talents.db` | Escaping Grab requires Full-Round Action | Current escape logic does not model automatic Grab escape |
| Expert Grappler | `packs/talents.db` | +2 competence bonus on Grapple attacks | Depends on `abilityMeta.grappleRules` normalization |
| Unbalance Strike | `packs/talents.db` | Grappled opponent loses Strength bonus to melee attacks against you | Requires relationship-specific grapple context |

## Ion-family feats/talents

| Name | Type | Found source | Runtime dependency | Current concern |
|---|---|---|---|---|
| Ion Shielding | Feat | `packs/feats.db` | Cap Ion DT CT movement to 1 step | Hook appears present, but baseline Ion 2-step shift must exist first |
| Ion Resistance 10 | Talent | `packs/talents.db` | DR/resistance applies only to Ion damage | Damage mitigation needs damage-type-specific DR validation |
| Ion Mastery | Talent | `packs/talents.db` | +1 attack and +1 die with Ion weapons | Requires attack/damage context `damageType: ion` |
| Ion Turret | Talent | `packs/talents.db` | Turret damage type becomes Ion | Requires turret weapon damage type propagation |
| Damage Conversion | Feat | `packs/feats.db` | Excludes Ion damage from conversion | Requires damage rules to identify Ion accurately |

## Overall crosswalk finding

The repo has plenty of feat/talent data for grapple and Ion, but the core state/damage context is not reliable enough yet for that metadata to be fully meaningful.

Highest-priority dependencies:

1. canonical grapple state machine,
2. explicit state-transition events,
3. attack/damage context preservation,
4. original-vs-halved special damage packet support,
5. target category/cybernetic eligibility model.
