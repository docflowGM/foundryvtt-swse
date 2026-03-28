# SWSE Progression Engine — Dependency Graph Design
## PHASE B + C: Dependency Model & Declaration Contracts

**Date**: 2026-03-28
**Purpose**: Define the right dependency model, produces/consumes contracts, and core API design

---

## EXECUTIVE SUMMARY

This document specifies:

1. **Dependency Domain Enum** — Canonical list of decision domains
2. **Produces/Consumes Contract** — What each step declares
3. **Graph Architecture** — How to model and traverse dependencies
4. **Core API** — How to query the graph
5. **Integration Points** — Where the graph hooks into shell, projection, invalidation
6. **Known Limitations** — What the graph does NOT do

**Design Level**: Domain-based + step-level compilation
- High level: domains and their dependencies
- Medium level: which steps produce/consume which domains
- Low level: affected steps computed from changed domains

---

## PART 1: DEPENDENCY DOMAIN ENUM

### The Seven Domain Categories

```typescript
enum DependencyDomain {
  // ============ IDENTITY DOMAINS ============
  /** Species selection (determines traits, language grants) */
  SPECIES_IDENTITY = 'species-identity',

  /** Class selection (determines feat/talent pools, skill budget, force access) */
  CLASS_IDENTITY = 'class-identity',

  /** Background selection (determines grants, context) */
  BACKGROUND_IDENTITY = 'background-identity',

  /** Subtype identity (actor, droid, beast, nonheroic, follower) */
  SUBTYPE_IDENTITY = 'subtype-identity',

  // ============ ABILITY GRANT DOMAINS ============
  /** Granted skills from class/background/feats */
  SKILL_GRANTS = 'skill-grants',

  /** Available skill training slots (from INT + bonuses) */
  SKILL_SLOTS = 'skill-slots',

  /** Feat entitlements (pool size from class/level/feats) */
  FEAT_GRANTS = 'feat-grants',

  /** Talent entitlements (pool size from class/level/talents) */
  TALENT_GRANTS = 'talent-grants',

  /** Language entitlements (slots from INT + species/background grants) */
  LANGUAGE_GRANTS = 'language-grants',

  // ============ MAGICAL ACCESS DOMAINS ============
  /** Force sensitivity (prerequisite for all Force-related steps) */
  FORCE_ACCESS = 'force-access',

  /** Force power entitlements (slots from class/level) */
  FORCE_POWER_GRANTS = 'force-power-grants',

  /** Force technique prerequisites (class/subtype restrictions) */
  FORCE_TECHNIQUE_ACCESS = 'force-technique-access',

  /** Force secret access (class/level restrictions) */
  FORCE_SECRET_ACCESS = 'force-secret-access',

  // ============ ALLOCATION DOMAINS ============
  /** Selected skill training choices */
  ALLOCATED_SKILLS = 'allocated-skills',

  /** Selected feat choices (both general and class) */
  ALLOCATED_FEATS = 'allocated-feats',

  /** Selected talent choices (both general and class) */
  ALLOCATED_TALENTS = 'allocated-talents',

  /** Selected language choices */
  ALLOCATED_LANGUAGES = 'allocated-languages',

  /** Selected force power choices */
  ALLOCATED_FORCE_POWERS = 'allocated-force-powers',

  /** Selected force technique choices */
  ALLOCATED_FORCE_TECHNIQUES = 'allocated-force-techniques',

  /** Selected force secret choices */
  ALLOCATED_FORCE_SECRETS = 'allocated-force-secrets',

  // ============ DERIVED DOMAINS ============
  /** Ability scores and derived modifiers */
  ATTRIBUTE_VALUES = 'attribute-values',

  /** Projected character (full snapshot) */
  PROJECTED_CHARACTER = 'projected-character',

  /** Droid configuration (construction/systems) */
  DROID_CONFIGURATION = 'droid-configuration',

  /** Starship maneuver selections */
  STARSHIP_MANEUVERS = 'starship-maneuvers',

  /** Summary validation (final character review) */
  SUMMARY_READINESS = 'summary-readiness',
}
```

---

