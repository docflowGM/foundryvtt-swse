# Advancement System Flow Diagrams

## Level-Up Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│ CHARACTER SHEET                                                         │
│ "Level Up" Button Click                                                │
└────────────────────┬────────────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ SWSECharacterSheet._onLevelUp()                                         │
│ ├─ Calls: SWSELevelUp.openEnhanced(this.actor)                         │
│ └─ Creates: new SWSELevelUpEnhanced(actor)                             │
└────────────────────┬────────────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ SWSELevelUpEnhanced Constructor                                         │
│ ├─ Initialize currentStep based on level                               │
│ │  ├─ Level 0: start at 'species'                                      │
│ │  └─ Level > 0: start at 'class'                                      │
│ ├─ Initialize selectedClass = null                                     │
│ ├─ Initialize selectedFeats = []                                       │
│ ├─ Initialize selectedTalent = null                                    │
│ ├─ Initialize abilityIncreases = {}                                    │
│ └─ Load mentor system                                                  │
└────────────────────┬────────────────────────────────────────────────────┘
                     │
                     ▼
            ┌────────────────────┐
            │ getData() called    │
            └────────────┬────────┘
                         │
        ┌────────────────┴────────────────┐
        │                                 │
        ▼                                 ▼
   ┌──────────────────┐          ┌──────────────────────┐
   │ Load Feats       │          │ Get Available        │
   │ Filter by        │          │ Classes              │
   │ isQualified      │          │ Check prerequisites  │
   │                  │          │ for each class       │
   └──────────────────┘          └──────────────────────┘
        │                                 │
        └────────────────┬────────────────┘
                         │
                         ▼
            ┌────────────────────────────┐
            │ Render Template with:       │
            │ - Available classes         │
            │ - Available feats (filtered)│
            │ - Mentor guidance           │
            │ - Current step              │
            └────────────┬────────────────┘
                         │
                         ▼
            ┌────────────────────────────┐
            │ User Interaction Loop      │
            │                            │
            │ ┌──────────────────────┐   │
            │ │ USER SELECTS CLASS   │   │
            │ └──────────┬───────────┘   │
            │            │               │
            │            ▼               │
            │ ┌──────────────────────┐   │
            │ │_onSelectClass()      │   │
            │ │ ├─ Calculate HP gain │   │
            │ │ ├─ Determine next    │   │
            │ │ │  step by checking: │   │
            │ │ │  - Ability increase│   │
            │ │ │  - Bonus feat      │   │
            │ │ │  - Talent          │   │
            │ │ ├─ Update currentStep│   │
            │ │ └─ Re-render         │   │
            │ └──────────┬───────────┘   │
            │            │               │
            │ ┌──────────┴───────────┐   │
            │ │ ABILITY INCREASE     │   │ (Levels 4,8,12,16,20)
            │ │ OPTIONAL STEP        │   │
            │ ├─ User clicks ability│   │
            │ │ ├─ Validate total   │   │
            │ │ │  not > 2 points   │   │
            │ │ ├─ if totalAllocated│   │
            │ │ │  < 2 when Next    │   │
            │ │ │  clicked:         │   │
            │ │ │  ├─ warn() ⚠      │   │
            │ │ │  └─ return (block)│   │
            │ │ └─ Re-render        │   │
            │ └──────────┬───────────┘   │
            │            │               │
            │ ┌──────────┴───────────┐   │
            │ │ FEAT SELECTION       │   │
            │ │ CONDITIONAL STEP     │   │
            │ ├─ Feats pre-filtered  │   │
            │ │  by prerequisites    │   │
            │ ├─ User clicks feat    │   │
            │ ├─ On Next step click: │   │
            │ │  if selectedFeats.len│   │
            │ │  ≠ 0: proceed        │   │
            │ │  else: warn() + block│   │
            │ └──────────┬───────────┘   │
            │            │               │
            │ ┌──────────┴───────────┐   │
            │ │ TALENT SELECTION     │   │
            │ │ CONDITIONAL STEP     │   │
            │ ├─ Show talent tree    │   │
            │ ├─ User clicks talent  │   │
            │ │  ├─ selectTalent()   │   │
            │ │  ├─ Validate prereqs │   │
            │ │  │ if !valid:        │   │
            │ │  │ ├─ warn() + return│   │
            │ │  │ │ null (blocked)  │   │
            │ │  │ else: save & return│   │
            │ │  └─ Re-render        │   │
            │ └──────────┬───────────┘   │
            │            │               │
            │ ┌──────────┴───────────┐   │
            │ │ SUMMARY STEP         │   │
            │ ├─ Review all choices  │   │
            │ ├─ Show HP gain        │   │
            │ ├─ Show mentor message │   │
            │ └──────────┬───────────┘   │
            │            │               │
            │ ┌──────────┴───────────┐   │
            │ │ USER CLICKS COMPLETE │   │
            │ │ LEVEL UP BUTTON      │   │
            │ └──────────┬───────────┘   │
            └────────────┼────────────────┘
                         │
                         ▼
            ┌────────────────────────────┐
            │ _onCompleteLevelUp()        │
            │ ├─ Save level 1 class      │
            │ ├─ Create/update class item│
            │ ├─ Add talent item         │
            │ ├─ Add feat items          │
            │ ├─ Apply ability increases │
            │ ├─ Update actor.system.    │
            │ │  level, hp, bab,        │
            │ │  defenses                │
            │ ├─ Create chat message     │
            │ ├─ Show success notification
            │ ├─ Close dialog            │
            │ └─ Re-render actor sheet   │
            └────────────────────────────┘
