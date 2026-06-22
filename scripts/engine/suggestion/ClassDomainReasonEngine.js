import { ReasonFactory } from "/systems/foundryvtt-swse/scripts/engine/suggestion/ReasonFactory.js";
import { CLASS_SYNERGY_DATA } from "/systems/foundryvtt-swse/scripts/engine/suggestion/shared-suggestion-utilities.js";
import { UNIFIED_TIERS } from "/systems/foundryvtt-swse/scripts/engine/suggestion/suggestion-unified-tiers.js";

const CORE_CLASS_NAMES = ['Jedi', 'Noble', 'Scoundrel', 'Scout', 'Soldier'];

const CLASS_ROUTE_AFFINITY = {
  Jedi: ['Jedi Knight', 'Jedi Master', 'Imperial Knight'],
  Noble: ['Officer', 'Crime Lord', 'Corporate Agent', 'Charlatan', 'Medic', 'Droid Commander'],
  Scoundrel: ['Gunslinger', 'Outlaw', 'Crime Lord', 'Infiltrator', 'Master Privateer', 'Assassin', 'Charlatan'],
  Scout: ['Bounty Hunter', 'Ace Pilot', 'Pathfinder', 'Infiltrator', 'Vanguard', 'Saboteur'],
  Soldier: ['Elite Trooper', 'Officer', 'Vanguard', 'Gladiator', 'Melee Duelist', 'Military Engineer', 'Bounty Hunter'],
};

const CLASS_ROUTE_FAMILIES = {
  Jedi: 'jedi_order',
  'Jedi Knight': 'jedi_order',
  'Jedi Master': 'jedi_order',
  'Imperial Knight': 'jedi_order',
  'Force Disciple': 'force_tradition',
  'Force Adept': 'force_tradition',
  'Sith Apprentice': 'force_tradition',
  'Sith Lord': 'force_tradition',
  Noble: 'leadership',
  Officer: 'leadership',
  'Crime Lord': 'leadership',
  'Corporate Agent': 'leadership',
  Charlatan: 'leadership',
  Medic: 'support',
  'Droid Commander': 'leadership',
  Scoundrel: 'rogue',
  Gunslinger: 'ranged',
  Outlaw: 'rogue',
  Infiltrator: 'rogue',
  'Master Privateer': 'rogue',
  Assassin: 'rogue',
  Scout: 'fieldcraft',
  'Bounty Hunter': 'fieldcraft',
  'Ace Pilot': 'vehicle',
  Pathfinder: 'fieldcraft',
  Vanguard: 'martial',
  Saboteur: 'technical',
  Soldier: 'martial',
  'Elite Trooper': 'martial',
  Gladiator: 'martial',
  'Melee Duelist': 'martial',
  'Military Engineer': 'technical',
};

const FAMILY_LABELS = {
  jedi_order: 'Jedi Order progression',
  force_tradition: 'Force tradition',
  leadership: 'leadership and influence',
  support: 'support and recovery',
  rogue: 'roguish problem-solving',
  ranged: 'ranged pressure',
  fieldcraft: 'survival and mobility',
  vehicle: 'vehicle mastery',
  martial: 'martial combat',
  technical: 'technical problem-solving',
  general: 'general capability',
};

function emptyPacket(context = null) {
  return { primary: [], secondary: [], forecast: [], opportunity: [], caution: [], classDomainContext: context };
}

