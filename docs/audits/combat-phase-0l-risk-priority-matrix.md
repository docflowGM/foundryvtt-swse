# SWSE Combat Phase 0L - Risk Priority Matrix

Audit-only phase. No runtime files were changed.

## Critical risks

### 1. Context loss between attack and damage

Why it matters: Burst Fire, Rapid Shot, Deadeye, Stun, Ion, Sonic, Evasion, crit behavior, and area attack behavior all depend on context surviving past the attack roll.

Boundary: automate.

Recommended handling: create context preservation before adding more special-case damage rules.

### 2. Combat action routing ambiguity

Why it matters: player-facing action cards do not reliably declare whether they are attacks, state toggles, full attacks, skill checks, manual references, or GM-managed actions.

Boundary: automate routing; GM manage table-specific outcomes.

Recommended handling: Phase 1 routing contract.

### 3. Action economy RAW seams

Why it matters: if substitution and full-round cost are wrong, every action/state implementation can become wrong even if its individual rule is correct.

Boundary: automate.

Recommended handling: fix before adding action-costed combat modes.

### 4. Grapple state fidelity

Why it matters: Grabbed, Grappled, and Pinned are distinct states. Current evidence suggests penalties, tie handling, feat gates, and escape flows do not fully match baseline rules.

Boundary: assist. The system should roll and track states, but GM may adjudicate edge cases.

Recommended handling: dedicated phase after routing/context foundation.

### 5. Special damage semantics

Why it matters: Stun, Ion, Sonic, Fire, Acid, and Force are not just labels.

Boundary: automate packet math where target data exists; assist/GM manage target traits and hazards where data is incomplete.

Recommended handling: damage packet model.

## High risks

### Burst Fire inheriting Autofire behavior

Burst Fire is a standard-action single-target attack using an autofire-capable weapon. It is not an area attack, does not do half damage on miss, and should not trigger Evasion.

### Evasion area damage handling

Evasion changes area attack damage on hit/miss. It requires hit/miss outcome, areaAttack context, target talent data, and damage packet data.

### Firing into melee and Precise Shot

The system should provide a ranged dialog checkbox for firing into melee. Precise Shot should suppress the normal penalty. Elusive Target should be GM adjudicated/manual because the system cannot reliably know melee engagement from sheet data.

### Fight Defensively and Total Defense

The UI state is useful, but RAW requires action cost and attack restrictions. Acrobatics training changes the Reflex bonus.

### Ammo UI and reload

Ammo counting is houserule-aware. When off, ammo UI should be removed entirely. When on, shot pills, reload buttons, and gates are useful.

## Medium risks

### Healing and repair split

Organic healing, droid repair, object/vehicle repair, biotech repair, and Bonus HP are not the same operation.

### Fire and Acid recurring hazards

Recurring hazards can be assisted through effects/reminders, but full environment handling should stay GM managed.

### Force/Yuuzhan Vong immunity

Requires compound context that may not always be available.

### NPC/follower compatibility

These sheets should reuse the player combat system after it stabilizes.

## Low risks or deferred details

### Exact area placement

Keep GM managed unless a future explicit map mode exists.

### Exact cover and line of sight

Keep GM managed. Use player/GM toggles instead.

### Gear accounting enforcement

Useful later, but current project state treats gear mostly nominally. Use stubs and reminders first.

## Overall priority order

1. Routing contract.
2. Action economy correction.
3. Attack context builder.
4. Chat context preservation.
5. Damage packet model.
6. Full attack gateway.
7. Autofire/Burst Fire/ammo.
8. Stun/Ion/Sonic/Evasion.
9. Fight Defensively/Full Defense persistence.
10. Grapple state machine.
11. Healing/repair packets.
12. NPC/follower reuse.
