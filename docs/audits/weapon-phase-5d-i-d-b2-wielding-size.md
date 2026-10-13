# Phase 5D-I-D-B2 — Effective wielding size, worn weapons, two-handed design, held-together Darksticks

One shared pure resolver (`scripts/items/weapon-runtime/wielding-size.js`, using the runtime's own `SIZE_RANK` vocabulary) feeding the existing `resolveWielding()` and the attack preflight in `scripts/combat/rolls/attacks.js`. No new engine.

## The model
`resolveEffectiveWieldingSize(shape, actorSize, { tripodMounted, beneficialSizeChoice })` returns `baseSize`, `effectiveSize`, `actorSize`, `sizeDelta`, `classification`, `requiredHands`, `source`, `legal`, `pending`, `reason`. Core Rulebook p.120 classes: smaller = **light**, same = **one-handed**, one larger = **two-handed**, two or more larger = **too large**. The class is what the weapon *requires*; the hands *used* stay the wielder's choice (`resolveWielding`: explicit grip → owned grip → mandatory grip (record `requiresTwoHands` or a two-handed class) → unresolved). A one-handed-class weapon may be voluntarily wielded two-handed unless its own rule forbids it (Lightfoil). Too large and an explicit one-handed grip on a two-handed class are refused before any roll or cost; the resolved class is carried in the workflow `attackShape.weaponSizeClass`.

| key(s) | automation | disposition | mechanical effect (production consumer) |
|---|---|---|---|
| `tripodEffectiveSize`, `tripodTreatsAsOneSizeSmallerForWielding` | AUTO | IMPLEMENTED | smaller size **only when a tripod is established** (owner-only `setMounted`, the attack option, or the existing tripod question). Unknown is *pending*: nothing is refused and nothing is assumed. A rifle host (`mountedHostId`) is not a tripod. Absolute size and one-step reduction are never both applied. |
| `mayCountAsSmallWhenBeneficial`, `mayTreatAsSizeWhenBeneficial` | CONTEXTUAL | IMPLEMENTED | the wielder's choice: attack option `beneficialSizeChoice` or the owned choice (`setSizeTreatment`); only the size the record declares; adds no bonus; two-handed use stays refused |
| `sizeRule` (`two_sizes_smaller_than_wearer`) | AUTO | IMPLEMENTED | wearer rank − 2, clamped to Fine; feeds the light classification (the sizeless Stunning Gauntlet used to be never-light) |
| `designedForTwoHandedUse` | AUTO | IMPLEMENTED | metadata + note only; **not** a mandatory grip (the size class decides that); the two-handed Strength result is the existing single doubling |
| `forearmMounted`, `wornOnWrist`, `wornAs` | AUTO | IMPLEMENTED | normalized `wearLocation` (`wrist` / `forearm`; `bracelet/jewelry` is a wrist item): notes and descriptor tokens only. No disarm immunity, hand rule or attack change is derived; disarm protection stays with `resolveDisarmProtection` (Stunning Gauntlet / Vibroknucklers own declarations) |
| `multipleHeldOneHandCountsAsOneWeapon` | AUTO | IMPLEMENTED | the **proficient player names the Item ids** held together in one hand (`setHeldTogether`; never counted from the inventory). `resolveHeldGroup` revalidates the group at every use — proficiency, owned, equipped, not designated off-hand, no overlap with another group — and the attack preflight, profile selection, notes and `DualWieldCombatShapeResolver` all read that one result. A valid group is one weapon slot (no extra attack, no two-weapon penalty) and selects the `melee-grouped` profile (2d8, the same for a third stick); an invalid / stale / forged group falls back to ordinary 1d6 and the grouped profile cannot be named. Thrown stays 1d6. |
| `collapsedForm` | AUTO | DUPLICATE | collapsed/expanded `configurationStates`, swift transition already paid by `setConfiguration` |

## Defect found and fixed: the two-handed Strength doubling never ran for production records
`getDamageAbilityContribution` returned the single Strength modifier whenever the weapon carried `combat.damage.ability = 'str'` — every production melee weapon — before reaching the Phase 5D-I-B two-handed doubling. The 5D-I-B tests used projection-free records. The doubling now runs first for the plain Strength case; explicit `none` / `str2` / `dex*`, ranged, light, legacy and "forgo double Strength" forms are unchanged (tested). **This changes real damage numbers for two-handed melee attacks.**

## Data amendment (builder, not hand edit)
`5D-I-D-B2-held-together-profile` adds the Darkstick `melee-grouped` profile (2d8; activation: held-together ≥ 2 + proficient wielder) and `operation.multipleHeldDamageProfile`, with a precondition on the record's own text. Registry and `packs/weapons*.db` regenerated; only the Darkstick record changed.

## Review corrections (PR #1027)
- **Vehicle exemption**: only a verified installation — the attack routes to a vehicle domain through a real `vehicle` actor that owns this very weapon Item. `vehicleWeapon` / `starshipWeapon` / `weaponSystem` options (or a vehicle that does not own the weapon) prove nothing and are refused.
- **Heavy Blaster Cannon**: the blanket exemption is gone. The record's own `preparedAttack.temporaryOverrides` (braced → Large, wielder Medium or larger) is read as a size rule and applied only when the readiness authority reports the brace done this round or paid with this attack; a Small wielder cannot brace it, a wielder exempt from the brace is not treated as braced, and an unpayable brace refuses the attack.
- **Tripod**: `sizeStateOf` keeps true / false / unknown. The question is asked once when the answer decides legality, **before** the attack-stage conditional modifiers are evaluated, and the single resolved value feeds hands, modifiers, the light classification, damage and the carried `weaponSizeClass`; completed attacks read the carried class instead of re-reading the live Item.
- **Tripod-dependent grip**: when both tripod answers are wieldable but need different grips (a Medium wielder's Large Flame Cannon: two hands off a tripod, one on it) the question is asked once, before the stage modifiers, whenever it changes the requested grip's legality, the melee light class, or whether the weapon can be wielded at all. An unanswered question never authorizes the one-handed grip (`grip-requires-tripod-confirmation`); a grip legal under both answers (two hands) or no stated grip asks nothing.
- **Darkstick equipped state**: `resolveHeldGroup` uses the repository's own `isItemEquipped` for the primary AND every member (a missing `equipped` value is not equipped; readied / flag-based representations count). One resolver serves the attack preflight, profile selection, notes and the dual-wield planner.
- **Darkstick primary ownership**: `resolveHeldGroup` requires the primary to be one of the acting actor's own Items by object identity in `actor.items` (an id, an equipped flag or a `weapon.actor` pointer prove nothing); an unowned primary establishes or retains no group and the explicit `melee-grouped` profile is refused before any roll or cost.
- **Darkstick group**: see the table.

## Judgment calls to confirm
- The thrown Darkstick keeps 1d6 (the text does not say a thrown stick is a held bundle).
- `encumbranceException`, the stock-option keys and `preferredMode` remain with a later owner; the Great Lightsaber `sizeGate` was not touched.

Foundry smoke: NOT RUN.