## PART 2: STEP PRODUCES/CONSUMES CONTRACT

Each step declares what domains it PRODUCES and what it CONSUMES.

### Contract Interface

```typescript
interface StepDependencyContract {
  /** Step ID (matches registry) */
  stepId: string;

  /** Domains this step produces (creates/modifies authoritative decisions) */
  produces: DependencyDomain[];

  /** Domains this step consumes (depends on for availability/legality) */
  consumes: DependencyDomain[];

  /** Optional: subtype scoping if contract differs by subtype */
  subtypeScoping?: {
    [subtype: string]: {
      produces?: DependencyDomain[];
      consumes?: DependencyDomain[];
    };
  };

  /** Optional: explanation template for invalidation */
  explanationTemplate?: {
    [domain: string]: string; // e.g., "Class change affected {domain}"
  };
}
```

### Concrete Declarations

```typescript
// STEP: intro
const INTRO_CONTRACT = {
  stepId: 'intro',
  produces: [],  // No selections made
  consumes: [],
};

// STEP: species
const SPECIES_CONTRACT = {
  stepId: 'species',
  produces: [
    DependencyDomain.SPECIES_IDENTITY,
    DependencyDomain.SKILL_GRANTS,      // Species may grant skills (rare)
    DependencyDomain.LANGUAGE_GRANTS,   // Species grants languages
    DependencyDomain.SKILL_SLOTS,       // Species may affect INT requirement
  ],
  consumes: [],  // No prerequisites
};

// STEP: class
const CLASS_CONTRACT = {
  stepId: 'class',
  produces: [
    DependencyDomain.CLASS_IDENTITY,
    DependencyDomain.FEAT_GRANTS,       // Class determines feat pool
    DependencyDomain.TALENT_GRANTS,     // Class determines talent pool
    DependencyDomain.SKILL_GRANTS,      // Class grants certain skills
    DependencyDomain.SKILL_SLOTS,       // Class affects training budget
    DependencyDomain.FORCE_ACCESS,      // Force-sensitive classes grant force
    DependencyDomain.FORCE_POWER_GRANTS, // Force class grants power slots
  ],
  consumes: [
    // No prerequisites for basic class choice
  ],
};

// STEP: background
const BACKGROUND_CONTRACT = {
  stepId: 'background',
  produces: [
    DependencyDomain.BACKGROUND_IDENTITY,
    DependencyDomain.FEAT_GRANTS,       // Background may grant feats
    DependencyDomain.LANGUAGE_GRANTS,   // Background may grant languages
    DependencyDomain.SKILL_GRANTS,      // Background may grant skills
  ],
  consumes: [
    DependencyDomain.SPECIES_IDENTITY,  // Background context-dependent on species
    DependencyDomain.CLASS_IDENTITY,    // Background context-dependent on class
  ],
};

// STEP: attribute
const ATTRIBUTE_CONTRACT = {
  stepId: 'attribute',
  produces: [
    DependencyDomain.ATTRIBUTE_VALUES,
    DependencyDomain.SKILL_SLOTS,       // INT affects slots
    DependencyDomain.LANGUAGE_GRANTS,   // INT affects bonus slots
  ],
  consumes: [],
};

// STEP: skills
const SKILLS_CONTRACT = {
  stepId: 'skills',
  produces: [
    DependencyDomain.ALLOCATED_SKILLS,
  ],
  consumes: [
    DependencyDomain.SKILL_SLOTS,       // Must have available slots
    DependencyDomain.SKILL_GRANTS,      // Available skill list
    DependencyDomain.ATTRIBUTE_VALUES,  // Modifiers (rare use)
  ],
};

// STEP: general-feat
const GENERAL_FEAT_CONTRACT = {
  stepId: 'general-feat',
  produces: [
    DependencyDomain.ALLOCATED_FEATS,
    DependencyDomain.FEAT_GRANTS,       // Feats can grant bonus feats
  ],
  consumes: [
    DependencyDomain.FEAT_GRANTS,       // Available feat pool
    DependencyDomain.ATTRIBUTE_VALUES,  // Some feats STR/CON gated
  ],
};

// STEP: class-feat
const CLASS_FEAT_CONTRACT = {
  stepId: 'class-feat',
  produces: [
    DependencyDomain.ALLOCATED_FEATS,
    DependencyDomain.FEAT_GRANTS,       // May grant bonus feats
  ],
  consumes: [
    DependencyDomain.CLASS_IDENTITY,    // Must have class
    DependencyDomain.FEAT_GRANTS,       // Class feat pool from class
  ],
};

// STEP: general-talent
const GENERAL_TALENT_CONTRACT = {
  stepId: 'general-talent',
  produces: [
    DependencyDomain.ALLOCATED_TALENTS,
    DependencyDomain.TALENT_GRANTS,     // Talents can grant bonus talents
  ],
  consumes: [
    DependencyDomain.TALENT_GRANTS,     // Available talent pool
  ],
};

// STEP: class-talent
const CLASS_TALENT_CONTRACT = {
  stepId: 'class-talent',
  produces: [
    DependencyDomain.ALLOCATED_TALENTS,
    DependencyDomain.TALENT_GRANTS,     // May grant bonus talents
  ],
  consumes: [
    DependencyDomain.CLASS_IDENTITY,    // Must have class
    DependencyDomain.TALENT_GRANTS,     // Class talent pool from class
  ],
};

// STEP: languages
const LANGUAGES_CONTRACT = {
  stepId: 'languages',
  produces: [
    DependencyDomain.ALLOCATED_LANGUAGES,
  ],
  consumes: [
    DependencyDomain.LANGUAGE_GRANTS,   // Available slots and granted languages
  ],
};

// STEP: force-powers
const FORCE_POWERS_CONTRACT = {
  stepId: 'force-powers',
  produces: [
    DependencyDomain.ALLOCATED_FORCE_POWERS,
  ],
  consumes: [
    DependencyDomain.FORCE_ACCESS,          // Must be force-sensitive
    DependencyDomain.FORCE_POWER_GRANTS,    // Available slots
  ],
};

// STEP: force-techniques
const FORCE_TECHNIQUES_CONTRACT = {
  stepId: 'force-techniques',
  produces: [
    DependencyDomain.ALLOCATED_FORCE_TECHNIQUES,
  ],
  consumes: [
    DependencyDomain.FORCE_ACCESS,
    DependencyDomain.FORCE_TECHNIQUE_ACCESS,  // Class/level restrictions
  ],
};

// STEP: force-secrets
const FORCE_SECRETS_CONTRACT = {
  stepId: 'force-secrets',
  produces: [
    DependencyDomain.ALLOCATED_FORCE_SECRETS,
  ],
  consumes: [
    DependencyDomain.FORCE_ACCESS,
    DependencyDomain.FORCE_SECRET_ACCESS,     // Class/level restrictions
  ],
};

// STEP: summary
const SUMMARY_CONTRACT = {
  stepId: 'summary',
  produces: [
    DependencyDomain.SUMMARY_READINESS,  // Summary validates everything
  ],
  consumes: [
    // Summary depends on EVERYTHING to compute final character
    DependencyDomain.SPECIES_IDENTITY,
    DependencyDomain.CLASS_IDENTITY,
    DependencyDomain.BACKGROUND_IDENTITY,
    DependencyDomain.ATTRIBUTE_VALUES,
    DependencyDomain.ALLOCATED_SKILLS,
    DependencyDomain.ALLOCATED_FEATS,
    DependencyDomain.ALLOCATED_TALENTS,
    DependencyDomain.ALLOCATED_LANGUAGES,
    DependencyDomain.ALLOCATED_FORCE_POWERS,
    DependencyDomain.ALLOCATED_FORCE_TECHNIQUES,
    DependencyDomain.ALLOCATED_FORCE_SECRETS,
    DependencyDomain.ALLOCATED_STARSHIP_MANEUVERS,
    DependencyDomain.DROID_CONFIGURATION,
  ],
};
```

