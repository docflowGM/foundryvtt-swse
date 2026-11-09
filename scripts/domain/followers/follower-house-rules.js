/**
 * Follower house rules (GM world settings). Pure: no Foundry access.
 *
 *   followerMaxCount        combined cap on follower slots recruited through
 *                           Inspire Loyalty, Reconnaissance Team Leader and
 *                           Commanding Officer ('3' | '6' | '9' | 'unlimited').
 *   followerSharedBenefits  when ON, every follower receives the combined
 *                           recruiting benefits of every recruiting talent the
 *                           leader owns; when OFF, only its own talent's.
 *
 * Printed per-talent limits (FOLLOWER_TALENT_CONFIG.maxCount) are unchanged;
 * the combined cap is an additional ceiling, and 'unlimited' only removes the
 * combined ceiling. GM-granted slots and other follower talents (Akk Dog
 * Master, minions) are outside both rules. Talent selections stay legal at
 * the cap; only slot creation is limited, and existing followers are never
 * deleted: slots beyond a lowered cap are reported for GM resolution.
 *
 * Talents that already say "all your followers" (Coordinated Tactics, Close-
 * Combat Assault, Undying Loyalty) are not touched by either setting.
 */
import { FOLLOWER_TALENT_CONFIG } from '../../engine/crew/follower-talent-config.js';

export const FOLLOWER_MAX_SETTING = 'followerMaxCount';
export const FOLLOWER_SHARE_SETTING = 'followerSharedBenefits';
export const FOLLOWER_CAP_CHOICES = Object.freeze({
  3: '3 followers (small team)',
  6: '6 followers (expanded squad)',
  9: '9 followers (full command group)',
  unlimited: 'Unlimited (GM adjudication)',
});
export const DEFAULT_FOLLOWER_CAP = '3';

export const RECRUITING_TALENTS = Object.freeze(['Inspire Loyalty', 'Reconnaissance Team Leader', 'Commanding Officer']);
export const ARMOR_LADDER = Object.freeze(['Armor Proficiency (Light)', 'Armor Proficiency (Medium)', 'Armor Proficiency (Heavy)']);

const isRecruitingName = name => RECRUITING_TALENTS.includes(name);
const unique = list => Array.from(new Set(list.filter(Boolean)));

/** Numeric ceiling for a setting value; an unrecognised value falls back to the default. */
export function followerCapLimit(value) {
  const key = String(value ?? DEFAULT_FOLLOWER_CAP).toLowerCase();
  if (key === 'unlimited') return Infinity;
  return key in FOLLOWER_CAP_CHOICES ? Number(key) : Number(DEFAULT_FOLLOWER_CAP);
}

/** A slot the combined cap governs: talent-recruited, never GM-granted. */
export function isCappedRecruitingSlot(slot) {
  return Boolean(slot) && slot.sourceType !== 'gm-grant' && isRecruitingName(slot.talentName);
}

/**
 * Cap status for an owner's slots. Slots are taken in array order, so the slots
 * past the limit are the "excess" and are only REPORTED, never removed.
 */
export function evaluateFollowerCap(slots, limit) {
  const capped = (Array.isArray(slots) ? slots : []).filter(isCappedRecruitingSlot);
  const excess = Number.isFinite(limit) ? capped.slice(limit) : [];
  return { limit, used: capped.length, over: excess.length > 0, excessSlotIds: excess.map(slot => slot.id) };
}

/** Whether one more recruiting slot may be created for this talent. */
export function canAddRecruitingSlot(slots, talentName, limit) {
  if (!isRecruitingName(talentName)) return true; // not governed by the combined cap
  return evaluateFollowerCap(slots, Infinity).used < limit;
}

/** Distinct recruiting talent names an owner has (repeat selections do not add a second benefit set). */
export function ownedRecruitingTalentNames(items) {
  const list = Array.isArray(items) ? items : Array.from(items?.contents ?? items ?? []);
  return unique(list.filter(item => item?.type === 'talent' && isRecruitingName(item.name)).map(item => item.name));
}