```

---

## Validation Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│ USER ATTEMPTS SELECTION                                     │
│ (e.g., select feat without prerequisite)                   │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
         ┌───────────────────────┐
         │ PHASE 1: RENDERING    │ (getData called)
         │ Pre-Filter Invalid    │
         └────────┬──────────────┘
                  │
        ┌─────────┴──────────┐
        │ filterQualified    │
        │ Feats/Talents      │
        │ (check prerequisites)
        │                    │
        ▼                    │
    ┌─────────────────────┐  │
    │ PrerequisiteValidator
    │ .checkFeatsPrereqs()  │  │
    │ .checkTalentPrereqs() │
    └──────┬────────────────┘  │
           │                   │
    ┌──────┴───────────────┐   │
    │ Parse prerequisites  │   │
    │ (comma-separated)    │   │
    └──────┬───────────────┘   │
           │                   │
    ┌──────┴──────────────┐    │
    │ For each prereq:    │    │
    │                    │    │
    │ ├─ type: ability   │    │
    │ │  Check score >= X│    │
    │ │                  │    │
    │ ├─ type: bab       │    │
    │ │  Check bab >= X  │    │
    │ │                  │    │
    │ ├─ type: level     │    │
    │ │  Check lvl >= X  │    │
    │ │                  │    │
    │ ├─ type: class     │    │
    │ │  Check class.lvl │    │
    │ │                  │    │
    │ ├─ type: skill     │    │
    │ │  Check trained   │    │
    │ │                  │    │
    │ ├─ type: feat      │    │
    │ │  Check has feat  │    │
    │ │                  │    │
    │ └─ type: talent    │    │
    │    Check has talent│    │
    └──────┬──────────────┘    │
           │                   │
    Accumulate failures        │
    in reasons[] array         │
           │                   │
    Return { valid: bool,      │
             reasons: [] }     │
           │                   │
    ┌──────┴──────────────┐    │
    │ Mark items as:      │    │
    │ isQualified: true   │    │
    │ or                  │    │
    │ isQualified: false  │    │
    └──────┬──────────────┘    │
           │                   │
           └───────┬───────────┘
                   │
                   ▼
         ┌─────────────────────┐
         │ PHASE 1 RESULT:     │
         │                     │
         │ Only isQualified:   │
         │ true items shown    │
         │ in template.        │
         │                     │
         │ Invalid items       │
         │ don't appear in UI. │
         │ User never sees     │
         │ unqualified options.│
         └─────────┬───────────┘
                   │
                   ▼
           ┌───────────────────┐
           │ PHASE 2: RUNTIME  │
           │ Selection Event   │
           └────────┬──────────┘
                    │
          ┌─────────┴──────────┐
          │ USER CLICKS ITEM   │
          │ (even if filtered, │
          │ defensive check)   │
          └────────┬───────────┘
                   │
                   ▼
        ┌──────────────────────┐
        │ selectFeat/Talent()  │
        │ handler called       │
        └────────┬─────────────┘
                 │
                 ▼
        ┌──────────────────────┐
        │ CHECK again:         │
        │ PrerequisiteValidator│
        │ .checkPrereqs()      │
        └────────┬─────────────┘
                 │
        ┌────────┴──────────┐
        │                   │
        ▼                   ▼
    ┌────────┐         ┌─────────┐
    │ VALID  │         │ INVALID │
    └───┬────┘         └────┬────┘
        │                   │
        ▼                   ▼
    Save to          ┌──────────────┐
    selectedFeats/   │ Show warning │
    selectedTalent   │ notification │
        │            └──────────────┘
        │                   │
        ▼                   ▼
    Return feat/     Return null
    talent object    (selection rejected)
        │                   │
        ▼                   ▼
    ├─ Update          ├─ characterData
    │  characterData   │  unchanged
    │  .selectedFeats  ├─ Dialog stays
    │  or .selected    │  open
    │  Talent          ├─ User can try
    ├─ Show success    │  again
    │  notification    └─ Must fix issue
    ├─ Re-render
    │  dialog
    └─ User can
       proceed to next
       step
```

