/**
 * Compile one reviewed Phase 4-B source profile into a complete-snapshot species variant.
 *
 * Closed, conservative compilers: a feature becomes structured (automated) ONLY when its audited mechanics have an
 * exactly recognised shape AND its printed text carries no condition the structure cannot express. Everything else is
 * kept as displayed text and reported as display-only; nothing is inferred from prose. A profile that needs a feature
 * the species schema cannot carry yet (natural weapons, ability choices, size variation, unresolved speed, droid
 * integration) is HELD and reported, never approximated.
 */

export class HoldProfile extends Error {
  constructor(reason) { super(reason); this.name = 'HoldProfile'; this.reason = reason; }
}

export const slug = s => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const ABILITIES = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'];
const DEFENSES = { reflex: 'reflex', fortitude: 'fortitude', will: 'will' };
const SKILL_IDS = new Set(['acrobatics', 'climb', 'deception', 'endurance', 'gatherinformation', 'initiative', 'jump', 'mechanics', 'perception', 'persuasion', 'pilot', 'ride', 'stealth', 'survival', 'swim', 'treatinjury', 'useComputer'.toLowerCase(), 'usetheforce']);
const skillIdOf = name => {
  const key = String(name ?? '').replace(/[^A-Za-z]/g, '').toLowerCase();
  if (!/^[A-Z][A-Za-z ]+$/.test(String(name ?? '')) || !SKILL_IDS.has(key) || key === 'initiative') return null;
  return { gatherinformation: 'gatherInformation', treatinjury: 'treatInjury', usetheforce: 'useTheForce', usecomputer: 'useComputer' }[key] ?? key;
};

// Words that make an otherwise simple-looking sentence conditional/limited; their presence keeps the feature display-only.
const stripEvenIf = t => String(t ?? '').replace(/\beven (?:if|when) (?:it is |they are )?(?:worse|lower)\b/gi, '');
const CONDITIONAL_TEXT = /\b(when|while|if|only|once per|per day|per encounter|against|versus|to (?:sense|sneak|intimidate|resist|change)|made to|involving|underwater|wearing|within|swift|standard action|free action)\b/i;

function compileDefense(f) {
  const m = f.mechanics ?? {};
  if (CONDITIONAL_TEXT.test(stripEvenIf(f.publishedRule))) return null;
  const amount = [m.bonus, m.modifier, m.amount].filter(v => v !== undefined);
  if (amount.length !== 1 || !Number.isFinite(amount[0]) || amount[0] === 0) return null;
  if (!['species', 'natural armor', 'natural-armor', 'naturalArmor'].includes(m.bonusType)) return null;
  const defense = DEFENSES[String(m.defense ?? '').toLowerCase()];
  if (!defense || m.defenses) return null;
  const bonusType = m.bonusType === 'species' ? 'species' : 'naturalArmor';
  return [{ type: 'defenseModifier', defense, value: amount[0], bonusType, when: { type: 'always' }, id: `${slug(f.name)}-rule-0` }];
}

function compileReroll(f) {
  const m = f.mechanics ?? {};
  if (CONDITIONAL_TEXT.test(stripEvenIf(f.publishedRule))) return null;
  if (m.subtask || m.application || m.skills || m.checks || m.skillFamily || m.take10 || m.take10When || m.take10Despite) return null;
  const skillId = skillIdOf(m.check ?? m.skill);
  if (!skillId) return null;
  const secondForced = (m.keep === 'second' && m.reroll === 'optional')
    || (m.take === 'second' && (m.reroll === true || m.reroll === 'any-check'))
    || (m.mustAcceptNewResult === true && m.reroll === 'optional')
    || (m.result === 'must-accept-reroll' && m.reroll === 'optional');
  const better = m.take === 'better' && (m.reroll === true || m.reroll === 'any-check');
  if (!secondForced && !better) return null;
  return [{ type: 'reroll', triggeredBy: { type: 'skillCheck', skillId }, outcome: secondForced ? 'mustAccept' : 'keepBetter', when: { type: 'always' }, id: `${slug(f.name)}-rule-0` }];
}

