import { DefenseCalculator } from '/systems/foundryvtt-swse/scripts/actors/derived/defense-calculator.js';
import { ActorEngine } from '/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js';
import { swseLogger } from '/systems/foundryvtt-swse/scripts/utils/logger.js';
import { finite, abilityMod, followerLevel, isFollower, conditionPenalty, templateDefenseBonus, normalize } from '/systems/foundryvtt-swse/scripts/sheets/v2/npc/follower-sheet-parity.js';

// Sheet context/events and follower feat de-duplication are folded into SWSEV2NpcSheet / FollowerCreator (F-PAT-002).
// What remains is the follower DefenseCalculator.calculate wrapper (a shadow defense authority; owner decision, left in place)
// and the GM-only startup duplicate-feat repair.
const REGISTERED = Symbol.for('swse.followerNpcSheetParity.v3');
const DEFENSE_PATCHED = Symbol.for('swse.followerNpcSheetParity.defense.v3');

function patchFollowerDefenses() {
  if (DefenseCalculator[DEFENSE_PATCHED] || typeof DefenseCalculator.calculate !== 'function') return;
  const original = DefenseCalculator.calculate.bind(DefenseCalculator);
  DefenseCalculator.calculate = async function patchedFollowerDefenseCalculate(actor, classLevels = [], options = {}, context = {}) {
    const result = await original(actor, classLevels, options, context);
    if (!isFollower(actor) || !result) return result;

    const level = followerLevel(actor);
    const con = abilityMod(actor, 'con');
    const dex = abilityMod(actor, 'dex');
    const wis = abilityMod(actor, 'wis');

    const rebuild = (row, ability, templateBonus, {
      size = 0,
      levelContribution = level,
      includeArmorBonus = true,
    } = {}) => {
      const classBonus = finite(row?.classBonus, 0);
      const armorBonus = includeArmorBonus ? finite(row?.armorBonus, 0) : 0;
      const speciesBonus = finite(row?.speciesBonus, 0);
      const miscBonus = finite(row?.miscBonus, 0);
      const stateBonus = finite(row?.stateBonus, 0);
      const adjustment = finite(row?.adjustment, 0);
      const condition = finite(row?.conditionPenalty, conditionPenalty(actor));
      const base = 10 + levelContribution + classBonus + armorBonus + ability + size;
      const total = Math.max(1, base + speciesBonus + miscBonus + stateBonus + adjustment + condition + templateBonus);
      return { ...row, base, total, heroicLevel: level, abilityMod: ability, levelContribution, templateBonus };
    };

    result.fortitude = rebuild(result.fortitude, con, templateDefenseBonus(actor, 'fortitude'));
    result.reflex = rebuild(result.reflex, dex, templateDefenseBonus(actor, 'reflex'), {
      size: finite(result.reflex?.sizeModifier, 0),
      levelContribution: finite(result.reflex?.levelContribution, level),
      includeArmorBonus: false,
    });
    result.will = rebuild(result.will, wis, templateDefenseBonus(actor, 'will'));
    result.flatFooted = {
      ...result.reflex,
      total: Math.max(1, result.reflex.total - Math.max(0, dex)),
      abilityMod: Math.min(0, dex),
    };
    return result;
  };
  Object.defineProperty(DefenseCalculator, DEFENSE_PATCHED, { value: true });
}

async function repairFollowerDuplicateFeats() {
  if (!game.user?.isGM) return;
  for (const actor of Array.from(game.actors || []).filter(isFollower)) {
    const seen = new Set();
    const duplicates = [];
    for (const feat of Array.from(actor.items || []).filter(item => item.type === 'feat')) {
      const key = normalize(feat.name);
      if (seen.has(key)) duplicates.push(feat.id);
      else seen.add(key);
    }
    if (!duplicates.length) continue;
    await ActorEngine.deleteEmbeddedDocuments(actor, 'Item', duplicates, {
      source: 'follower-feat-deduplication',
    });
    swseLogger.log('[Follower NPC Sheet] Removed duplicate follower feats', {
      actor: actor.name,
      removed: duplicates.length,
    });
  }
}

export function registerFollowerNpcSheetParityHotfix() {
  if (globalThis[REGISTERED]) return;
  globalThis[REGISTERED] = true;
  patchFollowerDefenses();
  Hooks.once('ready', () => globalThis.setTimeout?.(() => repairFollowerDuplicateFeats(), 1000));
}
