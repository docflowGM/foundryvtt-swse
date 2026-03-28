# SWSE Detail Rail Data Matrix

**Quick Reference for Detail Rail Implementation**
**Date:** March 28, 2026

---

## At-a-Glance Data Coverage

| Item Type | Description | Prerequisites | Metadata Tags | Mentor Prose | Implementation Ready |
|-----------|-------------|---|---|---|---|
| **Feat** | ✅ Compendium field | ⚠️  Text-only (no validation) | ✅ feat-metadata.json | ❌ None | Phase 2 |
| **Talent** | ✅ Compendium/JSON | ✅ Structured (talent-prerequisites.json) | ✅ talent-tree-tags.json | ❌ None | Phase 2 |
| **Species** | ✅ Compendium field | N/A | ✅ Item fields + traits | ✅ ol-salty-dialogues.json | **Phase 1** ✅ |
| **Class** | ✅ Compendium field | N/A | ✅ Item fields (BAB, hit die, abilities) | ⚠️  Mentor swap on commit | **Phase 1** ✅ |
| **Background** | ✅ backgrounds.json | N/A | ✅ backgrounds.json | ❌ None | **Phase 1** ✅ |
| **Force Power** | ✅ Compendium field | ⚠️  Text-only | ✅ Item fields | ⚠️  Manifestation prose exists | Phase 2 |
| **Force Technique** | ✅ Compendium field | ⚠️  Text-only | ✅ Item fields | ❌ None | Phase 2 |
| **Force Secret** | ✅ Compendium field | ⚠️  Text-only | ✅ Item fields | ❌ None | Phase 2 |
| **Language** | ✅ Registry field (50% coverage) | N/A | ✅ Registry (categories) | ❌ None | **Phase 1** ✅ |
| **Skill** | ✅ Registry field | N/A | ✅ Item fields | ❌ None (granted, not selected) | Not standalone |
| **Starship Maneuver** | ✅ Compendium field (80%) | ⚠️  Text-only | ✅ Item fields | ❌ None | Phase 2 |
| **Droid System** | ✅ Compendium field | N/A | ✅ Item fields | ❌ None | Phase 3 (blocked) |
| **Attribute** | ✅ Hardcoded | N/A | ✅ Hardcoded | ✅ Template hardcoded | **Phase 1** ✅ |

---

## Source-of-Truth by Data Field

### Description
- **Feat:** `feat.system.description` or `.system.benefit` (fallback)
- **Talent:** `talent.system.description` OR `talent-tree-descriptions.json` (ambiguous)
- **Species:** `species.system.description`
- **Class:** `class.system.description` or `.system.fantasy`
- **Background:** `backgrounds.json` → `narrativeDescription`
- **Force Power:** `power.system.description`
- **Force Technique:** `technique.system.description`
- **Force Secret:** `secret.system.description`
- **Language:** `language.system.description` or registry field (partial)
- **Skill:** `skill.system.description`
- **Starship Maneuver:** `maneuver.system.description`
- **Droid System:** `system.system.description`
- **Attribute:** Template hardcoded ("Strength affects melee combat...")

### Prerequisites
- **Feat:** `feat.system.prerequisites` or `.system.prerequisite` (text string)
- **Talent:** `talent-prerequisites.json` [name].conditions (structured; includes feat, talent, skillTrained, featPattern types)
- **Species:** N/A
- **Class:** N/A
- **Background:** N/A
- **Force Power:** `power.system.prerequisites` (text string)
- **Force Technique:** `technique.system.prerequisites` (text string)
- **Force Secret:** `secret.system.prerequisites` (text string)
- **Language:** N/A
- **Skill:** N/A
- **Starship Maneuver:** `maneuver.system.prerequisites` (text string)
- **Droid System:** N/A
- **Attribute:** N/A

### Metadata Tags
- **Feat:** `feat-metadata.json` → `feats[name].tags` (array: weapon-mastery, accuracy, combat, etc.)
- **Talent:** `talent-tree-tags.json` (per-talent object)
- **Species:** Item fields: `.system.size`, `.system.speed`, `.system.abilityScores`, `.system.abilities`, `.system.languages`
- **Class:** Item fields: `.system.bab`, `.system.hitDie`, `.system.defenseBonus`, `.system.startingAbilities`, `.system.trainedSkills`, `.system.classSkills`
- **Background:** `backgrounds.json` → `icon`, `category`, `relevantSkills`, `skillChoiceCount`, `mechanicalEffect`
- **Force Power:** Item fields: `.system.level`, `.system.discipline`, `.system.cost`
- **Force Technique:** Item fields: `.system.tier`
- **Force Secret:** Item fields: `.system.tier`
- **Language:** `languages.json` → `categories[category]` (widelyUsed, localTrade, etc.)
- **Skill:** Item fields: `.system.ability`, `.system.trainedOnly`
- **Starship Maneuver:** Item fields: `.system.maneuverType` (if exists)
- **Droid System:** Item fields: `.system.type`, `.system.cost`, `.system.slotsRequired`
- **Attribute:** Hardcoded (STR, DEX, CON, INT, WIS, CHA)