---

## PART 3: DEPENDENCY GRAPH ARCHITECTURE

### Graph Representation

```typescript
class DependencyGraph {
  /** Map: domain → [domains that depend on it] */
  private downstreamByDomain: Map<DependencyDomain, Set<DependencyDomain>>;

  /** Map: domain → [domains it depends on] */
  private upstreamByDomain: Map<DependencyDomain, Set<DependencyDomain>>;

  /** Map: stepId → contract */
  private stepContracts: Map<string, StepDependencyContract>;

  /** Map: domain → [stepIds that produce it] */
  private producersByDomain: Map<DependencyDomain, Set<string>>;

  /** Map: domain → [stepIds that consume it] */
  private consumersByDomain: Map<DependencyDomain, Set<string>>;

  constructor(contracts: StepDependencyContract[]) {
    // Initialize maps
    // Build producer/consumer indexes
    // Compute domain-to-domain edges
    // Detect and log circular dependencies
  }

  // Core query APIs (below)
}
```

### Key Invariants

1. **No producer = no authority**
   If no step produces a domain, it's immutable (system-provided)

2. **Multiple producers = coordination needed**
   If multiple steps produce same domain, order/priority matters

3. **Consumer without producer = error**
   Step consuming a domain no step produces is misconfigured

4. **Circular dependencies = alert**
   If A depends on B and B depends on A, graph logs and continues

