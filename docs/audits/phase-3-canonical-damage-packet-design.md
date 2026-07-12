# Phase 3 · Canonical Damage Packet — verification + design

**Status:** Verification + design. **No code.** This is the prerequisite milestone before the component-damage pipeline and D4A immunity.

## The question, answered

> *Does the damage resolver consistently read the weapon's damage type from the weapon schema and carry it through mitigation?*

**No — verified, not assumed.** It is **Option 3** (mixed), and for several important paths it is **Option 2** (type discarded, only a raw number survives). The weapon schema *has* a `damageType` and a correct builder *exists* (`resolveDamagePacketType`, `buildDamageComponents`), and the downstream mitigation pipe *does* forward components — but the **input at the `applyDamage` boundary is inconsistent**, so whether type/components reach the resolver depends entirely on the call path.

## Evidence

### The pipe downstream DOES support it
- `DamageResolutionEngine.resolveDamage(...)` forwards `options` → `DamageMitigationManager.resolve({..., options})` (`damage-resolution-engine.js:186-191`).
- The manager passes `options: context` → `resolveComponentMitigation(...)`, which reads `options.damageComponents ?? options.damagePacket.components` (`damage-mitigation-manager.js:83`, `damage-component-mitigation.js:210-213`).
- So **if a caller supplies `damageComponents`/`damagePacket`, component- and type-aware mitigation runs.** If not, it falls back to single-total, type-blind (`damageType='normal'`).

### The input at the boundary is NOT consistent

| Call path | What it passes | Type carried? | Components? |
|---|---|---|---|
| **Full workflow:** attack → damage card → **Apply** button | `damage.js:145/170/279` build `resolveDamagePacketType` + `damageComponents`; `chat-interaction-bridge.js:209/236/265` decode & forward them | ✅ | ✅ |
| **`rollAndApplyDamage(actor, weapon, token)`** → `applyDamage(token, roll.total)` | **only `roll.total`** (`damage.js:386`, helper sig `:355`) | ❌ dropped | ❌ |
| `DarkSidePowers.js:241/317/1227` → `actor.applyDamage(dmg.damage)` | only a number | ❌ | ❌ |
| `chat-commands.js:71` → `applyDamage(n, {checkThreshold})` | no type | ❌ | ❌ |
| Sith talents → `ActorEngine.applyDamage(t,{amount,type:'force'})` | `type` only | ✅ (force) | ❌ |
| `poison-engine.js:505` → `{damageType:'poison'}` | `type` only | ✅ (poison) | ❌ |
| `damage-engine-test.js` → `{damageType:'kinetic'}` | `type` only | ✅ | ❌ |
| `vehicle-collisions.js:74` → `DamageEngine.applyDamage(target, damage, {...})` | varies | partial | ❌ |

There are also **three different entry signatures** for the same operation:
- `ActorEngine.applyDamage(actor, { amount, type, source, sourceActor, options })`
- `actor.applyDamage(amount, options)` (`SWSEActorBase` → maps `options.damageType`→`type`, forwards `options`)
- `DamageEngine.applyDamage(actor, amount, options)`

### Consequence
- The **main "roll then apply" weapon helper drops type entirely** → mitigation treats it as `normal` → DR-exception, Energy Resistance, and immunity can never evaluate correctly on that path.
- Even paths that pass a `type` string pass **no components**, so mixed damage collapses and per-type mitigation can't run.
- **Lightsaber "ignore DR" is separately fragile:** `_shouldBypassDR` reads the *weapon object* (`isLightsaberWeapon(weapon)`), not a packet field — so any path that passes only a number (no `weapon`) also loses lightsaber-ignore-DR.

---

## Recommended architectural milestone: the Canonical Damage Packet

Make a canonical packet the **single required input** to damage application. Every attack path — weapon, Force power, vehicle weapon, talent, poison, area — builds one via **one** builder; the resolver reads components uniformly.

```js
DamagePacket {
  components: [
    { amount: 12, type: "energy", tags: ["lightsaber", "weapon"], source: weaponId },
    { amount: 4,  type: "fire",   tags: ["burning"],              source: weaponId }
  ],
  // top-level meta (attack-wide)
  source: actorId | itemId,
  sourceActor: actorId | null,
  options: { /* threshold flags, area, autofire, etc. */ }
}
```

