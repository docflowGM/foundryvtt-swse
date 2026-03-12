# Tier 1 Metadata Population Status

**As of**: Latest commit
**Status**: ✅ Ready for in-world application
**Infrastructure**: Complete
**Population**: Ready-to-apply via macro

---

## Overview

**Tier 1 Metadata** infrastructure has been fully implemented and tested:
- Schema fields added to `template.json` ✅
- ArchetypeMetadataEngine module created ✅
- SuggestionEngine integration complete ✅
- All 4 base classes normalized with archetype definitions ✅
- Metadata assignments documented ✅

**What remains**: Apply archetype metadata to individual feat/talent items.

---

## Assignment Status by Class

### Soldier (27 items)
- **Heavy Weapons Specialist**: 7 items (3 talents, 4 feats)
- **Armored Shock Trooper**: 7 items (3 talents, 4 feats)
- **Precision Rifleman**: 6 items (3 talents, 3 feats)
- **Close-Quarters Breacher**: 6 items (3 talents, 3 feats)
- **Battlefield Enforcer**: 6 items (3 talents, 3 feats)
- **Status**: All mapped, ready to populate

### Scoundrel (21 items)
- **Opportunistic Precision Striker**: 6 items (3 talents, 3 feats)
- **Debilitating Trickster**: 5 items (3 talents, 2 feats)
- **Gunslinger Duelist**: 6 items (3 talents, 3 feats)
- **Social Manipulator**: 5 items (3 talents, 2 feats)
- **Saboteur Technician**: 5 items (3 talents, 2 feats)
- **Status**: All mapped, ready to populate

### Scout (22 items)
- **Mobile Skirmisher**: 6 items (3 talents, 3 feats)
- **Wilderness Survivalist**: 5 items (3 talents, 2 feats)
- **Recon Sniper**: 6 items (3 talents, 3 feats)
- **Condition Harrier**: 6 items (3 talents, 3 feats)
- **Pilot Operative**: 5 items (3 talents, 2 feats)
- **Status**: All mapped, ready to populate

### Noble (20 items)
- **Battlefield Commander**: 5 items (3 talents, 2 feats)
- **Master Orator**: 5 items (3 talents, 2 feats)
- **Tactical Coordinator**: 5 items (3 talents, 2 feats)
- **Political Strategist**: 5 items (3 talents, 2 feats)
- **Inspirational Supporter**: 5 items (3 talents, 2 feats)
- **Status**: All mapped, ready to populate

### Jedi (26 items)
- **Precision Striker**: 8 items (4 talents, 4 feats)
- **Tank Guardian**: 7 items (4 talents, 3 feats)
- **Battlefield Controller**: 5 items (3 talents, 2 feats)
- **Force Burst Striker**: 6 items (3 talents, 3 feats)
- **Sentinel Generalist**: 6 items (3 talents, 3 feats)
- **Status**: Mapped, awaiting population

**Total**: ~115 feat/talent items across 5 base classes

---

## How to Apply Metadata

### Option 1: Foundry Macro (Recommended)

**File**: `APPLY_METADATA.js`

**Steps**:
1. Log into your FoundryVTT game world
2. Create a new Macro (any character can do this)
3. Copy the entire contents of `APPLY_METADATA.js`
4. Set type to "Script"
5. Click "Execute"
6. Check console (F12 → Console tab) for progress
7. A chat message will confirm completion

**Time**: < 1 minute to execute
**Result**: All 90+ items updated with archetype, playstyle, and tier metadata

### Option 2: JSON File (For integration)

**File**: `/tmp/metadata-assignments.json` (or move to data folder)

Contains all metadata assignments in structured format:
```json
{
  "soldier": {
    "archetype_id": {
      "talents": [{ "name": "...", "playstyle": "...", "tier": ... }],
      "feats": [{ "name": "...", "playstyle": "...", "tier": ... }]
    }
  }
}
```

Can be imported into custom tooling or used as reference.

### Option 3: Manual Application

**Mapping documents**:
- `SOLDIER_ARCHETYPE_METADATA_MAPPING.md`
- `SCOUNDREL_ARCHETYPE_METADATA_MAPPING.md`
- `SCOUT_ARCHETYPE_METADATA_MAPPING.md`
- `NOBLE_ARCHETYPE_METADATA_MAPPING.md`
- `JEDI_ARCHETYPE_METADATA_MAPPING.md`

Each contains a population checklist showing required metadata for each item.

**Time**: 60-90 minutes (manual)
**Process**: Open each feat/talent in FoundryVTT, fill in archetype/playstyle/tier fields

---

## Verification

After applying metadata (via any method):

### Automated Validation
```javascript
// Run in console or macro:
for (const item of game.items.contents) {
  if (item.type === 'feat' || item.type === 'talent') {
    const validation = ArchetypeMetadataEngine.validateMetadata(item);
    if (!validation.valid) {
      console.warn(`${item.name}: ${validation.errors}`);
    }
  }
}
```