const DEFENSE_CLASSES = new Set(['PASSIVE_DEFENSE', 'PASSIVE_DEFENSE_BONUS', 'DEFENSE_BONUS', 'SPECIES_DEFENSE_BONUS', 'NATURAL_ARMOR_BONUS', 'NATURAL_ARMOR_DEFENSE']);
const REROLL_CLASSES = new Set(['OPTIONAL_REROLL_MUST_ACCEPT', 'SKILL_REROLL', 'OPTIONAL_CHECK_REROLL', 'OPTIONAL_REROLL']);

const SKILL_KEYS = {
  acrobatics: 'acrobatics', climb: 'climb', deception: 'deception', endurance: 'endurance', 'gather information': 'gatherInformation',
  jump: 'jump', mechanics: 'mechanics', perception: 'perception', persuasion: 'persuasion', pilot: 'pilot', ride: 'ride',
  stealth: 'stealth', survival: 'survival', swim: 'swim', 'treat injury': 'treatInjury', 'use computer': 'useComputer', 'use the force': 'useTheForce',
};
const skillKey = name => SKILL_KEYS[String(name ?? '').toLowerCase().trim()] ?? null;

// Structured grant rules, ONLY for shapes whose meaning is fully expressed: a feat named (or chosen) with an optional
// "skill is trained" requirement, a pure class-skill list, a class-skill-pool trained-skill choice. Any other
// condition (ability scores, prerequisite feats, restricted pools) is not expressible and stays display-only.
function compileGrant(f) {
  const m = f.mechanics ?? {};
  const rid = `${slug(f.name)}-rule-0`;
  const strings = (...v) => v.find(x => typeof x === 'string' && x.trim()) ?? null;
  switch (f.classification) {
    case 'CONDITIONAL_FEAT_GRANT': {
      const skill = skillKey(strings(m.condition?.trainedSkill, m.requires?.trainedSkill, m.requiresTrainedSkill, m.skill && m.prerequisite === 'trainedInSurvival' ? m.skill : null,
        m.prerequisite === 'Use the Force trained' ? 'Use the Force' : null));
      let feat = strings(m.bonusFeat, m.grantFeat, m.grantsFeat);
      if (!feat && m.feat === 'Skill Focus' && m.skill && !m.choices) feat = `Skill Focus (${m.skill})`;
      if (!feat && m.feat === 'Force Training') feat = 'Force Training';
      const extra = Object.keys(m).filter(k => !['condition', 'requires', 'requiresTrainedSkill', 'bonusFeat', 'grantFeat', 'grantsFeat', 'featSource', 'feat', 'skill', 'prerequisite', 'automaticIfEligible'].includes(k));
      if (!skill || !feat || extra.length || (m.condition && Object.keys(m.condition).some(k => k !== 'trainedSkill')) || (m.requires && Object.keys(m.requires).some(k => k !== 'trainedSkill'))) return null;
      return [{ type: 'featGrant', featName: feat, requirements: [{ type: 'skillTrained', skill }], id: rid }];
    }
    case 'FIXED_FEAT_GRANT':
    case 'AUTOMATIC_FEAT_GRANT':
    case 'FIRST_LEVEL_BONUS_FEAT': {
      let feat = strings(m.bonusFeat, m.grantFeat, m.feat);
      if (feat && m.choice && /^[a-z]/.test(m.choice)) feat = `${feat} (${m.choice})`;
      const okKeys = ['bonusFeat', 'grantFeat', 'feat', 'condition', 'automatic', 'grant', 'grantType', 'atLevel', 'choice'];
      if (!feat || Object.keys(m).some(k => !okKeys.includes(k)) || (m.condition && m.condition !== 'always')) return null;
      return [{ type: 'featGrant', featName: feat, requirements: [], id: rid }];
    }
    case 'FIRST_LEVEL_BONUS_FEAT_CHOICE':
    case 'LEVEL_ONE_FEAT_GRANT': {
      const okKeys = ['atLevel', 'extraFeatChoices', 'grant', 'quantity'];
      if (Object.keys(m).some(k => !okKeys.includes(k)) || m.atLevel !== 1 || (m.extraFeatChoices ?? m.quantity ?? 1) !== 1) return null;
      return [{ type: 'featGrant', choice: true, id: rid }];
    }
    case 'LEVEL_ONE_CHOICE': {
      if (m.atLevel !== 1 || (m.quantity ?? 1) !== 1 || Object.keys(m).some(k => !['grant', 'quantity', 'atLevel', 'choiceSet'].includes(k))) return null;
      if (m.grant === 'one-trained-skill' && m.choiceSet === 'current-class-skills') return [{ type: 'trainedSkillChoice', pool: 'classSkills', id: rid }];
      if (m.grant === 'bonus-feat' && !m.choiceSet) return [{ type: 'featGrant', choice: true, id: rid }];
      return null;
    }
    case 'FIRST_LEVEL_BONUS_TRAINED_SKILL_CHOICE': {
      const pool = m.pool;
      if (m.atLevel !== 1 || !['classSkillList', 'characterClassSkills'].includes(pool) || (m.count ?? m.quantity ?? 1) !== 1) return null;
      return [{ type: 'trainedSkillChoice', pool: 'classSkills', id: rid }];
    }
    case 'CLASS_SKILL_GRANT': {
      const names = [].concat(m.classSkills ?? m.skill ?? m.classSkill ?? []).filter(x => typeof x === 'string');
      const keys = names.map(skillKey);
      const okKeys = ['classSkills', 'classSkill', 'skill', 'trainedAutomatically', 'applies'];
      if (!names.length || keys.some(k => !k) || Object.keys(m).some(k => !okKeys.includes(k)) || m.trainedAutomatically === true) return null;
      if (m.applies && m.applies !== 'allClasses') return null;
      return [{ type: 'classSkillGrant', skills: names, id: rid }];
    }
    default:
      return null;
  }
}

