import { ReasonFactory } from "/systems/foundryvtt-swse/scripts/engine/suggestion/ReasonFactory.js";
import { ClassDomainReasonEngine } from "/systems/foundryvtt-swse/scripts/engine/suggestion/ClassDomainReasonEngine.js";
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

async function loadJson(url) {
  if (url.protocol === 'file:') {
    const fs = await import('node:fs/promises');
    const { fileURLToPath } = await import('node:url');
    const raw = await fs.readFile(fileURLToPath(url), 'utf-8');
    return JSON.parse(raw);
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load JSON: ${url}`);
  return res.json();
}

const sentenceTemplatesUrl = new URL('../../../data/dialogue/reason-sentences.json', import.meta.url);
const reasonTextUrl = new URL('../../../data/dialogue/reasons.json', import.meta.url);
const SENTENCE_TEMPLATES = await loadJson(sentenceTemplatesUrl);
const REASON_TEXT_MAP = await loadJson(reasonTextUrl);

function uniq(arr) { return Array.from(new Set((arr || []).filter(Boolean))); }
function normalizeTag(tag) { return String(tag || '').trim().toLowerCase(); }
function candidateTags(suggestion) {
  const raw = suggestion?.context?.allTags || suggestion?.tags || suggestion?.system?.tags || suggestion?.item?.system?.tags || [];
  return uniq(raw.map(normalizeTag));
}
function candidateName(suggestion) { return suggestion?.name || suggestion?.label || suggestion?.item?.name || 'This option'; }
function getAbilityScore(actor, key) {
  const candidates = [
    actor?.system?.attributes?.[key]?.total,
    actor?.system?.attributes?.[key]?.value,
    actor?.system?.abilities?.[key]?.value,
    actor?.system?.abilities?.[key]?.base,
  ];
  for (const candidate of candidates) {
    const score = Number(candidate);
    if (Number.isFinite(score) && score > 0) return score;
  }
  return 10;
}
function getAbilityMod(actor, key) { return Math.floor((getAbilityScore(actor, key) - 10) / 2); }
function templateText(key) { return SENTENCE_TEMPLATES?.[key] || REASON_TEXT_MAP?.[key] || null; }
function addReason(bucket, key, strength = 0.8, domain = 'build', meta = {}) {
  const text = meta.text || templateText(key);
  if (!text) return;
  bucket.push(ReasonFactory.create({ domain, code: meta.code || String(key).toUpperCase(), text, strength, safe: true, atoms: meta.atoms || [] }));
}
function pickTop(reasons, limit = 3) { return ReasonFactory.limitByStrength(ReasonFactory.deduplicate(reasons), limit); }
function detectDomain(suggestion) { return suggestion?.type || suggestion?.domain || suggestion?.item?.type || suggestion?.suggestion?.domain || 'option'; }
function actionTags(tags) { return tags.filter(t => ['free_action','swift_action','move_action','standard_action','full_round_action','reaction','new_action','action_economy'].includes(t)); }


const GENERIC_REASON_FRAGMENTS = [
  'you meet the requirements',
  'you meet this requirement',
  'this adds to your selections',
  'adds to your selections',
  'this relates to your pattern',
  'this relates to your patterns',
  'this relates to your progression',
  'this reflects the path taking shape',
  'it reflects the path taking shape',
  'legal option',
  'available',
  'high-fit option for your build',
  'good-fit option for your build'
];

function isGenericReasonText(value) {
  const text = String(value || '').trim().toLowerCase();
  if (!text) return true;
  return GENERIC_REASON_FRAGMENTS.some(fragment => text === fragment || text.includes(fragment));
}

function normalizeNameKey(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[’'`]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function titleCaseTag(value) {
  return String(value || '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, ch => ch.toUpperCase());
}

function uniqueByName(items = []) {
  const seen = new Set();
  const out = [];
  for (const item of items || []) {
    const name = typeof item === 'string' ? item : item?.name;
    const key = normalizeNameKey(name);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(name);
  }
  return out;
}

function actorItemsByType(actor, type) {
  return Array.from(actor?.items?.contents || actor?.items || []).filter(item => item?.type === type);
}

function actorItemNames(actor, type = null) {
  const items = type ? actorItemsByType(actor, type) : Array.from(actor?.items?.contents || actor?.items || []);
  return uniqueByName(items.map(item => item?.name).filter(Boolean));
}

function candidatePrereqText(suggestion) {
  const item = suggestion?.item || suggestion;
  const system = item?.system || {};
  return String(
    item?.prerequisiteText || item?.prerequisiteLine || item?.prerequisites || item?.prerequisite ||
    system.prerequisiteText || system.prerequisiteLine || system.prerequisites || system.prerequisite || system.requirements || ''
  ).trim();
}

function suggestionReasonCode(suggestion) {
  return String(suggestion?.suggestion?.reasonCode || suggestion?.suggestion?.reason?.tierAssignedBy || '').toUpperCase();
}

function suggestionSourceId(suggestion) {
  return String(suggestion?.suggestion?.sourceId || suggestion?.sourceId || '').trim();
}

function candidateTreeName(suggestion) {
  const item = suggestion?.item || suggestion;
  const system = item?.system || {};
  return String(item?.sourceTreeName || item?.talentTree || item?.treeName || system.tree || system.talent_tree || system.talentTree || system.treeName || '').trim();
}

function displayList(values, limit = 3) {
  const cleaned = uniqueByName(values).slice(0, limit);
  if (!cleaned.length) return '';
  if (cleaned.length === 1) return cleaned[0];
  if (cleaned.length === 2) return `${cleaned[0]} and ${cleaned[1]}`;
  return `${cleaned.slice(0, -1).join(', ')}, and ${cleaned[cleaned.length - 1]}`;
}

const CORE_CLASS_NAMES = ['Jedi', 'Noble', 'Scoundrel', 'Scout', 'Soldier'];
const CLASS_ROUTE_AFFINITY = {
  Jedi: ['Jedi Knight', 'Jedi Master', 'Force Disciple', 'Force Adept', 'Imperial Knight', 'Sith Apprentice'],
  Noble: ['Officer', 'Crime Lord', 'Corporate Agent', 'Charlatan', 'Medic', 'Droid Commander'],
  Scoundrel: ['Gunslinger', 'Outlaw', 'Crime Lord', 'Infiltrator', 'Master Privateer', 'Assassin', 'Charlatan'],
  Scout: ['Bounty Hunter', 'Ace Pilot', 'Pathfinder', 'Infiltrator', 'Vanguard', 'Saboteur'],
  Soldier: ['Elite Trooper', 'Officer', 'Vanguard', 'Gladiator', 'Melee Duelist', 'Military Engineer', 'Bounty Hunter']
};
const CLASS_THEME_LABELS = {
  force: 'Force tradition', social: 'social command', ranged: 'ranged pressure', exploration: 'mobility and fieldcraft',
  combat: 'front-line combat', vehicle: 'vehicle mastery', stealth: 'infiltration', tracking: 'pursuit and tracking',
  leader: 'command', support: 'support', tech: 'technical problem-solving', melee: 'melee pressure', general: 'general capability'
};

function actorClassEntries(actor) {
  return actorItemsByType(actor, 'class')
    .map(item => ({ name: item?.name, level: Number(item?.system?.level ?? item?.system?.levels ?? 1) || 1 }))
    .filter(entry => entry.name);
}

function primaryBaseClass(actor) {
  const entries = actorClassEntries(actor)
    .filter(entry => CORE_CLASS_NAMES.some(name => normalizeNameKey(name) === normalizeNameKey(entry.name)))
    .sort((a, b) => b.level - a.level);
  return entries[0]?.name || null;
}

function classTheme(candidate) {
  const item = candidate?.item || candidate || {};
  const rawTheme = String(item?.theme || item?.system?.theme || item?.suggestion?.theme || item?.role || item?.system?.role || '').trim();
  const tags = candidateTags(candidate);
  if (rawTheme) return CLASS_THEME_LABELS[normalizeTag(rawTheme)] || rawTheme;
  if (tags.includes('force') || tags.includes('lightsaber')) return 'Force tradition';
  if (tags.includes('leader') || tags.includes('support')) return 'command/support';
  if (tags.includes('tech')) return 'technical problem-solving';
  if (tags.includes('ranged') || tags.includes('pistol') || tags.includes('rifle')) return 'ranged pressure';
  if (tags.includes('stealth')) return 'infiltration';
  if (tags.includes('vehicle')) return 'vehicle mastery';
  if (tags.includes('melee')) return 'melee pressure';
  return 'a different play pattern';
}

function isPrestigeClassCandidate(candidate) {
  const item = candidate?.item || candidate || {};
  return item?.prestigeClass === true || item?.isPrestige === true || item?.baseClass === false || item?.system?.prestigeClass === true || item?.system?.isPrestige === true;
}

function classSkillLabels(candidate) {
  const item = candidate?.item || candidate || {};
  const raw = item?.classSkills || item?.system?.classSkills || item?.skills || item?.suggestion?.classSkills || [];
  return (Array.isArray(raw) ? raw : Object.keys(raw || {})).map(titleCaseTag).filter(Boolean);
}

function classMissingPrereqs(candidate) {
  const block = candidate?.suggestion || {};
  const raw = block.missingPrereqs || candidate?.missingPrereqs || candidate?.missing || [];
  return (Array.isArray(raw) ? raw : [raw]).map(entry => {
    if (!entry) return null;
    if (typeof entry === 'string') return entry;
    return entry.display || entry.shortDisplay || entry.name || entry.label || entry.description || null;
  }).filter(Boolean);
}

function classRouteReasons(suggestion, actor, packet) {
  const name = candidateName(suggestion);
  if (!name || detectDomain(suggestion) !== 'class') return;

  const baseClass = primaryBaseClass(actor);
  const isPrestige = isPrestigeClassCandidate(suggestion);
  const missing = classMissingPrereqs(suggestion);
  const actorClasses = actorClassEntries(actor);
  const alreadyHasClass = actorClasses.some(entry => normalizeNameKey(entry.name) === normalizeNameKey(name));
  const routeMatchesBase = !!baseClass && (CLASS_ROUTE_AFFINITY[baseClass] || []).some(route => normalizeNameKey(route) === normalizeNameKey(name));
  const theme = classTheme(suggestion);
  const classSkills = classSkillLabels(suggestion);

  if (isPrestige && routeMatchesBase) {
    addConcreteReason(packet, 'primary', 'class', 'BASE_TO_PRESTIGE_ROUTE', `For a ${baseClass} foundation, ${name} is a natural advanced route rather than a random detour.`, 0.94);
  } else if (isPrestige && baseClass) {
    addConcreteReason(packet, 'secondary', 'class', 'PRESTIGE_CROSS_ROUTE', `${name} is an advanced route, but it changes the emphasis from your ${baseClass} foundation toward ${theme}.`, 0.78);
  }

  if (isPrestige && missing.length === 0) {
    addConcreteReason(packet, 'primary', 'class', 'PRESTIGE_READY_NOW', `You qualify now, so the choice is about identity and payoff rather than chasing missing gates.`, 0.9);
  } else if (isPrestige && missing.length > 0) {
    addConcreteReason(packet, 'caution', 'class', 'PRESTIGE_STILL_LOCKED', `It is close enough to inspect, but the remaining gates are ${displayList(missing, 3)}.`, 0.82);
  }

  if (!isPrestige && alreadyHasClass) {
    addConcreteReason(packet, 'primary', 'class', 'CLASS_CONTINUATION', `Continuing ${name} deepens the class chassis you already rely on instead of opening a side lane.`, 0.86);
  } else if (!isPrestige && baseClass && normalizeNameKey(baseClass) !== normalizeNameKey(name)) {
    addConcreteReason(packet, 'secondary', 'class', 'BASE_CLASS_CROSS_TRAINING', `${name} is cross-training from your ${baseClass} base; take it for ${theme}, not because it is the straightest prestige route.`, 0.76);
  } else if (!isPrestige && !baseClass) {
    addConcreteReason(packet, 'primary', 'class', 'FIRST_CLASS_IDENTITY', `${name} establishes your first mechanical identity around ${theme}.`, 0.82);
  }

  if (classSkills.length) {
    addConcreteReason(packet, 'secondary', 'skills', 'CLASS_SKILL_SURFACE', `Its useful class-skill surface includes ${displayList(classSkills, 3)}.`, 0.7);
  }

  if (/jedi knight/i.test(name) && /jedi/i.test(baseClass || '')) {
    addConcreteReason(packet, 'primary', 'class', 'JEDI_KNIGHT_ROUTE', `Your Jedi levels, Force training, and lightsaber foundation already point at Knighthood.`, 0.96);
  }
}

function addConcreteReason(packet, bucket, domain, code, text, strength = 0.84) {
  const clean = String(text || '').trim();
  if (!clean || isGenericReasonText(clean)) return;
  packet[bucket].push(ReasonFactory.create({ domain, code, text: clean, strength, safe: true }));
}

function ownedMatchesForTags(actor, tags = []) {
  const ownedNames = actorItemNames(actor);
  const ownedKeys = new Map(ownedNames.map(name => [normalizeNameKey(name), name]));
  const matches = [];

  const addIfOwned = (...names) => {
    for (const name of names) {
      const found = ownedKeys.get(normalizeNameKey(name));
      if (found) matches.push(found);
    }
  };

  if (tags.includes('lightsaber') || tags.includes('lightsaber_training') || tags.includes('duelist')) {
    addIfOwned('Weapon Proficiency (Lightsabers)', 'Block', 'Deflect', 'Lightsaber Defense', 'Lightsaber Construction', 'Double Attack (Lightsabers)');
  }
  if (tags.includes('force') || tags.includes('use_the_force') || tags.includes('force_power') || tags.includes('force_capacity') || tags.includes('force_execution')) {
    addIfOwned('Force Sensitivity', 'Force Training', 'Strong in the Force', 'Unstoppable Force', 'Force Regimen Mastery');
  }
  if (tags.includes('pistol') || tags.includes('ranged') || tags.includes('offense_ranged')) {
    addIfOwned('Weapon Proficiency (Pistols)', 'Point-Blank Shot', 'Precise Shot', 'Rapid Shot', 'Deadeye');
  }
  if (tags.includes('rifle') || tags.includes('sniping')) {
    addIfOwned('Weapon Proficiency (Rifles)', 'Point-Blank Shot', 'Precise Shot', 'Sniper');
  }
  if (tags.includes('armor') || tags.includes('defense')) {
    addIfOwned('Armor Proficiency (light)', 'Armor Proficiency (medium)', 'Armor Proficiency (heavy)', 'Improved Defenses', 'Toughness');
  }

  return uniqueByName(matches);
}

function prerequisiteReasons(suggestion, actor, packet) {
  const prereq = candidatePrereqText(suggestion);
  if (!prereq) return;
  const ownedNames = actorItemNames(actor);
  const ownedKeys = new Map(ownedNames.map(name => [normalizeNameKey(name), name]));
  const actorBab = Number(actor?.system?.bab || actor?.system?.attributes?.bab?.value || actor?.system?.details?.bab || 0);

  const babMatch = prereq.match(/(?:base attack bonus|bab)\s*\+?\s*(\d+)/i);
  if (babMatch && Number.isFinite(actorBab)) {
    const required = Number(babMatch[1]);
    if (actorBab >= required) {
      addConcreteReason(packet, 'primary', 'prerequisite', 'BAB_PREREQ_MET', `Your Base Attack Bonus is already high enough for its +${required} gate.`, 0.88);
    } else {
      addConcreteReason(packet, 'caution', 'prerequisite', 'BAB_PREREQ_SOON', `It still needs Base Attack Bonus +${required}; your current BAB is +${actorBab}.`, 0.74);
    }
  }

  const proficiencyMatches = Array.from(prereq.matchAll(/(Weapon Proficiency \([^)]+\)|Armor Proficiency \([^)]+\)|Force Sensitivity|Force Training)/gi))
    .map(match => match[1]);
  const metProficiencies = proficiencyMatches
    .map(name => ownedKeys.get(normalizeNameKey(name)) || (ownedKeys.has(normalizeNameKey(name.replace(/\s+/g, ' '))) ? name : null))
    .filter(Boolean);
  if (metProficiencies.length) {
    addConcreteReason(packet, 'primary', 'prerequisite', 'OWNED_PREREQ_MATCH', `You already have ${displayList(metProficiencies)}, so that gate is open.`, 0.9);
  }

  const trainedMatches = Array.from(prereq.matchAll(/trained\s+(?:in\s+)?([A-Za-z ]+)/gi))
    .map(match => match[1].replace(/(?:skill|check).*$/i, '').trim())
    .filter(Boolean);
  if (trainedMatches.length) {
    addConcreteReason(packet, 'secondary', 'skills', 'TRAINED_SKILL_GATE', `It uses trained skill work in ${displayList(trainedMatches)}, so the prerequisite is more than a raw feat tax.`, 0.76);
  }
}


