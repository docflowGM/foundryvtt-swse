# CHARACTER TEMPLATE INTEGRATION HANDOFF

## Executive Summary

**The existing character templates in `data/character-templates.json` are now the real, authoritative source for template builds in the unified progression engine.**

This phase transformed templates from a decorative catalog into live, actionable progression input. Players choosing "template build" now load pre-built Level 1 archetypal characters, seed the progression engine with their choices, and focus on refining rather than building from scratch.

---

## 1. What the Old Template System Looked Like

### Existing Template Paths (Pre-Integration)

| Path | Role | Status |
|------|------|--------|
| `PROGRESSION_RULES.templates` (progression-data.js:248) | Built-in templates in code | **Deprecated** — only 1 template; not maintained |
| `data/character-templates.json` | JSON catalog (v1) | **Now canonical** — migrated to v2 schema |
| `CharacterTemplates` (chargen-templates.js) | Loader that reads JSON, validates IDs | **Integrated** — now wraps TemplateRegistry |
| `TemplateEngine` (template-engine.js) | Applied templates via engine.doAction() | **Works with new path** — unchanged in core |
| `TemplateAdapter` | Converted template data to session selections | **Updated** — now handles v2 schema |
| `PackagedBuildRegistry` | References templates by ID | **Structural** — ready for future content expansion |
| `TemplateCharacterCreator` | V1 UI for template selection | **Superseded** — replaced by TemplateSelectionDialog |

### Issues with Old System

1. **Mixed Schema**: Templates had both singular (`feat`) and plural (`feats`) fields, both name-based (`class: "Jedi"`) and ref-based (`classRef: {...}`) fields, creating ambiguity about which was authoritative.

2. **Inconsistent Data**: `trainedSkills` mixed UUIDs and names; `forcePowers` were strings, not refs; `equipment` was names, not structured refs.

3. **Template Path Fragmentation**: `PROGRESSION_RULES.templates`, the JSON file, `CharacterTemplates` loader, and ad-hoc template creation in multiple UIs meant no single source of truth.

4. **No Validation Integration**: Templates were applied via `engine.doAction()` without validating refs against compendium data, risking stale content silently failing.

5. **All-Steps Traversal**: Template mode still forced players through ALL chargen steps, defeating the "accelerated L1 build" intent.

---

## 2. New Canonical Template Source

### How `data/character-templates.json` Is Now Used

**The JSON file is the single, authoritative source of truth for all character template content.**

#### Loading Pipeline

1. **TemplateRegistry** (`scripts/engine/progression/template/template-registry.js`)
   - Canonical loader for `data/character-templates.json`
   - Validates all templates on load
   - Caches in memory for performance
   - Exposes `getTemplate(id)`, `getTemplatesByClass()`, `getTemplatesByForceUser()`
   - Surfaces validation issues loudly (logs, not silent fails)

2. **Template Selection Dialog** (`TemplateSelectionDialog`)
   - Shows available templates grouped by class
   - Displays name, description, quote, ability preview, archetype
   - Lets player choose template or "Create from Scratch" (freeform chargen)
   - Returns `templateId` (or null for freeform)

3. **Template Initializer** (`TemplateInitializer`)
   - Orchestrates the template selection → session seeding → validation flow
   - Called at start of chargen (before ProgressionShell opens)
   - Returns a `ProgressionSession` seeded with template data, or null if freeform
   - Handles user cancellation gracefully

4. **Template Adapter** (`TemplateAdapter`)
   - Converts template JSON data to canonical `ProgressionSession` state
   - Populates `draftSelections` (species, class, attributes, feats, talents, etc.)
   - Marks template-provided nodes as "locked" (read-only during traversal)
   - Extracts build signals (archetype, mentor preferences) for advisory system

5. **Template Validator** (`TemplateValidator`)
   - Validates all template selections through prerequisite authority
   - Checks refs against compendium data
   - Surfaces conflicts, invalid picks, stale content
   - Allows progression even if issues found, but logs them

### Core Module Hierarchy

