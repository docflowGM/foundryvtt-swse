import { TransactionEngine } from "/systems/foundryvtt-swse/scripts/engine/store/transaction-engine.js";
import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";
import { LedgerService } from "/systems/foundryvtt-swse/scripts/engine/store/ledger-service.js";
import { rollSkill } from "/systems/foundryvtt-swse/scripts/rolls/skills.js";
import { resolveArmorData } from "/systems/foundryvtt-swse/scripts/items/armor-data-resolver.js";

const SYSTEM_ID = 'foundryvtt-swse';
const FLAG_SCOPE = 'swse';
const TECH_FLAG = 'techSpecialist';

const TECH_TRAITS = [
  { id: 'tech_armor_agile', tier: 'tech', category: 'armor', name: 'Agile Armor', benefit: "The armor's Maximum Dexterity Bonus increases by 1.", dc: 20, value: 1, update: { kind: 'maxDex', amount: 1 } },
  { id: 'tech_armor_fortifying', tier: 'tech', category: 'armor', name: 'Fortifying Armor', benefit: "The armor's equipment bonus to Fortitude Defense increases by 1.", dc: 20, value: 1, update: { kind: 'fortEquipment', amount: 1 } },
  { id: 'tech_armor_protective', tier: 'tech', category: 'armor', name: 'Protective Armor', benefit: "The armor's armor bonus to Reflex Defense increases by 1.", dc: 20, value: 1, update: { kind: 'armorReflex', amount: 1 } },

  { id: 'tech_device_strength', tier: 'tech', category: 'device', name: 'Enhanced Strength', benefit: "Increase the device's Strength score by 2.", dc: 20, value: 2, update: { kind: 'deviceStrength', amount: 2 } },
  { id: 'tech_device_durability', tier: 'tech', category: 'device', name: 'Improved Durability', benefit: "The device's Damage Reduction increases by 1 and it gains extra Hit Points equal to one-quarter of its maximum Hit Points.", dc: 20, value: 1, update: { kind: 'deviceDurability', amount: 1 } },
  { id: 'tech_device_mastercraft', tier: 'tech', category: 'device', name: 'Mastercraft Device', benefit: "Skill checks made using the device gain a +1 equipment bonus, or its existing equipment bonus increases by 1.", dc: 20, value: 1, update: { kind: 'equipmentSkillBonus', amount: 1 } },
  { id: 'tech_device_upgrade_slot', tier: 'tech', category: 'device', name: 'Additional Upgrade Slot', benefit: 'Install one additional upgrade slot. This modification can be made only once.', dc: 20, value: 1, unique: true, update: { kind: 'upgradeSlot', amount: 1 } },

  { id: 'tech_droid_dexterity', tier: 'tech', category: 'droid', name: 'Enhanced Dexterity', benefit: "Increase the droid's Dexterity score by 2.", dc: 20, value: 2, update: { kind: 'ability', ability: 'dex', amount: 2 } },
  { id: 'tech_droid_intelligence', tier: 'tech', category: 'droid', name: 'Enhanced Intelligence', benefit: "Increase the droid's Intelligence score by 2.", dc: 20, value: 2, update: { kind: 'ability', ability: 'int', amount: 2 } },
  { id: 'tech_droid_strength', tier: 'tech', category: 'droid', name: 'Enhanced Strength', benefit: "Increase the droid's Strength score by 2.", dc: 20, value: 2, update: { kind: 'ability', ability: 'str', amount: 2 } },

  { id: 'tech_vehicle_dexterity', tier: 'tech', category: 'vehicle', name: 'Enhanced Dexterity', benefit: "Increase the vehicle's Dexterity score by 2.", dc: 20, value: 2, update: { kind: 'vehicleAbility', ability: 'dex', amount: 2 } },
  { id: 'tech_vehicle_shields', tier: 'tech', category: 'vehicle', name: 'Improved Shields', benefit: "Increase the vehicle's Shield Rating by 5.", dc: 20, value: 5, update: { kind: 'shieldRating', amount: 5 } },
  { id: 'tech_vehicle_speed', tier: 'tech', category: 'vehicle', name: 'Improved Speed', benefit: "Increase the vehicle's speed by one-quarter of its base speed, minimum 1 square.", dc: 20, value: 0.25, update: { kind: 'speedMultiplier', amount: 0.25, minimum: 1 } },

  { id: 'tech_weapon_accuracy', tier: 'tech', category: 'weapon', name: 'Improved Accuracy', benefit: 'The weapon gains a +1 equipment bonus on attack rolls.', dc: 20, value: 1, update: { kind: 'weaponAttack', amount: 1 } },
  { id: 'tech_weapon_damage', tier: 'tech', category: 'weapon', name: 'Improved Damage', benefit: 'The weapon deals +2 points of damage with a successful hit.', dc: 20, value: 2, update: { kind: 'weaponDamage', amount: 2 } },
  { id: 'tech_weapon_selective_fire', tier: 'tech', category: 'weapon', name: 'Selective Fire', benefit: 'An autofire-only ranged weapon can fire single shots, or a single-shot weapon can gain autofire mode.', dc: 20, value: 1, update: { kind: 'selectiveFire', amount: 1 } },

  { id: 'superior_armor_mobile', tier: 'superior', category: 'armor', superiorCategory: 'armor', name: 'Mobile Armor', benefit: 'Increase speed by 1 square; Medium or Heavy armor only.', dc: 30, value: 1, update: { kind: 'wearerSpeed', amount: 1 } },
  { id: 'superior_armor_reinforced', tier: 'superior', category: 'armor', superiorCategory: 'armor', name: 'Reinforced Armor', benefit: 'Grants Damage Reduction 2.', dc: 30, value: 2, update: { kind: 'damageReduction', amount: 2 } },
  { id: 'superior_armor_agile', tier: 'superior', category: 'armor', superiorCategory: 'armor', name: 'Superior Agile Armor', benefit: "The armor's maximum Dexterity bonus increases by +2.", dc: 30, value: 2, update: { kind: 'maxDex', amount: 2 } },
  { id: 'superior_armor_fortifying', tier: 'superior', category: 'armor', superiorCategory: 'armor', name: 'Superior Fortifying Armor', benefit: "The armor's equipment bonus to Fortitude Defense increases by +2.", dc: 30, value: 2, update: { kind: 'fortEquipment', amount: 2 } },
  { id: 'superior_armor_helmet', tier: 'superior', category: 'armor', superiorCategory: 'armor', name: 'Superior Helmet Package', benefit: 'Grants wearer a +5 equipment bonus on Perception checks.', dc: 30, value: 5, update: { kind: 'perceptionEquipment', amount: 5 } },
  { id: 'superior_armor_protective', tier: 'superior', category: 'armor', superiorCategory: 'armor', name: 'Superior Protective Armor', benefit: "The armor's armor bonus to Reflex Defense increases by +2.", dc: 30, value: 2, update: { kind: 'armorReflex', amount: 2 } },

  { id: 'superior_device_strength', tier: 'superior', category: 'device', superiorCategory: 'device', name: 'Superior Strength', benefit: "Increase the device's Strength score by +4.", dc: 30, value: 4, update: { kind: 'deviceStrength', amount: 4 } },
  { id: 'superior_device_durability', tier: 'superior', category: 'device', superiorCategory: 'device', name: 'Superior Durability', benefit: "The device's Damage Reduction increases by +2, and increase its Hit Points by 150%.", dc: 30, value: 2, update: { kind: 'deviceDurabilitySuperior', amount: 2 } },
  { id: 'superior_device_reinforced', tier: 'superior', category: 'device', superiorCategory: 'device', name: 'Reinforced Device', benefit: "The device's Break DC increases by +5.", dc: 30, value: 5, update: { kind: 'breakDc', amount: 5 } },
  { id: 'superior_device_mastercraft', tier: 'superior', category: 'device', superiorCategory: 'device', name: 'Superior Mastercraft', benefit: 'Skill checks made using the device gain a +2 equipment bonus, or its existing equipment bonus increases by +2.', dc: 30, value: 2, update: { kind: 'equipmentSkillBonus', amount: 2 } },

  { id: 'superior_droid_ion_coating', tier: 'superior', category: 'droid', superiorCategory: 'droid', name: 'Ion Dispersal Coating', benefit: 'Droid gains Damage Reduction 5 against Ion damage.', dc: 30, value: 5, update: { kind: 'ionDr', amount: 5 } },
  { id: 'superior_droid_dexterity', tier: 'superior', category: 'droid', superiorCategory: 'droid', name: 'Superior Ability: Dexterity', benefit: "Increase the droid's Dexterity score by +4.", dc: 30, value: 4, update: { kind: 'ability', ability: 'dex', amount: 4 } },
  { id: 'superior_droid_intelligence', tier: 'superior', category: 'droid', superiorCategory: 'droid', name: 'Superior Ability: Intelligence', benefit: "Increase the droid's Intelligence score by +4.", dc: 30, value: 4, update: { kind: 'ability', ability: 'int', amount: 4 } },
  { id: 'superior_droid_strength', tier: 'superior', category: 'droid', superiorCategory: 'droid', name: 'Superior Ability: Strength', benefit: "Increase the droid's Strength score by +4.", dc: 30, value: 4, update: { kind: 'ability', ability: 'str', amount: 4 } },

  { id: 'superior_vehicle_dexterity', tier: 'superior', category: 'vehicle', superiorCategory: 'vehicle', name: 'Superior Ability: Dexterity', benefit: "Increase the vehicle's Dexterity by +4.", dc: 30, value: 4, update: { kind: 'vehicleAbility', ability: 'dex', amount: 4 } },
  { id: 'superior_vehicle_strength', tier: 'superior', category: 'vehicle', superiorCategory: 'vehicle', name: 'Superior Ability: Strength', benefit: "Increase the vehicle's Strength by +2.", dc: 30, value: 2, update: { kind: 'vehicleAbility', ability: 'str', amount: 2 } },
  { id: 'superior_vehicle_sensors', tier: 'superior', category: 'vehicle', superiorCategory: 'vehicle', name: 'Superior Sensors', benefit: "Increase the vehicle's Perception modifier by +2.", dc: 30, value: 2, update: { kind: 'vehiclePerception', amount: 2 } },
  { id: 'superior_vehicle_shields', tier: 'superior', category: 'vehicle', superiorCategory: 'vehicle', name: 'Superior Shields', benefit: "Increase the vehicle's Shield Rating by +10.", dc: 30, value: 10, update: { kind: 'shieldRating', amount: 10 } },
  { id: 'superior_vehicle_speed', tier: 'superior', category: 'vehicle', superiorCategory: 'vehicle', name: 'Superior Speed', benefit: "Increase the vehicle's speed by one-third of its base speed, minimum 1 square.", dc: 30, value: 0.333, update: { kind: 'speedMultiplier', amount: 0.333, minimum: 1 } },

  { id: 'superior_weapon_accuracy', tier: 'superior', category: 'weapon', superiorCategory: 'weapon', name: 'Superior Accuracy', benefit: 'The weapon gains a +2 equipment bonus on attack rolls.', dc: 30, value: 2, update: { kind: 'weaponAttack', amount: 2 } },
  { id: 'superior_weapon_capacity', tier: 'superior', category: 'weapon', superiorCategory: 'weapon', name: 'Superior Capacity', benefit: "The weapon's power pack provides double the number of shots.", dc: 30, value: 2, update: { kind: 'capacityMultiplier', amount: 2 } },
  { id: 'superior_weapon_damage', tier: 'superior', category: 'weapon', superiorCategory: 'weapon', name: 'Superior Damage', benefit: 'The weapon deals +5 damage with a successful hit.', dc: 30, value: 5, update: { kind: 'weaponDamage', amount: 5 } },
  { id: 'superior_weapon_range', tier: 'superior', category: 'weapon', superiorCategory: 'weapon', name: 'Superior Range', benefit: "The weapon's ranges all increase by 50%.", dc: 30, value: 1.5, update: { kind: 'rangeMultiplier', amount: 1.5 } }
];

