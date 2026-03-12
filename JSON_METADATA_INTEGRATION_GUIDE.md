# JSON Metadata Integration Guide

**File**: `data/metadata-assignments.json`
**Format**: Structured JSON with complete metadata assignments
**Classes**: Soldier, Scoundrel, Scout, Noble (Jedi included in previous mappings)
**Total Items**: 90+ feats/talents

---

## File Structure

```json
{
  "_meta": { ... },
  "soldier": {
    "archetype_id": {
      "talents": [
        { "name": "...", "playstyle": "...", "tier": ... }
      ],
      "feats": [
        { "name": "...", "playstyle": "...", "tier": ... }
      ]
    }
  }
}
```

---

## Usage Patterns

### Pattern 1: Direct File Read (Node.js)

```javascript
const fs = require('fs');
const metadata = JSON.parse(
  fs.readFileSync('./data/metadata-assignments.json', 'utf8')
);

// Iterate through assignments
for (const [className, archetypes] of Object.entries(metadata)) {
  if (className === '_meta') continue;

  for (const [archId, archData] of Object.entries(archetypes)) {
    console.log(`Class: ${className}, Archetype: ${archId}`);

    for (const talent of archData.talents) {
      console.log(`  Talent: ${talent.name} → ${talent.playstyle} (tier ${talent.tier})`);
    }
  }
}
```

### Pattern 2: Batch Update Script

```javascript
// Create a script that reads JSON and bulk-updates items
const metadata = require('./data/metadata-assignments.json');
const allItems = getAllItemsFromCompendium();

for (const [className, archetypes] of Object.entries(metadata)) {
  if (className === '_meta') continue;

  for (const [archId, archData] of Object.entries(archetypes)) {
    // Process talents
    for (const talentData of archData.talents) {
      const item = allItems.find(i => i.name === talentData.name);
      if (item) {
        item.update({
          'system.archetype': archId,
          'system.playstyle': talentData.playstyle,
          'system.tier': talentData.tier
        });
      }
    }

    // Process feats
    for (const featData of archData.feats) {
      const item = allItems.find(i => i.name === featData.name);
      if (item) {
        item.update({
          'system.archetype': archId,
          'system.playstyle': featData.playstyle,
          'system.tier': featData.tier
        });
      }
    }
  }
}
```

### Pattern 3: Compendium Import

If using a tool that supports JSON import:

```bash
# Convert to compendium format (class → item manifest)
node scripts/convert-metadata-to-compendium.js \
  --input data/metadata-assignments.json \
  --output data/metadata-items.json
```

### Pattern 4: Database Direct Insert

```javascript
// For direct database access (Foundry backend)
const metadata = require('./data/metadata-assignments.json');

for (const [className, archetypes] of Object.entries(metadata)) {
  if (className === '_meta') continue;

  for (const [archId, archData] of Object.entries(archetypes)) {
    for (const item of [...archData.talents, ...archData.feats]) {
      db.items.updateOne(
        { name: item.name, type: item.type },
        {
          $set: {
            'system.archetype': archId,
            'system.playstyle': item.playstyle,
            'system.tier': item.tier
          }
        }
      );
    }
  }
}
```

---

## Integration Points

### 1. Import During World Load

Add to `ready` hook in your system initialization:

```javascript
Hooks.on('ready', async () => {
  const metadata = await import('./data/metadata-assignments.json', { assert: { type: 'json' } });
  console.log(`Loaded metadata for ${Object.keys(metadata.default).length - 1} classes`);

  // Optional: Apply to all items
  applyMetadataToItems(metadata.default);
});
```

### 2. Migration Script

Create a migration that runs once per world:

```javascript
export const migrateMetadata = async (worldVersion) => {
  if (worldVersion < 1.5) {
    console.log('Applying Tier 1 metadata...');
    const metadata = require('./data/metadata-assignments.json');

    for (const [className, archetypes] of Object.entries(metadata)) {
      if (className === '_meta') continue;
      await applyClassMetadata(className, archetypes);
    }

    console.log('Metadata migration complete.');
  }
};
```

### 3. Validation Against Schema

```javascript
import { ArchetypeMetadataEngine } from './scripts/engine/suggestion/ArchetypeMetadataEngine.js';

const metadata = require('./data/metadata-assignments.json');

for (const [className, archetypes] of Object.entries(metadata)) {
  if (className === '_meta') continue;

  for (const [archId, archData] of Object.entries(archetypes)) {
    for (const item of [...archData.talents, ...archData.feats]) {
      const validation = ArchetypeMetadataEngine.validateMetadata({
        name: item.name,
        system: {
          archetype: archId,
          playstyle: item.playstyle,
          tier: item.tier
        }
      });

      if (!validation.valid) {
        console.warn(`${item.name}: ${validation.errors.join(', ')}`);
      }
    }
  }
}
```

