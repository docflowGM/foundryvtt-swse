# PHASE 4: MUTATION GOVERNANCE TRUTH TABLE

**Reference Artifact:** Definitive mapping of all mutation types and their enforcement behavior

This table will be completed during Phase 4 based on audit findings.

---

## MUTATION TYPE REFERENCE

Each row documents one mutation type with complete enforcement behavior.

### Template

| Mutation Type | Authority Path | Strict Mode | Normal Mode | Override/Freebuild | Recompute | Integrity | Sentinel Reporting |
|---|---|---|---|---|---|---|---|
| **NAME** | Who can do this? | Block/Throw? | Warn/Allow? | Allowed? | Runs? | Checked? | What's logged? |

---

## MUTATIONS TO DOCUMENT (Preliminary)

### Direct Actor Mutations
- [ ] `actor.update()` - direct
- [ ] `actor.update()` - via Phase 2 rerouted surface
- [ ] `actor.updateEmbeddedDocuments()` - direct
- [ ] `actor.deleteEmbeddedDocuments()` - direct
- [ ] `actor.createEmbeddedDocuments()` - direct

### Direct Item Mutations
- [ ] `item.update()` - owned
- [ ] `item.update()` - unowned (world item)
- [ ] `item.updateEmbeddedDocuments()` - if applicable

### ActorEngine Mutations (Authorized Path)
- [ ] `ActorEngine.updateActor()` - normal
- [ ] `ActorEngine.updateActor()` - with isMigration:true
- [ ] `ActorEngine.updateEmbeddedDocuments()` - normal
- [ ] `ActorEngine.updateEmbeddedDocuments()` - with isMigration:true
- [ ] `ActorEngine.recomputeHP()` - HP sole writer

### Hook/Helper Mutations
- [ ] Hook-triggered mutations
- [ ] Migration helper mutations
- [ ] Maintenance helper mutations

### Phase 2 Rerouted Surfaces (16 total)
- [ ] Item sheet mutations (4)
- [ ] Importer engine mutations (2)
- [ ] Upgrade system mutations (2)
- [ ] Vehicle weapon mutations (3)
- [ ] World repair mutations (1)
- [ ] Follower cleanup mutations (1)
- [ ] Migration script mutations (4)

---

## COMPLETED TABLE (after Phase 4 audit)

[TO BE FILLED IN WITH AUDIT RESULTS]

**Status:** Pending audit completion