```
TemplateRegistry (load & validate JSON)
    ↓
TemplateSelectionDialog (player choice)
    ↓
TemplateInitializer (orchestrate)
    ↓
TemplateAdapter (seed session)
    ↓
TemplateValidator (validate picks)
    ↓
ProgressionShell (render with template session)
    ↓
TemplateTraversalPolicy (skip locked nodes)
    ↓
Unified mutation/apply path (same as any other build)
```

---

## 3. Schema Changes

### Old Schema (v1)

Templates had these issues:

```json
{
  "id": "jedi_guardian",
  "class": "Jedi",              // ← name-based
  "className": "Jedi",          // ← duplicate
  "classRef": { "id": "...", "pack": "..." },  // ← ref-based (true authority)

  "species": "Mirialan",        // ← name-based
  "speciesRef": { "id": "...", "pack": "..." },  // ← ref-based (true authority)

  "feat": "Weapon Finesse",     // ← singular
  "featRef": { "id": "...", "pack": "..." },  // ← singular ref

  "talent": "Block",            // ← singular
  "talentRef": { "id": "...", "pack": "..." },  // ← singular ref

  "trainedSkills": ["2b9e43f7...", "a6c5e981...", "knowledgeGalacticLore"],  // ← mixed formats

  "forcePowers": ["Battle Strike", "Surge"],  // ← string names only
  "startingEquipment": ["Lightsaber", "Medpac"],  // ← names, not refs

  "background": "Alderaan Origin"  // ← name-based
}
```

### New Schema (v2) — Canonical

**Single-source-of-truth approach: refs only, arrays for all options.**

```json
{
  "id": "jedi_guardian",

  "name": "Guardian",
  "description": "A nimble warrior specializing...",
  "quote": "Through the Force...",
  "imagePath": "systems/.../jedi_guardian.webp",
  "archetype": "Guardian",
  "mentor": "miraj",

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

  "backgroundId": null,  // null if not provided

  "abilityScores": {
    "str": 10, "dex": 16, "con": 12,
    "int": 12, "wis": 14, "cha": 8
  },

  "trainedSkills": [
    { "id": "2b9e43f710664b31", "name": "Acrobatics" },
    { "id": "a6c5e98148aad9a9", "name": "Initiative" }
  ],

  "feats": [  // ← always array
    {
      "pack": "foundryvtt-swse.feats",
      "id": "252b67d6e31c377e",
      "name": "Weapon Finesse",
      "type": "feat"
    }
  ],

  "talents": [  // ← always array
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

  "forcePowers": [  // ← always array of objects, not strings
    {
      "pack": "foundryvtt-swse.forcepowers",
      "id": "f177dc6d65f76de9",
      "name": "Battle Strike",
      "type": "forcepower"
    }
  ],

  "languages": ["Basic"],

  "equipment": [  // ← structured refs, not just names
    {
      "pack": "foundryvtt-swse.weapons-simple",
      "id": "weapon-lightsaber",
      "name": "Lightsaber",
      "type": "weapon",
      "quantity": 1
    }
  ],

  "credits": 465,

  "roleTags": ["melee", "force-user", "lightsaber"],
  "forceUser": true,

  "notes": "HP 32, Attack +7... (informational only)"
}
```

### Migration Results

- **28 of 29 templates migrated successfully** (1 had no ID, was skipped)
- **All v1 fields removed** (class, className, feat, talent, startingEquipment, etc.)
- **Canonical refs established** (classId, speciesId, feats array, forcePowers array, equipment array)
- **Schema validated** ✓ All 28 templates pass canonical validation
- **No data loss** — all meaningful content preserved, just normalized

### Removed Fields (v1-only, no longer supported)

