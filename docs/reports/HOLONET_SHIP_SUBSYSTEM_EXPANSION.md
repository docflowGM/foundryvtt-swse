# Holonet Ship Subsystem Damage Expansion

**Date:** May 6, 2026  
**Scope:** Expand ship notifications from 4 intents to 12 intents covering all major subsystems  
**Status:** ✅ COMPLETE

---

## Summary

Expanded the Ship Emitter to comprehensively track and emit notifications for **4 major ship subsystems**:
1. **Hull** — Overall ship health (HP)
2. **Shields** — Shield strength and integrity
3. **Hyperdrive** — Faster-than-light drive status (functional vs. damaged)
4. **Condition Track** — Progressive damage state (0-5 scale)

Total ship notification types increased from **4 to 12 intents**, with dedicated notifications for damage and repair of each subsystem.

---

## New Notification Types

### Hull Subsystem (2 intents)
- **SHIP_DAMAGED** — Hull HP decreased
  - Priority: HIGH
  - Surfaces: HOME_FEED, NOTIFICATION_BUBBLE
  - Example: "Your Ship sustained hull damage. Hull: 75 → 50 (-25)"
  
- **SHIP_REPAIRED** — Hull HP increased
  - Priority: NORMAL
  - Surfaces: HOME_FEED, NOTIFICATION_BUBBLE
  - Example: "Your Ship was repaired. Hull: 50 → 75 (+25)"

### Shields Subsystem (2 intents)
- **SHIP_SHIELDS_DAMAGED** — Shield strength decreased
  - Priority: HIGH
  - Surfaces: HOME_FEED, NOTIFICATION_BUBBLE
  - Metadata: previousShields, newShields, damageAmount
  - Example: "Your Ship shields were damaged. Shields: 30 → 15 (-15)"

- **SHIP_SHIELDS_RESTORED** — Shield strength increased
  - Priority: NORMAL
  - Surfaces: HOME_FEED, NOTIFICATION_BUBBLE
  - Metadata: previousShields, newShields, restoredAmount
  - Example: "Your Ship shields were restored. Shields: 15 → 30 (+15)"

### Hyperdrive Subsystem (2 intents)
- **SHIP_HYPERDRIVE_DAMAGED** — Hyperdrive became non-functional (disabled)
  - Priority: **CRITICAL** (jump capability lost)
  - Surfaces: HOME_FEED, NOTIFICATION_BUBBLE
  - Metadata: previousClass, newClass (null = disabled)
  - Example: "Your Ship hyperdrive has been damaged and is no longer functional."

- **SHIP_HYPERDRIVE_REPAIRED** — Hyperdrive restored to functional state
  - Priority: NORMAL
  - Surfaces: HOME_FEED, NOTIFICATION_BUBBLE
  - Metadata: previousClass, newClass (string = functional)
  - Example: "Your Ship hyperdrive has been repaired and is operational."

### Condition Track Subsystem (2 intents)
- **SHIP_CONDITION_WORSENED** — Condition track increased (1-5 scale)
  - Priority: HIGH
  - Surfaces: HOME_FEED, NOTIFICATION_BUBBLE
  - Metadata: previousCondition, newCondition, worsened flag
  - Example: "Your Ship condition has worsened. Condition: 1 → 2"

- **SHIP_CONDITION_IMPROVED** — Condition track decreased
  - Priority: NORMAL
  - Surfaces: HOME_FEED only
  - Metadata: previousCondition, newCondition, worsened=false
  - Example: "Your Ship condition has improved. Condition: 2 → 1"

### Generic Systems (2 intents)
- **SHIP_SYSTEM_DAMAGED** — Generic subsystem damage (for future extensibility)
  - Priority: HIGH
  - Surfaces: HOME_FEED, NOTIFICATION_BUBBLE
  - Metadata: systemName, systemType, repaired flag

- **SHIP_SYSTEM_REPAIRED** — Generic subsystem repair
  - Priority: NORMAL
  - Surfaces: HOME_FEED
  - Metadata: systemName, systemType, repaired flag

### Legacy/Compatibility (2 intents)
- **SHIP_ENGINE_DAMAGED** — Kept for backward compatibility (unused)
- **SHIP_STATUS_CHANGED** — Generic catch-all for custom uses

---

## Implementation Changes