// Names the ledger turns into an activated species ability (species-grant-ledger-builder.js
// _populateActivatedSpeciesAbilities). A trait carrying such a name only activates it when the audit identifies the
// feature as that ability; otherwise it is explicitly display-only (a same-named, different rule).
const ACTIVATION_NAMES = {
  // Engine entries whose details were pinned against the audited text (tests/species-activation-exclusions.test.mjs).
  rage: ['DAILY_SWIFT_ACTIVATED_RAGE_WITH_RECOVERY', 'ACTIVATED_RAGE_WITH_CONDITION_PENALTY', 'ACTIVATED_CONDITION_AND_BONUS'],
  roller: ['ACTIVATED_ALTERNATE_MOVEMENT_FORM'],
  startle: ['ENCOUNTER_REACTION'],
  pheromones: ['INHALED_POISON_ACTIVATED_ABILITY'],
  'quick-energy': ['LIMITED_ACTIVATED_ABILITY'],
  // Engine entries known to differ from (or go beyond) the audited text: never activated from a published profile.
  // Pacifism omits the "only if the target attacks" condition; Confusion ends at the wrong time; Force Blast is a
  // different mechanic; Shapeshift invents a duration; Natural Telepath invents an action type; the rest are unverified.
  poison: [], 'natural-telepath': [], 'broadcast-telepath': [], bellow: [], 'sonic-bellow': [], confusion: [],
  shapeshifter: [], shapeshift: [], 'energy-surge': [], 'force-blast': [], pacifism: [],
};


