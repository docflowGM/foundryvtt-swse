/**
 * PHASE 8D-3B production — droid role/function catalog.
 *
 * Mirrors `npc-roles.js` for the droid half of `npc-concept.js`'s
 * schema (`droidRole`/`primaryFunction`/`chassisSuggestion`). Droids are
 * conceptually SEPARATE from Species demographics (phase spec's "DROID
 * NPCs" section, restated in `population-profile.js`'s own header) —
 * this catalog is never treated as a fake Species pool, and nothing
 * here carries mechanical chassis stats: `chassisSuggestion` is a
 * narrative hint ("astromech-class", "labor chassis"), never a real
 * Vehicle/Item compendium reference.
 *
 * `tags` reuse the same `ORGANIZATION_FAMILY`/economy-sector vocabulary
 * `npc-roles.js` uses, so both pools can be softly biased by identical
 * context.
 */

export const NPC_DROID_ROLES = Object.freeze([
  { value: 'protocol droid', weight: 3, tags: ['government-bureaucracy', 'business-professional', 'noble-house'], chassisSuggestion: 'protocol-class', tier: 'specialist' },
  { value: 'astromech droid', weight: 3, tags: ['technology', 'trade', 'military-paramilitary'], chassisSuggestion: 'astromech-class', tier: 'specialist' },
  { value: 'labor droid', weight: 3, tags: ['industrial', 'mining', 'agriculture'], chassisSuggestion: 'labor chassis', tier: 'common' },
  { value: 'maintenance droid', weight: 2, tags: ['industrial', 'technology'], chassisSuggestion: 'maintenance chassis', tier: 'common' },
  { value: 'repair droid', weight: 2, tags: ['technology', 'industrial'], chassisSuggestion: 'repair chassis', tier: 'specialist' },
  { value: 'security droid', weight: 2, tags: ['security', 'enforcement', 'military-paramilitary'], chassisSuggestion: 'security chassis', tier: 'common' },
  { value: 'combat droid', weight: 2, tags: ['military-paramilitary', 'crime-syndicate'], chassisSuggestion: 'combat chassis', tier: 'common' },
  { value: 'medical droid', weight: 2, tags: ['medical'], chassisSuggestion: 'medical chassis', tier: 'specialist' },
  { value: 'surgical droid', weight: 1, tags: ['medical'], chassisSuggestion: 'surgical chassis', tier: 'specialist' },
  { value: 'mining droid', weight: 2, tags: ['mining', 'industrial'], chassisSuggestion: 'mining chassis', tier: 'common' },
  { value: 'assembly-line droid', weight: 1, tags: ['industrial', 'business-professional'], chassisSuggestion: 'assembly chassis', tier: 'common' },
  { value: 'pilot droid', weight: 2, tags: ['trade', 'military-paramilitary'], chassisSuggestion: 'pilot-interface chassis', tier: 'specialist' },
  { value: 'navigation droid', weight: 1, tags: ['trade', 'technology'], chassisSuggestion: 'navigation chassis', tier: 'specialist' },
  { value: 'courier droid', weight: 1, tags: ['trade', 'urban'], chassisSuggestion: 'courier chassis', tier: 'common' },
  { value: 'translator droid', weight: 1, tags: ['government-bureaucracy', 'business-professional'], chassisSuggestion: 'protocol-class', tier: 'specialist' },
  { value: 'research assistant droid', weight: 1, tags: ['research', 'education'], chassisSuggestion: 'research chassis', tier: 'specialist' },
  { value: 'archivist droid', weight: 1, tags: ['education', 'government-bureaucracy'], chassisSuggestion: 'archival chassis', tier: 'specialist' },
  { value: 'accounting droid', weight: 1, tags: ['financial-services', 'business-professional'], chassisSuggestion: 'clerical chassis', tier: 'specialist' },
  { value: 'household droid', weight: 1, tags: ['noble-house', 'community-tribe'], chassisSuggestion: 'domestic chassis', tier: 'common' },
  { value: 'entertainment droid', weight: 1, tags: ['entertainment', 'urban'], chassisSuggestion: 'entertainment chassis', tier: 'common' },
  { value: 'interrogation droid', weight: 1, tags: ['crime-syndicate', 'enforcement'], chassisSuggestion: 'interrogation chassis', tier: 'specialist' },
  { value: 'assassin droid', weight: 1, tags: ['crime-syndicate'], chassisSuggestion: 'assassin chassis', tier: 'specialist' },
  { value: 'sentry droid', weight: 1, tags: ['security', 'military-paramilitary'], chassisSuggestion: 'sentry chassis', tier: 'common' },
  { value: 'demolitions droid', weight: 1, tags: ['military-paramilitary', 'crime-syndicate'], chassisSuggestion: 'ordnance chassis', tier: 'specialist' },
  { value: 'command/tactical droid', weight: 1, tags: ['military-paramilitary'], chassisSuggestion: 'tactical chassis', tier: 'leadership' },
  { value: 'overseer droid', weight: 1, tags: ['industrial', 'business-professional'], chassisSuggestion: 'supervisory chassis', tier: 'leadership' },
  { value: 'administrator droid', weight: 1, tags: ['government-bureaucracy', 'business-professional'], chassisSuggestion: 'administrative chassis', tier: 'leadership' },
  { value: 'moisture-farming droid', weight: 1, tags: ['agriculture', 'frontier'], chassisSuggestion: 'agricultural chassis', tier: 'common' },
  { value: 'terraforming droid', weight: 1, tags: ['agriculture', 'technology'], chassisSuggestion: 'terraforming chassis', tier: 'specialist' },
  { value: 'survey droid', weight: 1, tags: ['frontier', 'research'], chassisSuggestion: 'survey chassis', tier: 'specialist' },
  { value: 'salvage droid', weight: 1, tags: ['salvage', 'frontier'], chassisSuggestion: 'salvage chassis', tier: 'common' }
]);