function routeConfidenceReasons(suggestion, packet) {
  const scoring = suggestion?.suggestion?.scoring || {};
  const block = suggestion?.suggestion || {};
  const label = scoring.routeConfidenceLabel || block.routeConfidenceLabel || null;
  const matches = scoring.routeConfidenceMatches || block.routeConfidenceMatches || [];
  const repeatable = scoring.repeatableContinuation === true || block.repeatableContinuation === true;
  const accessOnly = scoring.routeAccessOnly === true || block.routeAccessOnly === true;
  const name = candidateName(suggestion);

  if (repeatable) {
    addConcreteReason(packet, 'forecast', 'route', 'REPEATABLE_INVESTMENT_CONTINUATION', `${name} can be taken again, and you have already shown investment in that lane.`, 0.9);
  }

  if (Array.isArray(matches) && matches.length) {
    const display = displayList(matches.map(titleCaseTag), 3);
    if (label === 'primary') {
      addConcreteReason(packet, 'primary', 'route', 'PRIMARY_ROUTE_CONFIDENCE', `It is supported by your strongest route evidence: ${display}.`, 0.88);
    } else if (label === 'secondary') {
      addConcreteReason(packet, 'secondary', 'route', 'SECONDARY_ROUTE_CONFIDENCE', `It belongs to a secondary lane you have started to support: ${display}.`, 0.78);
    } else if (label === 'latent') {
      addConcreteReason(packet, 'opportunity', 'route', 'LATENT_ROUTE_ACCESS', `It opens or develops a latent lane rather than replacing your main route: ${display}.`, 0.74);
    }
  }

  if (accessOnly) {
    addConcreteReason(packet, 'caution', 'route', 'SINGLE_SIGNAL_DAMPENED', `The engine sees access, but not enough stacked evidence to treat this as your main route yet.`, 0.72);
  }
}

