import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

const normalizeName = value => String(value ?? '').trim().toLowerCase();

export const PHASE3_FORCE_POWER_CORRECTIONS = Object.freeze({
  surge: Object.freeze({
    name: 'Surge',
    execution: 'active-effect',
    resolution: {
      version: 1,
      behavior: { primary: 'modifier', secondary: ['movement'] },
      check: { mode: 'fixed-dc', skill: 'useTheForce', baseDC: 10, defense: null, opposedBy: null, marginStep: null, take10Allowed: true },
      targeting: { mode: 'self', range: 'Personal', shape: 'single', size: null, origin: 'caster', lineOfSight: false, affectsSelf: true },
      outcomes: {
        tiers: [
          { minimum: 10, maximum: 14, label: '+10 Jump, +2 squares speed', outcomes: [{ kind: 'modifier', category: 'skill', target: 'jump', amount: 10, bonusType: 'force' }, { kind: 'modifier', category: 'speed', target: 'walk', amount: 2, bonusType: 'force' }] },
          { minimum: 15, maximum: 19, label: '+20 Jump, +4 squares speed', outcomes: [{ kind: 'modifier', category: 'skill', target: 'jump', amount: 20, bonusType: 'force' }, { kind: 'modifier', category: 'speed', target: 'walk', amount: 4, bonusType: 'force' }] },
          { minimum: 20, maximum: null, label: '+30 Jump, +6 squares speed', outcomes: [{ kind: 'modifier', category: 'skill', target: 'jump', amount: 30, bonusType: 'force' }, { kind: 'modifier', category: 'speed', target: 'walk', amount: 6, bonusType: 'force' }] }
        ],
        onFailure: [], onMiss: []
      },
      duration: { type: 'turns', value: 1, maintainable: false, maintenanceAction: null },
      resourceOptions: { forcePoint: [{ kind: 'modifier', category: 'skill', target: 'jump', amount: 10, bonusType: 'force' }, { kind: 'modifier', category: 'speed', target: 'walk', amount: 2, bonusType: 'force' }], destinyPoint: [] },
      automation: { status: 'partial', handler: 'phase3.surge', reviewRequired: false },
      source: { book: 'Saga Edition Core Rulebook', page: 100, verified: true, notes: [] }
    }
  }),
  rebuke: Object.freeze({
    name: 'Rebuke', execution: 'assisted',
    resolution: {
      version: 1,
      behavior: { primary: 'reaction', secondary: ['control'] },
      check: { mode: 'reaction-opposed', skill: 'useTheForce', baseDC: null, defense: null, opposedBy: 'originating Force power check', marginStep: 5, take10Allowed: false },
      targeting: { mode: 'special', range: null, shape: 'single', size: null, origin: 'caster', lineOfSight: false, affectsSelf: true },
      outcomes: { tiers: [{ minimum: 0, maximum: 4, label: 'Negate incoming Force power', outcomes: [{ kind: 'special', notes: 'Negate the incoming Force power.' }] }, { minimum: 5, maximum: null, label: 'Redirect incoming Force power', outcomes: [{ kind: 'special', notes: 'Redirect the incoming Force power to its originator.' }] }], onFailure: [], onMiss: [] },
      duration: { type: 'instant', value: null, maintainable: false, maintenanceAction: null },
      resourceOptions: { forcePoint: [], destinyPoint: [] },
      automation: { status: 'partial', handler: 'phase3.rebuke-assisted', reviewRequired: false },
      source: { book: 'Saga Edition Core Rulebook', page: 100, verified: true, notes: ['Reaction prompting and automatic redirection remain manual.'] }
    }
  }),
  'force disarm': Object.freeze({
    name: 'Force Disarm', execution: 'assisted',
    resolution: {
      version: 1,
      behavior: { primary: 'control', secondary: ['damage'] },
      check: { mode: 'attack-substitution', skill: 'useTheForce', baseDC: null, defense: null, opposedBy: 'normal disarm defense', marginStep: null, take10Allowed: false },
      targeting: { mode: 'creature', range: '6 squares', shape: 'single', size: null, origin: 'caster', lineOfSight: true, affectsSelf: false },
      outcomes: { tiers: [{ minimum: null, maximum: null, label: 'Use the Force check substitutes for the disarm attack roll', outcomes: [{ kind: 'disarm', notes: 'Resolve all remaining disarm rules normally.' }] }], onFailure: [], onMiss: [] },
      duration: { type: 'instant', value: null, maintainable: false, maintenanceAction: null },
      resourceOptions: { forcePoint: [{ kind: 'special', notes: 'Use the Force result may damage or destroy the disarmed weapon as allowed by the source.' }], destinyPoint: [] },
      automation: { status: 'partial', handler: 'phase3.force-disarm-assisted', reviewRequired: false },
      source: { book: 'Saga Edition Core Rulebook', page: 98, verified: true, notes: ['Full disarm combat resolver remains manual.'] }
    }
  }),
  farseeing: Object.freeze({
    name: 'Farseeing', execution: 'assisted',
    resolution: {
      version: 1,
      behavior: { primary: 'information', secondary: [] },
      check: { mode: 'defense', skill: 'useTheForce', baseDC: null, defense: 'will', opposedBy: null, marginStep: null, take10Allowed: true },
      targeting: { mode: 'creature', range: 'unlimited', shape: 'single', size: null, origin: 'caster', lineOfSight: false, affectsSelf: false },
      outcomes: { tiers: [{ minimum: null, maximum: null, label: 'Receive source-defined information about a known creature', outcomes: [{ kind: 'information', notes: 'Reveal whether the creature is alive, its general surroundings, activity, and emotional state as permitted by the source.' }] }], onFailure: [], onMiss: [] },
      duration: { type: 'instant', value: null, maintainable: false, maintenanceAction: null },
      resourceOptions: { forcePoint: [{ kind: 'information', notes: 'Provide the clearer image allowed by the source.' }], destinyPoint: [] },
      automation: { status: 'partial', handler: 'phase3.farseeing-assisted', reviewRequired: false },
      source: { book: 'Saga Edition Core Rulebook', page: 97, verified: true, notes: ['The 24-hour repeat restriction is surfaced as metadata but not automatically enforced.'] }
    }
  })
});

