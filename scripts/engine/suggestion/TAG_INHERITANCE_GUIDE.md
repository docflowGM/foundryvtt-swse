# Phase 2F: Tag Inheritance & Context Envelope

## Overview

This document describes the tag inheritance system that allows talent candidates to inherit tags from their parent talent trees, enabling richer scoring and mentoring without exposing mathematical logic.

## Components

### 1. TalentTreeTagRegistry
**File**: `TalentTreeTagRegistry.js`

Loads and caches talent tree metadata at boot time. Serves as the SSOT for tree tags.

```javascript
await TalentTreeTagRegistry.initialize();
const treeMeta = TalentTreeTagRegistry.getByTreeId(treeUuid);
// => { tags: [...], name: "...", descriptor: "..." }
```

**Key Methods**:
- `initialize()` - Load metadata from generated JSON (boot-time)
- `getByTreeId(treeId)` - Get tree metadata by UUID
- `getByTreeName(treeName)` - Get tree metadata by name
- `getTreeTags(treeId)` - Get just the tags for a tree
- `hasTree(treeId)` - Check if tree is registered

**Metadata File**: `data/metadata/talent-tree-tags.json`

### 2. TalentCandidateEnricher
**File**: `TalentCandidateEnricher.js`

Enriches talent candidates with inheritance context. Called during candidate pool building.

```javascript
const enriched = TalentCandidateEnricher.enrich(candidate, treeId);
// candidate.context now contains:
// {
//   treeId: "uuid-of-tree",
//   treeName: "Lightsaber Combat",
//   treeTags: ["lightsaber", "melee", "accuracy", "damage"],
//   candidateTags: ["force", "reaction", "defense"],
//   allTags: ["force", "reaction", "defense", "lightsaber", "melee", "accuracy", "damage"]
// }
```

**Key Methods**:
- `enrich(candidate, treeId)` - Add context to a single candidate
- `enrichBatch(candidates, treeId)` - Enrich multiple candidates
- `getAllTags(candidate)` - Get effective tags (with fallback)
- `hasTag(candidate, tag)` - Check if candidate has a tag
- `getTreeMeta(candidate)` - Get tree metadata for a candidate

### 3. CandidatePoolBuilder (Updated)
**File**: `CandidatePoolBuilder.js`

Integrated enrichment into talent candidate filtering.

```javascript
// Automatically enriches candidates after filtering
const { filteredCandidates } = await CandidatePoolBuilder.build(
  actor,
  slotContext,
  allCandidates
);
// All talent candidates now have context.allTags populated
```

### 4. SuggestionScorer (Updated)
**File**: `SuggestionScorer.js`

Uses helper functions to access tags. Automatically uses allTags if available.

```javascript
// Old: candidate.tags?.includes('defense')
// New: candidateHasTag(candidate, 'defense')
// Transparently uses context.allTags if enriched
```

**Helper Functions Added**:
- `getCandidateTags(candidate)` - Get effective tags
- `candidateHasTag(candidate, tag)` - Check for tag

### 5. EvidenceCardFactory
**File**: `EvidenceCardFactory.js`

Generates structured evidence cards for mentor reasoning. No math exposed.

```javascript
const cards = EvidenceCardFactory.createEvidenceSet(candidate, {
  includeTreeCard: true,
  includeTagsCard: true,
  archetype: "Guardian",
  defensePressure: 2
});

// cards[0] = {
//   source: "TalentTree",
//   refId: "tree-uuid",
//   label: "Lightsaber Combat",
//   tags: ["lightsaber", "melee", "defense"],
//   text: "Part of Lightsaber Combat, a talent path focused on..."
// }
```

**Evidence Source Types**:
- `TalentTree` - Tree tags and description
- `CandidateTags` - Candidate's own tags
- `ArchetypeAffinity` - Archetype alignment
- `ChainContinuation` - Build momentum
- `PrestigeTrajectory` - Path alignment
- `DefenseNeed` - Defense state
- `MilestoneForecast` - Upcoming level
- `AttributeBreakpoint` - Modifier breakpoint
- `WishlistTarget` - Wishlist progress

## Data Files