export function compileFeature(f) {
  let rules = null;
  if (DEFENSE_CLASSES.has(f.classification)) rules = compileDefense(f);
  else if (REROLL_CLASSES.has(f.classification)) rules = compileReroll(f);
  else rules = compileGrant(f);
  // Ids the ledger recognises BY ID and then parses from prose; an unautomated trait must never carry one.
  const RECOGNIZED_IDS = new Set(['bonus-feat', 'bonus-trained-skill', 'bonus-class-skill', 'bonus-class-skills', 'conditional-bonus-feat']);
  let id = slug(f.name);
  if (!rules && RECOGNIZED_IDS.has(id)) id = `${id}-text`;
  const activation = ACTIVATION_NAMES[id];
  const displayOnlyGuard = activation && !activation.includes(f.classification);
  return {
    trait: { id, name: f.name, description: f.publishedRule, sourceFeatureId: f.featureId, ...(rules ? { rules } : {}), ...(displayOnlyGuard ? { displayOnly: true } : {}) },
    automation: rules ? 'structured-rule' : (activation && !displayOnlyGuard ? 'named-activation' : (displayOnlyGuard && activation.length === 0 ? 'engine-suppressed' : 'display-only')),
  };
}

const titleWords = text => String(text).replace(/-/g, ' ').replace(/\b([a-z])/g, c => c.toUpperCase());

/**
 * Natural attacks go through the existing species natural-weapon path (ledger -> species-natural-weapon item), so only
 * the properties that path carries are accepted: a name, a dice damage, a printed damage type, always armed. A profile
 * carrying anything else (unprinted damage type, no-AoO / counts-as properties, ...) is held, never approximated.
 */
function compileNaturalWeapons(snap, speciesSlug) {
  const profiles = (snap.naturalAttackProfiles ?? []).length ? snap.naturalAttackProfiles : (snap.naturalWeapons ?? []);
  const out = [];
  for (const p of profiles) {
    const first = p.attackProfiles?.[0];
    const featureName = (snap.features ?? []).find(f => f.featureId === p.featureId && /\(([^)]+)\)/.test(f.name))?.name.match(/\(([^),]+)\)/)?.[1];
    // profileId such as "sv-barabel-claws" / "gaw-3i-07-retractable-claws": drop the publication code, number and species tokens.
    const speciesTokens = new Set(String(speciesSlug).split('-'));
    const idName = typeof p.profileId === 'string'
      ? p.profileId.split('-').filter((t, i, all) => !(all.slice(0, i).every(x => /^(sv|gaw|tfu|tog|kotor|ur|goi|cw|leg|jatm|core)$|^\d+[a-z]?$/.test(x) || speciesTokens.has(x)) && (/^(sv|gaw|tfu|tog|kotor|ur|goi|cw|leg|jatm|core)$|^\d+[a-z]?$/.test(t) || speciesTokens.has(t)))).join('-') || null
      : null;
    const name = p.weaponName ?? p.attackName ?? p.name ?? featureName ?? idName;
    const damage = typeof p.damage === 'string' ? p.damage : first?.damage?.formula;
    const type = p.type ?? p.damageType ?? first?.damage?.type;
    if (!name || !/^\d+d\d+$/.test(String(damage ?? ''))) throw new HoldProfile(`natural attack without printed dice damage (${name ?? 'unnamed'})`);
    if (!type) throw new HoldProfile(`natural attack "${name}": damage type not printed`);
    const extras = ['doesNotProvokeAOO', 'countsAs', 'threatensAdjacentSquares', 'damageBonusAbility'].filter(k => p[k] !== undefined);
    if (extras.length) throw new HoldProfile(`natural attack "${name}" carries ${extras.join(', ')} which the weapon item cannot represent`);
    if (p.alwaysArmed === false || first?.alwaysArmed === false) throw new HoldProfile(`natural attack "${name}" is not always armed`);
    out.push({
      id: p.profileId ?? p.id ?? slug(name), name: titleWords(name), damage, type: String(type).toLowerCase(),
      alwaysArmed: true, category: 'melee', attackAbility: 'str',
      sourceFeatureId: p.featureId ?? p.sourceFeatureId ?? null, sourcePrintedPage: p.sourcePrintedPage ?? null,
    });
  }
  return out;
}

/**
 * Printed mutually exclusive modifier sets within ONE publication (e.g. Devaronian male/female, Arkanian
 * Offshoot Strength or Dexterity) become the existing `abilityChoice` (type "choice"): the modifiers every option
 * shares are fixed, each option carries its own remaining modifiers, and the player chooses exactly one.
 */
