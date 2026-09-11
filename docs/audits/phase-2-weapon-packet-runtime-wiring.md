# Phase 2 — Character Weapon Damage Packet Runtime Wiring

Status: implemented and wired into the live damage path.
Contract: `docs/systems/CANONICAL_DAMAGE_PACKET.md` (swse.damage.packet.v2).
Prerequisite: `docs/audits/phase-0-damage-packet-recalibration-audit.md` (Phase 0),
Phase 1 canonical damage profile registry (`scripts/engine/combat/damage-profile-registry.js`,
`data/combat/damage-profiles.*.json`, `tools/audit-damage-profiles.mjs`).

## What was wired

`scripts/engine/combat/builders/weapon-damage-packet-builder.js` exports
`enhanceWeaponDamagePacket(v1Packet, { weapon, ... })`, which
`buildDamagePacket()` in `scripts/engine/combat/damage-packet-builder.js`
calls for **every** weapon-backed damage packet, immediately before
`finalizeDamagePacketForTarget()`. It is additive: it takes the v1 packet
already produced by the existing builder and layers the v2 axes on top
(`delivery`, `attackShape`, `scale`, `sourceId`/`sourceName`, `tags`,
`attack`, `area`, `riders`), without recomputing amount/type math except
where a wireable profile's area shape reconciles an already-decided
half-on-miss disposition (`reconcileDisposition`) — this does not change
totals for any weapon that was not already flagged as an area attack by the
v1 disposition resolver.

Routing (the "smoking gun" the user asked to close):
`rollAndApplyDamage(actor, weapon, token, context)` in
`scripts/combat/rolls/damage.js` builds a full packet via `buildDamagePacket()`
and applies it through `DamageSystem.applyPacketToActor()` whenever a target
is resolvable, instead of collapsing to `applyDamage(token, roll.total)`
(bare-number legacy path). A known weapon now always reaches mitigation with
its type + tags intact; the bare-number `applyDamage()` path is used only
when there is truly no target to resolve.

### Profile gate

Only `confidence: "verified"` profiles from the Phase 1 registry can select
an overlay (`damageProfileRegistry.getWireable(...)`). Family profiles used
this phase, from `data/combat/damage-profiles.weapon.json` and
`data/combat/damage-profiles.area.json`:

- `weapon-single-target` (default)
- `lightsaber` (adds the `lightsaber` tag; DR bypass stays tag-based, never
  inferred from the energy damage type)
- `stun-mode` / `ion-weapon` (selected by the *resolved* packet type, i.e.
  the workflow/options override, not the weapon's printed default)
- `grenade` (character weapons only; delivery becomes `grenade`)
- `autofire-capable-weapon`
- area shape overlays: `autofire`, `burst-fire`, `splash`, `cone`, `line`,
  `grenade-burst`

A weapon whose name matches the Phase 1 audit's character-weapon
`manualRequired` list (nets, launchers, `Special`/no-dice entries — see
`docs/audits/generated/damage-profile-audit.md`), or whose formula has no
parseable dice, is never wired: `enhanceWeaponDamagePacket` returns the input
v1 packet completely unchanged. Vehicle-weapon and Force-power profiles are
never consulted from this path — `getWireable('vehicleWeapon', …)` and
`getWireable('forcePower', …)` are not called here, and nothing in either
family is `confidence: "verified"` yet regardless.

### What still falls back to v1 / legacy

- Any packet built with no `weapon` argument (Force powers, hazards, GM
  damage dialogs, grapple damage) — untouched, same as before this phase.
- The ~20 character weapons on the manualRequired list (nets, grenade/missile
  launchers, `-`/`Special` damage strings).
- Vehicle weapons and Force powers — entirely out of scope; their profiles
  stay `inferred`/`manualRequired` in the registry by design.
- Poison — no rider wiring this phase.
- Area/autofire token geometry and per-target hit-spread — the shape
  overlays only carry resolution-policy metadata (already-decided
  half-on-miss/no-crit-double/cover flags); no new targeting logic was added.

## Bug found and fixed during verification

Writing the smoke test (`tools/weapon-damage-packet-smoke-test.mjs`) caught a
real defect in the tag/rider merge: `profiles.map(p => p.tags)` produced an
**array of arrays**, which the existing `uniqueStrings()` helper's
single-level flatten does not fully flatten — the nested array was
stringified whole (e.g. `String(["weapon","ion"])` → `"weapon,ion"`) instead
of contributing `"weapon"` and `"ion"` as separate tags. This silently
dropped the `ion` tag on ion-mode packets, the `stun-mode` tag on stun-mode
packets, and the `grenade`/`explosive`/`area` tags on grenades — everything
except `lightsaber`/`autofire-capable`, which happen to be added a second
time via separate hardcoded checks and so masked the bug for those two tags
only. Fixed by changing both call sites to `profiles.flatMap(p => p.tags)`
and `profiles.flatMap(p => p.riders)`. Regression coverage: the smoke test's
grenade case asserts `grenade`/`explosive`/`area` tags are present and that
no tag contains a comma (i.e., no collapsed multi-tag string survives).

## Tests

`node tools/weapon-damage-packet-smoke-test.mjs` — runs the real
`enhanceWeaponDamagePacket()` (via a small Foundry-absolute-import resolver
loader, `tools/lib/foundry-module-resolver.mjs`, since the builder and its
two dependency-free imports need no Foundry runtime) against synthetic
v1-shaped packets and real weapon fixtures, seeded from the actual Phase 1
profile data files:

- blaster pistol → `energy`, `weapon` tag, not `legacy`
- slugthrower → `kinetic`, `weapon` tag
- lightsaber → `energy` (type unchanged), `weapon`+`lightsaber` tags, the
  `lightsaber` tag reaches the component (which is what
  `damage-reduction-resolver.js`'s `componentBypassesDamageReduction` reads)
- ion override → resolved type `ion` beats the weapon's printed `energy`,
  `ion` tag present, item itself not mutated
- stun override → same, for `stun`
- grenade → `grenade`/`explosive`/`area` tags present and not collapsed
- legacy numeric damage (no weapon) → returns the identical v1 packet object
- `Net` (manualRequired by name) → returns the identical v1 packet object
- `Snare Rifle` (audited manualRequired, `Special` damage) → does not throw,
  falls back unchanged
- profile gate → `getWireable('vehicleWeapon', …)` is always `null`;
  `getWireable('weapon', 'lightsaber')` is populated
- the `rollAndApplyDamage` smoking-gun case → a known weapon's packet never
  collapses to `{ type: "normal", tags: ["legacy"] }`

`node --check` passes on all touched/added files;
`node tools/ci-smoke-check.mjs` passes repo-wide.

## Non-goals honored

No compendium pack rewrites, no vehicle-weapon or Force-power packet
builders, no poison riders, no token geometry, no attack-roll/crit/formula
math changes, no SR/DR/immunity/resistance semantic changes, no
compatibility wrapper removal, no `ActorEngine` changes.