function signalReasons(suggestion, packet) {
  const signals = Array.isArray(suggestion?.suggestion?.signals) ? suggestion.suggestion.signals : [];
  const sourceId = suggestionSourceId(suggestion);
  const sourcePayload = sourceId.includes(':') ? sourceId.split(':').slice(1).join(':').trim() : '';
  const treeName = candidateTreeName(suggestion);

  for (const signal of signals.slice(0, 6)) {
    const type = String(signal?.type || '');
    const meta = signal?.metadata || {};
    const tagMatches = String(meta.tagMatches || '').split(',').map(s => titleCaseTag(s)).filter(Boolean);
    const attributes = String(meta.attributes || '').split(',').map(s => titleCaseTag(s)).filter(Boolean);

    if (type === 'PRESTIGE_PROXIMITY') {
      const target = sourcePayload || meta.prestigeClass || '';
      addConcreteReason(packet, 'forecast', 'prestige', 'PRESTIGE_ROUTE_EXPLAINED', target
        ? `It keeps the ${target} route in view instead of spending the slot off-path.`
        : 'It supports an advanced-class route within the next few levels.', 0.9);
    } else if (type === 'FEAT_CHAIN_SETUP') {
      addConcreteReason(packet, 'forecast', 'chain', 'FEAT_CHAIN_EXPLAINED', sourcePayload
        ? `It continues the chain started by ${sourcePayload.replace(/^chain:/i, '')}.`
        : 'It continues a feat chain you have already started.', 0.86);
    } else if (type === 'TALENT_TREE_CONTINUATION') {
      addConcreteReason(packet, 'primary', 'talent', 'TALENT_TREE_CONTINUATION_EXPLAINED', treeName
        ? `It deepens your investment in the ${treeName} talent tree.`
        : 'It continues a talent path you have already opened.', 0.86);
    } else if (type === 'EQUIPMENT_SYNERGY') {
      addConcreteReason(packet, 'primary', 'equipment', 'EQUIPMENT_SYNERGY_EXPLAINED', 'It reinforces equipment choices your build is already leaning on.', 0.78);
    } else if (type === 'SKILL_INVESTMENT_ALIGNMENT') {
      addConcreteReason(packet, 'primary', 'skills', 'SKILL_INVESTMENT_EXPLAINED', 'It turns existing skill investment into a stronger mechanical payoff.', 0.78);
    } else if (type === 'DEFENSIVE_GAP_COVERAGE') {
      addConcreteReason(packet, 'primary', 'defense', 'DEFENSIVE_GAP_EXPLAINED', 'It shores up your defensive profile instead of only adding more offense.', 0.78);
    } else if (type === 'LEVEL_BREAKPOINT') {
      addConcreteReason(packet, 'forecast', 'level', 'LEVEL_BREAKPOINT_EXPLAINED', 'It lines up with an approaching level or BAB breakpoint.', 0.78);
    } else if (type === 'COMBAT_STYLE_MATCH' && tagMatches.length) {
      addConcreteReason(packet, 'primary', 'combat', 'TAG_MATCH_EXPLAINED', `It matches your current ${displayList(tagMatches)} direction.`, 0.82);
    } else if (type === 'ATTRIBUTE_SYNERGY' && attributes.length) {
      addConcreteReason(packet, 'primary', 'attributes', 'ATTRIBUTE_MATCH_EXPLAINED', `It uses your ${displayList(attributes)} axis rather than asking you to build around a dump stat.`, 0.8);
    } else if ((type === 'IDENTITY_ALIGNMENT' || type === 'ARCHETYPE_REINFORCEMENT') && tagMatches.length) {
      addConcreteReason(packet, 'primary', 'identity', 'IDENTITY_TAG_EXPLAINED', `It aligns with your visible ${displayList(tagMatches)} identity signals.`, 0.78);
    }
  }
}