/**
 * Apply `grants` Armor Proficiency grants cumulatively in prerequisite order
 * (Light, then Medium, then Heavy), skipping what the follower already has.
 */
export function armorLadderGrants(grants, existingFeatNames = []) {
  const have = new Set(existingFeatNames);
  const added = [];
  for (let i = 0; i < grants; i++) {
    const next = ARMOR_LADDER.find(feat => !have.has(feat));
    if (!next) break;
    have.add(next);
    added.push(next);
  }
  return added;
}

/**
 * Combined benefits of every owned recruiting talent plus the follower's own.
 * Returned shape mirrors the config fields the creators already read.
 */
export function sharedBenefitSet(ownedTalentNames, ownTalentName = null) {
  const names = unique([...(ownedTalentNames || []), ownTalentName]).filter(isRecruitingName);
  const configs = names.map(name => FOLLOWER_TALENT_CONFIG[name]).filter(Boolean);
  return {
    talents: names,
    additionalFeats: unique(configs.flatMap(cfg => cfg.additionalFeats || [])),
    additionalSkills: unique(configs.flatMap(cfg => cfg.additionalSkills || [])),
    armorGrants: configs.filter(cfg => cfg.armorProficiencyChoice === true).length,
  };
}

/**
 * Grant config for one follower. OFF (or a non-recruiting talent): the base
 * config untouched. ON: the combined set, with the single armor choice replaced
 * by cumulative automatic grants (`armorLadderGrants` on the config).
 */
export function effectiveFollowerGrantConfig(baseCfg, talentName, ownedTalentNames, { shared = false } = {}) {
  if (!baseCfg || shared !== true || !isRecruitingName(talentName)) return baseCfg;
  const set = sharedBenefitSet(ownedTalentNames, talentName);
  return {
    ...baseCfg,
    additionalFeats: set.additionalFeats,
    additionalSkills: set.additionalSkills,
    armorProficiencyChoice: false,
    armorLadderGrants: set.armorGrants,
  };
}

/**
 * Reconcile plan for an EXISTING follower. `recorded` is what a previous house-rule
 * reconcile added ({feats, skills}), so turning sharing off (or losing a talent)
 * removes only those, never anything the follower earned another way.
 *
 * @returns {{addFeats:string[], removeFeats:string[], addSkills:string[], removeSkills:string[], record:{feats:string[], skills:string[]}}}
 */
export function planSharedBenefitReconcile({ shared, ownedTalentNames, followerFeatNames, followerTrainedSkillNames, recorded = {} }) {
  const recFeats = unique(recorded.feats || []);
  const recSkills = unique(recorded.skills || []);
  const feats = new Set(followerFeatNames || []);
  const skills = new Set(followerTrainedSkillNames || []);
  if (shared !== true) {
    return {
      addFeats: [], addSkills: [],
      removeFeats: recFeats.filter(f => feats.has(f)),
      removeSkills: recSkills.filter(s => skills.has(s)),
      record: { feats: [], skills: [] },
    };
  }
  const set = sharedBenefitSet(ownedTalentNames);
  const earned = new Set([...feats].filter(f => !recFeats.includes(f)));          // feats not placed by this rule
  const ladder = armorLadderGrants(set.armorGrants, [...earned]);
  const wantedFeats = unique([...set.additionalFeats, ...ladder]);
  const earnedSkills = new Set([...skills].filter(s => !recSkills.includes(s)));
  const wantedSkills = set.additionalSkills;
  const placedFeats = wantedFeats.filter(f => !earned.has(f));
  const placedSkills = wantedSkills.filter(s => !earnedSkills.has(s));
  return {
    addFeats: placedFeats.filter(f => !feats.has(f)),
    removeFeats: recFeats.filter(f => feats.has(f) && !placedFeats.includes(f)),
    addSkills: placedSkills.filter(s => !skills.has(s)),
    removeSkills: recSkills.filter(s => skills.has(s) && !placedSkills.includes(s)),
    record: { feats: placedFeats, skills: placedSkills },
  };
}
