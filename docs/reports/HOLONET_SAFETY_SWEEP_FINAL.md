# Holonet Final Safety Sweep — Phase 4.5

**Date:** May 6, 2026  
**Purpose:** Code-side verification before Foundry runtime testing

---

## Summary

Found and fixed **1 additional critical defect** in HolonetManager:

**DEFECT #4: Invalid Intent Type Enums**
- HolonetManager was using intent types that don't exist in INTENT_TYPE enum
- Fixed all 5 manager methods to use actual enum values

---

## Issues Found and Fixed

### DEFECT #3: HolonetSender Missing Factory Methods (FIXED) ✅

**What was called:**
```javascript
HolonetSender.fromStableId?.(from)  // ✗ Method does not exist
HolonetSender.fromString?.(from)    // ✗ Method does not exist
```

**What exists:**
- `HolonetSender.fromActor(actorId, actorName, avatar)`
- `HolonetSender.system(label)`

**Fix:**
```javascript
const sender = typeof from === 'string' 
  ? HolonetSender.fromActor(from, from) 
  : from;
```

**Impact:** Optional chaining prevented crashes, but code wasn't using the intended API.

---

### DEFECT #4: Non-Existent Intent Type Enums (FIXED) ✅

**What was called (doesn't exist):**
- `INTENT_TYPE.MESSENGER_DIRECT_MESSAGE` → Fixed to `INTENT_TYPE.PLAYER_MESSAGE`
- `INTENT_TYPE.SYSTEM_NOTIFICATION` (2 places) → Fixed to `INTENT_TYPE.SYSTEM_NEW_EVENT`
- `INTENT_TYPE.BULLETIN_PUBLISHED` → Fixed to `INTENT_TYPE.BULLETIN_EVENT`
- `INTENT_TYPE.MENTOR_DIALOG` → Fixed to `INTENT_TYPE.MENTOR_CHECK_IN`

**Methods affected:**
1. `sendMessage()` — now uses `PLAYER_MESSAGE`
2. `notify()` — now uses `SYSTEM_NEW_EVENT` as default
3. `bulletin()` — now uses `BULLETIN_EVENT`
4. `mentorNotice()` — now uses `MENTOR_CHECK_IN` as default
5. `systemNotice()` — now uses `SYSTEM_NEW_EVENT` as default

**Why this matters:** Records would have undefined `intent` fields, breaking intent-based routing and projection rules.

---

## Verification Results

### ✅ All Imports Valid
- HolonetMessage imported correctly
- HolonetNotification imported correctly
- HolonetAudience methods verified (all calls exist)
- HolonetRecipient methods verified
- All enum values now point to real enum entries

### ✅ No Missing Method Calls
- HolonetAudience methods: `.selectedPlayers()`, `.allPlayers()`, `.fromString()` all exist
- HolonetRecipient.fromStableId() exists and works
- HolonetSender factory methods now use existing API
- All record class methods (.publish(), .toJSON(), .setDeliveryState()) verified

### ✅ Enum Values Correct
- INTENT_TYPE values mapped to real enum entries
- SOURCE_FAMILY values verified (MESSENGER, BULLETIN, MENTOR, GM_AUTHORED)
- DELIVERY_STATE values verified
- SURFACE_TYPE values verified

### ✅ No Shape Mismatches
- HolonetMessage instantiation matches class constructor
- HolonetNotification instantiation matches class constructor
- Audience objects have correct structure for HolonetAudience methods
- Recipient objects compatible with audience methods

### ✅ Hook Names Correct
- `swseHolonet:recordPublished` ✓
- `swseHolonet:threadUpdated` ✓
- `swseHolonetUpdated` compatibility hook ✓ (fired in all 4 locations)
- No hook name typos detected

### ✅ Async Failures Logged
- sendMessage() — catch block logs error ✓
- notify() — catch block logs error ✓
- bulletin() — catch block logs error ✓
- mentorNotice() — catch block logs error ✓
- systemNotice() — catch block logs error ✓
- markAllRead() — catch block logs error ✓
- All failures return false, not silent undefined ✓

### ✅ No Cached Mutations Creating Stale State
- HolonetStorage serializes records before storing ✓
- Cache invalidation happens after every write ✓
- HolonetEngine doesn't mutate indexed records unexpectedly ✓
- No direct mutations of `this.#recordIndex` or `this.#allRecords` outside of index rebuild ✓

### ✅ No TODOs or FIXMEs
- Searched entire Holonet subsystem
- No outstanding technical debt flags ✓

---

## Files Inspected

1. `scripts/holonet/holonet-manager.js` — MODIFIED (4 fixes)
2. `scripts/holonet/holonet-engine.js` — OK
3. `scripts/holonet/subsystems/holonet-storage.js` — OK
4. `scripts/holonet/subsystems/holonet-bus.js` — OK
5. `scripts/holonet/subsystems/holonet-socket-service.js` — OK
6. `scripts/holonet/subsystems/holonet-thread-service.js` — OK
7. `scripts/holonet/contracts/holonet-record.js` — OK
8. `scripts/holonet/contracts/holonet-message.js` — OK
9. `scripts/holonet/contracts/holonet-notification.js` — OK
10. `scripts/holonet/contracts/holonet-audience.js` — OK
11. `scripts/holonet/contracts/holonet-sender.js` — OK
12. `scripts/holonet/contracts/holonet-recipient.js` — OK
13. `scripts/holonet/contracts/holonet-intent-registry.js` — OK
14. `scripts/holonet/contracts/enums.js` — OK
15. `scripts/holonet/integration/holonet-init.js` — OK
16. `scripts/holonet/index.js` — OK

---

## Files Changed

**Modified:**
- `scripts/holonet/holonet-manager.js` — 4 concrete defects fixed

**Summary of changes:**
1. Replaced `HolonetSender.fromStableId?.()` with `HolonetSender.fromActor()`
2. Replaced `HolonetSender.fromString?.()` with conditional logic
3. Updated `sendMessage()` intent to `INTENT_TYPE.PLAYER_MESSAGE`
4. Updated `notify()` default intent to `INTENT_TYPE.SYSTEM_NEW_EVENT`
5. Updated `bulletin()` intent to `INTENT_TYPE.BULLETIN_EVENT`
6. Updated `mentorNotice()` intent to `INTENT_TYPE.MENTOR_CHECK_IN`
7. Updated `systemNotice()` default intent to `INTENT_TYPE.SYSTEM_NEW_EVENT`
8. Replaced `HolonetSender.system()` for mentor sender fallback

---

## Still Requires Foundry Runtime Testing

These 8 validation checks **must pass in Foundry** before Holonet is production-ready:

1. **GM sends system notice** through HolonetManager
   - ✓ Record instantiated as HolonetNotification class
   - ✓ Intent set to valid SYSTEM_NEW_EVENT
   - ✓ Audience uses HolonetAudience.allPlayers()
   - ⚠️ Verify UI renders notice in HOME_FEED and NOTIFICATION_BUBBLE

2. **Player sends message** to GM
   - ✓ Record instantiated as HolonetMessage class
   - ✓ Intent set to valid PLAYER_MESSAGE
   - ✓ Audience uses HolonetAudience.selectedPlayers()
   - ⚠️ Verify message appears in GM's MESSENGER_THREAD

3. **GM replies to player**
   - ⚠️ Verify thread updates with reply message
   - ⚠️ Verify sender marked read automatically

4. **Player marks one notice read**
   - ✓ markRead() calls HolonetEngine.markRead()
   - ⚠️ Verify UI updates isUnreadBy() status

5. **Player marks all notices read**
   - ✓ markAllRead() calls HolonetEngine.markManyRead()
   - ⚠️ Verify batch write completes
   - ⚠️ Verify all notices marked read

6. **Store transaction emits once** (no duplicates)
   - ✓ StoreEmitter uses HolonetEmissionService with dedupeKey
   - ⚠️ Verify retry doesn't double-publish

7. **Progression/level-up emits** and appears in right surface
   - ✓ ProgressionEmitter uses skipDedupe: true (correct for unique events)
   - ⚠️ Verify appears in HOME_FEED and NOTIFICATION_BUBBLE

8. **Approval reaches GM-facing surface**
   - ✓ ApprovalsEmitter uses HolonetEmissionService
   - ⚠️ Verify appears in GM_DATAPAD_APPROVALS
   - ⚠️ Verify old swseHolonetUpdated hook still refreshes surfaces

---

## Risk Assessment

### Resolved Risks
- ✅ Plain object vs. class instance (Phase 4 DEFECT #1)
- ✅ Non-existent audience methods (Phase 4 DEFECT #2)
- ✅ Non-existent sender methods (Phase 4.5 DEFECT #3)
- ✅ Invalid intent type enums (Phase 4.5 DEFECT #4)

### Remaining Risks
- 🟡 **Socket reliability under load** — Phase 4 verified paths, but Foundry runtime will show true concurrency issues
- 🟡 **UI refresh timing** — swseHolonetUpdated and typed hooks fire together, but UI may race on render
- 🟡 **Index stale state** — Cache invalidation works code-side, but socket async updates may create brief stale windows

### Deferred Risks
- 🟠 **Settings array size limit** — Acceptable for now, migrate at 10K+ records
- 🟠 **Cache rebuilds on restart** — Lazy rebuild acceptable, could optimize with persistent cache later

---

## Conclusion

**All code-side safety checks passed.** Holonet is ready for Foundry runtime validation.

The 8 validation checks above will confirm that the architectural foundation (Phases 1-4) translates to actual working gameplay. Once those pass, Holonet can be treated as a first-class system foundation for future communication/notification work.
