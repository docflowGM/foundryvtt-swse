# SWSE Automation Authority

> **SWSE Automation Authority.** The game system executes rules based on verified game state and explicitly supplied context. It does not invent facts about the fictional world, infer unrecorded circumstances, or substitute automated environmental detection for GM adjudication. Maps and automation enhance gameplay but are never prerequisites for using canonical mechanics.

*The GM determines the circumstances. Foundry determines and executes the mechanical consequences.* Foundry is a **rules engine, not a virtual Game Master**. This applies to weapons, talents, feats, Force powers, skills, combat actions, environmental hazards and everything else in the V2 framework. It supplements (and does not weaken) the SSOT, canonical-source, Action Authority and mutation-governance rules.

## 1. Three levels of automation

Every mechanic that needs runtime support is classified at one of three levels.

| Level | Meaning | Foundry does | Examples |
|---|---|---|---|
| **AUTO** | Reliable facts exist in character, item, resource or combat state | Executes through the existing authority; never asks for what it already knows | attack / damage bonuses, recorded proficiency and feats, ammunition and Force Point spending, Swift / Move cost of Draw & Stow, condition-track steps |
| **CONTEXTUAL** | The rule is executable, but one fact is only known to a player or the GM | Asks for / accepts that single fact (existing dialog, skill-use context, workflow option), then executes the mechanical consequence | target has concealment (None / 20% / 50%), *which* weapon is being concealed or used to snipe, terrain is forest / jungle, who is inside a smoke cloud |
| **GM_ADJUDICATED** | The outcome is narrative judgment | Presents the canonical rule and its source, offers optional controls, applies any mechanical consequence the GM establishes; **does not decide** | does a silent attack alert a guard, does a hidden shooter reveal their position, is an unusual action possible |

GM-adjudicated is **supported**, not unsupported: correct presentation + contextual input + existing mechanical execution is a complete implementation. Displaying text alone is *not* proof of automated execution.

## 2. Unknown is not false

Every contextual fact has three states:

* **TRUE** – the circumstance is established.
* **FALSE** – it is explicitly established not to apply.
* **UNKNOWN** – the system lacks reliable information.

No map, no token, no scene, an empty field or an incomplete sheet is **UNKNOWN**, never "no cover", "no concealment", "ordinary terrain" or "nobody heard". For optional modifiers an unknown fact applies nothing and is reported (never silently defaulted); where legality, resource expenditure or an irreversible mutation depends on the fact, the mechanic fails closed or uses the established PROMPT behavior.

## 3. GM authority, provenance and overrides

Four different sources of information are kept distinct and labelled where they reach the player:

| Source | Example provenance |
|---|---|
| **A. Canonical rule** | "+5 equipment bonus to Stealth to conceal it (Contact Stunner, Unknown Regions p.36)" |
| **B. Observed state** | owned / carried item, quantity, proficiency, recorded feats, ammunition |
| **C. Adjudicated context** | "Concealment (20%) — GM-established" , "terrain: forest — stated" |
| **D. Override** | "Concealment disregarded — GM override" |

An override changes the result for that situation. It never rewrites canonical weapon data, never bypasses `ActorEngine`, action economy or resource governance, and reuses existing override / context mechanisms rather than inventing a parallel one.

## 4. Maps are optional

Canonical mechanics must work with no map, no tokens, incomplete walls / lighting, or a GM who runs the scene narratively. If Foundry V13 can reliably supply scene geometry it may *suggest* a contextual answer as an optional assistant, but a suggestion is never an absolute ruling and the GM can always override it. Missing canvas data never silently disables a mechanic. **No general visibility, line-of-sight, sound-propagation, stealth-detection or environmental-simulation engine is authorized by this policy**; such a system needs separate architectural justification and explicit approval.

## 5. Context lifecycle and prompt minimization

