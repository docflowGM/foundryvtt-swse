import { ReasonFactory } from "/systems/foundryvtt-swse/scripts/engine/suggestion/ReasonFactory.js";
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
  const raw = actor?.system?.abilities?.[key]?.value;
  return Number.isFinite(raw) ? raw : 10;
}
function getAbilityMod(actor, key) { return Math.floor((getAbilityScore(actor, key) - 10) / 2); }
function templateText(key) { return SENTENCE_TEMPLATES?.[key] || REASON_TEXT_MAP?.[key] || null; }
function addReason(bucket, key, strength = 0.8, domain = 'build', meta = {}) {
  const text = meta.text || templateText(key);
  if (!text) return;
  bucket.push(ReasonFactory.create({ domain, code: meta.code || String(key).toUpperCase(), text, strength, safe: true, atoms: meta.atoms || [] }));
}
function pickTop(reasons, limit = 3) { return ReasonFactory.limitByStrength(ReasonFactory.deduplicate(reasons), limit); }
function detectDomain(suggestion) { return suggestion?.type || suggestion?.domain || suggestion?.item?.type || 'option'; }
function actionTags(tags) { return tags.filter(t => ['free_action','swift_action','move_action','standard_action','full_round_action','reaction','new_action','action_economy'].includes(t)); }

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
    class: `${name} fits the direction your character is already taking`,
    forcepower: hasForecast ? `${name} broadens your force toolkit in a useful way` : `${name} supports how you are using the Force`,
    forcetechnique: `${name} sharpens powers you are already leaning on`,
    forcesecret: `${name} deepens the force path you are building toward`,
    maneuver: `${name} fits the role you are trying to fill in starship combat`,
    option: hasCaution ? `${name} is viable, but it needs context` : `${name} is a strong fit for your current direction`
  };
  return openingsByDomain[domain] || openingsByDomain.option;
}

function sentenceJoin(fragments) {
  return fragments.filter(Boolean).map(fragment => {
    const trimmed = String(fragment).trim().replace(/^because\s+/i, '');
    if (!trimmed) return null;
    return trimmed.charAt(0).toLowerCase() + trimmed.slice(1);
  }).filter(Boolean).join(' and ');
}

function composeSentence(name, domain, packet) {
  const primary = pickTop(packet.primary, 2).map(r => r.text);
  const forecast = pickTop(packet.forecast, 1).map(r => r.text);
  const opportunity = pickTop(packet.opportunity, 1).map(r => r.text);
  const caution = pickTop(packet.caution, 1).map(r => r.text);
  const parts = [];
  const opening = composeOpening(name, domain, packet);
  const joinedPrimary = sentenceJoin(primary);
  if (joinedPrimary) parts.push(`${opening} because it ${joinedPrimary}`);
  else parts.push(opening);
  if (forecast.length) parts.push(`It ${forecast[0].replace(/^because\s+/i, '')}`);
  if (opportunity.length) parts.push(`It ${opportunity[0].replace(/^because\s+/i, '')}`);
  if (caution.length) parts.push(`Its immediate payoff is lower if ${caution[0].replace(/^because\s+/i, '')}`);
  let s = parts.join('. ').replace(/\s+/g, ' ').replace(/\. It it /g, '. It ');
  if (!/[.!?]$/.test(s)) s += '.';
  return s;
}

export class SuggestionReasonEngine {
  static buildPacket(suggestion, actor, options = {}) {
    try {
      const packet = mergeBuckets(buildScoreDrivenReasons(suggestion), buildTagDrivenReasons(suggestion, actor));
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
      }).filter(r => r?.text);
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
      return { ...packet, shortReason, fullReason, bullets, reasonText: fullReason, reasonSummary: shortReason };
    } catch (err) {
      SWSELogger.warn('[SuggestionReasonEngine] Failed to build packet', err);
      const fallback = `${candidateName(suggestion)} is a reasonable option for your current build.`;
      return { primary: [], secondary: [], forecast: [], opportunity: [], caution: [], allReasons: [], shortReason: fallback, fullReason: fallback, bullets: [fallback], reasonText: fallback, reasonSummary: fallback };
    }
  }
}
