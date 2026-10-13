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
| `multipleHeldOneHandCountsAsOneWeapon` | AUTO | IMPLEMENTED | the **proficient player establishes** N Darksticks held together in one hand (`setHeldTogetherCount`; never counted from the inventory): one weapon slot in `DualWieldCombatShapeResolver` (no two-weapon penalty, no extra attack), and the `melee-grouped` profile (2d8, same for a third stick) is selected through the existing profile authority; thrown stays 1d6; an unproficient / forged / unnamed claim fails |
| `collapsedForm` | AUTO | DUPLICATE | collapsed/expanded `configurationStates`, swift transition already paid by `setConfiguration` |

## Defect found and fixed: the two-handed Strength doubling never ran for production records
`getDamageAbilityContribution` returned the single Strength modifier whenever the weapon carried `combat.damage.ability = 'str'` — every production melee weapon — before reaching the Phase 5D-I-B two-handed doubling. The 5D-I-B tests used projection-free records. The doubling now runs first for the plain Strength case; explicit `none` / `str2` / `dex*`, ranged, light, legacy and "forgo double Strength" forms are unchanged (tested). **This changes real damage numbers for two-handed melee attacks.**

## Data amendment (builder, not hand edit)
`5D-I-D-B2-held-together-profile` adds the Darkstick `melee-grouped` profile (2d8; activation: held-together ≥ 2 + proficient wielder) and `operation.multipleHeldDamageProfile`, with a precondition on the record's own text. Registry and `packs/weapons*.db` regenerated; only the Darkstick record changed.

## Judgment calls to confirm
- **Exempt from the size gate**: vehicle / starship weapons (`actor.type === 'vehicle'` or the existing vehicle-weapon flags) and forms with a published size-dependent preparation rule (`exemptAboveWielderSize`: the heavy-weapon brace). Certified behaviour has a Medium wielder bracing the Huge Heavy Blaster Cannon, so Core p.120 cannot gate it; the brace rule is its published route.
- The thrown Darkstick keeps 1d6 (the text does not say a thrown stick is a held bundle).
- `encumbranceException`, the stock-option keys and `preferredMode` remain with a later owner; the Great Lightsaber `sizeGate` was not touched.

Foundry smoke: NOT RUN.