### File: `scripts/holonet/contracts/enums.js`
**Added 8 new INTENT_TYPE constants:**
- SHIP_SHIELDS_DAMAGED
- SHIP_SHIELDS_RESTORED
- SHIP_HYPERDRIVE_DAMAGED
- SHIP_HYPERDRIVE_REPAIRED
- SHIP_CONDITION_WORSENED
- SHIP_CONDITION_IMPROVED
- SHIP_SYSTEM_DAMAGED
- SHIP_SYSTEM_REPAIRED

### File: `scripts/holonet/contracts/holonet-intent-registry.js`
**Registered 8 new intents with metadata:**
- Each with category "ship"
- Appropriate priority levels (critical for hyperdrive damage, high for damage, normal for repairs)
- Surfaces assigned (HOME_FEED + NOTIFICATION_BUBBLE for critical/high)
- Font Awesome icons (shield, bolt, gears, wrench, hand-sparkles)

### File: `scripts/holonet/sources/ship-source.js`
**Added 6 new factory methods:**
1. `createShieldDamageNotification()` — Shield HP damage
2. `createShieldRestorationNotification()` — Shield HP restore
3. `createHyperdriveDamageNotification()` — Hyperdrive disabled
4. `createHyperdriveRepairNotification()` — Hyperdrive enabled
5. `createConditionChangeNotification()` — Condition track change
6. `createSystemDamageNotification()` — Generic subsystem change

Each factory includes rich metadata for filtering and rendering.

### File: `scripts/holonet/emitters/ship-emitter.js`
**Completely refactored to:**
- Maintain `#previousState` Map tracking all 4 subsystems
- Build state snapshots on each actor update: `#buildShipState()`
- Compute deltas and emit for each changed subsystem
- Dedicated private methods:
  - `#emitHullChange()` — Detect and emit hull damage/repair
  - `#emitShieldChange()` — Detect and emit shield damage/restore
  - `#emitHyperdriveChange()` — Detect and emit hyperdrive damage/repair
  - `#emitConditionChange()` — Detect and emit condition track changes

---

## State Tracking Architecture

**Ship State Snapshot:**
```javascript
{
  hp: actor.system.hp.value,
  maxHp: actor.system.hp.max,
  shields: actor.system.shields.value,
  maxShields: actor.system.shields.max,
  hyperdriveClass: actor.system.hyperdrive_class,
  backupClass: actor.system.backup_class,
  conditionTrack: actor.system.conditionTrack.current,
  conditionPenalty: actor.system.conditionTrack.penalty
}
```

**Change Detection:**
- On `updateActor` hook, snapshot is taken
- Previous state retrieved from `#previousState` map
- Deltas computed: `currState[field] !== prevState[field]`
- Only changed subsystems emit notifications
- State map updated with new snapshot

**Deduplication:**
- Each subsystem has unique dedupeKey: `ship-[subsystem]-[shipId]-[value]`
- 5-second dedup window per subsystem
- Prevents duplicate notifications from rapid updates
- Independent dedup per subsystem prevents collision

---

## Filtering & Safety

**Only Emits Notifications For:**
- ✓ Vehicles with type 'vehicle' OR system.isVehicle = true
- ✓ Ships attached to a player (actor.system.attachedTo = player character ID)
- ✓ Actual state changes (currState !== prevState)
- ✓ Condition changes only on increase/decrease (not penalty changes)
- ✓ Hyperdrive changes only on functional→null or null→functional transitions