function metadataDrivenReasons(suggestion, actor) {
  const packet = { primary: [], secondary: [], forecast: [], opportunity: [], caution: [] };
  const name = candidateName(suggestion);
  const domain = detectDomain(suggestion);
  const tags = candidateTags(suggestion);
  const reasonCode = suggestionReasonCode(suggestion);
  const sourceId = suggestionSourceId(suggestion);
  const sourceTarget = sourceId.includes(':') ? sourceId.split(':').slice(1).join(':').trim() : '';
  const treeName = candidateTreeName(suggestion);

  signalReasons(suggestion, packet);
  prerequisiteReasons(suggestion, actor, packet);
  routeConfidenceReasons(suggestion, packet);
  if (reasonCode.includes('PRESTIGE') && sourceTarget) {
    addConcreteReason(packet, 'forecast', 'prestige', 'PRESTIGE_SOURCE', `${name} is being highlighted because it supports ${sourceTarget}.`, 0.88);
  }
  if (reasonCode.includes('WISHLIST') && sourceTarget) {
    addConcreteReason(packet, 'forecast', 'wishlist', 'WISHLIST_SOURCE', `${name} moves you toward ${sourceTarget}, which is already marked as desirable for this build.`, 0.86);
  }
  if (reasonCode.includes('CHAIN') && sourceTarget) {
    addConcreteReason(packet, 'forecast', 'chain', 'CHAIN_SOURCE', `${name} follows from ${sourceTarget}, so it is a continuation rather than a detour.`, 0.86);
  }
  if (reasonCode.includes('CLASS')) {
    addConcreteReason(packet, 'secondary', 'class', 'CLASS_FIT_EXPLAINED', `${name} fits the class path you are currently advancing.`, 0.72);
  }
  if (reasonCode.includes('ABILITY')) {
    addConcreteReason(packet, 'secondary', 'attributes', 'ABILITY_REASON_CODE_EXPLAINED', `${name} leans into one of your stronger ability axes.`, 0.72);
  }
  if (reasonCode.includes('SKILL')) {
    addConcreteReason(packet, 'secondary', 'skills', 'SKILL_REASON_CODE_EXPLAINED', `${name} rewards skill investments you have already made.`, 0.72);
  }

  if (domain === 'talent' && treeName) {
    addConcreteReason(packet, 'primary', 'talent', 'CURRENT_TREE_CONTEXT', `It is inside the ${treeName} tree you are currently inspecting.`, 0.84);
    const ownedInTree = actorItemsByType(actor, 'talent')
      .filter(item => normalizeNameKey(item?.system?.tree || item?.system?.talent_tree || item?.system?.talentTree) === normalizeNameKey(treeName))
      .map(item => item?.name)
      .filter(Boolean);
    if (ownedInTree.length) {
      addConcreteReason(packet, 'primary', 'talent', 'OWNED_TREE_MOMENTUM', `You already have ${displayList(ownedInTree)} in this tree, so this keeps that branch coherent.`, 0.88);
    }
  }

  const ownedMatches = ownedMatchesForTags(actor, tags);
  if (ownedMatches.length) {
    addConcreteReason(packet, 'primary', 'build', 'OWNED_PACKAGE_MATCH', `It reinforces pieces you already have: ${displayList(ownedMatches)}.`, 0.88);
  }

  const scoringBreakdown = suggestion?.suggestion?.scoring?.horizonBreakdown || {};
  const immediateTags = scoringBreakdown?.immediate?.tagMatches || [];
  if (immediateTags.length) {
    addConcreteReason(packet, 'secondary', 'tags', 'SCORING_TAG_MATCHES', `The strongest matching lanes are ${displayList(immediateTags.map(titleCaseTag))}.`, 0.7);
  }
  const identityTags = scoringBreakdown?.identity?.identityTagMatches || [];
  if (identityTags.length) {
    addConcreteReason(packet, 'secondary', 'identity', 'SCORING_IDENTITY_MATCHES', `It echoes your ${displayList(identityTags.map(titleCaseTag))} identity signals.`, 0.7);
  }

  return packet;
}