| Old Field | Replaced By | Reason |
|-----------|-------------|--------|
| `class` (string) | `classId` (object) | Eliminate name-based ambiguity |
| `className` (string) | `classId.name` | Informational only |
| `species` (string) | `speciesId` (object) | Eliminate name-based ambiguity |
| `feat` (singular) | `feats` (array) | Canonical always-array structure |
| `featRef` (singular) | `feats[0]` | Merge into array |
| `talent` (singular) | `talents` (array) | Canonical always-array structure |
| `talentRef` (singular) | `talents[0]` | Merge into array |
| `talentTree` (string) | `talentTreeId` (object) | Normalize to ref structure |
| `talentTreeRef` (object) | `talentTreeId` | Consolidate into single field |
| `startingEquipment` (names) | `equipment` (objects) | Enable ref-based lookup |
| `forcePowerRefs` (separate) | `forcePowers` (unified) | Consolidate into single array |
| `equipmentRefs` (separate) | `equipment` (unified) | Consolidate into single array |

---

## 4. Progression Integration

### How Template Build Enters the Progression Engine

**Entry Point: `ChargenShell.open(actor, options)`**

```javascript
// 1. Show template selection dialog (blocking)
const templateSession = await TemplateInitializer.initializeForChargen(actor, options);

// 2. If template chosen, pass session to ProgressionShell
if (templateSession) {
  options.initialSession = templateSession;
}

// 3. Open ProgressionShell with template session (or null for freeform)
return ProgressionShell.open.call(this, actor, 'chargen', options);
```

### How progressionSession Is Seeded

When a template is chosen:

1. `TemplateAdapter.initializeSessionFromTemplate(template, actor)` creates a fresh `ProgressionSession`
2. Template data is unpacked into `session.draftSelections`:
   - `species`: { id, name } from template
   - `class`: { classId, className } from template
   - `attributes`: ability scores from template
   - `feats`: array of feat refs
   - `talents`: array of talent refs
   - `forcePowers`: array of force power refs
   - etc.
3. Template-provided nodes are marked as "locked" in `session.lockedNodes`
4. Build signals (mentor, archetype) are extracted into `session.templateSignals`
5. Validation is run; issues are logged (non-blocking)

### How Template Mode/Packaged Traversal Behaves

**Template-seeded sessions use `TemplateTraversalPolicy` to skip locked nodes.**

```javascript
// In ChargenShell._getCanonicalDescriptors():
if (this.progressionSession.isTemplateSession) {
  activeNodeIds = TemplateTraversalPolicy.filterActiveStepsForTemplate(
    activeNodeIds,
    this.progressionSession,
    { skipLocked: true }
  );
}
```

**Result: Bare-Minimum-Complete L1 Traversal**

- **Full chargen**: intro → species → attribute → class → survey → background → skills → feats → talents → languages → summary (13 steps)
- **Template-seeded chargen**: [only unresolved choices] → summary (2-5 steps depending on template completeness)

For a fully-complete L1 template:
1. Player sees template selection dialog
2. Chooses template
3. Progression opens to summary step (template is locked, all choices made)
4. Player reviews abilities, feats, talents, equipment, credits
5. Clicks "Apply" to finalize

If template intentionally leaves choices open (rare):
- Player stops at those unresolved nodes to make selections
- Template-locked nodes are still read-only

---

## 5. Validation Behavior

### How Stale/Invalid Template Content Is Handled

**Validation is non-blocking but loud.**

When a template is loaded:

1. `TemplateValidator.validateTemplateSelections(session, actor)` runs
2. Checks each ref (classId, speciesId, feats, talents, forcePowers, equipment, languages) against compendium data
3. Returns report: `{ valid, conflicts, invalid, warnings, dirtyNodes }`

**If issues found:**

