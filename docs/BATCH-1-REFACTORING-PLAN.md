# BATCH 1 REFACTORING PLAN: 49 Violations

## Violation Inventory

### By Type:
- **createEmbeddedDocuments**: 32 calls
- **deleteEmbeddedDocuments**: 6 calls  
- **updateEmbeddedDocuments**: 2 calls
- **actor.update**: 4 calls (mostly tests)

### By File (Priority Order):

**High Priority (4+ violations):**
1. chargen-templates.js - 5 createEmbeddedDocuments
2. apply-handlers.js - 5 createEmbeddedDocuments + 1 updateEmbeddedDocuments
3. equipment-engine.js - 3 createEmbeddedDocuments
4. chargen-feats-talents.js - 3 createEmbeddedDocuments
5. chargen-main.js - 3 createEmbeddedDocuments
6. template-integration.test.js - 3 actor.update + 2 createEmbeddedDocuments

**Medium Priority (2-3 violations):**
7. chargen-improved.js - 2 createEmbeddedDocuments
8. chargen-class.js - 2 createEmbeddedDocuments
9. levelup-class.js - 2 createEmbeddedDocuments + 1 updateEmbeddedDocuments

**Low Priority (1 violation):**
- 10 other files with 1 violation each

---

## Action Plan

### For each file:
1. **Identify** the direct mutation call
2. **Replace** with ActorEngine equivalent
3. **Import** ActorEngine if not already present
4. **Test** that call patterns match (return value, async/await, etc)
5. **Verify** with lint

### Key Replacements:

```javascript
// createEmbeddedDocuments
❌ actor.createEmbeddedDocuments('Item', data)
✅ ActorEngine.createEmbeddedDocuments(actor, 'Item', data)

// deleteEmbeddedDocuments  
❌ actor.deleteEmbeddedDocuments('Item', ids)
✅ ActorEngine.deleteEmbeddedDocuments(actor, 'Item', ids)

// updateEmbeddedDocuments
❌ actor.updateEmbeddedDocuments('Item', updates)
✅ ActorEngine.updateEmbeddedDocuments(actor, 'Item', updates)

// actor.update
❌ actor.update(data)
✅ ActorEngine.updateActor(actor, data)
```

---

## Starting with High-Priority Files

Ready to begin? I will:

1. Fix chargen-templates.js (5 violations)
2. Fix apply-handlers.js (6 violations)
3. Fix equipment-engine.js (3 violations)
4. Continue through medium/low priority
5. Run lint to verify all 49 are converted
6. Report results

**Proceed with refactoring?**
