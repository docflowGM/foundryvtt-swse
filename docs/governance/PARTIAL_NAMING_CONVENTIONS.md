# PARTIAL NAMING CONVENTIONS - QUICK REFERENCE

Use this card when naming any new panel or subpartial.

---

## PANEL NAMING PATTERN

| Aspect | Pattern | Example | Example | Example |
|--------|---------|---------|---------|---------|
| **Builder Method** | `build<PascalCase>Panel()` | `buildHealthPanel()` | `buildAbilityScoresPanel()` | `buildDroidModPointsPanel()` |
| **Context Key** | `<camelCase>Panel` | `healthPanel` | `abilityScoresPanel` | `droidModPointsPanel` |
| **Template File** | `<kebab-case>-panel.hbs` | `health-panel.hbs` | `ability-scores-panel.hbs` | `droid-mod-points-panel.hbs` |
| **Validator Func** | `validate<PascalCase>Panel()` | `validateHealthPanel()` | `validateAbilityScoresPanel()` | `validateDroidModPointsPanel()` |
| **CSS Root Class** | `.swse-panel--<kebab-case>` | `.swse-panel--health` | `.swse-panel--ability-scores` | `.swse-panel--droid-mod-points` |
| **Registry Entry** | `PANEL_REGISTRY.panels.<camelCase>Panel` | `PANEL_REGISTRY.panels.healthPanel` | `PANEL_REGISTRY.panels.abilityScoresPanel` | `PANEL_REGISTRY.panels.droidModPointsPanel` |

---

## SUBPARTIAL NAMING PATTERN

| Aspect | Pattern | Example | Example | Example |
|--------|---------|---------|---------|---------|
| **Template File** | `<kebab-case>-subpartial.hbs` | `health-bar-subpartial.hbs` | `ability-score-subpartial.hbs` | `condition-slot-subpartial.hbs` |
| **CSS Root Class** | `.swse-subpartial--<kebab-case>` | `.swse-subpartial--health-bar` | `.swse-subpartial--ability-score` | `.swse-subpartial--condition-slot` |
| **Validator (optional)** | `validate<PascalCase>Subpartial()` | `validateHealthBarSubpartial()` | `validateAbilityScoreSubpartial()` | `validateConditionSlotSubpartial()` |
| **In Parent Registry** | `subpartials[].name` | `'health-bar-subpartial'` | `'ability-score-subpartial'` | `'condition-slot-subpartial'` |

---

## ROW TRANSFORMER NAMING

| What | Pattern | Example | Example |
|------|---------|---------|---------|
| **Transformer Function** | `transform<SourceType>Row()` | `transformInventoryItemRow()` | `transformDroidProtocolRow()` |
| **Row Validator (optional)** | `validate<SourceType>Row()` | `validateInventoryItemRow()` | `validateDroidProtocolRow()` |
| **Row CSS Class** | `.row--<type>` | `.row--weapon` | `.row--protocol` |

---

## NAMING EXAMPLES: DO AND DON'T

### Panels

✅ **GOOD** — Clear, specific, no abbreviations
```
buildInventoryPanel()
buildTalentPanel()
buildDroidCustomizationPanel()
buildStar ShipManeuverPanel()
buildDarkSidePanel()
buildRacialAbilitiesPanel()
```

❌ **BAD** — Abbreviated, vague, inconsistent
```
buildInvPanel()           ← Abbreviated
buildTalentPanel()        ← Actually good, but sometimes abbreviated as talentPanel (inconsistent)
buildDroidModPanel()      ← Abbreviated
buildShipManPanel()       ← Abbreviated
buildDarkSidePanel()      ← Actually good
buildRacialAbilPanel()    ← Abbreviated
```

### Subpartials

✅ **GOOD** — Purpose-specific, descriptive
```
inventory-row-subpartial.hbs
talent-summary-subpartial.hbs
condition-slot-subpartial.hbs
protocol-effect-subpartial.hbs
damage-indicator-subpartial.hbs
feat-prerequisite-subpartial.hbs
```

❌ **BAD** — Too vague, context-unclear
```
row.hbs                    ← What row? Inventory? Combat?
item.hbs                   ← Item could mean many things
display.hbs                ← What's displayed?
detail.hbs                 ← What details?
summary.hbs                ← Summary of what?
entry.hbs                  ← Generic, unclear
```

### Row Transformers

✅ **GOOD** — Clear source type
```
transformInventoryItemRow()
transformTalentRow()
transformFeatRow()
transformDroidProtocolRow()
transformLanguageRow()
```

❌ **BAD** — Vague verbs, wrong naming
```
formatItemRow()            ← Wrong verb (should be 'transform')
prepareInventoryRow()      ← Wrong verb
parseItemData()            ← Wrong verb, wrong output type
prepInventoryRow()         ← Abbreviated
transformItem()            ← Missing 'Row'
```

---

## MULTI-WORD NAMING RULES

### CamelCase (Methods, Context Keys)
- No spaces, first word lowercase, subsequent words capitalized
- `buildAbilityScoresPanel()`
- `abilityScoresPanel`
- `validateAbilityScoresPanel()`

### kebab-case (Files, CSS Classes)
- Words separated by hyphens, all lowercase
- `ability-scores-panel.hbs`
- `.swse-panel--ability-scores`
- `ability-score-subpartial.hbs`
- `.swse-subpartial--ability-score`