---

## PART 4: CORE API DESIGN

### Query Methods

```typescript
class DependencyGraph {
  /**
   * Get all domains produced by a step
   */
  getProducedDomains(stepId: string, context?: Context): DependencyDomain[] {
    // Return from contract, apply subtype scoping
  }

  /**
   * Get all domains consumed by a step
   */
  getConsumedDomains(stepId: string, context?: Context): DependencyDomain[] {
    // Return from contract, apply subtype scoping
  }

  /**
   * Given a set of changed domains, compute all affected domains (transitive)
   */
  getAffectedDomains(
    changedDomains: DependencyDomain[],
    context?: Context
  ): {
    directlyAffected: DependencyDomain[];
    transitivelyAffected: DependencyDomain[];
    all: DependencyDomain[];
  } {
    // Traverse downstream in domain graph
    // Separate direct vs. transitive
  }

  /**
   * Given a changed step, get all affected domains
   */
  getAffectedDomainsFromStep(
    stepId: string,
    context?: Context
  ): {
    produced: DependencyDomain[];
    affected: DependencyDomain[];
  } {
    // Get what this step produces
    // Compute affected domains from that production
  }

  /**
   * Given changed domains, get all affected step IDs
   */
  getAffectedStepIds(
    changedDomains: DependencyDomain[],
    context?: Context
  ): {
    directlyAffected: string[]; // Steps consuming changed domains
    transitivelyAffected: string[]; // Steps consuming affected domains
    all: string[];
  } {
    // For each affected domain, find consuming steps
    // Separate direct vs. transitive
  }

  /**
   * Given a changed step, get all affected step IDs
   */
  getAffectedStepIdsFromStep(
    changedStepId: string,
    context?: Context
  ): {
    affected: string[];
    reasons: Map<string, string[]>; // Why each step affected
  } {
    const producedDomains = this.getProducedDomains(changedStepId, context);
    const affected = this.getAffectedStepIds(producedDomains, context);
    const reasons = this._buildReasons(changedStepId, affected.all);
    return { affected: affected.all, reasons };
  }

  /**
   * Explain why step B is affected by change in step A
   */
  explainImpact(
    changedStepId: string,
    affectedStepId: string,
    context?: Context
  ): {
    isAffected: boolean;
    domains: DependencyDomain[]; // Which domains create the dependency
    reasons: string[]; // Human explanations
    severity: 'error' | 'warning' | 'info'; // How severe
  } {
    // Find path from A to B in domain graph
    // Generate explanation from path
    // Determine severity (PURGE/DIRTY/RECOMPUTE)
  }

  /**
   * Get explanation templates for a domain
   */
  getExplanationForDomain(
    domain: DependencyDomain,
    changedStepId: string
  ): string {
    // Look up template from producer's contract
    // Return specific explanation
  }

  /**
   * Detect and report graph issues
   */
  diagnose(): {
    circularDependencies: Array<DependencyDomain[]>;
    orphanDomains: DependencyDomain[];
    misconfiguredSteps: string[];
  } {
    // Find circular domain dependencies
    // Find domains with no producer
    // Find steps with consuming-only contracts
  }
}
```