---

## JSON Reference

### Playstyle Values (Enum)

```
"melee"      - Melee combat tactics
"ranged"     - Ranged combat tactics
"force"      - Force power synergy
"support"    - Helping allies/buffs
"control"    - Crowd control/debuffs
"defense"    - Damage mitigation
"skill"      - Skill/knowledge focus
"utility"    - Out-of-combat utility
```

### Tier Values (Range)

```
0 - Novice (Levels 1-3)
1 - Intermediate (Levels 4-8)
2 - Advanced (Levels 9-16)
3 - Expert (Levels 17+)
```

### Archetype IDs

**Soldier**:
- `heavy_weapons_specialist`
- `armored_shock_trooper`
- `precision_rifleman`
- `close_quarters_breacher`
- `battlefield_enforcer`

**Scoundrel**:
- `opportunistic_precision_striker`
- `debilitating_trickster`
- `gunslinger_duelist`
- `social_manipulator`
- `saboteur_technician`

**Scout**:
- `mobile_skirmisher`
- `wilderness_survivalist`
- `recon_sniper`
- `condition_harrier`
- `pilot_operative`

**Noble**:
- `battlefield_commander`
- `master_orator`
- `tactical_coordinator`
- `political_strategist`
- `inspirational_supporter`

---

## Data Quality

All entries verified:
- ✅ Playstyle values are valid enum members
- ✅ Tier values are in range 0-3
- ✅ Archetype IDs match class-archetypes.json
- ✅ All feat/talent names standardized
- ✅ No duplicate entries within archetype

---

## Custom Tooling Examples

### Example 1: Generate SQL INSERT

```javascript
const fs = require('fs');
const metadata = JSON.parse(fs.readFileSync('./data/metadata-assignments.json', 'utf8'));

const sql = [];
for (const [className, archetypes] of Object.entries(metadata)) {
  if (className === '_meta') continue;

  for (const [archId, archData] of Object.entries(archetypes)) {
    for (const item of [...archData.talents, ...archData.feats]) {
      sql.push(`
        UPDATE items
        SET system.archetype = '${archId}',
            system.playstyle = '${item.playstyle}',
            system.tier = ${item.tier}
        WHERE name = '${item.name}';
      `);
    }
  }
}

fs.writeFileSync('./metadata-updates.sql', sql.join('\n'));
```

### Example 2: CSV Export

```javascript
const fs = require('fs');
const metadata = JSON.parse(fs.readFileSync('./data/metadata-assignments.json', 'utf8'));

const csv = ['Name,Type,Archetype,Playstyle,Tier'];
for (const [className, archetypes] of Object.entries(metadata)) {
  if (className === '_meta') continue;

  for (const [archId, archData] of Object.entries(archetypes)) {
    for (const talent of archData.talents) {
      csv.push(`${talent.name},talent,${archId},${talent.playstyle},${talent.tier}`);
    }
    for (const feat of archData.feats) {
      csv.push(`${feat.name},feat,${archId},${feat.playstyle},${feat.tier}`);
    }
  }
}

fs.writeFileSync('./metadata.csv', csv.join('\n'));
```

### Example 3: Spreadsheet Import

1. Run CSV export (above)
2. Open in Excel/Sheets
3. Import via custom importer or manual verification

---

## Integration with Existing Systems

The JSON is compatible with:
- ✅ Direct file I/O (Node.js)
- ✅ Compendium systems (with ID mapping)
- ✅ Database migrations
- ✅ Custom importers
- ✅ Validation frameworks
- ✅ Export tools (SQL, CSV, etc.)

---

## Support

If items are missing or misnamed:
1. Check the item's actual name in FoundryVTT
2. Update the JSON with correct name
3. Re-import/apply

If playstyle/tier seems wrong:
1. Review the archetype documentation (SOLDIER_ARCHETYPE_METADATA_MAPPING.md, etc.)
2. Cross-reference mechanicalBias in class-archetypes.json
3. Adjust if needed (JSON is editable)

---

**File**: `/home/user/foundryvtt-swse/data/metadata-assignments.json`
**Ready for**: Custom tooling, batch imports, migrations, exports
