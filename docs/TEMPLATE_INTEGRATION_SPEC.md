# Character Template Integration Specification

## Canonical Template JSON Schema (v2)

This is the authoritative schema for `data/character-templates.json`. Each template represents a completed bare-minimum Level 1 build.

### Root Structure
```
{
  "version": 2,
  "templates": [ ... ]
}
```

### Per-Template Structure

#### A. IDENTIFICATION & PRESENTATION (required)
- `id` (string): Unique identifier, snake_case format (e.g., "jedi_guardian")
- `name` (string): Display name (e.g., "Guardian")
- `description` (string): Build philosophy and role description
- `quote` (string): In-character quote or flavor text
- `imagePath` (string): Path to template artwork

#### B. BUILD CLASSIFICATION (required)
- `subtype` (string): Actor subtype ("actor", "droid", "npc"). Default: "actor"
- `level` (number): Template target level (always 1 for now)
- `supportLevel` (string): Curation status. "FULL" = complete validated build, "PARTIAL" = WIP, "REFERENCE" = example only

#### C. MECHANICAL SELECTIONS (required, using refs only)

**Class:**
- `classId` (object): Canonical class reference
  - `pack` (string): Compendium pack name
  - `id` (string): Compendium document ID
  - `name` (string): Display name (informational only)
  - `type` (string): "class"

**Species:**
- `speciesId` (object): Canonical species reference
  - `pack` (string): Compendium pack name
  - `id` (string): Compendium document ID
  - `name` (string): Display name (informational only)
  - `type` (string): "species"

**Background:**
- `backgroundId` (object | null): Canonical background reference, or null if not provided
  - `pack` (string): Compendium pack name
  - `id` (string): Compendium document ID
  - `name` (string): Display name (informational only)
  - `type` (string): "background"

**Ability Scores:**
- `abilityScores` (object): Preset ability values (Level 1 base)
  - `str`, `dex`, `con`, `int`, `wis`, `cha` (number): Ability scores (10-18 typical for L1)

**Trained Skills:**
- `trainedSkills` (array of objects): Skills to train at Level 1
  - Each: `{ "id": "<compendium-id>", "name": "<display-name>" }`
  - All IDs should be canonical UUIDs/IDs from skill compendium

**Feats:**
- `feats` (array of objects): Feats granted at Level 1
  - Each: `{ "id": "<feat-id>", "pack": "<pack-name>", "name": "<display-name>" }`
  - Can be empty if template doesn't grant feats

**Talents:**
- `talents` (array of objects): Talent selections at Level 1
  - Each: `{ "id": "<talent-id>", "pack": "<pack-name>", "name": "<display-name>" }`
  - Can be empty

**Talent Tree (optional):**
- `talentTreeId` (object | null): Talent tree selection (if specified)
  - `id`, `pack`, `name`, `type`

**Force Powers (if Force User):**
- `forcePowers` (array of objects): Force powers granted
  - Each: `{ "id": "<forcepower-id>", "pack": "<pack-name>", "name": "<display-name>", "type": "forcepower" }`
  - Can be empty for non-Force users

**Languages (optional):**
- `languages` (array of strings): Language IDs or standard language names (e.g., "Basic", "Shyriiwook")

**Equipment & Credits:**
- `equipment` (array of objects): Starting equipment
  - Each: `{ "id": "<equipment-id>", "pack": "<pack-name>", "quantity": 1, "name": "<display-name>" }`
- `credits` (number): Starting credits for template

#### D. TRAVERSAL POLICY (optional, affects progression spine behavior)

- `mentor` (string | null): Preferred mentor ID (if any)
- `archetype` (string): Build archetype tag (e.g., "Guardian", "Consular") - used for signaling
- `roleTags` (array of strings): Role classifications (e.g., ["melee", "tank"], ["force-user", "diplomat"])
- `forceUser` (boolean): Whether this is a Force-using template. Default: determined from forcePowers presence.

#### E. METADATA & NOTES (non-authoritative)

- `notes` (string): Human-readable commentary about the build (computed stats for reference, NOT authoritative for validation)

### REMOVED FIELDS (no longer in canonical schema)

The following fields existed in v1 but are NOT in the canonical v2 schema:

- `class` (string) - Use `classId` object instead
- `className` (string) - Use `classId.name` for display
- `species` (string) - Use `speciesId` object instead
- `speciesName` (string) - Use `speciesId.name` for display
- `background` (string) - Use `backgroundId` object instead
- `backgroundName` (string) - Use `backgroundId.name` for display
- `feat` (string, singular) - Use `feats` array instead
- `featRef` (object) - Consolidated into `feats` array
- `talent` (string, singular) - Use `talents` array instead
- `talentRef` (object) - Consolidated into `talents` array
- `talentTree` (string) - Use `talentTreeId` object instead
- `talentTreeRef` (object) - Consolidated into `talentTreeId` object
- `startingEquipment` (array of strings) - Use `equipment` array of objects instead
- `forcePowerRefs` (array, separate) - Consolidated into `forcePowers` array with full ref structure
- `equipmentRefs` (array) - Consolidated into `equipment` array

