# Clone Wars Campaign Guide — Complete published droid source-mechanical second pass

**2026-11-02** | **Branch:** `audit/droid-publication-census-2026-10-29` | **Primary:** *Clone Wars Campaign Guide* PDF + uploaded text as search aid.

## What is complete

**40 / 40 publication-specific Clone Wars records have received a detailed source-mechanical review**, across printed pages 66–73, 94, 160–162, 188–202 and 208. The prior 528 selected PDF-field comparisons were supplemented by direct rendered-page review of the primary Systems, Possessions, attack and model-specific rule presentations. This is a SOURCE PASS closeout, not individual model mechanical certification.

| Metric | Total |
|---|---:|
| Publication source identities | **40** |
| Deep-reviewed source identities | **40** |
| Individual droid models | **32** |
| B1 squad-format identities | **1** |
| Vehicle/starfighter-format droid identities | **7** |
| Named installed System instances or unresolved tokens | **211** |
| Printed possession entries | **54** |
| Grouped published feat entries (not unique certified feat IDs) | **179** |
| Grouped published talent entries | **29** |
| Printed skill-result entries | **94** |
| Source-only model constraints | **144** |
| Other explicitly conditional mechanics | **9** |
| Optional narrative programming variants | **1** |
| Printed droid-actor attack groups kept source-only | **162** |
| Vehicle weapon source groups kept source-only | **15** |
| Unresolved inventory / attack source discrepancies | **2** |
| Strict individual mechanical certifications | **0 / 40** |

The component-token count is a mix of individually traced physical parts (early-model pass) and later printed System labels; **211 does not assert 211 verified distinct physical mount positions**. Grouped feats and talents are literal source provenance, not 1:1 canonical compendium links or legal character advancement.

## Important findings across the book

1. **Distinct authorities.** The B1-Series Battle Droid Squad is one squad-format aggregation of four droids, not a chassis granting four independent turns. The seven Confederate vehicles/starfighters (Ground Armored Tank through Hyena-class Bomber) remain vehicles, using vehicle HP/DR, weapons, payloads and speed rules. The Hyena has distinct tactical and starship-scale flying speeds. No vehicle was converted to an individual-droid actor.
2. **Factory equipment and bounded consumables.** P2 Basic is *understand-only* and its astrogation buffer stores four memory units. FX-6 medical tools are not proven generic hands. IM-6 reservoir holds five medpacs; Marksman-H factory blaster is stun-only. A-DSD has 36 missiles; Ultra Droideka's wheeled and walking locomotion are mutually exclusive; Hyena carries six proton torpedoes and six concussion missiles.
3. **Conditional combat rules.** A-DSD Leg Shields cost a move action and last to the next turn. JK-13 Killing Rage activates on its own 0 HP, gives melee bonuses but forbids Use the Force. Octuptarra alternate virus self-destruct affects living creatures using a Fortitude attack, with hit/miss persistent condition consequences. OG-9 critical leg damage can immobilize it without disabling its weapons.
4. **Factory-versus-variant gates.** The optional 5YQ creative-dampener removal has no printed check, cost or numeric bonus. OOM commanders and pilot variants have separately scoped bonus skills/feats; these are not universal factory OOM traits. The examples, lore, weapon lists and equipment descriptions do not create free abilities.
5. **Two unresolved printed-source discrepancies.** BCA-11/X has a *claw melee attack* without a claw in the printed Systems list. IG-86 has *blaster carbine* attack options but a *blaster rifle* Possessions entry. Both retain two opposing source claims and `resolutionStatus: unresolved`.

## Corrections made during final reconciliation

- A-Series Assassin Droid, printed p189, was originally contaminated by A-DSD p188 Systems in an early source overlay. Corrected: heuristic processor, improved sensors/darkvision, synchronized fire circuits, two hands, stabilized weapon mount, vocabulator and locked access; **no A-DSD self-destruct**.
- JK-13 p194 *Killing Rage* original source-only note incorrectly said Use the Force was allowed. Corrected the record to say **loses ability to make Use the Force checks**; trigger is droid's own 0 HP.
- Octuptarra p196 virus self-destruct clarified hit/failed-hit effect and DC15 Treat Injury recovery.
- OG-9 leg-damage source citation corrected from printed p200 to **p201**.

## What is NOT complete

The ledger remains `mechanicalStatus: partial` across **all 40 records**, and no live actor/runtime implementation occurred. Full strict certification still needs mechanical feat/talent identity, physical appendage/mount and carried-item ownership, ammo consumption, optional factory configuration gates, exact heroic character legality, squad combat and vehicle-weapon authority. The wider repository's source schema and automated suite were not run, and live Foundry V13 behavior was not exercised. The existing equipment-component refactor remains separate.

## Checks actually performed

Source identity/order/key invariants, presence of 40 recorded deep-source review checkpoints, distinct authority 32/1/7, all conditional rules and vehicle weapon entries source-cited/non-executable, zero certified/runtime promotions, two contradictory source-claim IDs preserved and unresolved, A-Series systems correction and JK-13 source wording verified. GitHub readback will be checked after push.

**Machine-readable closeout:** `data/audits/droids/clone-source-mechanics-second-pass-closeout.json`.

**Next:** strict mechanical certification (not another general Clone Wars droid page inventory). Other sourcebooks may proceed independently while these 40 remain uncertified.