---

## Character Generation Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│ OPEN CHARACTER GENERATOR                                    │
│ new CharacterGenerator()                                    │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
         ┌─────────────────────────┐
         │ chargen-main.js         │
         │ constructor:            │
         │ ├─ currentStep = "name" │
         │ ├─ Load packs           │
         │ │  - species            │
         │ │  - feats              │
         │ │  - talents            │
         │ │  - classes            │
         │ │  - droids             │
         │ └─ Load skills.json     │
         └────────┬────────────────┘
                  │
                  ▼
         ┌─────────────────────────┐
         │ _getSteps() determines  │
         │ step sequence:          │
         │                         │
         │ FOR LIVING CHARS:       │
         │ 1. name                 │
         │ 2. type ← pick LIVING   │
         │ 3. species              │
         │ 4. abilities (point buy)│
         │ 5. class (core only)    │
         │ 6. feats                │
         │ 7. talents              │
         │ 8. skills               │
         │ 9. summary              │
         │ 10. shop                │
         │                         │
         │ FOR DROIDS:             │
         │ 1. name                 │
         │ 2. type ← pick DROID    │
         │ 3. degree               │
         │ 4. size                 │
         │ 5. droid-builder        │
         │ [THEN] steps 4-10       │
         └────────┬────────────────┘
                  │
         ┌────────┴────────────┐
         │                     │
         ▼                     ▼
    ┌──────────────┐      ┌──────────────┐
    │ NAME STEP    │      │ TYPE STEP    │
    ├──────────────┤      ├──────────────┤
    │ Input field  │      │ Button       │
    │ on change:   │      │ click:       │
    │ Store name   │      │ Set isDroid  │
    │ in chargen   │      │ in characterD
    │ Data.name    │      │ ata          │
    │              │      │              │
    │ On Next:     │      │ Next auto-   │
    │ ├─ _validate │      │ advances     │
    │ │ CurrentStep│      │              │
    │ │ ├─ name    │      └──────────────┘
    │ │ │ empty?   │
    │ │ │ warn()   │
    │ │ │ return   │
    │ │ │ false    │
    │ │ └─ block   │
    │ │   advance  │
    │ └─ if valid:│
    │ │ advance   │
    │ └─ re-render
    └──────────────┘
         │
         ▼
    ┌──────────────────────┐
    │ SPECIES STEP         │
    │ (Living) or          │
    │ DEGREE STEP (Droid)  │
    ├──────────────────────┤
    │ Button clicks        │
    │ call:                │
    │ _onSelectSpecies()   │
    │ or _onSelectDegree() │
    │                      │
    │ Save selection to    │
    │ characterData.       │
    │ species or           │
    │ droidDegree          │
    │                      │
    │ On Next: validate    │
    │ ├─ species selected? │
    │ ├─ warn if not       │
    │ └─ return false      │
    │   (block)            │
    └────────┬─────────────┘
             │
             ▼
    ┌────────────────────┐
    │ ABILITIES STEP     │
    │ (Living) or        │
    │ DROID-BUILDER STEP │
    │ (Droid)            │
    │                    │
    │ Living:            │
    │ ├─ Point buy UI    │
    │ ├─ Allocate 25     │
    │ │  points to STR,  │
    │ │  DEX, CON, INT,  │
    │ │  WIS, CHA        │
    │ ├─ Apply racial    │
    │ │  modifiers       │
    │ └─ Calculate       │
    │    modifiers       │
    │                    │
    │ Droid:             │
    │ ├─ System shop UI  │
    │ ├─ Choose:         │
    │ │  - Locomotion    │
    │ │  - Processor     │
    │ │  - Appendages    │
    │ │  - Accessories   │
    │ ├─ Track points    │
    │ └─ Validate budget │
    └────────┬───────────┘
             │
             ▼
    ┌───────────────────────┐
    │ CLASS SELECTION       │
    │                       │
    │ Button clicks call:   │
    │ _onSelectClass()      │
    │                       │
    │ Save selection to     │
    │ characterData.classes │
    │                       │
    │ On Next: validate     │
    │ ├─ class selected?    │
    │ ├─ warn if not        │
    │ └─ return false       │
    │   (block)             │
    └────────┬──────────────┘
             │
             ▼
    ┌───────────────────────┐
    │ FEAT SELECTION        │
    │                       │
    │ Pre-filtered by       │
    │ prerequisites         │
    │                       │
    │ Button clicks call:   │
    │ _onSelectFeat()       │
    │ ├─ Find feat in packs │
    │ ├─ Check not already  │
    │ │  selected           │
    │ ├─ Push to feats[]    │
    │ └─ Re-render          │
    └────────┬──────────────┘
             │
             ▼
    ┌───────────────────────┐
    │ TALENT SELECTION      │
    │                       │
    │ Pre-filtered by       │
    │ prerequisites         │
    │                       │
    │ _onSelectTalent()     │
    │ ├─ Find talent        │
    │ ├─ Check not already  │
    │ │  selected           │
    │ ├─ Auto-advance to    │
    │ │  next step          │
    │ └─ Push to talents[]  │
    └────────┬──────────────┘
             │
             ▼
    ┌───────────────────────┐
    │ SKILLS SELECTION      │
    │                       │
    │ List available skills │
    │ with:                 │
    │ ├─ Class skill bonus  │
    │ ├─ Ability modifier   │
    │ ├─ Half level         │
    │ └─ Trained checkbox   │
    │                       │
    │ _onTrainSkill()       │
    │ ├─ Toggle .trained    │
    │ └─ Update count       │
    └────────┬──────────────┘
             │
             ▼
    ┌───────────────────────┐
    │ SUMMARY STEP          │
    │                       │
    │ Shows:                │
    │ ├─ Character name     │
    │ ├─ Species            │
    │ ├─ Class              │
    │ ├─ Abilities & mods   │
    │ ├─ Skills count       │
    │ ├─ HP calculation     │
    │ ├─ Defenses           │
    │ └─ All selections     │
    │                       │
    │ _onNextStep() call:   │
    │ ├─ _finalizeCharacter│
    │ │  ├─ Recalc abilities
    │ │  ├─ Recalc defenses │
    │ │  ├─ Calc HP         │
    │ │  └─ Calc 2nd wind   │
    │ ├─ Create actor from  │
    │ │  characterData      │
    │ └─ Advance to shop    │
    └────────┬──────────────┘
             │
             ▼
    ┌───────────────────────┐
    │ SHOP STEP             │
    │                       │
    │ Shows equipment store │
    │ Player purchases gear │
    │ with starting credits │
    │                       │
    │ .finish button:       │
    │ ├─ Close dialog       │
    │ └─ Render char sheet  │
    └───────────────────────┘
