# Phase 5D-I-D-B1 — Mounting and host relationships

Seven residual operation keys, one capability: a weapon is mounted on a **host weapon** through the existing owned-state / skill-roll authorities.

| key | automation | disposition | carrier |
|---|---|---|---|
| `canMountOnRifle`, `rifleMountable` | AUTO | IMPLEMENTED | `host-mount.js` `mountRuleOf` -> shape `mountRule.hostGroup = 'rifles'`; `FireStateStore.mountOnHost` validates the host by canonical identity |
| `mountableOnMinimumWeaponSize` | AUTO | IMPLEMENTED | `mountRule.minHostSize` vs the host's canonical `size` |
| `canUseStandalone` | AUTO | IMPLEMENTED | `mountRule.standalone`; the default configuration stays usable; setting `standalone` detaches |
| `mountMechanicsDC` | CONTEXTUAL | IMPLEMENTED | Mechanics check rolled through `SWSERoll.rollSkill`; cancel / failure write nothing |
| `mountTimeMinutes` | CONTEXTUAL | IMPLEMENTED | reported with the result and in the sheet notice; never simulated; no action is stated so none is spent |
| `requiresGrenadeLauncher` | AUTO | IMPLEMENTED | `delegateLoadedPayload` accepts a payload that declares it into a full-size grenade launcher; a direct attack with it carries a readiness note (not a block) |

## Behaviour
- **Host eligibility** (`hostEligibility`): owned, canonical (legacy/custom hosts are refused, never guessed), not the weapon itself, not already mounted on something, group `rifles` when the record says rifle, canonical size at least the record's minimum.
- **Owned state**: `flags.swse.fireState.mountedHostId` (+ `configurationId` of the mount configuration when the record has one). Written only on success through `persistOwned` -> `ActorEngine.updateOwnedItems`. Idempotent on the same host (no second check).
- `setConfiguration` refuses to *enter* the mount configuration (`mount-requires-host`); leaving it detaches the weapon.
- `previewReadiness` blocks `mount-host-missing` when the recorded host is no longer an owned item. A never-mounted weapon is never blocked (unknown is not false).
- Sheet: the existing Configure control opens a host picker for mountable weapons (`mountHostOptions`: only eligible canonical hosts), applying only through the store.
- Attack bonus, payload damage (including the Micro Grenade Launcher −2 dice adjustment) and ammo are unchanged by mounting (tested).

## Source points and data gaps (reported, nothing invented)
- **Grenade Launcher** text: "mounted on a rifle in 1 minute with a DC 15 Mechanics check", but the canonical record carries `rifleMountable` only (no DC / time / `configurationStates`). Mounting therefore rolls no check and reports no time; the GM adjudicates. A targeted canonical-data amendment (builder, then regenerate) would close it; deliberately **not** done in this PR.
- **Targeting Laser** states no check or time: it mounts on a Medium-or-larger host with no roll.
- **Electronet / Micro Grenade Launcher**: the text says "fired from a grenade launcher"; whether a *micro* launcher may fire it is not stated. Refused conservatively (documented, uncertain). A direct attack with the electronet record shows a readiness note rather than a block, because the existing control-resolution tests attack the payload record itself; the delegated launcher attack is the production path.
- Time-in-minutes remains a GM circumstance.

## Counters
`UNIQUE_OPERATION_KEYS_WITHOUT_CONSUMER` 61 -> 54, raw 70 -> 63; families 57 (37/12/8) unchanged; deferred relations 2; canonical heuristic usage 0; I-D manifest IMPLEMENTED 14 -> 21, DEFERRED 56 -> 49.

Foundry smoke: NOT RUN.