These consolidations eliminate co-equal "truth" fields and make the schema unambiguous.

### Example Template (Canonical Schema v2)

```json
{
  "id": "jedi_guardian",
  "name": "Guardian",
  "description": "A nimble warrior specializing in lightsaber combat, using finesse and defensive techniques to overwhelm opponents.",
  "quote": "Through the Force, I am the shield that guards the innocent.",
  "imagePath": "systems/foundryvtt-swse/assets/templates/jedi_guardian.webp",
  "subtype": "actor",
  "level": 1,
  "supportLevel": "FULL",

  "classId": {
    "pack": "foundryvtt-swse.classes",
    "id": "fec1f8af44fcc35a",
    "name": "Jedi",
    "type": "class"
  },

  "speciesId": {
    "pack": "foundryvtt-swse.species",
    "id": "species-mirialan",
    "name": "Mirialan",
    "type": "species"
  },

  "backgroundId": null,

  "abilityScores": {
    "str": 10,
    "dex": 16,
    "con": 12,
    "int": 12,
    "wis": 14,
    "cha": 8
  },

  "trainedSkills": [
    { "id": "2b9e43f710664b31", "name": "Acrobatics" },
    { "id": "a6c5e98148aad9a9", "name": "Initiative" },
    { "id": "cb5493f65f0bdb62", "name": "Perception" },
    { "id": "43c5941072ec78af", "name": "Use the Force" }
  ],

  "feats": [
    {
      "pack": "foundryvtt-swse.feats",
      "id": "252b67d6e31c377e",
      "name": "Weapon Finesse",
      "type": "feat"
    }
  ],

  "talents": [
    {
      "pack": "foundryvtt-swse.talents",
      "id": "9379daa94a228c04",
      "name": "Block",
      "type": "talent"
    }
  ],

  "talentTreeId": {
    "pack": "foundryvtt-swse.talent_trees",
    "id": "10c843cef8ce2798",
    "name": "Jedi Guardian",
    "type": "talenttree"
  },

  "forcePowers": [
    {
      "pack": "foundryvtt-swse.forcepowers",
      "id": "f177dc6d65f76de9",
      "name": "Battle Strike",
      "type": "forcepower"
    },
    {
      "pack": "foundryvtt-swse.forcepowers",
      "id": "1ac1084ca8f07114",
      "name": "Surge",
      "type": "forcepower"
    }
  ],

  "languages": ["Basic"],

  "equipment": [
    {
      "pack": "foundryvtt-swse.weapons-simple",
      "id": "weapon-lightsaber",
      "name": "Lightsaber",
      "type": "weapon",
      "quantity": 1
    },
    {
      "pack": "foundryvtt-swse.equipment",
      "id": "medical-medpac",
      "name": "Medpac",
      "type": "equipment",
      "quantity": 1
    }
  ],

  "credits": 465,

  "mentor": "miraj",
  "archetype": "Guardian",
  "roleTags": ["melee", "force-user", "lightsaber"],
  "forceUser": true,

  "notes": "Attack +7, Reflex Defense 19, HP 32. Block talent allows negating melee attacks with Use the Force check."
}
```

### Migration Notes

When converting v1 templates to v2:

1. **classId**: Extract from `classRef` if present, otherwise construct from `className`
2. **speciesId**: Extract from `speciesRef` if present
3. **backgroundId**: Extract from `backgroundRef` if present, or set to null
4. **feats**: Merge `feat` (singular) and `featRef` (if both exist) into array
5. **talents**: Merge `talent` (singular) and `talentRef` (if both exist) into array
6. **talentTreeId**: Extract from `talentTreeRef` if present, or null
7. **forcePowers**: Convert array using `forcePowerRefs` structure (pack, id, name, type)
8. **trainedSkills**: Normalize all IDs to consistent format (prefer UUIDs from compendium index)
9. **equipment**: Convert from `startingEquipment` names to `equipment` with full refs from `equipmentRefs`
10. **mentor**: Keep as-is (can be ID or name for now)
11. **archetype**: Extract from template, may need to normalize format
12. **Remove**: All v1-only fields (class, species, feat, talent, etc.)

### Validation Rules

Templates loaded from this schema must satisfy:

- `id` is non-empty and unique
- `classId` must point to a valid class in compendiums
- `speciesId` must point to a valid species
- `backgroundId` (if not null) must point to a valid background
- `abilityScores` must contain all six abilities, each 3-18
- `feats` must all point to valid feat compendiums
- `talents` must all point to valid talent compendiums
- `talentTreeId` (if present) must point to valid talent tree
- `forcePowers` must all point to valid force power compendiums
- `equipment` must all point to valid equipment/weapon compendiums
- `credits` must be non-negative
- `level` must be 1 (for now)

If any validations fail, the template is marked as invalid and surfaced in logs.