const TRAIT_BY_ID = new Map(TECH_TRAITS.map(t => [t.id, t]));

function normalize(value) {
  return String(value ?? '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

function compact(value) {
  return normalize(value).replace(/_/g, '');
}

function getItems(actor) {
  const c = actor?.items;
  if (!c) return [];
  if (Array.isArray(c)) return c.filter(Boolean);
  if (Array.isArray(c.contents)) return c.contents.filter(Boolean);
  if (typeof c.values === 'function') return Array.from(c.values()).filter(Boolean);
  if (typeof c.filter === 'function') {
    try { return c.filter(() => true).filter(Boolean); } catch (_err) { return []; }
  }
  return [];
}

function getItemId(item) {
  return item?.id ?? item?._id ?? null;
}

function getSubjectUuid(subject) {
  return subject?.uuid || (subject?.documentName && subject?.id ? `${subject.documentName}.${subject.id}` : subject?.id ?? subject?._id ?? subject?.name ?? null);
}

function pathGet(obj, path, fallback = undefined) {
  try { return foundry.utils.getProperty(obj, path) ?? fallback; }
  catch (_err) { return fallback; }
}

function currentNumber(subject, paths, fallback = 0) {
  for (const path of paths) {
    const value = Number(pathGet(subject, path));
    if (Number.isFinite(value)) return value;
  }
  return fallback;
}

function hasFeat(actor, name) {
  const wanted = normalize(name);
  return getItems(actor).some(item => item?.type === 'feat' && normalize(item.name) === wanted);
}

function findFeat(actor, name) {
  const wanted = normalize(name);
  return getItems(actor).find(item => item?.type === 'feat' && normalize(item.name) === wanted) ?? null;
}

function hasFeatPrefix(actor, prefix) {
  const wanted = normalize(prefix);
  return getItems(actor).some(item => item?.type === 'feat' && normalize(item.name).startsWith(wanted));
}

function actorMechanicsTotal(actor) {
  const derived = actor?.system?.derived?.skills;
  const row = Array.isArray(derived?.list) ? derived.list.find(r => r?.key === 'mechanics') : derived?.mechanics;
  if (Number.isFinite(Number(row?.total))) return Number(row.total);
  const skill = actor?.system?.skills?.mechanics || {};
  const intMod = Number(actor?.system?.derived?.attributes?.int?.mod ?? actor?.system?.attributes?.int?.mod ?? 0) || 0;
  const half = Number(actor?.system?.derived?.identity?.halfLevel ?? Math.floor((Number(actor?.system?.level) || 1) / 2)) || 0;
  return intMod + half + (skill.trained ? 5 : 0) + (skill.focused ? 5 : 0) + (Number(skill.miscMod) || 0);
}

function isTrainedMechanics(actor) {
  const skill = actor?.system?.skills?.mechanics;
  const derived = Array.isArray(actor?.system?.derived?.skills?.list)
    ? actor.system.derived.skills.list.find(r => r?.key === 'mechanics')
    : actor?.system?.derived?.skills?.mechanics;
  return skill?.trained === true || derived?.trained === true;
}

function resolveWalletActor(subjectActor, explicitWallet = null) {
  if (explicitWallet) return game?.actors?.get?.(explicitWallet.id) || explicitWallet;
  const ownerId = subjectActor?.system?.ownedByActorId || subjectActor?.flags?.swse?.ownedByActorId || subjectActor?.flags?.[SYSTEM_ID]?.ownedByActorId;
  if (ownerId && game?.actors?.get?.(ownerId)) return game.actors.get(ownerId);
  const userCharacter = game?.user?.character;
  if (userCharacter && userCharacter.isOwner !== false) return userCharacter;
  return subjectActor;
}

function classifyItemSubject(item) {
  if (!item) return 'device';
  const system = item.system || {};
  const text = [item.type, item.name, system.category, system.itemCategory, system.equipmentType, system.weaponType, system.weaponSubtype, system.family, system.group, system.subtype].filter(Boolean).join(' ').toLowerCase();
  if (item.type === 'armor' || text.includes('armor') || text.includes('shield')) return 'armor';
  if (item.type === 'weapon' || item.type === 'blaster' || text.includes('weapon') || text.includes('lightsaber') || text.includes('rifle') || text.includes('pistol')) return 'weapon';
  return 'device';
}

function classifyActorSubject(actor) {
  if (actor?.type === 'droid' || actor?.system?.isDroid === true) return 'droid';
  if (actor?.type === 'vehicle') return 'vehicle';
  return 'device';
}

function getSuperiorChoiceCategories(actor) {
  const categories = new Set();
  for (const item of getItems(actor)) {
    if (item?.type !== 'feat') continue;
    const name = String(item.name || '');
    const norm = normalize(name);
    if (norm === 'superior_tech') {
      const choice = item.flags?.swse?.selectedChoice ?? item.system?.selectedChoice ?? item.system?.choice ?? null;
      const actorChoice = actor?.flags?.swse?.choices?.superior_tech ?? actor?.flags?.[SYSTEM_ID]?.choices?.superior_tech ?? null;
      for (const value of [choice, actorChoice].flat(5).filter(Boolean)) categories.add(normalize(value));
    }
    const match = name.match(/Superior\s+Tech\s*\(([^)]+)\)/i);
    if (match) categories.add(normalize(match[1]));
  }
  return categories;
}

function superiorAllows(actor, subjectType) {
  if (!hasFeatPrefix(actor, 'Superior Tech')) return false;
  const choices = getSuperiorChoiceCategories(actor);
  if (!choices.size) return false;
  const aliases = {
    weapon: ['weapon', 'weapons', 'lightsaber', 'lightsabers'],
    armor: ['armor', 'armors'],
    device: ['device', 'devices'],
    droid: ['droid', 'droids'],
    vehicle: ['vehicle', 'vehicles', 'ship', 'ships', 'starship', 'starships']
  }[subjectType] || [subjectType];
  return aliases.some(alias => choices.has(normalize(alias)) || choices.has(compact(alias)));
}

function getTechFlag(subject) {
  return subject?.flags?.swse?.techSpecialist || subject?.flags?.[SYSTEM_ID]?.techSpecialist || {};
}

function getInstalledTraits(subject) {
  const flag = getTechFlag(subject);
  return Array.isArray(flag.traits) ? foundry.utils.deepClone(flag.traits).filter(Boolean) : [];
}

function activeTraitId(subject) {
  const flag = getTechFlag(subject);
  return flag.activeTraitId || null;
}

function signatureFlag(actor) {
  return actor?.flags?.swse?.techSpecialist?.signatureDevice || actor?.flags?.[SYSTEM_ID]?.techSpecialist?.signatureDevice || null;
}

function subjectIsSignature(actor, subject) {
  const sig = signatureFlag(actor);
  if (!sig) return false;
  const id = getItemId(subject) || subject?.id;
  const uuid = getSubjectUuid(subject);
  return (sig.itemId && sig.itemId === id) || (sig.uuid && sig.uuid === uuid) || (sig.actorId && sig.actorId === subject?.id);
}

function numberFromCreditText(value) {
  if (value === null || value === undefined) return 0;
  const text = String(value).replace(/,/g, '').trim();
  const match = text.match(/-?\d+(?:\.\d+)?/);
  const n = Number(match?.[0] ?? NaN);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function stripHtml(value) {
  return String(value ?? '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&#x27;|&#39;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

function descriptionText(subject) {
  const system = subject?.system || {};
  return [
    system.description?.value,
    system.description,
    system.longDescription,
    system.details,
    subject?.description
  ].map(stripHtml).filter(Boolean).join(' ');
}

function parseCostFromDescription(subject) {
  const text = descriptionText(subject);
  if (!text) return 0;
  const labeled = text.match(/(?:cost|price|value|market value)\s*:?\s*(?:credits?\s*)?([0-9][0-9,]*(?:\.[0-9]+)?)/i);
  if (labeled) return numberFromCreditText(labeled[1]);
  const creditTrail = text.match(/([0-9][0-9,]*(?:\.[0-9]+)?)\s*(?:credits?|cr\b|credit symbol|₡)/i);
  if (creditTrail) return numberFromCreditText(creditTrail[1]);
  return 0;
}

function baseCostInfo(subject) {
  const candidates = [
    ['finalCost', subject?.finalCost],
    ['system.cost', subject?.system?.cost],
    ['system.costNumeric', subject?.system?.costNumeric],
    ['system.baseCost', subject?.system?.baseCost],
    ['system.economics.cost', subject?.system?.economics?.cost],
    ['system.price', subject?.system?.price],
    ['system.value', subject?.system?.value],
    ['flags.swse.store.baseCost', subject?.flags?.swse?.store?.baseCost]
  ];
  for (const [source, value] of candidates) {
    const n = numberFromCreditText(value);
    if (n > 0) return { cost: n, source };
  }
  const parsed = parseCostFromDescription(subject);
  if (parsed > 0) return { cost: parsed, source: 'description' };
  return { cost: 0, source: 'minimum' };
}

function baseCost(subject) {
  return baseCostInfo(subject).cost;
}

function modificationCost(subject, tier) {
  const cost = baseCost(subject);
  if (tier === 'superior') return Math.max(Math.ceil(cost / 5), 2000);
  return Math.max(Math.ceil(cost / 10), 1000);
}

function modificationCostInfo(subject, tier) {
  const base = baseCostInfo(subject);
  const divisor = tier === 'superior' ? 5 : 10;
  const minimum = tier === 'superior' ? 2000 : 1000;
  const computed = base.cost > 0 ? Math.ceil(base.cost / divisor) : 0;
  const cost = Math.max(computed, minimum);
  return {
    cost,
    baseCost: base.cost,
    source: base.source,
    minimum,
    formula: tier === 'superior' ? '1/5 item cost or 2,000 credits, whichever is higher' : '1/10 item cost or 1,000 credits, whichever is higher'
  };
}

function isDuplicateBlocked(trait, installed, signatureSecond = false) {
  if (!trait) return true;
  if (installed.some(entry => entry?.traitId === trait.id)) return true;
  if (trait.unique && installed.some(entry => entry?.update?.kind === trait.update?.kind)) return true;
  if (!signatureSecond && installed.length > 0) return true;
  if (signatureSecond && installed.length >= 2) return true;
  return false;
}

function traitAppliesToSubject(trait, subjectType, actor) {
  if (!trait) return false;
  if (trait.category !== subjectType) return false;
  if (trait.tier !== 'superior') return true;
  return superiorAllows(actor, subjectType);
}

function buildTraitOptions(actor, subject, subjectType, signatureSecond = false) {
  const installed = getInstalledTraits(subject);
  return TECH_TRAITS
    .filter(trait => traitAppliesToSubject(trait, subjectType, actor))
    .map(trait => {
      const costInfo = modificationCostInfo(subject, trait.tier);
      return {
        ...trait,
        cost: costInfo.cost,
        costInfo,
        disabled: isDuplicateBlocked(trait, installed, signatureSecond),
        installed: installed.some(entry => entry?.traitId === trait.id),
        tierLabel: trait.tier === 'superior' ? 'Superior Tech' : 'Tech Specialist'
      };
    });
}

function addSet(plan, path, value) {
  plan[path] = value;
}

function itemUpdateBase(subject) {
  return { _id: getItemId(subject) };
}

function applyTraitSystemUpdatesToItem(update, subject, trait, sign = 1) {
  const kind = trait?.update?.kind;
  const rawAmount = Number(trait?.update?.amount ?? trait?.value ?? 0) || 0;
  const amount = rawAmount * (Number(sign) < 0 ? -1 : 1);
  if (kind === 'weaponAttack') update['system.attackBonus'] = currentNumber(subject, ['system.attackBonus', 'system.combat.attack.bonus'], 0) + amount;
  if (kind === 'weaponDamage') update['system.flatDamageBonus'] = currentNumber(subject, ['system.flatDamageBonus', 'system.damageFlatBonus', 'system.combat.damage.bonus'], 0) + amount;
  if (kind === 'maxDex') {
    const armor = subject?.type === 'armor' ? resolveArmorData(subject) : null;
    const next = (armor?.maxDexBonus ?? currentNumber(subject, ['system.maxDexBonus', 'system.maxDex', 'system.limits.maxDex'], 0)) + amount;
    update['system.maxDexBonus'] = next;
    update['system.maxDex'] = next === null ? 999 : next;
  }
  if (kind === 'fortEquipment') {
    const armor = subject?.type === 'armor' ? resolveArmorData(subject) : null;
    const next = (armor?.fortitudeBonus ?? currentNumber(subject, ['system.fortitudeBonus', 'system.fortBonus'], 0)) + amount;
    update['system.fortitudeBonus'] = next;
    update['system.fortBonus'] = next;
  }
  if (kind === 'armorReflex') {
    const armor = subject?.type === 'armor' ? resolveArmorData(subject) : null;
    const next = (armor?.reflexBonus ?? currentNumber(subject, ['system.defenseBonus', 'system.reflexBonus', 'system.armorBonus'], 0)) + amount;
    update['system.defenseBonus'] = next;
    update['system.reflexBonus'] = next;
    update['system.armorBonus'] = next;
  }
  if (kind === 'upgradeSlot') update['system.upgradeSlots'] = currentNumber(subject, ['system.upgradeSlots'], 0) + amount;
  if (kind === 'damageReduction') update['system.damageReduction'] = currentNumber(subject, ['system.damageReduction', 'system.dr'], 0) + amount;
  if (kind === 'selectiveFire') {
    update['system.selectiveFire'] = Number(sign) < 0 ? false : true;
    update['flags.swse.selectiveFire'] = Number(sign) < 0 ? false : true;
  }
  if (kind === 'capacityMultiplier') update['flags.swse.capacityMultiplier'] = Number(sign) < 0 ? null : rawAmount;
  if (kind === 'rangeMultiplier') update['flags.swse.rangeMultiplier'] = Number(sign) < 0 ? null : rawAmount;
  if (kind === 'wearerSpeed') update['flags.swse.wearerSpeedBonus'] = currentNumber(subject, ['flags.swse.wearerSpeedBonus'], 0) + amount;
  if (kind === 'perceptionEquipment') update['flags.swse.perceptionEquipmentBonus'] = currentNumber(subject, ['flags.swse.perceptionEquipmentBonus'], 0) + amount;
  if (kind === 'equipmentSkillBonus') update['flags.swse.equipmentSkillBonus'] = currentNumber(subject, ['flags.swse.equipmentSkillBonus'], 0) + amount;
  if (kind === 'breakDc') update['flags.swse.breakDcBonus'] = currentNumber(subject, ['flags.swse.breakDcBonus'], 0) + amount;
  if (kind?.startsWith?.('device') || kind === 'deviceStrength') update[`flags.swse.techSpecialist.device.${kind}`] = amount;
}

function applyTraitSystemUpdatesToActor(set, subject, trait, sign = 1) {
  const kind = trait?.update?.kind;
  const rawAmount = Number(trait?.update?.amount ?? trait?.value ?? 0) || 0;
  const amount = rawAmount * (Number(sign) < 0 ? -1 : 1);
  const ability = trait?.update?.ability;
  if (kind === 'ability' && ability) {
    addSet(set, `system.attributes.${ability}.enhancement`, currentNumber(subject, [`system.attributes.${ability}.enhancement`], 0) + amount);
  }
  if (kind === 'vehicleAbility' && ability) {
    addSet(set, `flags.swse.techSpecialist.abilityEnhancements.${ability}`, currentNumber(subject, [`flags.swse.techSpecialist.abilityEnhancements.${ability}`], 0) + amount);
  }
  if (kind === 'shieldRating') addSet(set, 'system.shieldRating', currentNumber(subject, ['system.shieldRating', 'system.sr'], 0) + amount);
  if (kind === 'speedMultiplier') addSet(set, 'flags.swse.techSpecialist.speedMultiplierBonus', Number(sign) < 0 ? 0 : Number(trait.update.amount || 0));
  if (kind === 'vehiclePerception') addSet(set, 'flags.swse.techSpecialist.perceptionBonus', currentNumber(subject, ['flags.swse.techSpecialist.perceptionBonus'], 0) + amount);
  if (kind === 'ionDr') addSet(set, 'flags.swse.techSpecialist.ionDamageReduction', currentNumber(subject, ['flags.swse.techSpecialist.ionDamageReduction'], 0) + amount);
}

function makeTraitRecord({ trait, cost, dc, rollTotal, sourceFeat, signatureSecond = false }) {
  return {
    id: foundry.utils.randomID(),
    traitId: trait.id,
    name: trait.name,
    tier: trait.tier,
    category: trait.category,
    benefit: trait.benefit,
    update: trait.update || null,
    sourceFeat,
    costPaid: cost,
    dc,
    rollTotal,
    success: true,
    signatureSecond: !!signatureSecond,
    installedAt: game?.time?.worldTime ?? Date.now()
  };
}

async function chatTake10(actor, total, dc, trait) {
  try {
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor }),
      content: `<div class="swse-chat-card"><h3>Tech Specialist Modification</h3><p><strong>${trait.name}</strong></p><p>Mechanics Take 10 total: <strong>${total}</strong> vs DC ${dc}</p></div>`
    });
  } catch (_err) {}
}

