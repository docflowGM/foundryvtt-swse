/**
 * Progression Entitlement Calculator
 *
 * Phase 1 layer split for actor-wide progression reconciliation.
 * This layer answers: "What progression choices should this actor have?"
 *
 * The first pass is intentionally a thin adapter around the existing, proven
 * reconciler helpers so the public API remains stable while the monolith is
 * split into testable layers. Later phases can move the delegated helper logic
 * fully into this class without changing consumers.
 */
export class ProgressionEntitlementCalculator {
  constructor({ helpers = {} } = {}) {
    this.helpers = helpers;
  }

  calculate(actor, options = {}) {
    const buildClassSummaries = this.helpers.buildClassSummaries;
    const getActorTotalLevel = this.helpers.getActorTotalLevel;
    const getActorHeroicLevel = this.helpers.getActorHeroicLevel;
    const toPublicClassSummary = this.helpers.toPublicClassSummary;
    const buildAbilityIncreaseSlots = this.helpers.buildAbilityIncreaseSlots;
    const buildGeneralFeatSlots = this.helpers.buildGeneralFeatSlots;
    const buildHeroicTalentSlots = this.helpers.buildHeroicTalentSlots;
    const buildClassChoiceSlots = this.helpers.buildClassChoiceSlots;
    const buildDerivedStatsAudit = this.helpers.buildDerivedStatsAudit;

    const internalClassSummaries = typeof buildClassSummaries === 'function'
      ? buildClassSummaries(actor)
      : [];
    const totalLevel = typeof getActorTotalLevel === 'function'
      ? getActorTotalLevel(actor)
      : 0;
    const totalHeroicLevel = typeof getActorHeroicLevel === 'function'
      ? getActorHeroicLevel(actor, internalClassSummaries)
      : totalLevel;

    const abilityIncreases = typeof buildAbilityIncreaseSlots === 'function'
      ? buildAbilityIncreaseSlots(actor, totalLevel)
      : [];
    const generalFeats = typeof buildGeneralFeatSlots === 'function'
      ? buildGeneralFeatSlots(actor, totalHeroicLevel)
      : [];
    const heroicTalents = typeof buildHeroicTalentSlots === 'function'
      ? buildHeroicTalentSlots(actor, totalHeroicLevel)
      : [];
    const classChoices = typeof buildClassChoiceSlots === 'function'
      ? buildClassChoiceSlots(actor, internalClassSummaries)
      : [];

    const classFeats = classChoices.filter(slot => slot?.type === 'class-feat');
    const classTalents = classChoices.filter(slot => slot?.type === 'class-talent');
    const derivedStats = typeof buildDerivedStatsAudit === 'function'
      ? buildDerivedStatsAudit(actor, internalClassSummaries, { totalLevel, totalHeroicLevel })
      : { status: 'unavailable', rows: [], hasIssues: false, issueCount: 0 };

    return {
      kind: 'swse-progression-entitlement-plan',
      version: 3,
      actorId: actor?.id || null,
      actorName: actor?.name || 'Actor',
      totalLevel,
      totalHeroicLevel,
      mode: options.mode || 'actor-audit',
      internalClassSummaries,
      classSummaries: internalClassSummaries.map(summary => (
        typeof toPublicClassSummary === 'function'
          ? toPublicClassSummary(summary)
          : {
              itemId: summary?.itemId || null,
              classId: summary?.classId || '',
              className: summary?.className || summary?.classId || 'Unknown',
              level: Number(summary?.level || 0) || 0,
            }
      )),
      slots: {
        abilityIncreases,
        generalFeats,
        heroicTalents,
        classChoices,
        classFeats,
        classTalents,
        derivedStats,
      },
      derivedStats,
      diagnostics: {
        layer: 'entitlement-calculator',
        delegated: true,
        phase: 6,
        classLevelSources: internalClassSummaries.map(summary => ({
          classId: summary?.classId || '',
          className: summary?.className || '',
          level: Number(summary?.level || 0) || 0,
          sources: Array.from(new Set(Array.isArray(summary?.sources) ? summary.sources : [])),
          classProgressionSource: 'class-compendium-ssot',
          cadenceFallback: false,
        })),
        derivedStats: {
          status: derivedStats?.status || 'unavailable',
          rowCount: Array.isArray(derivedStats?.rows) ? derivedStats.rows.length : 0,
          issueCount: Number(derivedStats?.issueCount || 0) || 0,
          source: 'class-compendium-ssot',
        },
      },
    };
  }
}

export default ProgressionEntitlementCalculator;
