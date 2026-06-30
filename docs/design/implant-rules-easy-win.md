# Phase 4A — Implant Rules Foundation, Will Defense, and Condition Track

Phase 4A implements only the global downside rules that are safe to automate:

- A character with an active Implant takes a -2 penalty to Will Defense.
- A character with an active Implant moves 1 extra step down the Condition Track whenever a downward CT shift is applied.
- The Implant Training feat suppresses both penalties.

## Scope boundary

This is intentionally not a full Cybernetic Surgery or cybernetic-device workbench.

Cybernetic Surgery remains a procedural/GM-facing installation rule: it tells who can install cybernetic devices, how long surgery takes, and the Treat Injury DC. The code added here does not spend credits, consume surgery kits, create devices, run an installation clock, or adjudicate failed surgery.

Generic cybernetic prostheses are also not automatically treated as KOTOR-style Implants. To count an equipment item as an Implant, mark it with one of the implant identifiers below and make it active through equipped, installed, or integrated state.

## Item metadata contract

An owned `equipment` item counts as an active Implant when it is implant-tagged and active.

Accepted implant identifiers include:

```text
system.equipmentType = implant
system.category = implant
system.itemRole = implant
system.tags includes implant
system.properties includes implant
system.implantRules.countAsImplant = true
```

Accepted active states include:

```text
system.equipped = true
system.installed = true
system.integrated = true
system.usage.equipped = true
system.usage.installed = true
system.usage.integrated = true
system.implantRules.activeByOwnership = true
```

Actor-level flags also work for quick GM handling:

```text
system.hasImplant = true
system.implantRules.hasImplant = true
flags.swse.hasImplant = true
```

## Where the rules are wired

- `scripts/engine/implants/ImplantRules.js` owns implant detection and Implant Training suppression.
- `scripts/actors/derived/defense-calculator.js` applies the Will Defense penalty.
- `scripts/governance/actor-engine/actor-engine.js` applies the extra downward Condition Track step through `applyConditionShift`.
- `scripts/actors/v2/base-actor.js` exposes `system.derived.implants` for sheet/debug visibility.

## Future work

A future Cybernetic Surgery phase could add a GM medical/workbench workflow. That should be separate from these global implant penalties.