function buildScoreDrivenReasons(suggestion) {
  const packet = { primary: [], secondary: [], forecast: [], opportunity: [], caution: [] };
  const scoring = suggestion?.suggestion?.scoring || {};
  const breakdown = scoring?.breakdown || {};
  const immediate = Number(breakdown.immediate ?? 0);
  const shortTerm = Number(breakdown.shortTerm ?? 0);
  const identity = Number(breakdown.identity ?? 0);
  const conditionalBonus = Number(breakdown.conditionalBonus ?? 0);
  if (immediate >= 0.65) addReason(packet.primary, 'immediate_fit_high', 0.88, 'timing');
  else if (immediate >= 0.45) addReason(packet.secondary, 'immediate_fit_moderate', 0.72, 'timing');
  if (shortTerm >= 0.55) addReason(packet.forecast, 'short_term_value_high', 0.86, 'forecast');
  if (identity >= 0.55) addReason(packet.primary, 'identity_alignment_high', 0.84, 'identity');
  if (conditionalBonus >= 0.05) addReason(packet.opportunity, 'opportunity_window_open', 0.84, 'opportunity');
  const advisories = Array.isArray(scoring?.advisories) ? scoring.advisories.map(a => typeof a === 'string' ? a : a?.text).filter(Boolean) : [];
  for (const text of advisories.slice(0, 2)) {
    const lowered = text.toLowerCase();
    if (lowered.includes('risk') || lowered.includes('delay') || lowered.includes('cost')) {
      packet.caution.push(ReasonFactory.moderate('forecast', 'ADVISORY_CAUTION', text));
    } else if (lowered.includes('unlock') || lowered.includes('prestige') || lowered.includes('future')) {
      packet.forecast.push(ReasonFactory.strong('forecast', 'ADVISORY_FORECAST', text));
    } else {
      packet.secondary.push(ReasonFactory.moderate('build', 'ADVISORY_CONTEXT', text));
    }
  }
  return packet;
}