```

---

## Prerequisite Type Decision Tree

```
┌──────────────────────────────┐
│ PREREQUISITE STRING:         │
│ "STR 13, BAB +5, Level 7"   │
└────────────┬─────────────────┘
             │
             ▼
     ┌───────────────────┐
     │ SPLIT by:         │
     │ comma, semicolon, │
     │ "and", "or"       │
     └───────┬───────────┘
             │
    ┌────────┼────────┐
    │        │        │
    ▼        ▼        ▼
┌──────┐ ┌──────┐ ┌───────┐
│STR13 │ │BAB +5│ │Level 7│
└───┬──┘ └───┬──┘ └───┬───┘
    │        │        │
    ▼        ▼        ▼
  ┌─────────────────────────────┐
  │ _parsePrerequisitePart()    │
  │ Test against patterns:      │
  │                             │
  │ Match ability pattern?      │
  │ "STR 13" → YES              │
  │ {type: 'ability',           │
  │  ability: 'str',            │
  │  value: 13}                 │
  │                             │
  │ Match BAB pattern?          │
  │ "BAB +5" → YES              │
  │ {type: 'bab',              │
  │  value: 5}                  │
  │                             │
  │ Match level pattern?        │
  │ "Level 7" → YES             │
  │ {type: 'level',            │
  │  value: 7}                  │
  │                             │
  │ [... other patterns ...]    │
  └─────────────────────────────┘
         │        │        │
         ▼        ▼        ▼
   ┌──────────────────────────┐
   │ _checkSinglePrerequisite │
   │ switch(prereq.type)      │
   │                          │
   │ case 'ability':          │
   │  Get actor.system.       │
   │  abilities.str.total     │
   │  Compare: 12 < 13?       │
   │  → { valid: false,       │
   │      reason: "Requires   │
   │      STR 13+ (you have   │
   │      12)" }              │
   │                          │
   │ case 'bab':              │
   │  Get actor.system.bab    │
   │  Compare: 4 < 5?         │
   │  → { valid: false,       │
   │      reason: "Requires   │
   │      BAB +5 (you have +4)│
   │      }                   │
   │                          │
   │ case 'level':            │
   │  Get actor.system.level  │
   │  Compare: 5 < 7?         │
   │  → { valid: false,       │
   │      reason: "Requires   │
   │      character level 7   │
   │      (you are level 5)"  │
   │      }                   │
   └──────────────────────────┘
         │        │        │
         └────────┼────────┘
                  │
                  ▼
       ┌─────────────────────┐
       │ ACCUMULATE RESULTS  │
       │                     │
       │ reasons = [         │
       │   "Requires STR...",│
       │   "Requires BAB...",│
       │   "Requires level..." │
       │ ]                   │
       │                     │
       │ valid = (length===0)│
       │      = false        │
       │                     │
       │ return {            │
       │   valid: false,     │
       │   reasons: [...]    │
       │ }                   │
       └─────────────────────┘
              │
              ▼
       ┌─────────────────────┐
       │ FILTER RESULT       │
       │                     │
       │ if (valid === false)│
       │ ├─ Mark item as     │
       │ │  isQualified: false
       │ ├─ Don't show in UI │
       │ │  (silent filtering)│
       │ └─ Or if somehow    │
       │    shown, prevent   │
       │    selection        │
       │                     │
       │ if (valid === true) │
       │ ├─ Mark as         │
       │ │  isQualified: true
       │ └─ Show in UI      │
       │    (allow selection)│
       └─────────────────────┘
```