function compileAbilityChoice(snap) {
  const variants = snap.abilityModifierVariants ?? [];
  if (!variants.length) return null;
  if (variants.length < 2 || variants.some(v => !v.selector || ABILITIES.some(k => !Number.isFinite(v.abilityModifiers?.[k])))) throw new HoldProfile('ability choice options incomplete');
  if (Object.values(snap.abilityModifiers ?? {}).some(v => v)) throw new HoldProfile('ability choice combined with a separate fixed modifier set');
  const common = Object.fromEntries(ABILITIES.map(k => [k, variants.every(v => v.abilityModifiers[k] === variants[0].abilityModifiers[k]) ? variants[0].abilityModifiers[k] : null]));
  const differing = ABILITIES.filter(k => common[k] === null);
  const commonFull = Object.fromEntries(ABILITIES.map(k => [k, common[k] ?? 0]));
  return {
    common: commonFull,
    abilityChoice: {
      type: 'choice',
      label: 'Ability modifiers',
      fixed: Object.fromEntries(ABILITIES.map(k => [k.toLowerCase(), commonFull[k]])),
      chooseOne: variants.map(v => ({
        id: slug(v.selector),
        label: titleWords(v.selector.replace(/^(\w)/, c => c.toUpperCase())),
        ...Object.fromEntries(differing.map(k => [k.toLowerCase(), v.abilityModifiers[k]])),
      })),
    },
  };
}

const SUPPRESSION = new Set(['STARTING_PROFICIENCY_SUPPRESSION', 'STARTING_CLASS_FEAT_OVERRIDE', 'LEVEL_ONE_STARTING_PROFICIENCY_SUPPRESSION', 'FIRST_LEVEL_WEAPON_PROFICIENCY_SUPPRESSION', 'STARTING_PROFICIENCY_RESTRICTION']);
const suppressionFeats = m => (m.suppressedStartingClassFeats || m.suppressStartingClassBonusFeats || m.denyClassStartingFeats
  || (Array.isArray(m.suppressStartingClassWeaponProficiencies) ? m.suppressStartingClassWeaponProficiencies.map(g => `Weapon Proficiency (${g})`) : null) || []);
const titleCase = text => String(text).replace(/\b([a-z])/g, c => c.toUpperCase());