### Metadata Files

#### `data/metadata/talent-tree-tags.json`
SSOT for talent tree tags. Boot-loaded by TalentTreeTagRegistry.

```json
{
  "treeMetadata": {
    "lightsaber-combat": {
      "name": "Lightsaber Combat",
      "descriptor": "Core lightsaber mastery",
      "tags": ["lightsaber", "melee", "accuracy", "damage", "defense"]
    }
  }
}
```

#### `data/metadata/force-power-tags.byId.json`
UUID-keyed Force Power metadata with tags and mentor hints.

```json
{
  "powers": {
    "00b65e47a4dd7d76": {
      "name": "Vital Transfer",
      "actionType": "standard",
      "tags": ["force", "light", "healing", "support"],
      "mentorHints": {
        "oneLiner": "Core healing tool (Light Side).",
        "notes": "Defines healer/support identity lanes."
      }
    }
  }
}
```

#### `data/metadata/force-power-tags.report.json`
Resolution report showing which UUIDs have been resolved and which are pending.

## Integration Points

### Boot Time
1. Suggestion engine initialization
2. Call `TalentTreeTagRegistry.initialize()` to load metadata
3. System ready for candidate enrichment

### Candidate Building
1. CandidatePoolBuilder filters by slot context
2. For talent candidates, enrich each with `TalentCandidateEnricher.enrich()`
3. Candidates now have `context.allTags` populated

### Scoring
1. SuggestionScorer calls `candidateHasTag()` instead of direct tag checks
2. Transparently uses `context.allTags` for tree-enriched candidates
3. No need to rewrite scoring logic—helper functions handle fallback

### Mentoring
1. When generating mentor advice, use `EvidenceCardFactory.createEvidenceSet()`
2. Generate evidence cards structured by source type
3. Mentor dialogue cites evidence, not math

## Example Usage

### Complete Flow

```javascript
// 1. Boot: Initialize registry
await TalentTreeTagRegistry.initialize();

// 2. Build candidates (in SuggestionEngine)
const { filteredCandidates } = await CandidatePoolBuilder.build(
  actor,
  slotContext,
  allCandidates
);
// Candidates are now enriched with context.allTags

// 3. Score candidates (in SuggestionScorer)
for (const candidate of filteredCandidates) {
  const score = scoreSuggestion(candidate, actor, buildIntent, options);
  // Scoring automatically uses context.allTags for inherited tags
}

// 4. Generate mentor reasons (in MentorSystem)
const evidenceCards = EvidenceCardFactory.createEvidenceSet(candidate, {
  includeTreeCard: true,
  defensePressure: 2,
  archetype: "Guardian"
});

const mentorText = EvidenceCardFactory.cardsToMentorText(evidenceCards);
// "Part of Lightsaber Combat. Your defenses are low for your level."
```

## Testing

### Unit Tests

```javascript
// Test enrichment
const candidate = { name: "Deflect", tags: ["reaction", "defense"] };
const treeId = "lightsaber-combat";
TalentCandidateEnricher.enrich(candidate, treeId);
expect(candidate.context.allTags).toContain("lightsaber");

// Test tag checking
expect(candidateHasTag(candidate, "lightsaber")).toBe(true);

// Test evidence cards
const cards = EvidenceCardFactory.createEvidenceSet(candidate);
expect(cards.some(c => c.source === "TalentTree")).toBe(true);
```

## Future Extensions

1. **Talent Tree Discovery**: UI to visualize tree tags and inherited tags
2. **Tag Weighting**: Soft tags vs. hard tags (inherit some at lower strength)
3. **Prestige Trees**: Extend to prestige class trees
4. **Dynamic Tag Assignment**: Update trees with tags at runtime
5. **Tag Analytics**: Track which tags are used most, mentor patterns

## Notes

- Tag inheritance is **non-destructive**: candidate.tags remain unchanged, context.allTags is additive
- Registry is **extensible**: call `TalentTreeTagRegistry.register()` to add trees at runtime
- Evidence cards are **modular**: each card is independent, mentors choose which to cite
- Scoring is **transparent**: helpers make it easy to swap tag sources