export function getPhase3ForcePowerCorrection(powerOrName) {
  const name = typeof powerOrName === 'string' ? powerOrName : powerOrName?.name;
  return PHASE3_FORCE_POWER_CORRECTIONS[normalizeName(name)] ?? null;
}

function chooseTier(resolution, total) {
  return resolution.outcomes.tiers.find(tier =>
    (tier.minimum == null || total >= tier.minimum) &&
    (tier.maximum == null || total <= tier.maximum)
  ) ?? null;
}

function buildIntentEffect(actor, powerItem, outcome) {
  return {
    label: `${powerItem.name} (${outcome.target} +${outcome.amount})`,
    icon: powerItem.img || 'icons/svg/magic.svg',
    origin: actor.uuid,
    disabled: false,
    transfer: false,
    duration: { type: 'turns', duration: 1 },
    changes: [],
    flags: {
      swse: { effectType: 'forcePowerIntent' },
      'foundryvtt-swse': {
        effectIntent: {
          category: outcome.category,
          target: outcome.target,
          operation: 'increase',
          amount: outcome.amount,
          bonusType: outcome.bonusType || 'force',
          application: 'always',
          scope: 'self',
          transfer: true
        }
      }
    }
  };
}

export function installPhase3ForcePowerCorrections(ForcePowerEffectsEngine) {
  if (!ForcePowerEffectsEngine || ForcePowerEffectsEngine.__phase3CorrectionsInstalled) return;
  const original = ForcePowerEffectsEngine._buildEffectDataForPower.bind(ForcePowerEffectsEngine);
  ForcePowerEffectsEngine._buildEffectDataForPower = function phase3BuildEffectData(actor, powerItem, rollTotal) {
    const correction = getPhase3ForcePowerCorrection(powerItem);
    if (!correction) return original(actor, powerItem, rollTotal);
    if (normalizeName(powerItem.name) !== 'surge') return [];
    const tier = chooseTier(correction.resolution, Number(rollTotal) || 0);
    if (!tier) return [];
    return tier.outcomes.filter(outcome => outcome.kind === 'modifier').map(outcome => buildIntentEffect(actor, powerItem, outcome));
  };
  Object.defineProperty(ForcePowerEffectsEngine, '__phase3CorrectionsInstalled', { value: true, configurable: false });
  SWSELogger.log('SWSE | Force Powers | Phase 3 critical corrections installed');
}