function buildTagDrivenReasons(suggestion, actor) {
  const packet = { primary: [], secondary: [], forecast: [], opportunity: [], caution: [] };
  const tags = candidateTags(suggestion);
  const domain = detectDomain(suggestion);
  if (tags.includes('build_enabler') || tags.includes('prereq_gateway')) addReason(packet.forecast, 'opens_later_options', 0.92, 'forecast');
  if (tags.includes('forecast_value') || tags.includes('force_multiplier') || tags.includes('power_upgrade')) addReason(packet.forecast, 'grows_in_value', 0.88, 'forecast');
  if (tags.includes('species_opportunity') || tags.includes('species_locked') || tags.includes('racial')) addReason(packet.opportunity, 'species_window', 0.9, 'opportunity');
  if (tags.includes('conditional_opportunity')) addReason(packet.opportunity, 'conditional_window', 0.84, 'opportunity');
  if (tags.includes('skill_recovery') || tags.includes('skill_training')) addReason(packet.primary, 'patches_missing_lane', 0.86, 'skills');
  if (tags.includes('class_skill_expansion')) addReason(packet.primary, 'expands_class_skills', 0.86, 'skills');
  if (tags.includes('ally_support') || tags.includes('leader') || tags.includes('leadership')) addReason(packet.primary, 'supports_group_role', 0.82, 'role');
  if (tags.includes('mobility')) addReason(packet.secondary, 'improves_positioning', 0.76, 'mobility');
  if (tags.includes('control')) addReason(packet.secondary, 'adds_control_layer', 0.76, 'control');
  if (tags.includes('survivability') || tags.includes('defense') || tags.includes('melee_defense') || tags.includes('ranged_defense')) addReason(packet.primary, 'improves_defense', 0.8, 'defense');
  if (tags.includes('healing') || tags.includes('medical')) addReason(packet.primary, 'adds_recovery_tools', 0.8, 'support');
  if (actionTags(tags).length) addReason(packet.secondary, 'improves_action_economy', 0.78, 'action');
  if (tags.includes('offense_melee') || tags.includes('duelist') || tags.includes('lightsaber')) addReason(packet.primary, 'fits_melee_identity', 0.84, 'combat');
  if (tags.includes('offense_ranged') || tags.includes('sniping') || tags.includes('pistol') || tags.includes('rifle')) addReason(packet.primary, 'fits_ranged_identity', 0.84, 'combat');
  if (tags.includes('ally_support') || tags.includes('leadership')) addReason(packet.primary, 'fits_support_identity', 0.84, 'combat');
  if (tags.includes('control') || tags.includes('mind_affecting')) addReason(packet.primary, 'fits_control_identity', 0.84, 'combat');
  if (tags.includes('force_capacity')) {
    if (getAbilityMod(actor, 'wis') >= 2) addReason(packet.primary, 'force_capacity_realized', 0.88, 'force');
    else addReason(packet.caution, 'force_capacity_low', 0.74, 'force');
  }
  if (tags.includes('force_execution') || tags.includes('use_the_force') || tags.includes('force_power_check')) {
    if (getAbilityMod(actor, 'cha') >= 2) addReason(packet.primary, 'force_execution_realized', 0.88, 'force');
    else addReason(packet.caution, 'force_execution_low', 0.72, 'force');
  }
  if (tags.includes('strength_synergy') || tags.includes('ability_strength')) {
    if (getAbilityMod(actor, 'str') >= 2) addReason(packet.primary, 'strength_supports_choice', 0.82, 'attributes');
    else if (getAbilityMod(actor, 'str') <= 0) addReason(packet.caution, 'strength_is_limited', 0.72, 'attributes');
  }
  if (tags.includes('dexterity_synergy') || tags.includes('ability_dexterity') || tags.includes('finesse')) {
    if (getAbilityMod(actor, 'dex') >= 2) addReason(packet.primary, 'dexterity_supports_choice', 0.82, 'attributes');
    else if (getAbilityMod(actor, 'dex') <= 0) addReason(packet.caution, 'dexterity_is_limited', 0.72, 'attributes');
  }
  if (tags.includes('ability_constitution')) {
    if (getAbilityMod(actor, 'con') >= 2) addReason(packet.primary, 'constitution_supports_choice', 0.8, 'attributes');
    else if (getAbilityMod(actor, 'con') <= 0) addReason(packet.caution, 'constitution_is_limited', 0.7, 'attributes');
  }
  if (tags.includes('ability_intelligence') || tags.includes('tech') || tags.includes('skill_knowledge')) {
    if (getAbilityMod(actor, 'int') >= 2) addReason(packet.primary, 'intelligence_supports_choice', 0.8, 'attributes');
  }
  if (tags.includes('ability_wisdom') || tags.includes('perception') || tags.includes('survival')) {
    if (getAbilityMod(actor, 'wis') >= 2) addReason(packet.primary, 'wisdom_supports_choice', 0.8, 'attributes');
  }
  if (tags.includes('ability_charisma') || tags.includes('social')) {
    if (getAbilityMod(actor, 'cha') >= 2) addReason(packet.primary, 'charisma_supports_choice', 0.8, 'attributes');
  }
  if (domain === 'background') {
    if (tags.includes('class_skill_expansion') || tags.includes('skill_stealth') || tags.includes('skill_use_the_force')) addReason(packet.primary, 'background_patches_training', 0.9, 'background');
    if (tags.includes('prestige_support') || tags.some(t => t.startsWith('prereq_'))) addReason(packet.forecast, 'background_supports_prestige', 0.88, 'background');
  }
  return packet;
}

