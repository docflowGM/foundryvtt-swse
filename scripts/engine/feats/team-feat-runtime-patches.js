import { SkillFeatResolver } from "/systems/foundryvtt-swse/scripts/engine/skills/skill-feat-resolver.js";
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

let registered = false;

function normalizeKey(value = '') {
  return String(value ?? '')
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-zA-Z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}

function normalizeSkill(value = '') {
  return SkillFeatResolver.normalizeSkillKey?.(value) ?? SkillFeatResolver.normalizeSkillKey?.(normalizeKey(value)) ?? value;
}

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (value === undefined || value === null) return [];
  return [value];
}

function clone(value) {
  if (value == null || typeof value !== 'object') return value;
  try { return foundry?.utils?.deepClone?.(value) ?? JSON.parse(JSON.stringify(value)); }
  catch (_err) { return JSON.parse(JSON.stringify(value)); }
}

function actorItems(actor) {
  try { return Array.from(actor?.items ?? []); }
  catch (_err) { return []; }
}

function itemRules(item) {
  return asArray(item?.system?.abilityMeta?.rules)
    .map(rule => ({ ...clone(rule), source: rule.source ?? item?.name, sourceName: item?.name, sourceId: item?.id }));
}

function skillMatches(rule, skillKey) {
  const wanted = normalizeSkill(skillKey);
  const skills = [rule.skill, rule.skillKey, ...asArray(rule.skillKeys), ...asArray(rule.skills)]
    .map(normalizeSkill)
    .filter(Boolean);
  return !skills.length || skills.includes('any') || skills.includes(wanted);
}

function collectTeamSkillBonusRules(actor, skillKey = null) {
  const rules = [];
  for (const item of actorItems(actor)) {
    if (item?.type !== 'feat' || item?.system?.disabled === true) continue;
    for (const rule of itemRules(item)) {
      if (normalizeKey(rule.type) !== 'team-feat-skill-bonus') continue;
      if (skillKey && !skillMatches(rule, skillKey)) continue;
      rules.push(rule);
    }
  }
  return rules;
}

function teamAllyCountFromContext(rule, context = {}) {
  const counts = context.teamFeatAllyCounts ?? context.teamFeatCounts ?? {};
  const keys = [rule.id, rule.sourceId, rule.sourceName, rule.label, rule.source].map(normalizeKey).filter(Boolean);
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(counts, key)) return Number(counts[key]) || 0;
  }
  if (Number.isFinite(Number(context.teamFeatAllyCount))) return Number(context.teamFeatAllyCount) || 0;
  return 0;
}

function teamFeatBonusValue(rule, allyCount = 0) {
  const base = Number(rule.baseValue ?? rule.value ?? 3) || 3;
  const perAlly = Number(rule.perMatchingAllyWithinRange ?? rule.perAlly ?? 1) || 1;
  const max = Number(rule.maxValue ?? rule.max ?? 7) || 7;
  return Math.min(max, base + Math.max(0, Number(allyCount) || 0) * perAlly);
}

function buildTeamFeatBonuses(actor, skillKey, context = {}) {
  return collectTeamSkillBonusRules(actor, skillKey).map(rule => {
    const allyCount = teamAllyCountFromContext(rule, context);
    const value = teamFeatBonusValue(rule, allyCount);
    return {
      id: rule.id ?? `${rule.sourceId}-team-feat-bonus`,
      sourceId: rule.sourceId,
      sourceName: rule.sourceName ?? rule.source ?? rule.label,
      type: rule.bonusType ?? 'competence',
      value,
      allyCount,
      maxValue: Number(rule.maxValue ?? 7) || 7,
      description: `${rule.sourceName ?? rule.label}: +${value} ${rule.bonusType ?? 'competence'} (${allyCount} matching allies within ${Number(rule.rangeSquares ?? 12) || 12} squares)`,
      rule
    };
  });
}

async function promptForTeamFeatAllyCounts(actor, skillKey, context = {}) {
  const rules = collectTeamSkillBonusRules(actor, skillKey);
  if (!rules.length) return context;
  if (context.skipTeamFeatPrompt === true || context.teamFeatPrompted === true) return context;
  if (context.teamFeatAllyCounts && typeof context.teamFeatAllyCounts === 'object') return context;
  if (!actor?.isOwner) return context;
  if (typeof Dialog?.prompt !== 'function') return context;

  const rows = rules.map((rule, index) => {
    const id = `team-feat-${index}`;
    const label = String(rule.sourceName ?? rule.label ?? 'Team Feat');
    const range = Number(rule.rangeSquares ?? 12) || 12;
    return `<label class="swse-team-feat-row" for="${id}">
      <span><strong>${label}</strong><small>Matching allies within ${range} squares; bonus caps at +${Number(rule.maxValue ?? 7) || 7}</small></span>
      <input id="${id}" name="${id}" type="number" min="0" step="1" value="0" />
    </label>`;
  }).join('');

  const content = `<form class="swse-team-feat-prompt">
    <p>How many other allies currently have the same Team Feat and are within 12 squares?</p>
    <div class="swse-team-feat-list">${rows}</div>
  </form>`;

  let counts = null;
  try {
    counts = await Dialog.prompt({
      title: 'Team Feat Allies',
      content,
      label: 'Apply Team Bonuses',
      callback: (html) => {
        const root = html?.[0] ?? html;
        const result = {};
        rules.forEach((rule, index) => {
          const input = root?.querySelector?.(`[name="team-feat-${index}"]`);
          const value = Math.max(0, Math.floor(Number(input?.value ?? 0) || 0));
          for (const key of [rule.id, rule.sourceId, rule.sourceName, rule.label, rule.source].map(normalizeKey).filter(Boolean)) result[key] = value;
        });
        return result;
      },
      rejectClose: false
    });
  } catch (_err) {
    counts = null;
  }

  return {
    ...context,
    teamFeatPrompted: true,
    teamFeatAllyCounts: counts ?? {}
  };
}

function patchSkillCheckBonuses() {
  if (SkillFeatResolver.__swseTeamFeatSkillBonusPatched === true) return;
  const original = SkillFeatResolver.getSkillCheckBonuses?.bind(SkillFeatResolver);
  SkillFeatResolver.getSkillCheckBonuses = function patchedTeamFeatSkillCheckBonuses(actor, skillKey, context = {}) {
    const base = typeof original === 'function' ? original(actor, skillKey, context) : { total: 0, bonuses: [] };
    const teamBonuses = buildTeamFeatBonuses(actor, skillKey, context);
    if (!teamBonuses.length) return base;
    return {
      total: Number(base?.total ?? 0) + teamBonuses.reduce((sum, bonus) => sum + Number(bonus.value || 0), 0),
      bonuses: [...asArray(base?.bonuses), ...teamBonuses]
    };
  };
  SkillFeatResolver.__swseTeamFeatSkillBonusPatched = true;
}

export const TeamFeatRuntime = {
  collectTeamSkillBonusRules,
  buildTeamFeatBonuses,
  promptForTeamFeatAllyCounts
};

export function registerTeamFeatRuntimePatches() {
  if (registered) return;
  registered = true;
  patchSkillCheckBonuses();
  game.swse ??= {};
  game.swse.skills ??= {};
  game.swse.skills.teamFeatRuntime = TeamFeatRuntime;
  SWSELogger.log('[TeamFeats] Runtime patches registered');
}

export default registerTeamFeatRuntimePatches;