async function rollMechanics(actor, { dc, take10 = false, trait } = {}) {
  if (take10) {
    const total = 10 + actorMechanicsTotal(actor);
    await chatTake10(actor, total, dc, trait);
    return { total, success: total >= dc, take10: true };
  }
  const roll = await rollSkill(actor, 'mechanics', { dc, showDialog: false, skillUse: { key: 'tech-specialist-modification', label: 'Tech Specialist Modification' } });
  const total = Number(roll?.total ?? 0);
  return { total, success: total >= dc, take10: false };
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatCredits(value) {
  return `${Number(value || 0).toLocaleString()} cr`;
}

async function chooseTraitDialog({ actor, subject, subjectType, options, isSignature, canTake10 }) {
  const enabled = options.filter(o => !o.disabled);
  if (!enabled.length) {
    ui.notifications.warn('No legal Tech Specialist traits are available for this item or asset.');
    return null;
  }
  const firstEnabledId = enabled[0]?.id;
  const groups = [
    { tier: 'tech', label: 'Tech Specialist traits', hint: 'Cost: 1/10 item cost or 1,000 credits, whichever is higher. DC 20 Mechanics.' },
    { tier: 'superior', label: 'Superior Tech traits', hint: 'Cost: 1/5 item cost or 2,000 credits, whichever is higher. DC 30 Mechanics.' }
  ];
  const groupRows = groups.map(group => {
    const traits = options.filter(trait => trait.tier === group.tier);
    if (!traits.length) return '';
    const rows = traits.map(trait => `
      <label class="swse-tech-trait-row ${trait.disabled ? 'disabled' : ''}">
        <input type="radio" name="traitId" value="${escapeHtml(trait.id)}" ${trait.disabled ? 'disabled' : ''} ${trait.id === firstEnabledId ? 'checked' : ''}>
        <span class="swse-tech-trait-name">${escapeHtml(trait.name)}</span>
        <span class="swse-tech-trait-description">${escapeHtml(trait.benefit)}</span>
        <span class="swse-tech-trait-cost">${formatCredits(trait.cost)}</span>
        <small class="swse-tech-trait-meta">${escapeHtml(trait.tierLabel)} · DC ${Number(trait.dc || 0)} · ${escapeHtml(trait.costInfo?.formula || '')}${trait.costInfo?.source === 'minimum' ? ' · minimum used because no item cost was found' : ''}</small>
      </label>`).join('');
    return `<section class="swse-tech-trait-group"><h4>${escapeHtml(group.label)}</h4><p>${escapeHtml(group.hint)}</p>${rows}</section>`;
  }).join('');
  const take10Row = canTake10 ? `<label class="swse-tech-take10"><input type="checkbox" name="take10" checked> Take 10 with Signature Device</label>` : '';
  const costSource = enabled[0]?.costInfo?.source || 'minimum';
  const baseLabel = enabled[0]?.costInfo?.baseCost ? `Base cost detected: ${formatCredits(enabled[0].costInfo.baseCost)} (${escapeHtml(costSource)}).` : 'No base cost detected; minimum modification cost applies.';
  const content = `<form class="swse-tech-specialist-dialog">
    <p><strong>${escapeHtml(actor.name)}</strong> will modify <strong>${escapeHtml(subject.name)}</strong>. Credits are spent before the Mechanics check; on failure the money is lost.</p>
    <p class="hint">${baseLabel} GM determines the required downtime.</p>
    <div class="swse-tech-trait-list">${groupRows}</div>
    ${take10Row}
    ${isSignature ? '<p class="hint">Signature Device: this item may hold two Tech Specialist traits, but only one Signature trait is active at a time.</p>' : ''}
  </form>`;
  return new Promise(resolve => {
    let settled = false;
    new Dialog({
      title: `Tech Specialist: ${subject.name}`,
      content,
      buttons: {
        apply: {
          label: 'Attempt Modification',
          callback: html => {
            settled = true;
            const root = html?.[0] || html;
            const traitId = root.querySelector?.('input[name="traitId"]:checked')?.value;
            const take10 = root.querySelector?.('input[name="take10"]')?.checked === true;
            resolve({ traitId, take10 });
          }
        },
        cancel: { label: 'Cancel', callback: () => { settled = true; resolve(null); } }
      },
      default: 'apply',
      close: () => { if (!settled) resolve(null); }
    }).render(true);
  });
}
function resolvePriorSignatureSubject(actor, signature) {
  if (!signature) return null;
  if (signature.itemId && actor?.items?.get) {
    const item = actor.items.get(signature.itemId);
    if (item) return { subject: item, subjectKind: 'item' };
  }
  if (signature.actorId && game?.actors?.get?.(signature.actorId)) return { subject: game.actors.get(signature.actorId), subjectKind: 'actor' };
  if (signature.uuid && typeof fromUuidSync === 'function') {
    try {
      const subject = fromUuidSync(signature.uuid);
      if (subject) return { subject, subjectKind: subject.documentName === 'Actor' ? 'actor' : 'item' };
    } catch (_err) {}
  }
  return null;
}

async function clearFormerSignatureDevice(actor, signature) {
  const resolved = resolvePriorSignatureSubject(actor, signature);
  if (!resolved?.subject) return;
  const subject = resolved.subject;
  const installed = getInstalledTraits(subject);
  const signatureTraitIds = new Set(installed.filter(entry => entry?.signatureSecond === true).map(entry => entry.id));
  const keep = installed.filter(entry => !signatureTraitIds.has(entry.id));
  const activeId = activeTraitId(subject);
  const nextActive = keep[0]?.id || null;
  if (resolved.subjectKind === 'actor') {
    const set = {
      [`flags.${FLAG_SCOPE}.${TECH_FLAG}.signatureDevice`]: false,
      [`flags.${FLAG_SCOPE}.${TECH_FLAG}.traits`]: keep,
      [`flags.${FLAG_SCOPE}.${TECH_FLAG}.activeTraitId`]: nextActive
    };
    for (const entry of installed) {
      if (signatureTraitIds.has(entry.id) || entry.id === activeId) applyTraitSystemUpdatesToActor(set, subject, TRAIT_BY_ID.get(entry.traitId), -1);
    }
    if (nextActive) {
      const next = keep.find(entry => entry.id === nextActive);
      if (next) applyTraitSystemUpdatesToActor(set, subject, TRAIT_BY_ID.get(next.traitId), 1);
    }
    await subject.update(set);
    return;
  }
  const update = itemUpdateBase(subject);
  update[`flags.${FLAG_SCOPE}.${TECH_FLAG}.signatureDevice`] = false;
  update[`flags.${FLAG_SCOPE}.${TECH_FLAG}.traits`] = keep;
  update[`flags.${FLAG_SCOPE}.${TECH_FLAG}.activeTraitId`] = nextActive;
  for (const entry of installed) {
    if (signatureTraitIds.has(entry.id) || entry.id === activeId) applyTraitSystemUpdatesToItem(update, subject, TRAIT_BY_ID.get(entry.traitId), -1);
  }
  if (nextActive) {
    const next = keep.find(entry => entry.id === nextActive);
    if (next) applyTraitSystemUpdatesToItem(update, subject, TRAIT_BY_ID.get(next.traitId), 1);
  }
  await subject.update(update);
}

export class TechSpecialistModificationService {
  static get traits() { return TECH_TRAITS; }

  static hasFeat(actor, name) { return hasFeat(actor, name); }

  static resolveWalletActor(subjectActor, explicitWallet = null) { return resolveWalletActor(subjectActor, explicitWallet); }

  static classifySubject(subject, options = {}) {
    if (options.subjectType) return options.subjectType;
    if (subject?.documentName === 'Actor' || subject?.type === 'droid' || subject?.type === 'vehicle') return classifyActorSubject(subject);
    return classifyItemSubject(subject);
  }

  static getUiContext(actor, subject, options = {}) {
    const subjectType = this.classifySubject(subject, options);
    const hasTech = hasFeat(actor, 'Tech Specialist');
    const hasSignature = hasFeat(actor, 'Signature Device');
    const hasSuperior = hasFeatPrefix(actor, 'Superior Tech');
    const isSignature = hasSignature && subjectIsSignature(actor, subject);
    const installed = getInstalledTraits(subject);
    const optionsList = hasTech ? buildTraitOptions(actor, subject, subjectType, isSignature && installed.length === 1) : [];
    const activeId = activeTraitId(subject) || installed[0]?.id || null;
    return {
      canUse: !!(actor && subject && hasTech),
      subjectType,
      hasTech,
      hasSignature,
      hasSuperior,
      isSignature,
      installedTraits: installed.map(entry => ({ ...entry, active: (activeId ? entry.id === activeId : installed[0]?.id === entry.id) })),
      canDesignateSignature: hasSignature && !isSignature,
      canInstall: hasTech && optionsList.some(o => !o.disabled),
      optionCount: optionsList.filter(o => !o.disabled).length,
      label: hasTech ? 'Tech Specialist' : 'Tech Specialist unavailable',
      hint: !hasTech ? 'Requires Tech Specialist.' : `${optionsList.filter(o => !o.disabled).length} available traits for ${subjectType}.`
    };
  }

  static async designateSignatureDevice(actor, subject, options = {}) {
    if (!hasFeat(actor, 'Signature Device')) {
      ui.notifications.warn('Signature Device feat required.');
      return { success: false, error: 'missing_signature_device_feat' };
    }
    const prior = signatureFlag(actor);
    if (prior && !subjectIsSignature(actor, subject)) {
      const ok = await Dialog.confirm({
        title: 'Change Signature Device?',
        content: `<p>You already have a Signature Device: <strong>${escapeHtml(prior.name || prior.uuid || 'Unknown Item')}</strong>.</p><p>Changing to <strong>${escapeHtml(subject.name)}</strong> removes the former Signature Device-only benefits. Credits already spent are not refunded.</p>`,
        yes: () => true,
        no: () => false,
        defaultYes: false
      });
      if (!ok) return { success: false, error: 'cancelled' };
      await clearFormerSignatureDevice(actor, prior);
    }
    const payload = {
      uuid: getSubjectUuid(subject),
      itemId: getItemId(subject) || null,
      actorId: subject?.documentName === 'Actor' ? subject.id : null,
      name: subject.name,
      subjectType: this.classifySubject(subject, options),
      designatedAt: game?.time?.worldTime ?? Date.now()
    };
    await actor.setFlag(FLAG_SCOPE, `${TECH_FLAG}.signatureDevice`, payload);
    if (subject?.setFlag) await subject.setFlag(FLAG_SCOPE, `${TECH_FLAG}.signatureDevice`, true);
    ui.notifications.info(`${subject.name} designated as Signature Device.`);
    return { success: true };
  }

  static async toggleActiveSignatureTrait(actor, subject, traitRecordId) {
    const installed = getInstalledTraits(subject);
    const next = installed.find(entry => entry.id === traitRecordId);
    if (!next) return { success: false, error: 'trait_not_found' };
    const previousId = activeTraitId(subject) || installed[0]?.id || null;
    if (previousId === traitRecordId) return { success: true, unchanged: true };
    const previous = installed.find(entry => entry.id === previousId);
    if (subject?.documentName === 'Actor') {
      const set = { [`flags.${FLAG_SCOPE}.${TECH_FLAG}.activeTraitId`]: traitRecordId };
      if (previous) applyTraitSystemUpdatesToActor(set, subject, TRAIT_BY_ID.get(previous.traitId), -1);
      applyTraitSystemUpdatesToActor(set, subject, TRAIT_BY_ID.get(next.traitId), 1);
      // Mechanical trait change → route through ActorEngine so derived data recalcs.
      await ActorEngine.updateActor(subject, set, { source: 'TechSpecialist.toggleActiveSignatureTrait' });
    } else {
      const update = { [`flags.${FLAG_SCOPE}.${TECH_FLAG}.activeTraitId`]: traitRecordId };
      if (previous) applyTraitSystemUpdatesToItem(update, subject, TRAIT_BY_ID.get(previous.traitId), -1);
      applyTraitSystemUpdatesToItem(update, subject, TRAIT_BY_ID.get(next.traitId), 1);
      // Mechanical trait change on an owned item → route through ActorEngine.
      if (subject?.actor) {
        await ActorEngine.updateOwnedItems(subject.actor, [{ _id: subject.id, ...update }]);
      } else {
        // @mutation-exception: world-item - unowned item, no actor to route through
        await subject.update(update);
      }
    }
    ui.notifications.info(`${subject.name} active Signature trait changed.`);
    return { success: true };
  }

  static async openModificationDialog({ actor, subject, subjectKind = 'item', subjectType = null, walletActor = null } = {}) {
    if (!actor || !subject) return { success: false, error: 'missing_actor_or_subject' };
    if (!hasFeat(actor, 'Tech Specialist')) {
      ui.notifications.warn('Tech Specialist feat required.');
      return { success: false, error: 'missing_tech_specialist' };
    }
    if (!isTrainedMechanics(actor)) {
      ui.notifications.warn('Tech Specialist requires training in Mechanics.');
      return { success: false, error: 'mechanics_not_trained' };
    }
    const type = subjectType || this.classifySubject(subject);
    const isSignature = hasFeat(actor, 'Signature Device') && subjectIsSignature(actor, subject);
    const installed = getInstalledTraits(subject);
    const signatureSecond = isSignature && installed.length === 1;
    const options = buildTraitOptions(actor, subject, type, signatureSecond);
    const chosen = await chooseTraitDialog({ actor, subject, subjectType: type, options, isSignature, canTake10: isSignature });
    if (!chosen?.traitId) return { success: false, error: 'cancelled' };
    const trait = TRAIT_BY_ID.get(chosen.traitId);
    if (!trait) return { success: false, error: 'unknown_trait' };
    const cost = modificationCost(subject, trait.tier);
    const dc = signatureSecond ? Math.max(30, trait.dc) : trait.dc;
    const payer = resolveWalletActor(subjectKind === 'actor' ? subject : actor, walletActor || actor);
    const funds = LedgerService.validateFunds(payer, cost);
    if (!funds.ok) {
      ui.notifications.warn(`Insufficient credits (have ${funds.current}, need ${funds.required}).`);
      return { success: false, error: 'insufficient_credits' };
    }
    const roll = await rollMechanics(actor, { dc, take10: chosen.take10 === true && isSignature, trait });
    const success = roll.success;
    if (!success) {
      const result = subjectKind === 'actor'
        ? await TransactionEngine.executeAssetCustomizationTransaction({ actor: payer, assetActor: subject, assetMutationPlan: { set: {} }, cost, transactionContext: 'owned-customization', reason: `Failed ${trait.name} modification`, audit: { techSpecialist: { traitId: trait.id, success: false, rollTotal: roll.total, dc } } }, { source: 'TechSpecialistModificationService.failure', validate: true, rederive: true })
        : await TransactionEngine.executeMutationTransaction({ actor: payer, mutationPlan: { update: { items: [] } }, cost, transactionContext: 'owned-customization', audit: { itemId: getItemId(subject), itemName: subject.name, techSpecialist: { traitId: trait.id, success: false, rollTotal: roll.total, dc } } }, { source: 'TechSpecialistModificationService.failure', validate: true, rederive: true });
      ui.notifications.warn(`${trait.name} failed. Credits spent are lost.`);
      return { success: false, paid: result.success, error: 'check_failed', rollTotal: roll.total, dc };
    }

    const record = makeTraitRecord({ trait, cost, dc, rollTotal: roll.total, sourceFeat: trait.tier === 'superior' ? 'Superior Tech' : 'Tech Specialist', signatureSecond });
    const previousActiveId = activeTraitId(subject) || installed[0]?.id || null;
    const previousActiveTrait = installed.find(entry => entry.id === previousActiveId);
    const nextTraits = [...installed, record];
    const activeId = signatureSecond ? record.id : (previousActiveId || record.id);
    let tx;
    if (subjectKind === 'actor') {
      const set = {
        [`flags.${FLAG_SCOPE}.${TECH_FLAG}.traits`]: nextTraits,
        [`flags.${FLAG_SCOPE}.${TECH_FLAG}.activeTraitId`]: activeId,
        [`flags.${FLAG_SCOPE}.${TECH_FLAG}.lastModifiedBy`]: actor.id
      };
      if (signatureSecond && previousActiveTrait) applyTraitSystemUpdatesToActor(set, subject, TRAIT_BY_ID.get(previousActiveTrait.traitId), -1);
      applyTraitSystemUpdatesToActor(set, subject, trait, 1);
      tx = await TransactionEngine.executeAssetCustomizationTransaction({ actor: payer, assetActor: subject, assetMutationPlan: { set }, cost, transactionContext: 'owned-customization', reason: `${trait.name} modification`, audit: { techSpecialist: { traitId: trait.id, traitName: trait.name, success: true, rollTotal: roll.total, dc } } }, { source: 'TechSpecialistModificationService.success', validate: true, rederive: true });
    } else {
      const update = itemUpdateBase(subject);
      update[`flags.${FLAG_SCOPE}.${TECH_FLAG}.traits`] = nextTraits;
      update[`flags.${FLAG_SCOPE}.${TECH_FLAG}.activeTraitId`] = activeId;
      update[`flags.${FLAG_SCOPE}.${TECH_FLAG}.lastModifiedBy`] = actor.id;
      if (signatureSecond && previousActiveTrait) applyTraitSystemUpdatesToItem(update, subject, TRAIT_BY_ID.get(previousActiveTrait.traitId), -1);
      applyTraitSystemUpdatesToItem(update, subject, trait, 1);
      tx = await TransactionEngine.executeMutationTransaction({ actor: payer, mutationPlan: { update: { items: [update] } }, cost, transactionContext: 'owned-customization', audit: { itemId: getItemId(subject), itemName: subject.name, techSpecialist: { traitId: trait.id, traitName: trait.name, success: true, rollTotal: roll.total, dc } } }, { source: 'TechSpecialistModificationService.success', validate: true, rederive: true });
    }
    if (!tx.success) {
      ui.notifications.error(`Tech Specialist transaction failed: ${tx.error}`);
      return { success: false, error: tx.error };
    }
    ui.notifications.info(`${trait.name} installed on ${subject.name}.`);
    return { success: true, transaction: tx, trait: record };
  }
}

export default TechSpecialistModificationService;