/** @returns {{variant: object, expectation: object, automation: Array<{feature:string, automation:string}>}} */
export function hydrateProfile(profile, record, { provenance = [] } = {}) {
  if (profile.disposition === 'DEFERRED_DROID_INTEGRATION') throw new HoldProfile('droid integration deferred');
  const snap = profile.sourceRuleSnapshot;
  if (snap.abilityScoreGeneration) throw new HoldProfile('ability score generation support (fixed array)');
  const choice = compileAbilityChoice(snap);
  if (snap.sizeVariation) throw new HoldProfile('size variation support');
  const naturalWeapons = compileNaturalWeapons(snap, slug(profile.speciesDisplayName));
  if (!snap.features) throw new HoldProfile('no audited features');
  if (!Array.isArray(snap.automaticLanguages) || !snap.automaticLanguages.length) throw new HoldProfile('automatic languages not recorded in the audit');
  const m = snap.movementSquares;
  if (!Number.isFinite(m?.land)) throw new HoldProfile(`land speed not printed/resolved (${JSON.stringify(m)})`);
  const baseMods = choice ? choice.common : snap.abilityModifiers;
  if (ABILITIES.some(k => !Number.isFinite(baseMods?.[k]))) throw new HoldProfile('ability modifiers not all printed');
  const newId = `${slug(profile.speciesDisplayName)}-${profile.sourceProfileId.toLowerCase()}`;
  const legacy = (record?.system?.variants ?? []).filter(v => v.completeSnapshot !== true);
  const unexplained = legacy.filter(v => !provenance.some(p => p.variantId === v.id && p.supersededBy === newId));
  if (unexplained.length) throw new HoldProfile(`legacy variant(s) ${unexplained.map(v => v.id).join(', ')} pending provenance reconciliation`);

  const abilityMods = Object.fromEntries(ABILITIES.map(k => [k.toLowerCase(), baseMods[k]]));
  const abilityText = ABILITIES.filter(k => baseMods[k]).sort((a, b) => baseMods[b] - baseMods[a])
    .map(k => `${baseMods[k] > 0 ? '+' : ''}${baseMods[k]} ${k[0] + k.slice(1).toLowerCase()}`).join(', ');
  const movement = { walk: m.land, swim: m.swim ?? null, fly: m.fly ?? null, climb: null, hover: null, glide: null, burrow: null, bySize: {} };

  const compiled = snap.features.map(compileFeature);
  for (const c of compiled) if (SUPPRESSION.has(snap.features.find(f => f.featureId === c.trait.sourceFeatureId)?.classification)) c.automation = 'structured-field';
  const ids = compiled.map(c => c.trait.id);
  if (new Set(ids).size !== ids.length) throw new HoldProfile(`duplicate trait ids (${ids.join(', ')})`);
  const traits = compiled.map(c => c.trait);

  const suppressionFeature = snap.features.find(f => SUPPRESSION.has(f.classification));
  const suppressed = suppressionFeature
    ? suppressionFeats(suppressionFeature.mechanics ?? {}).map(titleCase)
    : [];
  if (suppressionFeature && !suppressed.length) throw new HoldProfile('proficiency suppression without a feat list');

  const shortPublication = String(profile.publication).replace(/^Star Wars Roleplaying Game: Saga Edition\s+/i, '').replace(/\s*\(\d{4}\)\s*$/, '');
  const variant = {
    id: `${slug(profile.speciesDisplayName)}-${profile.sourceProfileId.toLowerCase()}`,
    label: profile.publication,
    source: shortPublication,
    completeSnapshot: true,
    sourceProfileId: profile.sourceProfileId,
    size: snap.size,
    speed: m.land,
    movement,
    abilities: abilityText,
    abilityMods,
    abilityChoice: choice ? choice.abilityChoice : null,
    skillBonuses: [],
    special: traits.map(t => t.name),
    languages: snap.automaticLanguages.map(l => l.name),
    naturalWeapons,
    ...(suppressed.length ? { primitive: true, suppressedClassProficiencies: suppressed } : {}),
    description: `${profile.speciesDisplayName} as printed in ${profile.publication}. Complete publication snapshot; no traits are inherited from other publications.`,
    traits,
    runtimeStatus: 'NOT_RUNTIME_CERTIFIED',
  };

  // Derived expectations (no rules text) for the committed regression fixture.
  const rulesOf = type => compiled.flatMap(c => (c.trait.rules ?? []).filter(r => r.type === type));
  const expectation = {
    species: profile.speciesDisplayName,
    sourceProfileId: profile.sourceProfileId,
    abilityMods, size: snap.size, speed: m.land, languages: variant.languages,
    traitIds: ids,
    defense: Object.fromEntries(rulesOf('defenseModifier').map(r => [r.defense, { value: r.value, bonusType: r.bonusType }])),
    rerolls: rulesOf('reroll').map(r => ({ skillId: r.triggeredBy.skillId, outcome: r.outcome })),
    featGrants: rulesOf('featGrant').map(r => (r.choice ? { choice: true } : { feat: r.featName, requiresTrained: r.requirements.map(q => q.skill) })),
    naturalWeapons: naturalWeapons.map(w => ({ name: w.name, damage: w.damage, type: w.type })),
    classSkills: rulesOf('classSkillGrant').flatMap(r => r.skills),
    trainedSkillChoices: rulesOf('trainedSkillChoice').length,
    suppressedProficiencies: suppressed,
    namedActivations: compiled.filter(c => c.automation === 'named-activation').map(c => c.trait.id),
    automation: Object.fromEntries(compiled.map(c => [c.trait.id, c.automation])),
  };
  return { variant, expectation, automation: compiled.map(c => ({ feature: c.trait.name, automation: c.automation, classification: snap.features.find(f => f.featureId === c.trait.sourceFeatureId)?.classification })) };
}