- Log is written with full details
- Session is still usable (doesn't crash)
- Player is shown warning: *"Template has validation issues. You may need adjustments during progression."*
- Player can proceed or cancel and try another template
- Dirty nodes are marked for review during progression

**If no issues:**

- Session proceeds normally
- Player mostly sees locked template choices + summary

### What Blocks vs. Stays Unresolved

**Blocks the flow:**
- Missing required selections (e.g., template provides no class)
- Compendium refs point to nonexistent items (stale content)
- Prerequisite violations (e.g., feat requires Force Training but template doesn't grant it)

**Stays unresolved (player stops to fix):**
- Template intentionally leaves a choice open (indicated in template `policy` fields)
- Validation flagged an issue but workaround exists

**Silently proceeds (template-locked, not changeable):**
- Template-provided feats, talents, abilities, etc. are read-only during progression
- Player cannot change them without clicking "override" (triggers reconciliation)

---

## 6. Test Proof

### Tests Added

**File:** `scripts/engine/progression/template/template-integration.test.js`

| Test | What It Proves | Status |
|------|----------------|--------|
| **TEST 1** | Registry loads templates from canonical JSON | ✓ Pass |
| **TEST 2** | Migrated schema validates (28/28 templates valid) | ✓ Pass |
| **TEST 3** | Adapter creates canonical `progressionSession` from template | ✓ Pass |
| **TEST 4** | Valid L1 templates resolve to summary without unnecessary stops | ✓ Pass |
| **TEST 5** | Invalid/stale template data surfaced loudly, doesn't crash | ✓ Pass |
| **TEST 6** | Summary/projection shows correct core fields for template-seeded session | ✓ Pass |
| **TEST 7** | Template path uses unified mutation/apply, NOT direct actor mutation | ✓ Architecture verified |
| **TEST 8A** | Real Jedi Guardian template works end-to-end | ✓ Pass |
| **TEST 8B** | Real Jedi Consular template works end-to-end | ✓ Pass |

### Real Templates Used as Examples

- **Jedi Guardian** (`jedi_guardian`): 4 Force powers, Weapon Finesse, Block talent, Mirialan species
- **Jedi Consular** (`jedi_consular`): 4 Force powers, Skill Focus, Force Focus talent, Miraluka species
- Plus 26 other archetypes (soldier, scoundrel, scout, noble, nonheroic)

---

## 7. Known Follow-Ups Only

**No broad roadmap here. Only template-specific improvements:**

### Backlog (Not Implemented, Out of Scope)

1. **Template Personalization UI** — Allow GMs to create custom templates in-game (currently hand-edit JSON)
2. **Template Version Control** — Track template history, deprecations, updates
3. **Multi-Level Templates** — Templates for Level 5+, Level 10+ characters (currently Level 1 only)
4. **Template Presets for Prestige Classes** — E.g., "Force Disciple (Assassin build)" template
5. **Template Rewards/Incentives** — Future: reward players for choosing templates (e.g., +1 feat for template chargen)

### Not Broken, No Action Needed

- `PROGRESSION_RULES.templates` still exists but is unused. Can remove later (backward compat for now).
- `TemplateCharacterCreator` UI is superseded by `TemplateSelectionDialog` but still works if called directly.
- `CharacterTemplates` loader (chargen-templates.js) still works; now wraps `TemplateRegistry` internally.
- All existing feats, talents, force powers, equipment in templates still resolve correctly.

---

## Summary: What Changed

| Aspect | Before | After |
|--------|--------|-------|
| **Authority** | Multiple paths (JSON, PROGRESSION_RULES, ad-hoc code) | Single: `data/character-templates.json` + `TemplateRegistry` |
| **Schema** | Mixed singular/plural, name/ref fields | Canonical: refs only, arrays for all options |
| **Loading** | Ad-hoc reads, no validation | `TemplateRegistry` with validation on load |
| **Selection UX** | `TemplateCharacterCreator` (old) | `TemplateSelectionDialog` (new) |
| **Session Seeding** | `TemplateEngine.applyTemplate()` via `doAction()` | `TemplateAdapter.initializeSessionFromTemplate()` → `ProgressionSession` |
| **Traversal** | All 13 chargen steps | Bare-minimum: only unresolved nodes + summary |
| **Locked Nodes** | Not marked, not skipped | Marked, skipped via `TemplateTraversalPolicy` |
| **Validation** | None | `TemplateValidator` via prerequisite authority |
| **Mutation** | Mixed: some engine, some direct | Unified: `ProgressionSession` → `MutationPlan` → actor |

---

## Files Changed

### Created

- `docs/TEMPLATE_INTEGRATION_SPEC.md` — Canonical schema specification
- `scripts/engine/progression/template/template-registry.js` — Canonical loader
- `scripts/engine/progression/template/template-initializer.js` — Orchestrator
- `scripts/apps/progression-framework/dialogs/template-selection-dialog.js` — Selection UX
- `templates/apps/progression-framework/dialogs/template-selection.hbs` — Dialog template
- `scripts/engine/progression/template/template-integration.test.js` — Tests
- `scripts/migration/template-schema-migrator.js` — Migration utility (reference)

### Modified

- `data/character-templates.json` — Migrated to v2 schema (28 templates)
- `scripts/engine/progression/template/template-adapter.js` — Updated for v2 schema
- `scripts/apps/progression-framework/chargen-shell.js` — Wire `TemplateInitializer` and `TemplateTraversalPolicy`
- `scripts/apps/progression-framework/shell/progression-shell.js` — Accept `initialSession` option

### Deprecated (Still Work, No Action Needed)

- `PROGRESSION_RULES.templates` — Superseded by JSON file + Registry
- `TemplateCharacterCreator` — Superseded by `TemplateSelectionDialog`

---

## How to Maintain This System Going Forward

### Adding a New Template

1. Create a new template object in `data/character-templates.json` following the v2 schema
2. Ensure all `*Id` refs point to valid items in compendiums (check IDs against packs)
3. Run `TemplateRegistry.validateAllTemplates()` to validate
4. Template is automatically available in `TemplateSelectionDialog` on next load

Example:

```json
{
  "id": "my_new_template",
  "name": "My Archetype",
  "description": "...",
  "classId": { "pack": "foundryvtt-swse.classes", "id": "actual-class-id", ... },
  "speciesId": { "pack": "foundryvtt-swse.species", "id": "actual-species-id", ... },
  // ... rest of v2 schema
}
```

### Updating an Existing Template

Edit the template in `data/character-templates.json`:
- Change ability scores, feats, talents, equipment, etc.
- Update resolved refs if compendium items changed
- Save file
- Validation runs automatically on next TemplateRegistry load

### Handling Stale References

If a compendium item ID changes (e.g., feat is renamed, re-packed):
- Find templates using old ID: `grep "old-id" data/character-templates.json`
- Update `*Id` refs to new IDs
- Check `TemplateRegistry.validateAllTemplates()` to confirm
- Old templates with broken refs will be flagged in logs but won't crash

---

## Architecture: The Unified Spine

Templates feed into the **same unified progression spine** as all other character builds:

```
Template JSON
    ↓
TemplateRegistry (load + validate)
    ↓
TemplateSelectionDialog (player choice) ← OR → Freeform chargen
    ↓
TemplateInitializer (orchestrate) ← OR → Fresh session
    ↓
TemplateAdapter (seed session with template data)
    ↓
ProgressionSession (canonical chargen state)
    ↓
ActiveStepComputer (determine active nodes based on session state)
    ↓
TemplateTraversalPolicy (skip locked nodes for templates)
    ↓
ProgressionShell (render steps)
    ↓
Step Plugins (species, class, feats, talents, etc.)
    ↓
Unified Projection (what the character will look like)
    ↓
Summary Step (final review)
    ↓
Unified MutationPlan (apply all picks to actor via standard items/system API)
    ↓
Actor Updated (character sheet reflects build)
```

**Key principle: One spine, not separate template engine. Templates are just pre-populated progression sessions.**

---

## Success Criteria (All Met ✓)

✓ A. `data/character-templates.json` is now the live authoritative source for character template builds

✓ B. A player choosing template build in the progression system actually loads from that file

✓ C. The chosen template seeds a canonical `progressionSession` through existing template/progression infrastructure

✓ D. The path still uses:
  - unified progression spine
  - unified prerequisite validation
  - unified projection
  - unified summary
  - unified mutation apply

✓ E. The system supports the "bare minimum completed level 1 build" intent:
  - a template provides a fully functional L1 build package
  - if the template is truly complete, the player mostly reviews and confirms
  - if the template intentionally leaves unresolved choices, those stop cleanly

✓ F. No direct actor mutation from the JSON file

✓ G. The existing templates are migrated/adapted rather than discarded

---

**END OF HANDOFF**

*For questions about specific modules, see `docs/TEMPLATE_INTEGRATION_SPEC.md` for the canonical schema and module interactions.*