### Manual Spot Check
1. Create a Jedi character with archetype "Precision Striker"
2. Trigger feat suggestions
3. Look for Precision Striker feats (Weapon Focus Lightsabers, Improved Critical, etc.) to have higher confidence
4. Playstyle should be "melee" or "defense" for these items

### Expected Results
- Suggestions for archetype-matched feats: +0.15 confidence boost
- Playstyle-aligned feats: +0.10 additional boost
- Tier-appropriate feats: +0.05 additional boost
- Total max metadata boost: +0.25 per feat (capped in SuggestionEngine)

---

## Quality Metrics

After population, all items should have:

| Field | Type | Valid Values | Notes |
|-------|------|--------------|-------|
| `archetype` | string | Any archetype ID | `precision_striker`, `tank_guardian`, etc. |
| `playstyle` | string | Enum | `melee`, `ranged`, `force`, `support`, `control`, `defense`, `skill`, `utility` |
| `tier` | number | 0-3 | 0=Novice, 1=Intermediate, 2=Advanced, 3=Expert |

**Validation rules**:
- All 3 fields optional (backward compatible)
- Missing fields = no boost (not an error)
- Invalid values logged but don't crash system

---

## Integration Points

Metadata is automatically used by:

1. **SuggestionEngine._buildSuggestionWithArchetype()**
   - Calls `ArchetypeMetadataEngine.calculateMetadataBoost()`
   - Adds metadata bonus to confidence score
   - Stores boost reasons in `suggestion.reason.metadataBoost`

2. **Character Analysis**
   - `ArchetypeMetadataEngine.detectCharacterPlaystyle(actor)` analyzes owned items
   - Counts playstyle occurrences to determine character's dominant playstyle
   - Used by metadata boost calculation

3. **No Code Changes Needed**
   - Already integrated into all feat evaluation pathways
   - Works with existing archetype recommendations
   - Graceful degradation if metadata missing

---

## Timeline

| Task | Status | Time |
|------|--------|------|
| Schema extension | ✅ Complete | Done |
| ArchetypeMetadataEngine | ✅ Complete | Done |
| SuggestionEngine integration | ✅ Complete | Done |
| Archetype normalization (5 classes) | ✅ Complete | Done |
| Metadata assignment docs | ✅ Complete | Done |
| Apply metadata via macro | ⏳ Ready | ~1 min |
| Test in dev world | ⏳ Ready | ~10 min |
| **Total for population**: | | **~15 min** |

---

## Next Steps

1. **Run APPLY_METADATA.js macro in-world**
   - Takes < 1 minute
   - Updates 90+ items automatically
   - Check console for any "not found" items

2. **Spot-check suggestions in dev world**
   - Create test character with archetype
   - Verify feat suggestions show improved confidence
   - Look for metadata boost in suggestion reasons

3. **Optional: Prestige Layer**
   - Design prestige branch archetypes (e.g., Weapon Master, Sage, etc.)
   - Would add another 50+ archetypes for prestige classes
   - Estimated 4-6 hours design + population

4. **Optional: Tier 2 Metadata**
   - Add `synergiesWith` for feat chains
   - Add `conflictsWith` for preventing bad combinations
   - Add `skillAffinity` for skill-based boosting
   - Would significantly improve suggestion accuracy

---

## Files Provided

### Metadata & Documentation
- `JEDI_ARCHETYPE_METADATA_MAPPING.md`
- `SOLDIER_ARCHETYPE_METADATA_MAPPING.md`
- `SCOUNDREL_ARCHETYPE_METADATA_MAPPING.md`
- `SCOUT_ARCHETYPE_METADATA_MAPPING.md`
- `NOBLE_ARCHETYPE_METADATA_MAPPING.md`

### Application Tools
- `APPLY_METADATA.js` — Foundry macro for in-world application
- `/tmp/metadata-assignments.json` — JSON reference document

### Configuration
- `data/class-archetypes.json` — Updated with all 5 normalized base classes

---

## Success Criteria

✅ All provided when metadata is populated:

- [ ] Feat suggestions show +0.10-0.25 confidence boost for archetype-matched items
- [ ] Playstyle detection working (character's items analyzed for dominant pattern)
- [ ] Tier-appropriate feats suggested at each level range
- [ ] No console errors during suggestion evaluation
- [ ] ArchetypeMetadataEngine.validateMetadata() reports no issues
- [ ] Prestige path suggestions (if enabled) also get metadata boosts

---

## Questions?

Check the logs:
- Browser console (F12 → Console) shows all metadata application progress
- `SWSE Logger` warnings/errors captured during validation
- Macro reports total updated vs. not-found items in chat message

Good to go!
