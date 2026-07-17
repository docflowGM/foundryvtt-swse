/**
 * Runtime Bugfix Hotfixes
 *
 * Surgical runtime fixes for current v2 migration seams:
 * - attack-card damage buttons that lose virtual weapon context
 * - compact chat roll-card total overflow
 * - stale Armor Specialist Armor Mastery hydration from older generated data
 */

import { buildVirtualUnarmedWeapon } from "/systems/foundryvtt-swse/scripts/engine/combat/unarmed-attack-helper.js";
import { getSelfDestructDamage, hydrateDroidPart } from "/systems/foundryvtt-swse/scripts/data/droid-part-schema.js";
import { decodeCombatWorkflowContext } from "/systems/foundryvtt-swse/scripts/engine/combat/workflow/combat-context-serializer.js";
import { decodeDamageComponents } from "/systems/foundryvtt-swse/scripts/engine/combat/damage-component-rules.js";
import { TalentRegistry } from "/systems/foundryvtt-swse/scripts/registries/talent-registry.js";
import { TalentEffectEngine } from "/systems/foundryvtt-swse/scripts/engine/talent/talent-effect-engine.js";
import { RollEngine } from "/systems/foundryvtt-swse/scripts/engine/roll-engine.js";

const CHAT_LAYOUT_STYLE_ID = 'swse-chat-roll-total-layout-hotfix';
const ARMOR_SPECIALIST_KEYS = new Set(['armor-specialist', '17cec542331cb4e4']);
const BLOCKED_ARMOR_MASTERY_IDS = new Set(['4c236343b01ea763']);
let registered = false;
let fetchPatched = false;
let talentRegistryPatched = false;
let talentEffectDamagePatched = false;