- **`type` is required per component** (never inferred to `normal` silently — a missing type is a bug to log, then default from the weapon schema).
- **`tags[]` separates weapon properties from damage type.** Lightsaber = `type:"energy"` (for immunity/resistance/DR-exception) **plus** `tags:["lightsaber"]` (for ignore-DR). These are orthogonal concepts and the packet expresses both:
  - Energy Resistance / immunity / `DR/energy` read `type: "energy"`.
  - Ignore-DR reads `tags` includes `"lightsaber"` (or `bypassDR`).
  - SR still applies (lightsabers do not bypass SR).
- **Single-component attacks** are a 1-element `components` array — same shape, no special case (feeds the unified component pipeline).

### Where it plugs in
- The existing `damage-packet-builder` (`resolveDamagePacketType`, `buildDamageComponents`, `weaponDamageType`) already produces most of this from `weapon.system.damageType` + roll context. Promote it to **the** builder and make `ActorEngine.applyDamage` require a canonical packet (with a compatibility wrapper).
- **Force powers** must set their component `type` (e.g. `force`, or the power's damage descriptor) at build time — do not let them fall through to `normal`.
- **Vehicle weapons** build the same packet shape (type/tags), so vehicle damage type is first-class too.

---

## Migration / fallback policy

- **Add a compatibility wrapper** in `ActorEngine.applyDamage`: if a caller passes a bare number or `{amount, type}` with no `components`, wrap it into a 1-component canonical packet (`type` from `options.damageType`/weapon schema, else logged `normal`). No caller breaks; every caller ends up canonical downstream.
- **Route the bare-number helpers through the builder:** `rollAndApplyDamage`/`applyDamage(token,total)` should build the packet from the weapon it already has (it has `weapon` in `rollAndApplyDamage`), not pass `roll.total` alone.
- **Force/talent/poison direct calls** keep working via the wrapper, but should migrate to set explicit component `type`/`tags`.
- **No schema migration** — `weapon.system.damageType` already exists; this is about *plumbing*, not new fields.

## Implementation phases (after sign-off)

1. **Define** the canonical `DamagePacket` (components + tags) and make `damage-packet-builder` the one producer; add the `ActorEngine.applyDamage` compatibility wrapper.
2. **Route callers:** convert bare-number/`{type}`-only call sites to build a canonical packet (start with the weapon helpers, then Force/talent/poison/vehicle).
3. **Resolver reads components uniformly** (ties into the component-damage pipeline design): SR → Immunity → DR (with per-component exceptions + lightsaber tag) → resistance → HP.
4. **Move `bypassDR`/lightsaber to a packet tag** read by the DR resolver, so it survives paths without a `weapon` object.

## Risks

- **Broad blast radius:** many `applyDamage` call sites. Mitigate with the compatibility wrapper so nothing breaks while callers migrate incrementally.
- **Behavior change where type was previously `normal`:** once a path carries real type, immunity/DR-exception/resistance may now apply where they silently didn't. This is the *fix*, but it changes outcomes and needs tests per path.
- **Tag vs type confusion:** authors must not put `lightsaber` in `type` or `energy` in `tags`. The builder should enforce the split.
- **Double-typing:** ensure a component isn't both collapsed to a string and expanded — the packet's `components[].type` is authoritative; the legacy single `damageType` string becomes a derived convenience only.

## Do-not-touch list

- **Shield math** (D1/D2) — SR unchanged; it reads the packet total and still runs first.
- **DR / resistance math** — unchanged; only their inputs (per-component type + tags) and order change.
- **No immunity implementation yet** — D4A stays blocked until the packet + component pipeline land.
- **Effect/condition immunity** (poison/disease/mind-affecting) — effect layer, unaffected.
- **Special ion/stun/scale** — keep their rules; they become component `type`/`tags` rather than new mechanics.
- No resolver edits, ActiveEffect retargeting, or schema migration in this design phase.

---

## Revised roadmap (this changes the order)

This audit inserts a prerequisite ahead of D4A:

1. **Canonical Damage Packet** (this doc) — make type + components a required, uniformly-built input.
2. **Component-damage pipeline** — unify mitigation on the component array (decisions D-C1..D-C4).
3. **D4A immunity** — now safe, because every attack carries per-component type.
4. **D3 DR (`entries` + exceptions)** and **D4 resistance** — per-component, reading canonical types/tags.

Everything downstream depends on step 1. Recommend doing it before any immunity/resistance code.
