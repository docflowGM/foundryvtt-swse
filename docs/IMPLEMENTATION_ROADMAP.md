# SWSE Modernization Implementation Roadmap

Generated: 2025-10-30 19:57:54

## 🎯 Vision

Create a fully modern SWSE system with:
- ✅ Drag-and-drop everything (species, classes, feats, talents, Force powers, droid chassis, vehicles)
- ✅ Beautiful holo-themed sheets with organized tabs
- ✅ Multiple actor types (characters, NPCs, droids, vehicles)
- ✅ Template system for droids/vehicles
- ✅ High automation (damage threshold, condition track, etc.)
- ✅ GM customization tools
- ✅ Functional chargen, level-up, and store

---

## 📋 Implementation Phases

### Phase 1: Foundation (Week 1-2) ⚡ START HERE
**Goal:** Get basic modern architecture working

#### Critical Path:
1. **Complete DataModel classes** (2 days)
   - [ ] Finish `actor-base-model.js` with full schema
   - [ ] Finish `character-model.js` with all character fields
   - [ ] Create `vehicle-model.js` with vehicle systems
   - [ ] Register in index.js

2. **Complete calculation modules** (2 days)
   - [ ] Finish `abilities.js`
   - [ ] Finish `defenses.js` (with armor OR level logic)
   - [ ] Finish `skills.js` (with training/focus)
   - [ ] Finish `conditions.js` (with track movement)

3. **Create base Actor class** (2 days)
   - [ ] File: `scripts/actors/base/swse-actor-base.js`
   - [ ] Implement `prepareData()` using calculation modules
   - [ ] Implement `getRollData()` with all modifiers
   - [ ] Implement `applyDamage()` with threshold checking
   - [ ] Implement `moveConditionTrack()`

4. **Test in FoundryVTT** (1 day)
   - [ ] Create test character
   - [ ] Verify calculations work
   - [ ] Test damage application
   - [ ] Fix any bugs

**Success Criteria:**
- ✅ Character sheet loads without errors
- ✅ Defenses calculate correctly
- ✅ Skills calculate correctly
- ✅ Condition track applies penalties
- ✅ Damage threshold checks work

---

### Phase 2: Drag-Drop System (Week 3-4)
**Goal:** Full drag-and-drop functionality

#### Critical Path:
1. **Complete drop handler** (3 days)
   - [ ] Finish all methods in `drop-handler.js`
   - [ ] Test species drops (apply racial bonuses)
   - [ ] Test class drops (add features)
   - [ ] Test feat/talent drops
   - [ ] Test Force power drops

2. **Droid chassis system** (2 days)
   - [ ] Create droid-chassis Item type in template.json
   - [ ] Finish `swse-droid-handler.js`
   - [ ] Test dropping chassis onto droid
   - [ ] Verify stat replacement works

3. **Vehicle template system** (2 days)
   - [ ] Create vehicle-template Item type
   - [ ] Finish `swse-vehicle-handler.js`
   - [ ] Test dropping template onto vehicle
   - [ ] Verify complete stat replacement

4. **Item type definitions** (2 days)
   - [ ] Update template.json with all item types
   - [ ] Create item sheet templates for each type
   - [ ] Add proper data fields to each type

**Success Criteria:**
- ✅ Drag species onto character → stats update
- ✅ Drag class onto character → features added
- ✅ Drag chassis onto droid → complete replacement
- ✅ Drag vehicle template → complete replacement
- ✅ Drag feat/talent → added with prerequisite checking

---

### Phase 3: Sheet Redesign (Week 5-6)
**Goal:** Beautiful, organized, functional sheets

#### Critical Path:
1. **Character sheet with tabs** (4 days)
   - [ ] Create tab structure (Summary, Skills, Combat, Talents, Force, Equipment, Biography)
   - [ ] Summary tab: defenses, HP, condition track, Force points, common attacks
   - [ ] Skills tab: organized skill list with training indicators
   - [ ] Talents tab: visual tree display with prerequisites
   - [ ] Force tab: powers with suite management
   - [ ] Maintain holo theme throughout

2. **Condition track UI** (1 day)
   - [ ] Create visual progress bar
   - [ ] Clickable steps
   - [ ] Show current penalties
   - [ ] Persistent checkbox
   - [ ] Recovery/damage buttons

3. **Resource bars** (1 day)
   - [ ] HP bar with percentage
   - [ ] Force Points with reroll dice display
   - [ ] Second Wind tracker

4. **Make everything rollable** (2 days)
   - [ ] Add rollable class to all numeric values
   - [ ] Implement click handlers
   - [ ] Show roll dialogs with modifiers
   - [ ] Create nice chat cards

**Success Criteria:**
- ✅ All tabs work smoothly
- ✅ Holo theme preserved
- ✅ Condition track is visual and interactive
- ✅ Everything that should roll does roll
- ✅ Sheet is organized and easy to navigate

---

### Phase 4: Combat Automation (Week 7)
**Goal:** Automated damage threshold and condition management