function normalizeKey(value) {
  return String(value ?? '')
    .toLowerCase()
    .trim()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function normalizeName(value) {
  return String(value ?? '')
    .toLowerCase()
    .trim()
    .replace(/[\u2018\u2019']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function normalizeRoot(html) {
  if (html instanceof HTMLElement) return html;
  if (html?.[0] instanceof HTMLElement) return html[0];
  return null;
}

function actorFromId(id) {
  if (!id) return null;
  return game?.actors?.get?.(id)
    ?? canvas?.tokens?.placeables?.find?.(token => token.id === id || token.document?.id === id || token.actor?.id === id)?.actor
    ?? null;
}

function actorFromSpeaker(message) {
  try {
    const speaker = message?.speaker ?? message?.data?.speaker ?? null;
    return globalThis.ChatMessage?.getSpeakerActor?.(speaker) ?? actorFromId(speaker?.actor) ?? actorFromId(speaker?.token) ?? null;
  } catch (_err) {
    return null;
  }
}

function actorSize(actor) {
  return String(actor?.system?.size ?? actor?.system?.droidSystems?.size ?? actor?.system?.droidSize ?? 'medium').toLowerCase();
}

function buildVirtualDroidPartWeapon(actor, itemId) {
  const ruleId = String(itemId || '').replace(/^swse-droid-part-/, '');
  const part = hydrateDroidPart({ id: ruleId });
  const profile = part?.weaponProfile ?? {};
  const damage = profile.damageBySize
    ? getSelfDestructDamage(actorSize(actor), { miniaturized: profile.miniaturized === true })
    : (profile.damage ?? '1d6');

  return {
    id: itemId,
    name: profile.name ?? part?.name ?? 'Droid Part',
    type: 'weapon',
    img: actor?.img ?? 'icons/svg/aura.svg',
    flags: { swse: { virtual: true, droidPart: true, droidPartId: ruleId, selfDestruct: profile.selfDestruct === true } },
    system: {
      damage: damage || '1d6',
      damageType: profile.damageType ?? 'normal',
      attackAttribute: profile.mode === 'ranged' || profile.mode === 'area' ? 'dex' : 'str',
      meleeOrRanged: profile.mode === 'ranged' || profile.mode === 'area' ? 'ranged' : 'melee',
      weaponType: profile.weaponType ?? 'simple',
      weaponGroup: profile.weaponType ?? 'simple',
      proficiency: profile.weaponType ?? 'simple',
      range: profile.range ?? '',
      attackBonus: profile.attackBonus ?? 0,
      equipped: true,
      integrated: true,
      description: part?.description ?? ''
    }
  };
}

function boolFromDataset(value) {
  if (value === true || value === 'true') return true;
  if (value === false || value === 'false') return false;
  return null;
}

function mergeDamageButtonWorkflowContext(button, decoded = null) {
  const context = decoded && typeof decoded === 'object' ? { ...decoded } : {};
  const attack = { ...(context.attack ?? {}) };
  const damage = { ...(context.damage ?? {}) };
  const resources = { ...(context.resources ?? {}) };
  const tags = new Set(Array.isArray(context.contextTags) ? context.contextTags : []);

  for (const tag of String(button.dataset.contextTags || '').split('|')) {
    if (tag.trim()) tags.add(tag.trim());
  }

  if (button.dataset.workflowId) context.workflowId = context.workflowId ?? button.dataset.workflowId;
  if (button.dataset.actionId) context.actionId = context.actionId ?? button.dataset.actionId;
  if (button.dataset.attackMode) attack.mode = attack.mode ?? button.dataset.attackMode;
  if (button.dataset.target) context.targetId = context.targetId ?? button.dataset.target;
  if (button.dataset.actorId) context.actorId = context.actorId ?? button.dataset.actorId;
  if (button.dataset.weaponId || button.dataset.weapon) context.weaponId = context.weaponId ?? button.dataset.weaponId ?? button.dataset.weapon;

  const hit = button.dataset.hit;
  if (hit === 'true') damage.hit = true;
  else if (hit === 'false') damage.hit = false;
  else if (damage.hit === undefined) damage.hit = null;

  const buttonDamageTypes = String(button.dataset.damageTypes || '').split('|').map(v => v.trim()).filter(Boolean);
  if (button.dataset.damageType) damage.damageType = damage.damageType ?? button.dataset.damageType;
  if (buttonDamageTypes.length) damage.damageTypes = Array.from(new Set([...(Array.isArray(damage.damageTypes) ? damage.damageTypes : []), ...buttonDamageTypes]));

  const buttonComponents = decodeDamageComponents(button.dataset.damageComponents || '');
  if (buttonComponents.length) damage.damageComponents = buttonComponents;

  damage.crit = boolFromDataset(button.dataset.isCrit) ?? damage.crit;
  damage.natural1 = boolFromDataset(button.dataset.natural1) ?? damage.natural1;
  damage.natural20 = boolFromDataset(button.dataset.natural20) ?? damage.natural20;
  damage.critMultiplier = Number.parseInt(button.dataset.critMult, 10) || damage.critMultiplier || 2;

  attack.isArea = boolFromDataset(button.dataset.areaAttack) ?? attack.isArea;
  attack.isBurstFire = boolFromDataset(button.dataset.burstFire) ?? attack.isBurstFire;
  attack.isAutofire = boolFromDataset(button.dataset.autofire) ?? attack.isAutofire;
  attack.isStun = boolFromDataset(button.dataset.stun) ?? attack.isStun;
  attack.isIon = boolFromDataset(button.dataset.ion) ?? attack.isIon;
  resources.ammoCost = Number.parseInt(button.dataset.ammoCost, 10) || resources.ammoCost || 0;

  return { ...context, contextTags: [...tags], attack, damage, resources };
}

function isUnarmedRef(value, context = {}) {
  const text = `${value ?? ''} ${context?.weaponName ?? ''}`.toLowerCase();
  return text.includes('swse-virtual-unarmed') || text === 'unarmed' || text.includes('unarmed strike');
}

function itemFromActor(actor, itemId, context = {}) {
  if (!actor) return null;
  const id = String(itemId || context?.weaponId || '').trim();
  if (id === 'swse-virtual-unarmed' || id.startsWith('swse-virtual-unarmed') || isUnarmedRef(id, context)) {
    return buildVirtualUnarmedWeapon(actor, { id: id || 'swse-virtual-unarmed', name: context?.weaponName || 'Unarmed Strike' });
  }
  if (id.startsWith('swse-droid-part-')) return buildVirtualDroidPartWeapon(actor, id);
  return actor.items?.get?.(id) ?? actor.items?.find?.(item => item.id === id || item._id === id) ?? null;
}

function countTalentsNamed(actor, name) {
  const wanted = normalizeName(name);
  if (!wanted) return 0;
  try {
    return Array.from(actor?.items ?? []).filter(item => item?.type === 'talent' && normalizeName(item?.name) === wanted).length;
  } catch (_err) {
    return 0;
  }
}

function damageContextTarget(context = {}) {
  return context.target?.actor ?? context.targetActor ?? context.target ?? game?.user?.targets?.first?.()?.actor ?? null;
}

function targetIsDeniedDexForDamage(context = {}) {
  const target = damageContextTarget(context);
  return context.sneakAttack === true
    || context.targetFlatFooted === true
    || context.flatFootedTarget === true
    || context.deniedDex === true
    || context.targetDeniedDex === true
    || context.attack?.targetFlatFooted === true
    || context.attack?.targetDeniedDex === true
    || context.combatContext?.targetFlatFooted === true
    || context.combatContext?.attack?.targetFlatFooted === true
    || target?.system?.condition?.flatFooted === true
    || target?.system?.conditions?.flatFooted === true
    || target?.flags?.swse?.flatFooted === true
    || target?.flags?.['foundryvtt-swse']?.flatFooted === true;
}

function buildTalentDamageBonusFallback(actor, context = {}) {
  const bonusDice = [];
  const breakdown = [];
  const notifications = [];
  let flatBonus = 0;

  const sneakAttackCount = countTalentsNamed(actor, 'Sneak Attack');
  if (sneakAttackCount > 0 && targetIsDeniedDexForDamage(context)) {
    const formula = `${sneakAttackCount}d6`;
    bonusDice.push(formula);
    breakdown.push(`Sneak Attack +${formula}`);
  }

  const formulaParts = [...bonusDice];
  if (flatBonus !== 0) formulaParts.push(String(flatBonus));
  return {
    formula: formulaParts.join(' + '),
    bonusDice,
    flatBonus,
    breakdown,
    notifications
  };
}

async function rollDamageFromButton(event, button, message) {
  event.preventDefault();
  event.stopImmediatePropagation();

  const combatContext = mergeDamageButtonWorkflowContext(button, decodeCombatWorkflowContext(button.dataset.workflowContext));
  const actor = actorFromId(button.dataset.actorId)
    || actorFromId(button.dataset.attacker)
    || actorFromId(combatContext?.actorId)
    || actorFromSpeaker(message);
  const weaponId = button.dataset.weaponId || button.dataset.weapon || combatContext?.weaponId;
  const weapon = itemFromActor(actor, weaponId, combatContext);

  if (!actor || !weapon) {
    console.warn('[SWSE Chat Hotfix] Damage roll context could not be resolved.', {
      actorId: button.dataset.actorId || combatContext?.actorId || message?.speaker?.actor || '',
      weaponId,
      messageId: message?.id || null,
      combatContext
    });
    ui?.notifications?.warn?.('Damage roll context could not be resolved.');
    return;
  }

  try {
    globalThis.SWSE ??= {};
    globalThis.SWSE.RollEngine ??= RollEngine;
    const target = actorFromId(button.dataset.target) || actorFromId(combatContext?.targetId) || null;
    const { SWSERoll } = await import('/systems/foundryvtt-swse/scripts/combat/rolls/enhanced-rolls.js');
    await SWSERoll.rollDamage(actor, weapon, {
      target,
      isCritical: button.dataset.isCrit === 'true' || combatContext?.damage?.crit === true,
      critMultiplier: Number.parseInt(button.dataset.critMult, 10) || combatContext?.damage?.critMultiplier || 2,
      twoHanded: button.dataset.twoHanded === 'true',
      damageComponents: combatContext?.damage?.damageComponents ?? decodeDamageComponents(button.dataset.damageComponents || ''),
      combatContext,
      workflowContext: combatContext
    });
  } catch (err) {
    console.error('[SWSE Chat Hotfix] Damage roll failed.', err);
    ui?.notifications?.error?.('Damage roll failed. See console for details.');
  }
}

function bindDamageButtons(message, html) {
  const root = normalizeRoot(html);
  if (!root) return;
  root.querySelectorAll('.swse-roll-damage, .swse-roll-damage-btn').forEach(button => {
    if (!(button instanceof HTMLElement)) return;
    if (button.dataset.swseDamageHotfixBound === 'true') return;
    button.dataset.swseDamageHotfixBound = 'true';
    button.addEventListener('click', event => rollDamageFromButton(event, button, message), { capture: true });
  });
}

function installDamageButtonCapture() {
  Hooks.on('renderChatMessageHTML', (message, html) => bindDamageButtons(message, html));
}

function installChatRollCardLayoutFix() {
  const inject = () => {
    if (globalThis.document?.getElementById?.(CHAT_LAYOUT_STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = CHAT_LAYOUT_STYLE_ID;
    style.textContent = `
.chat-message .swse-chat-card[data-swse-chat-card-v2="true"] .total {
  grid-template-columns: minmax(40px, max-content) minmax(0, 1fr) auto;
  align-items: center;
  column-gap: 8px;
  row-gap: 5px;
  padding: 9px 10px 10px;
  min-width: 0;
}
.chat-message .swse-chat-card[data-swse-chat-card-v2="true"] .total .num {
  grid-column: 1;
  grid-row: 1;
  font-size: 34px;
  line-height: 1;
}
.chat-message .swse-chat-card[data-swse-chat-card-v2="true"] .total .label {
  grid-column: 2;
  grid-row: 1;
  min-width: 0;
  align-self: center;
  padding-bottom: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 9.5px;
  letter-spacing: 0.12em;
}
.chat-message .swse-chat-card[data-swse-chat-card-v2="true"] .total::after {
  grid-column: 3;
  grid-row: 1;
  justify-self: end;
}
.chat-message .swse-chat-card[data-swse-chat-card-v2="true"] .dmg-type {
  grid-column: 1 / -1;
  grid-row: 2;
  justify-self: end;
  max-width: 100%;
  white-space: normal;
  overflow-wrap: anywhere;
  text-align: right;
  padding: 2px 7px;
  font-size: 9px;
  letter-spacing: 0.1em;
}
@media (max-width: 420px) {
  .chat-message .swse-chat-card[data-swse-chat-card-v2="true"] .total .num { font-size: 30px; }
  .chat-message .swse-chat-card[data-swse-chat-card-v2="true"] .dmg-type { justify-self: start; text-align: left; }
}`;
    document.head?.appendChild?.(style);
  };

  if (globalThis.document?.head) inject();
  else Hooks.once('ready', inject);
}

function isRegistryUrl(resource) {
  const url = String(resource?.url ?? resource ?? '');
  return url.includes('/data/generated/talent-trees.registry.json') || url.includes('/data/fixes/talent-trees.registry.json');
}

function isArmorSpecialistTree(entry) {
  return [entry?.id, entry?.key, entry?.name, entry?.displayName].map(normalizeKey).some(key => ARMOR_SPECIALIST_KEYS.has(key));
}

function isBlockedArmorMasteryRef(ref) {
  const raw = String(ref ?? '').trim();
  return BLOCKED_ARMOR_MASTERY_IDS.has(raw) || normalizeName(raw) === 'armor-mastery';
}

function filterArmorSpecialistRegistry(data) {
  if (!Array.isArray(data)) return data;
  return data.map(entry => {
    if (!isArmorSpecialistTree(entry) || !Array.isArray(entry.talents)) return entry;
    const talents = entry.talents.filter(ref => !isBlockedArmorMasteryRef(ref));
    return { ...entry, talentCount: talents.length, talents };
  });
}

function installRegistryFetchFilter() {
  if (fetchPatched || typeof globalThis.fetch !== 'function') return;
  fetchPatched = true;
  const originalFetch = globalThis.fetch.bind(globalThis);
  globalThis.fetch = async (resource, options) => {
    const response = await originalFetch(resource, options);
    if (!isRegistryUrl(resource)) return response;
    try {
      const data = await response.clone().json();
      const filtered = filterArmorSpecialistRegistry(data);
      const headers = new Headers(response.headers);
      headers.set('content-type', 'application/json');
      return new Response(JSON.stringify(filtered), { status: response.status, statusText: response.statusText, headers });
    } catch (_err) {
      return response;
    }
  };
}

function talentTreeKeys(talent = {}) {
  return [
    talent?.treeId,
    talent?.treeName,
    talent?.talentTree,
    talent?.category,
    talent?.system?.treeId,
    talent?.system?.talentTreeId,
    talent?.system?.talent_tree_id,
    talent?.system?.talent_tree,
    talent?.system?.talentTree,
    talent?.system?.tree
  ].map(normalizeKey).filter(Boolean);
}

function isBlockedArmorMasteryTalent(talent) {
  if (!talent) return false;
  if (BLOCKED_ARMOR_MASTERY_IDS.has(String(talent.id || talent._id || ''))) return true;
  if (normalizeName(talent.name) !== 'armor-mastery') return false;
  const keys = talentTreeKeys(talent);
  return !keys.length || keys.some(key => ARMOR_SPECIALIST_KEYS.has(key));
}

function installTalentRegistryArmorFilter() {
  if (talentRegistryPatched) return;
  talentRegistryPatched = true;

  const originalGetById = TalentRegistry.getById?.bind(TalentRegistry);
  if (originalGetById) TalentRegistry.getById = id => BLOCKED_ARMOR_MASTERY_IDS.has(String(id || '')) ? null : originalGetById(id);

  const originalGetByName = TalentRegistry.getByName?.bind(TalentRegistry);
  if (originalGetByName) TalentRegistry.getByName = name => normalizeName(name) === 'armor-mastery' ? null : originalGetByName(name);

  const originalGetAll = TalentRegistry.getAll?.bind(TalentRegistry);
  if (originalGetAll) TalentRegistry.getAll = () => originalGetAll().filter(talent => !isBlockedArmorMasteryTalent(talent));

  const originalGetByTree = TalentRegistry.getByTree?.bind(TalentRegistry);
  if (originalGetByTree) {
    TalentRegistry.getByTree = treeRef => {
      const list = originalGetByTree(treeRef);
      if (!ARMOR_SPECIALIST_KEYS.has(normalizeKey(treeRef))) return list;
      return list.filter(talent => !isBlockedArmorMasteryTalent(talent));
    };
  }

  const originalSearch = TalentRegistry.search?.bind(TalentRegistry);
  if (originalSearch) TalentRegistry.search = predicate => originalSearch(predicate).filter(talent => !isBlockedArmorMasteryTalent(talent));
}

function installArmorSpecialistFilter() {
  installRegistryFetchFilter();
  installTalentRegistryArmorFilter();
}

function installTalentEffectDamageCompatibility() {
  if (talentEffectDamagePatched) return;
  talentEffectDamagePatched = true;

  if (typeof TalentEffectEngine.calculateDamageBonus !== 'function') {
    TalentEffectEngine.calculateDamageBonus = function calculateDamageBonus(actor, context = {}) {
      return buildTalentDamageBonusFallback(actor, context);
    };
  }

  if (typeof TalentEffectEngine.applyPostDamageEffects !== 'function') {
    TalentEffectEngine.applyPostDamageEffects = async function applyPostDamageEffects() {
      return { success: true, effects: [] };
    };
  }
}

export function registerRuntimeBugfixHotfixes() {
  if (registered) return false;
  registered = true;
  installChatRollCardLayoutFix();
  installArmorSpecialistFilter();
  installTalentEffectDamageCompatibility();
  installDamageButtonCapture();
  return true;
}

export default registerRuntimeBugfixHotfixes;