### Context Parameter (Subtype-Aware)

```typescript
interface Context {
  subtype?: 'actor' | 'npc' | 'droid' | 'beast' | 'nonheroic' | 'follower';
  mode?: 'chargen' | 'levelup';
  level?: number; // For level-up context
  session?: ProgressionSession; // For current state queries
}
```

---

## PART 5: INTEGRATION POINTS

### 5.1 Invalidation Integration

**Current code** (`progression-shell.js` commitSelection):
```javascript
_trackDownstreamInvalidation(stepId) {
  const invalidated = computer.getInvalidatedNodes(nodeId);
  for (const {nodeId, behavior} of invalidated) {
    if (visited && behavior === 'DIRTY') {
      mark as stale;
    }
  }
}
```

**With graph**:
```javascript
_trackDownstreamInvalidation(stepId) {
  const producedDomains = this.dependencyGraph.getProducedDomains(stepId);
  const affectedInfo = this.dependencyGraph.getAffectedStepIds(producedDomains);

  for (const affectedStepId of affectedInfo.directlyAffected) {
    const explanation = this.dependencyGraph.explainImpact(
      stepId, affectedStepId
    );

    if (explanation.severity === 'error') {
      // Mark as error, possibly PURGE
      this.progressionSession.invalidatedStepIds.push(affectedStepId);
      explanation_reason = explanation.reasons[0];
    } else if (explanation.severity === 'warning') {
      // Mark as stale (caution)
      this.progressionSession.invalidatedStepIds.push(affectedStepId);
    }
    // Store explanation for summary display
    this.invalidationExplanations.set(affectedStepId, explanation);
  }
}
```

**Benefits**:
- Only truly affected steps marked
- Explanation available for UI
- PURGE vs. DIRTY determined by behavior
- Unrelated steps left alone

---

### 5.2 Explanation Integration

Summary step can now display:

```
Changes that require review:

Skills (visited):
  ✓ Class change affected skill budget

Feats (visited):
  ✓ Class change limited feat eligibility

Talents (not visited):
  • Talent rules may have changed when you get there

Summary needs re-validation due to changes above.
```

Instead of vague: "Steps marked for review due to upstream change"

---

### 5.3 Active Step Applicability Integration

**Current logic** (ActiveStepComputer.\_evaluateStepApplicability):
```javascript
case 'force-powers':
  return this._hasForcePowerChoices(actor, session);
```

**With graph**:
```javascript
case 'force-powers':
  // Check if required domains are available
  const requiredDomains = this.dependencyGraph.getConsumedDomains('force-powers');

  const hasForceAccess = session.draftSelections.class?.forceAccess ?? false;
  const hasPowerSlots = session.derivedEntitlements?.forcePowers?.available > 0;

  return hasForceAccess && hasPowerSlots;
```

**Benefit**: Logic explicitly tied to domain availability

---

### 5.4 Debug/Diagnostics Integration

Dev debug overlay can now show:

```
Dependency Graph Status:

Step: species
  Produces: [species-identity, language-grants]
  Affected by: (nothing)
  Affects downstream: [languages, background, summary]
  Affected steps (currently visited): [background, summary]

Step: class
  Produces: [class-identity, feat-grants, talent-grants, force-access]
  Affected by: (nothing)
  Affects downstream: [skills, general-feat, class-feat, ...]
  Affected steps (currently visited): [skills]

Invalidation Impact of changing class from Jedi → Scoundrel:
  - Skills: YES (feat pool changed)
  - General Feat: NO (no class prerequisite)
  - Class Feat: YES (class-specific pool)
  - Force Powers: YES (lost force access)
```

---

## PART 6: DECLARATION SYSTEM

### How Contracts Are Registered

