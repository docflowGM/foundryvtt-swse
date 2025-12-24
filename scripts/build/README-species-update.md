# Species Traits Update

This directory contains scripts for updating the species compendium with racial traits.

## Files

- **data/species-traits.json** - JSON data file containing racial traits for all species
- **scripts/migration/update-species-traits-migration.js** - Automated migration that runs on world ready
- **scripts/build/update-species-traits.js** - Manual script for updating species (can be run as a macro)

## Automated Migration

The species traits update migration runs automatically when a GM loads a world. The migration:

1. Loads species traits from `data/species-traits.json`
2. Updates each species in the compendium with their racial traits
3. Tracks the migration version to avoid re-running
4. Provides detailed logging and notifications

**Migration Version**: 1.1.215

### Migration Status

The migration will only run once per version. To check or manually run the migration:

```javascript
// Check if migration is needed
await game.swse.migrations.updateSpeciesTraits();

// Or manually trigger via console
await game.swse.migrations.updateSpeciesTraits();
```

## Manual Update Script

If you need to manually update species traits (e.g., during development), you can use the `update-species-traits.js` script:

1. Copy the contents of `scripts/build/update-species-traits.js`
2. Create a new Script macro in Foundry VTT
3. Paste the content
4. Execute the macro as GM

This will update all species in the compendium with their racial traits from the data file.

## Species Traits Data Format

The `species-traits.json` file contains an array of species objects:

```json
[
  {
    "name": "Species Name",
    "racialTraits": [
      "Trait Name: Description of the trait",
      "Another Trait: Description of another trait"
    ]
  }
]
```

Each species can have multiple racial traits, which are stored as an array of strings.

## Adding New Species Traits

To add or update species traits:

1. Edit `data/species-traits.json`
2. Add or modify species entries
3. Update the `MIGRATION_VERSION` in `update-species-traits-migration.js`
4. Reload the world (as GM) to trigger the migration

## Technical Details

- **Compendium**: `foundryvtt-swse.species`
- **Storage Field**: `system.racialTraits`
- **Migration Setting**: `foundryvtt-swse.speciesTraitsUpdate`

The racial traits are stored in the `system.racialTraits` field of each species document, with multiple traits separated by double newlines.