**Does NOT Emit For:**
- ✗ Unattached vehicles (NPCs' ships, world props)
- ✗ Vehicles where no owner player exists
- ✗ No-op updates (same value)
- ✗ Condition penalty-only changes
- ✗ Hyperdrive class changes within functional state (x1 → x2)

---

## Priority Levels

| Priority | Subsystem | Intent | Reasoning |
|----------|-----------|--------|-----------|
| CRITICAL | Hyperdrive | DAMAGED | Jump capability lost; major tactical consequence |
| HIGH | Hull | DAMAGED | Core integrity compromised |
| HIGH | Shields | DAMAGED | Defensive capability compromised |
| HIGH | Condition | WORSENED | Progressive damage worsens ship effectiveness |
| NORMAL | Hull | REPAIRED | Restoration event |
| NORMAL | Shields | RESTORED | Defensive capability recovered |
| NORMAL | Hyperdrive | REPAIRED | Tactical capability recovered |
| NORMAL | Condition | IMPROVED | Repairs progress |

---

## Surface Assignments

| Intent | HOME_FEED | NOTIFICATION_BUBBLE | STORE_NOTICE | Notes |
|--------|-----------|---------------------|--------------|-------|
| SHIP_DAMAGED | ✓ | ✓ | | High priority damage |
| SHIP_REPAIRED | ✓ | ✓ | | Hull repair |
| SHIP_SHIELDS_DAMAGED | ✓ | ✓ | | High priority defense loss |
| SHIP_SHIELDS_RESTORED | ✓ | ✓ | | Defense recovery |
| SHIP_HYPERDRIVE_DAMAGED | ✓ | ✓ | | CRITICAL: jump disabled |
| SHIP_HYPERDRIVE_REPAIRED | ✓ | ✓ | | Jump capability restored |
| SHIP_CONDITION_WORSENED | ✓ | ✓ | | High priority condition |
| SHIP_CONDITION_IMPROVED | ✓ | | | Condition improvement |
| SHIP_SYSTEM_DAMAGED | ✓ | ✓ | | Generic system damage |
| SHIP_SYSTEM_REPAIRED | ✓ | | | System repair |
| SHIP_STATUS_CHANGED | ✓ | | | Catch-all generic |

---

## Backward Compatibility

✅ **Fully Backward Compatible:**
- Original `SHIP_DAMAGED` and `SHIP_REPAIRED` intents unchanged
- Original `SHIP_ENGINE_DAMAGED` still registered (unused but safe)
- Original `SHIP_STATUS_CHANGED` still available for custom implementations
- All new intents are **additions**, no modifications to existing behavior
- No breaking changes to HolonetEngine, storage, or delivery systems
- Existing ship notifications continue to work as before

---

## Metadata Included in Notifications

**All subsystem notifications include:**
```javascript
{
  shipId: actor.id,
  shipName: actor.name,
  actorId: actor.system.attachedTo  // Player character ID
}
```

**Subsystem-specific metadata:**

**Hull:**
- previousHp, newHp, damageAmount (or healAmount)

**Shields:**
- previousShields, newShields, damageAmount (or restoredAmount)

**Hyperdrive:**
- previousClass, newClass

**Condition Track:**
- previousCondition, newCondition, worsened (boolean flag)

**Generic Systems:**
- systemName, systemType, repaired (boolean flag)

---

## Runtime Testing Checklist

**Hull Subsystem:**
- [ ] Damage actor hull HP → SHIP_DAMAGED notification appears
- [ ] Repair actor hull HP → SHIP_REPAIRED notification appears
- [ ] Rapid hull changes deduplicate correctly (5s window)

**Shields Subsystem:**
- [ ] Reduce shields → SHIP_SHIELDS_DAMAGED notification appears
- [ ] Increase shields → SHIP_SHIELDS_RESTORED notification appears
- [ ] Shields to 0 → SHIP_SHIELDS_DAMAGED with amount shown

**Hyperdrive Subsystem:**
- [ ] Set hyperdrive_class to null → SHIP_HYPERDRIVE_DAMAGED (critical priority)
- [ ] Set hyperdrive_class to value → SHIP_HYPERDRIVE_REPAIRED
- [ ] Damage notification in NOTIFICATION_BUBBLE (critical priority)

**Condition Track:**
- [ ] Increase condition track → SHIP_CONDITION_WORSENED in both feeds
- [ ] Decrease condition track → SHIP_CONDITION_IMPROVED in HOME_FEED only
- [ ] Penalty-only changes → no notification

**Surfaces:**
- [ ] All high/critical notifications in HOME_FEED
- [ ] All high/critical notifications in NOTIFICATION_BUBBLE
- [ ] Normal repairs/improvements in HOME_FEED only

**Filtering:**
- [ ] Unattached ships → no notifications
- [ ] Non-player ships → no notifications
- [ ] Same value updates → no duplicate notifications

---

## Conclusion

✅ **Ship subsystem tracking fully implemented**

Holonet now emits comprehensive notifications for all major ship systems:
- Hull integrity (damage/repair)
- Shield strength (damage/restore)
- Hyperdrive status (critical: disabled/enabled)
- Condition track (progressive damage/repair)
- Generic systems (extensible for future subsystems)

Players are now notified whenever their ship experiences subsystem damage or repair, with priority and surface assignment appropriate to the severity and tactical importance of each subsystem change.