function normalizeKey(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[\u2018\u2019\u201B\u2032'`]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function titleCase(value) {
  return String(value || '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, ch => ch.toUpperCase());
}

function asArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (value instanceof Set) return Array.from(value);
  if (value instanceof Map) return Array.from(value.values());
  return [value];
}

function unique(values = []) {
  const seen = new Set();
  const out = [];
  for (const value of values) {
    const text = String(value || '').trim();
    const key = normalizeKey(text);
    if (!text || seen.has(key)) continue;
    seen.add(key);
    out.push(text);
  }
  return out;
}

function displayList(values = [], limit = 3) {
  const cleaned = unique(values).slice(0, limit);
  if (!cleaned.length) return '';
  if (cleaned.length === 1) return cleaned[0];
  if (cleaned.length === 2) return `${cleaned[0]} and ${cleaned[1]}`;
  return `${cleaned.slice(0, -1).join(', ')}, and ${cleaned[cleaned.length - 1]}`;
}

function candidateName(suggestion) {
  return suggestion?.name || suggestion?.label || suggestion?.item?.name || suggestion?.className || suggestion?.suggestion?.className || 'This class';
}

function suggestionBlock(suggestion) {
  return suggestion?.suggestion || {};
}

function classBlock(suggestion) {
  return suggestion?.classDomain || suggestion?.classDomainContext || suggestionBlock(suggestion)?.classDomain || suggestionBlock(suggestion)?.classDomainContext || {};
}

function actorItems(actor) {
  return Array.from(actor?.items?.contents || actor?.items || []);
}

function actorClassEntries(actor) {
  return actorItems(actor)
    .filter(item => item?.type === 'class')
    .map(item => ({ name: item?.name, level: Number(item?.system?.level ?? item?.system?.levels ?? 1) || 1 }))
    .filter(entry => entry.name);
}

function primaryBaseClassFromEntries(entries = []) {
  return [...entries]
    .filter(entry => CORE_CLASS_NAMES.some(name => normalizeKey(name) === normalizeKey(entry.name)))
    .sort((a, b) => b.level - a.level)[0]?.name || null;
}

function isClassSuggestion(suggestion) {
  const domain = String(suggestion?.type || suggestion?.domain || suggestion?.item?.type || suggestionBlock(suggestion)?.domain || '').toLowerCase();
  return domain === 'class' || suggestion?.item?.type === 'class' || classBlock(suggestion)?.className || suggestion?.className;
}

function isPrestigeClass(suggestion) {
  const block = classBlock(suggestion);
  const item = suggestion?.item || suggestion || {};
  return block.isPrestige === true
    || item.isPrestige === true
    || item.prestigeClass === true
    || item.baseClass === false
    || item.system?.isPrestige === true
    || item.system?.prestigeClass === true
    || suggestionBlock(suggestion).isPrestige === true;
}

function reasonText(suggestion) {
  return String(suggestionBlock(suggestion).reason || suggestionBlock(suggestion).reasonText || suggestion?.reasonText || suggestion?.reason || '').trim();
}

function suggestionTier(suggestion) {
  const value = Number(suggestionBlock(suggestion).tier ?? suggestion?.tier ?? 0);
  return Number.isFinite(value) ? value : 0;
}

function routeFamilyForName(name, suggestion = null) {
  const exact = Object.entries(CLASS_ROUTE_FAMILIES).find(([className]) => normalizeKey(className) === normalizeKey(name));
  if (exact) return exact[1];

  const synergy = CLASS_SYNERGY_DATA[name] || CLASS_SYNERGY_DATA[candidateName(suggestion)] || {};
  const theme = normalizeKey(synergy.theme || suggestion?.theme || suggestion?.system?.theme || suggestionBlock(suggestion).theme || '');
  const tags = asArray(synergy.tags || suggestion?.tags || suggestion?.system?.tags || suggestionBlock(suggestion).tags).map(normalizeKey);
  const haystack = `${theme} ${tags.join(' ')}`;
  if (/jedi|lightsaber/.test(haystack)) return 'jedi_order';
  if (/force|use the force/.test(haystack)) return 'force_tradition';
  if (/leader|noble|officer|social|support/.test(haystack)) return 'leadership';
  if (/soldier|martial|combat|melee|armor/.test(haystack)) return 'martial';
  if (/scout|survival|mobility|exploration|tracking/.test(haystack)) return 'fieldcraft';
  if (/pilot|vehicle|starship/.test(haystack)) return 'vehicle';
  if (/tech|mechanic|computer|slicer/.test(haystack)) return 'technical';
  if (/stealth|scoundrel|infiltrat|crime|rogue/.test(haystack)) return 'rogue';
  return 'general';
}

function classSkillsFor(suggestion) {
  const block = classBlock(suggestion);
  const name = candidateName(suggestion);
  const synergy = CLASS_SYNERGY_DATA[name] || {};
  const raw = block.classSkills
    || suggestion?.classSkills
    || suggestion?.system?.classSkills
    || suggestionBlock(suggestion).classSkills
    || synergy.skills
    || [];
  if (Array.isArray(raw)) return raw.map(titleCase).filter(Boolean);
  return Object.keys(raw || {}).map(titleCase).filter(Boolean);
}

function prereqLabel(entry) {
  if (!entry) return '';
  if (typeof entry === 'string') return entry;
  return entry.shortDisplay || entry.display || entry.name || entry.label || entry.description || entry.type || '';
}

function prereqLabels(value) {
  return asArray(value).map(prereqLabel).filter(Boolean);
}

function classRouteMatches(baseClass, className) {
  if (!baseClass || !className) return false;
  return (CLASS_ROUTE_AFFINITY[baseClass] || []).some(route => normalizeKey(route) === normalizeKey(className));
}

function supportsPrestigeTarget(name, prestigeClassTarget, suggestion) {
  if (!prestigeClassTarget) return false;
  const text = `${reasonText(suggestion)} ${asArray(suggestionBlock(suggestion).reasons).map(prereqLabel).join(' ')}`.toLowerCase();
  if (text.includes(String(prestigeClassTarget).toLowerCase())) return true;
  const targetFamily = routeFamilyForName(prestigeClassTarget, suggestion);
  const candidateFamily = routeFamilyForName(name, suggestion);
  return targetFamily !== 'general' && targetFamily === candidateFamily;
}

function buildContext(suggestion, actor, options = {}) {
  const block = classBlock(suggestion);
  const routeProfile = block.routeProfile || suggestionBlock(suggestion)?.routeProfile || {};
  const name = block.className || routeProfile.className || candidateName(suggestion);
  const actorClasses = asArray(block.currentClasses).length ? asArray(block.currentClasses) : actorClassEntries(actor);
  const normalizedEntries = actorClasses.map(entry => typeof entry === 'string' ? { name: entry, level: 1 } : entry).filter(entry => entry?.name);
  const baseClass = block.baseClass || block.startingClass || options?.classRouteContext?.baseClass || primaryBaseClassFromEntries(normalizedEntries);
  const startingClass = block.startingClass || options?.pendingData?.startingClass || baseClass || null;
  const isPrestige = block.isPrestige ?? isPrestigeClass(suggestion);
  const missingPrereqs = prereqLabels(block.missingPrereqs || suggestionBlock(suggestion).missingPrereqs || suggestion?.missingPrereqs || []);
  const metPrereqs = prereqLabels(block.metPrereqs || suggestionBlock(suggestion).metPrereqs || suggestion?.metPrereqs || []);
  const prestigeClassTarget = block.prestigeClassTarget || options?.pendingData?.prestigeClassTarget || actor?.system?.swse?.mentorBuildIntentBiases?.prestigeClassTarget || null;
  const routeFamily = block.routeFamily || routeProfile.routeFamily || routeFamilyForName(name, suggestion);
  const baseRouteFamily = block.baseRouteFamily || routeFamilyForName(baseClass || startingClass || '', suggestion);
  const targetRouteFamily = block.targetRouteFamily || routeProfile.targetRouteFamily || (prestigeClassTarget ? routeFamilyForName(prestigeClassTarget, suggestion) : null);
  const tier = suggestionTier(suggestion);
  const suggestionReason = reasonText(suggestion);
  const alreadyHasClass = normalizedEntries.some(entry => normalizeKey(entry.name) === normalizeKey(name));
  const routeMatchesBase = block.routeMatchesBase ?? routeProfile.routeMatchesBase ?? classRouteMatches(baseClass, name);
  const routeMatchesStartingClass = block.routeMatchesStartingClass ?? routeProfile.routeMatchesStartingClass ?? false;
  const targetMatches = block.targetMatches ?? routeProfile.targetMatches ?? (prestigeClassTarget && normalizeKey(prestigeClassTarget) === normalizeKey(name));
  const hasMissingPrereqs = missingPrereqs.length > 0 || suggestionBlock(suggestion).hasMissingPrereqs === true;
  const metPrereqGate = block.metPrereqs === true || (!hasMissingPrereqs && isPrestige) || tier >= UNIFIED_TIERS.PRESTIGE_QUALIFIED_NOW;
  const classSkills = classSkillsFor(suggestion);
  const supportsTarget = supportsPrestigeTarget(name, prestigeClassTarget, suggestion);

  return {
    className: name,
    isPrestige,
    actorClasses: normalizedEntries,
    startingClass,
    baseClass,
    prestigeClassTarget,
    missingPrereqs,
    metPrereqs,
    metPrereqGate,
    classSuggestionTier: tier,
    classSuggestionReason: suggestionReason,
    routeFamily,
    baseRouteFamily,
    targetRouteFamily,
    routeFamilyLabel: FAMILY_LABELS[routeFamily] || FAMILY_LABELS.general,
    baseRouteFamilyLabel: FAMILY_LABELS[baseRouteFamily] || FAMILY_LABELS.general,
    targetRouteFamilyLabel: FAMILY_LABELS[targetRouteFamily] || null,
    routeMatchesBase,
    routeMatchesStartingClass,
    targetMatches,
    supportsTarget,
    alreadyHasClass,
    classSkills,
    readiness: block.readiness || routeProfile.readiness || null,
    routeFit: block.routeFit || routeProfile.routeFit || null,
    routeFitScore: block.routeFitScore ?? routeProfile.routeFitScore ?? null,
    urgency: block.urgency || routeProfile.urgency || null,
    investmentShape: block.investmentShape || routeProfile.investmentShape || null,
    diffuseBuild: block.diffuseBuild || routeProfile.diffuseBuild || false,
    startingClassAnchor: block.startingClassAnchor || routeProfile.startingClassAnchor || null,
    dominantIdentity: block.dominantIdentity || routeProfile.dominantIdentity || [],
    investmentProfiles: block.investmentProfiles || routeProfile.investmentProfiles || [],
    supportingSignals: block.supportingSignals || routeProfile.supportingSignals || [],
    cautionSignals: block.cautionSignals || routeProfile.cautionSignals || [],
  };
}

function addReason(packet, bucket, code, text, strength = 0.84, domain = 'class', atoms = []) {
  const clean = String(text || '').trim();
  if (!clean) return;
  packet[bucket].push(ReasonFactory.create({ domain, code, text: clean, strength, safe: true, atoms }));
}

function addAlignmentReasons(packet, ctx) {
  const { className: name, routeFamily, baseRouteFamily, routeFamilyLabel } = ctx;
  if (routeFamily === 'force_tradition') {
    addReason(packet, 'primary', 'FORCE_PATH_ALIGNMENT', `${name} advances a Force-centered route through ${routeFamilyLabel}.`, 0.86, 'force', ['force_path']);
  }
  if (routeFamily === 'jedi_order') {
    addReason(packet, 'primary', 'JEDI_ORDER_ALIGNMENT', `${name} stays inside the Jedi Order's authority structure instead of treating the Force path as generic mysticism.`, 0.9, 'class', ['jedi_order']);
  }
  if (routeFamily === 'martial' || baseRouteFamily === 'martial') {
    addReason(packet, 'primary', 'MARTIAL_PATH_ALIGNMENT', `${name} supports a martial route where armor, weapons, and front-line pressure matter.`, 0.82, 'combat', ['martial_path']);
  }
  if (routeFamily === 'leadership' || baseRouteFamily === 'leadership') {
    addReason(packet, 'primary', 'LEADERSHIP_PATH_ALIGNMENT', `${name} supports command, influence, and team-facing decisions rather than only personal combat output.`, 0.82, 'social', ['leadership_path']);
  }
}

function addPrerequisiteReasons(packet, ctx) {
  const { className: name, isPrestige, missingPrereqs, metPrereqs, metPrereqGate } = ctx;
  if (!isPrestige) return;

  if (metPrereqGate) {
    const prestigeBucket = ctx.urgency === 'enterNow' ? 'primary' : 'secondary';
    const prestigeText = ctx.urgency === 'enterNow'
      ? `${name} is legally ready now and its prestige identity matches the route you have been building.`
      : `${name} is legally ready now, but legality is separate from whether this prestige identity fits the current route.`;
    addReason(packet, prestigeBucket, 'PRESTIGE_NOW', prestigeText, ctx.urgency === 'enterNow' ? 0.96 : 0.74, 'class', ['prestige_now']);
  }

  if (metPrereqs.length) {
    addReason(packet, 'secondary', 'CLASS_PREREQS_MET', `The gates already satisfied include ${displayList(metPrereqs, 3)}.`, 0.76, 'prerequisite', ['prereq_met']);
  }

  if (missingPrereqs.length) {
    addReason(packet, 'caution', 'CLASS_PREREQS_MISSING', `${name} still has prerequisite gates remaining: ${displayList(missingPrereqs, 3)}.`, 0.86, 'prerequisite', ['prereq_missing']);
  }
}

function addRouteReasons(packet, ctx) {
  const {
    className: name,
    isPrestige,
    baseClass,
    routeMatchesBase,
    targetMatches,
    supportsTarget,
    prestigeClassTarget,
    alreadyHasClass,
    routeFamilyLabel,
    baseRouteFamilyLabel,
    targetRouteFamilyLabel,
  } = ctx;

  if (isPrestige && (routeMatchesBase || targetMatches || supportsTarget)) {
    const source = targetMatches && prestigeClassTarget
      ? `your stated ${prestigeClassTarget} goal`
      : baseClass
        ? `your ${baseClass} foundation`
        : 'your current build';
    addReason(packet, 'primary', 'PRESTIGE_ROUTE_CONTINUATION', `${name} is route continuation from ${source}, not a random advanced-class detour.`, 0.94, 'class', ['route_continuation']);
  } else if (isPrestige && baseClass) {
    addReason(packet, 'secondary', 'PRESTIGE_ROUTE_SHIFT', `${name} is an advanced class, but it shifts the route from ${baseClass} toward ${routeFamilyLabel}.`, 0.78, 'class', ['route_shift']);
  }

  if (!isPrestige && alreadyHasClass) {
    addReason(packet, 'primary', 'CLASS_CONTINUATION', `${name} continues the class chassis you already rely on instead of opening a new side lane.`, 0.84, 'class', ['class_continuation']);
  }

  if (!isPrestige && baseClass && normalizeKey(baseClass) !== normalizeKey(name)) {
    if (supportsTarget && prestigeClassTarget) {
      addReason(packet, 'forecast', 'BASE_CLASS_PRESTIGE_BRIDGE', `${name} can still serve the ${prestigeClassTarget} plan by keeping you near the ${targetRouteFamilyLabel || routeFamilyLabel} route.`, 0.82, 'class', ['prestige_bridge']);
    } else if (ctx.routeFamily === ctx.baseRouteFamily || ctx.routeFamily === 'general') {
      addReason(packet, 'secondary', 'BASE_CLASS_LATERAL_SHIFT', `${name} is a lateral shift from ${baseClass}; it changes tools inside a similar ${baseRouteFamilyLabel} lane.`, 0.76, 'class', ['lateral_shift']);
    } else {
      addReason(packet, 'caution', 'BASE_CLASS_DETOUR', `${name} is a deliberate detour from ${baseClass}; take it for ${routeFamilyLabel}, not because it is the straightest route forward.`, 0.78, 'class', ['class_detour']);
    }
  }
}


function addRouteProfileReasons(packet, ctx) {
  const name = ctx.className;

  if (ctx.startingClassAnchor?.className) {
    addReason(
      packet,
      ctx.startingClassAnchor.hasClearPivot ? 'secondary' : 'primary',
      'STARTING_CLASS_ANCHOR',
      ctx.startingClassAnchor.signal || `Level 1 ${ctx.startingClassAnchor.className} sets the original chassis for skills, HP, and early feats.`,
      ctx.startingClassAnchor.hasClearPivot ? 0.72 : 0.88,
      'class',
      ['starting_class_anchor']
    );
  }

  if (ctx.urgency === 'enterNow') {
    addReason(packet, 'primary', 'PRESTIGE_ENTER_NOW', `${name} is not just legal; it is an early prestige entry that fits the demonstrated route.`, 0.96, 'class', ['prestige_now', 'route_fit']);
  } else if (ctx.urgency === 'forecast') {
    addReason(packet, 'forecast', 'PRESTIGE_ROUTE_FORECAST', `${name} should stay on deck; it fits the route, but a remaining gate still matters.`, 0.86, 'class', ['prestige_forecast']);
  } else if (ctx.urgency === 'mutedPrestige' || ctx.urgency === 'mutedForecast') {
    addReason(packet, 'caution', 'PRESTIGE_ROUTE_MUTED', `${name} may be mechanically reachable, but the current build intent does not strongly support that prestige lane.`, 0.86, 'class', ['prestige_muted']);
  }

  if (ctx.diffuseBuild) {
    addReason(packet, 'caution', 'CLASS_ROUTE_DIFFUSE', `Your class history is broad; ${name} should be weighed against the route you want to consolidate next.`, 0.82, 'class', ['diffuse_build']);
  }

  for (const signal of ctx.supportingSignals.slice(0, 3)) {
    addReason(packet, 'secondary', 'CLASS_ROUTE_SIGNAL', signal, 0.74, 'class', ['route_signal']);
  }

  for (const caution of ctx.cautionSignals.slice(0, 3)) {
    addReason(packet, 'caution', 'CLASS_ROUTE_CAUTION', caution, 0.78, 'class', ['route_caution']);
  }
}

function addSkillReason(packet, ctx) {
  if (!ctx.classSkills.length) return;
  addReason(packet, 'secondary', 'CLASS_SKILL_VALUE', `${ctx.className} gives access to useful class-skill lanes such as ${displayList(ctx.classSkills, 3)}.`, 0.78, 'skills', ['class_skill_value']);
}

export class ClassDomainReasonEngine {
  static buildPacket(suggestion, actor, options = {}) {
    if (!isClassSuggestion(suggestion)) return emptyPacket();
    const ctx = buildContext(suggestion, actor, options);
    const packet = emptyPacket(ctx);

    addPrerequisiteReasons(packet, ctx);
    addRouteReasons(packet, ctx);
    addRouteProfileReasons(packet, ctx);
    addAlignmentReasons(packet, ctx);
    addSkillReason(packet, ctx);

    if (!packet.primary.length && !packet.secondary.length && !packet.forecast.length && !packet.caution.length) {
      addReason(packet, 'secondary', 'CLASS_DOMAIN_CONTEXT', `${ctx.className} sits in the ${ctx.routeFamilyLabel} lane for this build.`, 0.66, 'class');
    }

    return packet;
  }
}

export default ClassDomainReasonEngine;