Option 1: **Centralized registry** (like current PROGRESSION_NODE_REGISTRY)
```javascript
export const STEP_DEPENDENCY_CONTRACTS = {
  intro: { stepId: 'intro', produces: [], consumes: [] },
  species: { ... },
  // etc.
};
```

Option 2: **Distributed in step plugins**
```javascript
export class SpeciesStep extends ProgressionStepPlugin {
  static CONTRACT = {
    stepId: 'species',
    produces: [DependencyDomain.SPECIES_IDENTITY, ...],
    consumes: [],
  };
  // ...
}
```

**Recommended: Centralized** (like STEP_DEPENDENCY_CONTRACTS.js)
- Single source of truth
- Easier to audit relationships
- No coupling step plugins to dependency system
- Can be generated/validated separately

### Fallback Heuristics

If a step lacks an explicit contract:

```javascript
DEFAULT_CONTRACT = {
  stepId: unknownStepId,
  produces: [], // Unknown what it produces
  consumes: [], // Unknown what it consumes
};
// Log warning during init
```

This is fail-safe: graph operates but logs uncertainty.

---

## PART 7: KNOWN LIMITATIONS

### What the Graph Does NOT Do

1. **Graph does not replace prerequisite logic**
   The graph tracks that "class-feat consumes CLASS_IDENTITY", but doesn't validate which specific feats are legal for which classes. That stays in plugins/AbilityEngine.

2. **Graph does not replace projection logic**
   The graph tracks that "FORCE_ACCESS produces force-power-grants", but doesn't calculate the actual power slot count. That stays in ProjectionEngine.

3. **Graph does not replace active-step evaluation**
   The graph tracks which domains affect a step, but doesn't evaluate prerequisites or applicability rules. That stays in ActiveStepComputer.

4. **Graph does not own game rules**
   If a feat grants another feat, the graph tracks "feat-grants consumes feat-grants" (circular), but doesn't enforce the rules. Prerequisite logic owns that.

5. **Graph may have transitive false positives (initially)**
   If A produces X, B consumes X, C produces Y, and B also consumes Y (but doesn't really use both), the graph marks C → A as a dependency. This is a conservative false positive. Better to over-invalidate initially, then refine contracts.

6. **Projection rebuild is still monolithic (for now)**
   The graph can inform *what* needs recomputing, but ProjectionEngine still rebuilds everything. This is acceptable for Phase D. Phase F can explore narrow rebuild if needed.

### What the Graph DOES Do Well

1. ✓ Track dependencies at domain level (not step-to-step bluntness)
2. ✓ Distinguish prerequisite vs. grant dependencies (explicit in contracts)
3. ✓ Support transitive dependencies (A → B → C chains)
4. ✓ Generate specific explanations (from dependency path)
5. ✓ Detect misconfiguration (missing producers, circular deps)
6. ✓ Support subtype-specific edges (via context parameter)
7. ✓ Narrow invalidation scope (only affected domains)

---

## PART 8: IMPLEMENTATION ROADMAP

### Phase D: Build Dependency Graph Service
1. Create `dependency-graph.js`
2. Implement graph data structures
3. Implement query APIs
4. Add diagnostics

### Phase E: Wire Into Invalidation
1. Modify `commitSelection` to use graph
2. Replace broad `invalidates` with graph-informed invalidation
3. Store explanations for display
4. Test narrowed invalidation

### Phase F: Use for Explanations
1. Add explanation layer to graph
2. Surface in Summary step
3. Optional: Add to caution markers in rail

### Phase G: Testing
1. Write dependency tests
2. Write integration tests
3. Golden path tests (Jedi, Scout, Beast, etc.)

---

## SUMMARY

**Dependency Graph Design**:
- **Level**: Domain-based + step-level compilation
- **Domains**: 25 specific decision/grant/allocation/derived domains
- **Contracts**: Each step declares produces/consumes
- **Graph**: Builds domain dependency edges from contracts
- **API**: getAffectedDomains, getAffectedStepIds, explainImpact
- **Integration**: Invalidation becomes graph-informed, explanations become precise
- **Limitations**: Graph doesn't own rules; it describes dependencies

**Next**: Proceed to Phase D (implementation) with dependency-graph.js and integration.