function mergeBuckets(a, b) {
  return { primary: [...a.primary, ...b.primary], secondary: [...a.secondary, ...b.secondary], forecast: [...a.forecast, ...b.forecast], opportunity: [...a.opportunity, ...b.opportunity], caution: [...a.caution, ...b.caution] };
}

function composeOpening(name, domain, packet) {
  const hasOpportunity = packet.opportunity.length > 0;
  const hasForecast = packet.forecast.length > 0;
  const hasCaution = packet.caution.length > 0;
  const openingsByDomain = {
    feat: hasOpportunity ? `${name} stands out right now` : hasForecast ? `${name} sets up your build well` : `${name} fits the build you are shaping`,
    talent: hasOpportunity ? `${name} is a strong talent pick right now` : hasForecast ? `${name} pushes your playstyle forward` : `${name} reinforces your current style`,
    background: hasOpportunity ? `${name} is an unusually timely background pick` : `${name} patches a useful gap in your build`,
    species: `${name} lines up cleanly with the direction you are building toward`,
    class: hasCaution ? `${name} is viable, but it changes the route` : hasForecast ? `${name} keeps a class route in view` : `${name} fits the direction your character is already taking`,
    forcepower: hasForecast ? `${name} broadens your force toolkit in a useful way` : `${name} supports how you are using the Force`,
    forcetechnique: `${name} sharpens powers you are already leaning on`,
    forcesecret: `${name} deepens the force path you are building toward`,
    maneuver: `${name} fits the role you are trying to fill in starship combat`,
    option: hasCaution ? `${name} is viable, but it needs context` : `${name} is a strong fit for your current direction`
  };
  return openingsByDomain[domain] || openingsByDomain.option;
}

function isClauseReason(value) {
  const text = String(value || '').trim();
  if (!text) return false;
  return /^because\b/i.test(text) || /^[a-z][^.!?]*$/.test(text);
}

function cleanClauseReason(value) {
  const trimmed = String(value || '').trim().replace(/^because\s+/i, '').replace(/^it\s+/i, '');
  if (!trimmed) return '';
  return trimmed.charAt(0).toLowerCase() + trimmed.slice(1).replace(/[.!?]+$/g, '');
}