#### Critical Path:
1. **Combat hooks** (2 days)
   - [ ] Hook into combat tracker
   - [ ] Auto-check damage threshold on damage
   - [ ] Move condition track automatically
   - [ ] Prompt for recovery at turn start
   - [ ] Reset resources at combat start

2. **Damage dialog** (1 day)
   - [ ] Create damage application dialog
   - [ ] Apply to temp HP first
   - [ ] Check threshold
   - [ ] Show result in chat

3. **Chat integration** (2 days)
   - [ ] Custom chat cards for attacks
   - [ ] Custom cards for damage
   - [ ] Custom cards for threshold breach
   - [ ] Apply damage from chat

**Success Criteria:**
- ✅ Damage automatically checks threshold
- ✅ Condition track moves on breach
- ✅ Recovery prompts work
- ✅ Chat cards are functional and pretty

---

### Phase 5: GM Tools (Week 8)
**Goal:** Homebrew and customization framework

#### Critical Path:
1. **Homebrew manager** (3 days)
   - [ ] Create homebrew dialog
   - [ ] Tabs for each content type
   - [ ] Custom feat creator
   - [ ] Custom talent creator
   - [ ] Custom Force power creator
   - [ ] Export/import system

2. **Settings expansion** (1 day)
   - [ ] Add all automation toggles
   - [ ] Add display preferences
   - [ ] Add GM options
   - [ ] Add house rules section

3. **Documentation** (1 day)
   - [ ] Create GM guide
   - [ ] Document homebrew system
   - [ ] Create examples

**Success Criteria:**
- ✅ GMs can create custom content
- ✅ Settings are comprehensive
- ✅ Everything is documented

---

### Phase 6: Polish & Optimization (Week 9-10)
**Goal:** Performance, testing, documentation

#### Critical Path:
1. **Performance optimization**
   - [ ] Audit render performance
   - [ ] Add partial rendering where needed
   - [ ] Optimize calculation frequency
   - [ ] Add caching where appropriate

2. **Testing**
   - [ ] Write calculation tests
   - [ ] Write integration tests
   - [ ] Manual testing of all features
   - [ ] Bug fixes

3. **Documentation**
   - [ ] API documentation
   - [ ] User guide
   - [ ] GM guide
   - [ ] Developer guide

**Success Criteria:**
- ✅ System runs smoothly
- ✅ All features tested
- ✅ Comprehensive documentation
- ✅ Ready for release

---

## 🚀 Quick Start Checklist

### Today:
- [ ] Review this roadmap
- [ ] Check that backup was created
- [ ] Review new file structure
- [ ] Identify which files need immediate attention

### This Week:
- [ ] Complete Phase 1 (Foundation)
- [ ] Test basic functionality
- [ ] Fix any critical bugs

### This Month:
- [ ] Complete Phases 1-4
- [ ] Have fully functional drag-and-drop
- [ ] Have beautiful redesigned sheets
- [ ] Have combat automation working

---

## 📊 File Priority Matrix

### 🔴 CRITICAL - Do First:
1. `scripts/data-models/actor-base-model.js`
2. `scripts/data-models/character-model.js`
3. `scripts/calculations/*.js` (all calculation files)
4. `scripts/actors/base/swse-actor-base.js`
5. `index.js` (uncomment TODOs)

### 🟡 HIGH - Do Second:
1. `scripts/drag-drop/drop-handler.js`
2. `scripts/actors/droid/swse-droid-handler.js`
3. `scripts/actors/vehicle/swse-vehicle-handler.js`
4. `templates/actors/character/character-sheet.hbs`
5. Character sheet tab templates

### 🟢 MEDIUM - Do Third:
1. `scripts/automation/combat-automation.js`
2. `scripts/gm-tools/homebrew-manager.js`
3. Chat templates
4. Settings refinement

### 🔵 LOW - Polish Later:
1. Tests
2. Documentation
3. Performance optimization
4. Additional features

---

## 💡 Pro Tips

1. **Start with calculations** - Everything else depends on accurate math
2. **Test frequently** - Launch FoundryVTT after each major change
3. **Use feature branches** - Don't break main
4. **Document as you go** - Future you will thank you
5. **Ask for help** - The FoundryVTT Discord is very helpful

---

## 🎯 Next Action

**Your immediate next step:**
1. Open `scripts/data-models/actor-base-model.js`
2. Complete the schema with all ability scores, defenses, skills, etc.
3. Test that it validates properly
4. Move to calculation modules

**Need help?** Review the stub files - they have detailed TODOs for what needs to be done.

---

## 📝 Notes

- All stub files have TODO comments marking what needs completion
- Original files backed up to: C:\Users\Owner\Documents\GitHub\foundryvtt-swse\_BACKUP_20251030_195751
- Merged files tracked in: RESTRUCTURE_REPORT.json
- This roadmap is living - update as you complete tasks

**Remember:** This is a marathon, not a sprint. Focus on getting one phase working well before moving to the next.

Good luck! May the Force be with you. 🌟