### PascalCase (Function Names Only)
- Every word capitalized, no spaces
- `buildAbilityScoresPanel()` ← Used for method names
- `validateAbilityScoresPanel()` ← Used for validator names
- `transformInventoryItemRow()` ← Used for transformer names

---

## FORBIDDEN ABBREVIATIONS

These are not allowed in formal panel/subpartial names:

```
✗ Inv → Inventory
✗ Dmg → Damage
✗ Mod → Modification or Modifier (context-dependent, spell it out)
✗ Pt → Points
✗ Exp → Experience
✗ Cond → Condition
✗ Qty → Quantity
✗ Prev → Prevention or Previous (spell it out)
✗ Stat → Statistic
✗ Req → Required
✗ Ctrl → Control
```

Exception: Well-known acronyms
```
✓ NPC (Non-Player Character) — acceptable in context
✓ SVG (Scalable Vector Graphics) — acceptable in context
✓ CSS (Cascading Style Sheets) — acceptable in context
✓ UUID (Unique Identifier) — acceptable in context
```

But still spell out in panel names:
```
✓ buildNPCPanel() (use buildNpcPanel() or buildNonPlayerCharacterPanel())
✓ buildSVGBackedHealthPanel() (rare, usually buildPortraitPanel for SVG art)
```

---

## SHEETS AND SHEET-SPECIFIC NAMING

Each sheet type has its own directory and file structure. Keep naming consistent within sheet:

### Character Sheet
```
scripts/sheets/v2/character/
  CharacterPanelContextBuilder.js
  CharacterPanelValidators.js
  PANEL_REGISTRY.js

templates/v2/character/panels/
  health-panel.hbs
  inventory-panel.hbs
  talent-panel.hbs
  subpartials/
    health-bar-subpartial.hbs
    inventory-row-subpartial.hbs
    talent-summary-subpartial.hbs
```

### NPC Sheet
```
scripts/sheets/v2/npc/
  NPCPanelContextBuilder.js
  NPCPanelValidators.js
  PANEL_REGISTRY.js

templates/v2/npc/panels/
  health-panel.hbs (reused from character)
  npc-biography-panel.hbs (NPC-specific)
  inventory-panel.hbs (reused)
  subpartials/
    inventory-row-subpartial.hbs (reused from character)
    npc-biography-subpartial.hbs (NPC-specific)
```

Pattern: Reused panels keep same names. New panels get sheet-specific prefixes if needed.

---

## EXAMPLE: ADDING A NEW PANEL

Task: Add a "Resistance Panel" to character sheet showing resistances to damage types.

Step 1: Name it
```
Panel Name:       Resistance (or "Damage Resistance")
Builder:          buildResistancePanel()
Context Key:      resistancePanel
Validator:        validateResistancePanel()
Template:         resistance-panel.hbs
CSS Root:         .swse-panel--resistance
Registry Entry:   PANEL_REGISTRY.panels.resistancePanel
```

Step 2: If it has rows (ledger-style), name the transformer
```
Transformer:      transformResistanceRow()
Row Validator:    validateResistanceRow()
```

Step 3: If it has subpartials, name them
```
Subpartial:       resistance-item-subpartial.hbs
CSS Root:         .swse-subpartial--resistance-item
Validator:        validateResistanceItemSubpartial() (optional)
```

Step 4: Implement
```
// scripts/sheets/v2/character/CharacterPanelContextBuilder.js
buildResistancePanel(actor) { ... }

// scripts/sheets/v2/character/CharacterPanelValidators.js
validateResistancePanel(resistancePanel) { ... }
validateResistanceRow(row) { ... }

// templates/v2/character/panels/resistance-panel.hbs
<div class="swse-panel--resistance"> ... </div>

// templates/v2/character/panels/subpartials/resistance-item-subpartial.hbs
<div class="swse-subpartial--resistance-item"> ... </div>

// PANEL_REGISTRY.js
PANEL_REGISTRY.panels.resistancePanel = {
  name: 'resistancePanel',
  builderName: 'buildResistancePanel',
  validatorName: 'validateResistancePanel',
  templatePath: 'templates/v2/character/panels/resistance-panel.hbs',
  // ... more metadata ...
  subpartials: [{
    name: 'resistance-item-subpartial',
    template: 'templates/v2/character/panels/subpartials/resistance-item-subpartial.hbs',
    validatorName: 'validateResistanceItemSubpartial',
    // ... metadata ...
  }]
}
```

---

## REFERENCE: STANDARD PANEL NAMES IN CODEBASE

Use these as examples when naming new panels:

**Character Sheet Standard Panels**
- `healthPanel` (health-panel.hbs)
- `defensePanel` (defense-panel.hbs)
- `portraitPanel` (portrait-panel.hbs)
- `inventoryPanel` (inventory-panel.hbs)
- `talentPanel` (talent-panel.hbs)
- `featPanel` (feat-panel.hbs)
- `skillsPanel` (skills-panel.hbs)
- `abilitiesPanel` (abilities-panel.hbs)
- `biographyPanel` (biography-panel.hbs)
- `languagesPanel` (languages-panel.hbs)
- `combatPanel` (combat-panel.hbs)
- `darkSidePanel` (dark-side-panel.hbs)
- `forcePowersPanel` (force-powers-panel.hbs)
- `racialAbilitiesPanel` (racial-abilities-panel.hbs)

Follow this pattern when adding new panels.

---

**Version:** 1.0
**Last Updated:** 2026-03-29