function ensureSentence(value) {
  const trimmed = String(value || '').trim().replace(/^because\s+/i, 'It ');
  if (!trimmed) return '';
  const sentence = /^[a-z]/.test(trimmed) ? trimmed.charAt(0).toUpperCase() + trimmed.slice(1) : trimmed;
  return /[.!?]$/.test(sentence) ? sentence : `${sentence}.`;
}

function sentenceJoin(fragments) {
  return fragments.filter(Boolean).map(cleanClauseReason).filter(Boolean).join(' and ');
}

function composeSentence(name, domain, packet) {
  const primaryReasons = pickTop(packet.primary, 2).map(r => r.text);
  const primaryClauses = primaryReasons.filter(isClauseReason);
  const primarySentences = primaryReasons.filter(reason => !isClauseReason(reason));
  const forecast = pickTop(packet.forecast, 1).map(r => r.text);
  const opportunity = pickTop(packet.opportunity, 1).map(r => r.text);
  const caution = pickTop(packet.caution, 1).map(r => r.text);
  const parts = [];
  const opening = composeOpening(name, domain, packet);
  const joinedPrimary = sentenceJoin(primaryClauses);

  if (joinedPrimary) parts.push(`${opening} because it ${joinedPrimary}`);
  else parts.push(opening);

  for (const sentence of primarySentences) parts.push(ensureSentence(sentence));
  if (forecast.length) parts.push(isClauseReason(forecast[0]) ? `It ${cleanClauseReason(forecast[0])}.` : ensureSentence(forecast[0]));
  if (opportunity.length) parts.push(isClauseReason(opportunity[0]) ? `It ${cleanClauseReason(opportunity[0])}.` : ensureSentence(opportunity[0]));
  if (caution.length) parts.push(isClauseReason(caution[0]) ? `Its immediate payoff is lower if ${cleanClauseReason(caution[0])}.` : ensureSentence(caution[0]));
  let s = parts.map(ensureSentence).filter(Boolean).join(' ').replace(/\s+/g, ' ').replace(/\. It it /g, '. It ');
  if (!/[.!?]$/.test(s)) s += '.';
  return s;
}

export class SuggestionReasonEngine {
  static buildPacket(suggestion, actor, options = {}) {
    try {
      let packet = mergeBuckets(buildScoreDrivenReasons(suggestion), buildTagDrivenReasons(suggestion, actor));
      const classDomainPacket = ClassDomainReasonEngine.buildPacket(suggestion, actor, options);
      packet = mergeBuckets(packet, classDomainPacket);
      packet = mergeBuckets(packet, metadataDrivenReasons(suggestion, actor));
      const rawExistingReasons = [
        ...(Array.isArray(suggestion?.reasons) ? suggestion.reasons : []),
        ...(Array.isArray(suggestion?.suggestion?.reasons) ? suggestion.suggestion.reasons : []),
        suggestion?.suggestion?.reason,
        suggestion?.suggestion?.reasonText,
        suggestion?.reason,
        suggestion?.reasonText,
      ].filter(Boolean);
      const existingReasons = rawExistingReasons.map((reason) => {
        if (typeof reason === 'string') return { text: reason, domain: detectDomain(suggestion) || 'build' };
        return reason?.text ? reason : null;
      }).filter(r => r?.text && !isGenericReasonText(r.text));
      packet.secondary.push(...existingReasons.map(r => ReasonFactory.create({ domain: r.domain || detectDomain(suggestion) || 'build', code: r.code || 'EXISTING_REASON', text: r.text, safe: r.safe !== false, strength: r.strength ?? 0.72, atoms: r.atoms || [] })));
      packet.primary = pickTop(packet.primary, 3);
      packet.secondary = pickTop(packet.secondary, 3);
      packet.forecast = pickTop(packet.forecast, 2);
      packet.opportunity = pickTop(packet.opportunity, 2);
      packet.caution = pickTop(packet.caution, 2);
      packet.allReasons = pickTop([...packet.primary, ...packet.secondary, ...packet.forecast, ...packet.opportunity, ...packet.caution], 6);
      const fallback = `${candidateName(suggestion)} fits your current direction.`;
      let shortReason = packet.primary[0]?.text || packet.secondary[0]?.text || fallback;
      shortReason = shortReason.replace(/^because /i, '').replace(/^this /i, 'It ').replace(/^it /i, 'It ');
      if (!/[.!?]$/.test(shortReason)) shortReason += '.';
      const fullReason = composeSentence(candidateName(suggestion), detectDomain(suggestion), packet);
      const bullets = uniq([...packet.primary.map(r => r.text), ...packet.forecast.map(r => r.text), ...packet.opportunity.map(r => r.text), ...packet.caution.map(r => r.text)]).slice(0, 4);
      return {
        ...packet,
        classDomainContext: classDomainPacket.classDomainContext || null,
        shortReason,
        fullReason,
        bullets,
        reasonText: fullReason,
        reasonSummary: shortReason
      };
    } catch (err) {
      SWSELogger.warn('[SuggestionReasonEngine] Failed to build packet', err);
      const fallback = `${candidateName(suggestion)} is a reasonable option for your current build.`;
      return { primary: [], secondary: [], forecast: [], opportunity: [], caution: [], allReasons: [], shortReason: fallback, fullReason: fallback, bullets: [fallback], reasonText: fallback, reasonSummary: fallback };
    }
  }
}