Ask only for a fact that materially changes the rule being executed, in this order of preference: already-recorded context → context supplied in the current workflow → an option in an existing dialog → one focused prompt → GM-managed resolution. Reuse an answer inside its valid scope (one skill use, one attack, one round, one scene) and never let it leak to another target, attack, round or scene. An unanswered or closed prompt applies nothing.

## 6. Rules execution vs. narrative adjudication

Automate the **consequence** of a decision, not the decision. Example: the GM rules that the stormtroopers have concealment (contextual fact); Foundry rolls the 20% miss chance. Foundry does not work out who is standing in the smoke. Arithmetic the system can compute is never pushed to the GM: if an attack costs two ammunition units Foundry spends two.

## 7. Audit and certification

* The historical Phase 5D-H closure census and its counters keep their original meaning and are never redefined to show progress. They change only when production evidence satisfies their original accounting rules.
* The I-D manifest adds **automation level** (`AUTO` / `CONTEXTUAL` / `GM_ADJUDICATED`) and **smallest outstanding support gap** as additional dimensions:
  * `INTEGRATION_PENDING` – an existing authority is not yet connected to the production call path;
  * `CONTEXT_SURFACE_PENDING` – the consequence already executes from supplied context, but the weapon-declared fact / duration is not surfaced into the workflow;
  * `PRESENTATION_PENDING` – GM-adjudicated; the rule must be presented, there is no numeric consumer;
  * `MISSING_CONSUMER` – a numeric / status consequence exists and **no mechanical consumer exists** (the only case that is `BLOCKED`).
* A mechanic is **not** blocked because Foundry cannot observe the world. Smoke concealment is playable (CONTEXTUAL) even though who stands in the smoke is unknown to the system; "can the rule execute once the GM supplies the missing circumstance?" is the test. If yes, implement that; if no, name the *smallest* missing capability.
* A BLOCKED / absent-subsystem claim is guarded by a **tripwire** (a declared-absence scan) that fails the census when the capability appears.

## 8. Mutation and SSOT boundaries

Contextual answers feed existing authorities (`ActorEngine`, action economy, `InventoryEngine`, `FireStateStore`, the skill-roll pipeline, `ModifierEngine`, `EquipmentSkillHookResolver`). They are roll / workflow inputs, not stored world state, unless an existing state contract already owns that state. No parallel ledger, engine or registry is created to hold a supplied circumstance.

## 9. Worked examples

| Mechanic | Level | Behaviour |
|---|---|---|
| Hold-out blaster, Contact Stunner (+5 equipment, conceal) | CONTEXTUAL | Bonus applies when the player chooses the *Conceal item on self* use and names that weapon; no item named → nothing applied and the player is told |
| Ascension Gun (-5 to conceal) | CONTEXTUAL | A real penalty for that weapon only; never discarded by "best equipment bonus" selection |
| Magna-Caster (+5 to snipe) | CONTEXTUAL | Only on the *Snipe* use with that weapon |
| Wookiee Ryyk Blade (+2 Basic Survival) | AUTO + CONTEXTUAL | Carried + proficient are observed; the forest / jungle terrain is stated |
| Smoke / Gas Grenade | CONTEXTUAL | GM selects the concealment level in the attack dialog; Foundry rolls the miss chance; cloud rule and duration are surfaced and timed on the existing clock; no cloud geometry |
| Gas Grenade impact (CT -2 / Evasion -1) | AUTO | Already implemented (I-C-A); never reapplied by the cloud |
| Xerrol Nightstinger, Vibrorapier, Sonic Stunner | GM_ADJUDICATED | Rule presented; nobody is marked hidden / deaf automatically; Sonic Stunner damage applies normally |
| Mortar Launcher LOS origin | GM_ADJUDICATED | Rule presented; LOS stays a supplied fact |
| Radiation Grenade | CONTEXTUAL (who) + MISSING_CONSUMER (exposure level) | GM states who is exposed; the exposure-level consumer is the genuinely missing capability |