### Mentor Prose
- **Feat:** ❌ None (use Ask Mentor)
- **Talent:** ❌ None (use Ask Mentor)
- **Species:** ✅ `data/dialogue/mentors/ol_salty/ol-salty-species-dialogues.json` [speciesName]
- **Class:** ⚠️  Mentor swap on selection; mentor name in `.system.mentor`; guidance via `getMentorGuidance()` on-demand
- **Background:** ❌ None (use Ask Mentor)
- **Force Power:** ⚠️  Manifestation prose in `data/force-power-descriptions.json` [discipline].intro/manifestation (not mentor-specific)
- **Force Technique:** ❌ None (use Ask Mentor)
- **Force Secret:** ❌ None (use Ask Mentor)
- **Language:** ❌ None (use Ask Mentor, if wired)
- **Skill:** ❌ N/A (granted, not selected)
- **Starship Maneuver:** ❌ None (use Ask Mentor)
- **Droid System:** ❌ None
- **Attribute:** ✅ Template hardcoded per-ability guidance text

---

## Implementation Blockers & Gaps

### Critical Blockers (Prevent Implementation)
🔴 **Droid Systems:** Detail panel not used in current architecture; requires step redesign

### Major Gaps (Accept as Interim Limitation)
🟠 **Feat Prerequisites:** Text-only; cannot render "met/unmet" indicators; requires structured data migration to fix

🟠 **Force Power Prerequisites:** Text-only; cannot validate

🟠 **Force Technique Prerequisites:** Text-only; cannot validate

🟠 **Starship Maneuver Prerequisites:** Text-only (80% coverage); cannot validate

🟠 **Mentor Prose (Feats, Talents, Backgrounds, Force Types, Languages, Starship Maneuvers):** None; requires content creation effort

### Minor Gaps (Acceptable for MVP)
🟡 **Language Descriptions:** ~50% coverage; acceptable; fallback to category description

🟡 **Talent Description Precedence:** Unclear if compendium or JSON file is source; needs explicit choice during implementation

🟡 **Droid System Descriptions:** ~85% coverage; acceptable; fallback to system type

---

## Ready-to-Implement Items (No Blockers)

### Phase 1: No Data Work Required ✅
- **Species** (all data available; Ol' Salty prose)
- **Class** (all data available; mentor guidance via Ask Mentor)
- **Background** (all data available)
- **Attributes** (hardcoded; guidance exists)
- **Languages** (metadata complete; descriptions ~50% but acceptable)

**Effort:** Template/styling only; 1–2 days per item

### Phase 2: Minor Data Gaps (Acceptable Workarounds) ✅
- **Feat** (description + category ready; prerequisites text-only; no mentor prose → Ask Mentor fallback)
- **Talent** (structured prerequisites ready; render them properly per TODO comment)
- **Force Power** (description ready; prerequisites text-only; manifestation prose can be displayed)
- **Force Technique** (description ready; prerequisites text-only)
- **Force Secret** (description ready; prerequisites text-only)
- **Starship Maneuver** (description ~80%; prerequisites text-only)

**Effort:** Template/styling + structured prerequisite rendering; 2–3 days per item

### Phase 3: Blocked or Deferred ❌
- **Droid Systems** (requires architecture review; no detail panel in current flow)
- **Skills** (not standalone; would need summary integration)

---

## Ask Mentor Integration

**Current Status:** Ask Mentor buttons exist in detail panels but require mentor system to be wired per-step.

| Item Type | Ask Mentor Available | Wiring Status |
|-----------|---|---|
| Feat | ✅ Yes | `feat-details.hbs` has button |
| Talent | ✅ Yes | `talent-details.hbs` has button |
| Species | ✅ Yes | Ol' Salty dialogue + button |
| Class | ✅ Yes | Mentor swap on commit |
| Background | ⚠️  Unclear | Not wired in progression framework |
| Force Power | ✅ Yes | `force-power-details.hbs` has button |
| Force Technique | ✅ Yes | `force-technique-details.hbs` has button |
| Force Secret | ✅ Yes | `force-secret-details.hbs` has button |
| Language | ❌ No | Not wired in language step |
| Skill | N/A | Granted, not selected |
| Starship Maneuver | ✅ Yes | `starship-maneuver-details.hbs` has button |
| Droid System | ❌ No | No detail panel |
| Attribute | N/A | Hardcoded guidance |

---

## Quick Decision Matrix for Implementation Order

**Want to ship Phase 1 items quickly?** → Pick Species, Class, Background, Attributes, Languages
**Want most complete Phase 2 items?** → Talents (structured prereqs ready) + Feats (good coverage)
**Want to defer everything with big gaps?** → Skip Feat/Force/Maneuver prerequisites for now; Ask Mentor fallback

---

## Summary Table: Implementation Readiness

| Phase | Items | Status | Data Work Required | Template Work Required |
|-------|-------|--------|---|---|
| **Phase 1** | Species, Class, Background, Attributes, Languages | ✅ Ready | None | Yes (styling/logic) |
| **Phase 2** | Feats, Talents, Force Powers, Force Techniques, Force Secrets, Starship Maneuvers | ⚠️  Ready with gaps | None (accept text-only prereqs) | Yes (prereq rendering) |
| **Phase 3** | Droid Systems | ❌ Blocked | Architecture review | New step design |
| **Future** | Mentor prose for all types | ❌ Not available | Content creation | N/A (already in templates) |
| **Future** | Structured prerequisites for feats/force types | ❌ Not available | Data migration | N/A (templates ready) |

---

**Bottom Line:** Implement Phases 1–2 now (3–4 weeks, no blockers). Phase 3 and future work require separate initiatives and data/content work beyond scope of detail rail UI.

