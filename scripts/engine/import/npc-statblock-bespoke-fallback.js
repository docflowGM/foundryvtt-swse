const FORCE_PACK_IDS = Object.freeze(new Set([
  'foundryvtt-swse.forcepowers',
  'foundryvtt-swse.lightsaberformpowers'
]));

const BESPOKE_WEAPONS = Object.freeze(new Map([
  ['knife', { label: 'Knife', damageType: 'kinetic', tags: ['simple', 'melee', 'knife'] }],
  ['spear', { label: 'Spear', damageType: 'kinetic', tags: ['simple', 'melee', 'spear'] }],
  ['quarterstaff', { label: 'Quarterstaff', damageType: 'kinetic', tags: ['simple', 'melee', 'quarterstaff'] }],
  ['force pike', { label: 'Force Pike', damageType: 'kinetic', tags: ['advanced', 'melee', 'force-pike'] }],
  ['bayonet', { label: 'Bayonet', damageType: 'kinetic', tags: ['simple', 'melee', 'bayonet'] }],
  ['baton', { label: 'Baton', damageType: 'kinetic', tags: ['simple', 'melee', 'baton'] }],
  ['mace', { label: 'Mace', damageType: 'kinetic', tags: ['simple', 'melee', 'mace'] }],
  ['club', { label: 'Club', damageType: 'kinetic', tags: ['simple', 'melee', 'club'] }],
  ['combat gloves', { label: 'Combat Gloves', damageType: 'kinetic', tags: ['simple', 'melee', 'combat-gloves'] }]
]));

let forcePowerIndexPromise = null;

function cleanText(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function normalize(value) {
  return cleanText(value)
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/\*/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function parsePrintedDamage(raw) {
  const parentheticals = [...cleanText(raw).matchAll(/\(([^()]*)\)/g)].map((match) => match[1]);
  for (const text of parentheticals) {
    const match = text.match(/\b\d+d\d+(?:\s*(?:\+|-)\s*(?:\d+d\d+|\d+))*(?:\s*[x×*]\s*\d+)?\b/i);
    if (match) return cleanText(match[0]).replace(/×/g, 'x').replace(/\s+/g, '');
  }
  return null;
}

function parsePrintedAttackBonus(raw) {
  const match = cleanText(raw).match(/(?:^|\s)([+-]\d+)(?:\*+)?(?=\s|\()/);
  return match ? Number(match[1]) : null;
}

function stripAttackSyntax(raw) {
  return cleanText(raw)
    .replace(/\s+[+-]\d+(?:\s*\/\s*[+-]?\d+)*(?:\*+)?(?=\s|\()/, ' ')
    .replace(/\s*\([^)]*\)\s*/g, ' ')
    .replace(/\b(?:melee|ranged)\b\s*/i, ' ')
    .replace(/[,:;]+$/g, '')
    .trim();
}

function getDamageFormula(system = {}) {
  return cleanText(system.damageFormula ?? system.damage?.formula ?? system.damage ?? '');
}

function getDamageType(system = {}) {
  return cleanText(
    system.damageType
    ?? system.primaryType
    ?? system.damage?.type
    ?? system.damage?.primaryType
    ?? (Array.isArray(system.damageTypes) ? system.damageTypes[0] : '')
  );
}

function inferPrintedType(raw, fallback = '') {
  const text = cleanText(raw).toLowerCase();
  if (/\bstun\b/.test(text)) return 'stun';
  if (/\bion\b/.test(text)) return 'ion';
  if (/\bfire\b|\bflame\b|\bburning\b/.test(text)) return 'fire';
  if (/\bacid\b/.test(text)) return 'acid';
  if (/\bsonic\b/.test(text)) return 'sonic';
  if (/\benergy\b|\blightning\b|\belectric\b/.test(text)) return 'energy';
  return fallback;
}

function buildSingleTargetMetadata() {
  return {
    attackShape: 'single-target',
    attack: {
      isArea: false,
      isAutofire: false,
      isBurstFire: false,
      halfDamageOnMiss: false,
      noCriticalDouble: false,
      coverCanNegateMissDamage: false,
      attackRollMinimum: null,
      defense: 'reflex'
    },
    area: {
      shape: null,
      radius: null,
      size: null,
      originMode: null,
      targetPolicy: 'single'
    }
  };
}

async function buildForcePowerIndex() {
  const byName = new Map();
  for (const pack of game.packs ?? []) {
    const collection = String(pack?.collection ?? pack?.metadata?.id ?? '');
    if (!FORCE_PACK_IDS.has(collection) || pack?.documentName !== 'Item') continue;

    let index;
    try {
      index = await pack.getIndex({ fields: [
        'name',
        'type',
        'system.damage',
        'system.damageFormula',
        'system.damageType',
        'system.damageTypes',
        'system.primaryType'
      ] });
    } catch (error) {
      console.warn('[SWSE NPC Damage] Unable to index Force power pack', collection, error);
      continue;
    }

    for (const entry of index ?? []) {
      const key = normalize(entry.name);
      if (!key) continue;
      const list = byName.get(key) ?? [];
      list.push({ pack, entry });
      byName.set(key, list);
    }
  }
  return byName;
}

async function getForcePowerIndex() {
  forcePowerIndexPromise ??= buildForcePowerIndex();
  return forcePowerIndexPromise;
}

async function resolveForcePower(raw, itemName) {
  const index = await getForcePowerIndex();
  const names = [...new Set([normalize(itemName), normalize(stripAttackSyntax(raw))].filter(Boolean))];

  for (const name of names) {
    const candidates = index.get(name) ?? [];
    if (candidates.length !== 1) continue;
    const document = await candidates[0].pack.getDocument(candidates[0].entry._id);
    if (document) return document;
  }
  return null;
}

function buildHydratedFlags(baseFlags, {
  raw,
  actorName,
  attackName,
  slug,
  hydrationPolicy,
  sourceType,
  sourceUuid,
  printedFormula,
  printedAttackBonus
}) {
  return foundry.utils.mergeObject(baseFlags ?? {}, {
    swse: {
      import: {
        sourceAuthority: 'statblock',
        raw,
        damageProfile: {
          matched: true,
          slug,
          actorName: actorName ?? null,
          attackName,
          confidence: 'printed-statblock',
          hydrationPolicy,
          reviewRequired: false,
          printedFormula,
          formulaMode: 'printed-override',
          printedAttackBonus,
          printedAttackHydratePolicy: 'metadata-only',
          sourceWeaponUuid: sourceUuid ?? null
        }
      },
      damageProfile: {
        slug,
        sourceType,
        confidence: 'printed-statblock',
        hydrationPolicy,
        sourceWeaponUuid: sourceUuid ?? null,
        printedFormula,
        formulaMode: 'printed-override',
        printedAttackBonus,
        printedAttackHydratePolicy: 'metadata-only'
      }
    }
  }, { inplace: false, recursive: true });
}

function applyCanonicalDamageFields(hydrated, {
  raw,
  actorName,
  attackName,
  slug,
  formula,
  damageType,
  delivery,
  hydrationPolicy,
  sourceType,
  sourceUuid = null,
  sourceBaseFormula = null,
  tags = []
}) {
  const printedAttackBonus = parsePrintedAttackBonus(raw);
  const metadata = buildSingleTargetMetadata();

  hydrated.system.damage = formula;
  hydrated.system.damageFormula = formula;
  hydrated.system.damageType = damageType;
  hydrated.system.damageTypes = [damageType];
  hydrated.system.primaryType = damageType;
  hydrated.system.delivery = delivery;
  hydrated.system.attackShape = metadata.attackShape;
  hydrated.system.scale = 'character';
  hydrated.system.attack = metadata.attack;
  hydrated.system.area = metadata.area;
  hydrated.system.components = [{
    key: 'statblock-printed',
    label: attackName,
    formula,
    type: damageType,
    tags: ['base', damageType, 'statblock-printed']
  }];
  hydrated.system.riders = [];
  hydrated.system.sourceWeaponUuid = sourceUuid;
  hydrated.system.sourceWeaponBaseFormula = sourceBaseFormula;
  hydrated.system.damageProfileSlug = slug;
  hydrated.system.statblockHydrated = true;
  hydrated.system.statblockHydrationConfidence = 'printed-statblock';
  hydrated.system.statblockHydrationPolicy = hydrationPolicy;
  hydrated.system.statblockPrintedFormula = formula;
  hydrated.system.statblockFormulaMode = 'printed-override';
  hydrated.system.statblockPrintedAttackBonus = printedAttackBonus;
  hydrated.system.statblockPrintedAttackHydratePolicy = 'metadata-only';
  hydrated.system.sourceAuthority = 'statblock';
  hydrated.system.playModeReference = true;
  hydrated.system.tags = [...new Set([...(hydrated.system.tags ?? []), 'statblock', 'printed-override', ...tags])];
  hydrated.flags = buildHydratedFlags(hydrated.flags, {
    raw,
    actorName,
    attackName,
    slug,
    hydrationPolicy,
    sourceType,
    sourceUuid,
    printedFormula: formula,
    printedAttackBonus
  });
  return hydrated;
}

async function hydrateForcePower(itemData, { raw, actorName }) {
  const formula = parsePrintedDamage(raw);
  if (!formula) return itemData;

  const forcePower = await resolveForcePower(raw, itemData.name);
  if (!forcePower) return itemData;

  const baseSystem = forcePower.system?.toObject?.() ?? foundry.utils.deepClone(forcePower.system ?? {});
  const damageType = inferPrintedType(raw, getDamageType(baseSystem));
  if (!damageType) return itemData;

  const hydrated = foundry.utils.deepClone(itemData);
  hydrated.system = foundry.utils.mergeObject(baseSystem, hydrated.system ?? {}, { inplace: false, recursive: true });
  const attackName = itemData.name ?? forcePower.name;
  const slug = `statblock-force-${normalize(actorName)}-${normalize(attackName)}`.replace(/\s+/g, '-');

  return applyCanonicalDamageFields(hydrated, {
    raw,
    actorName,
    attackName,
    slug,
    formula,
    damageType,
    delivery: 'force-power',
    hydrationPolicy: 'exact-force-power-printed-override',
    sourceType: 'nonheroic-statblock-force-power',
    sourceUuid: forcePower.uuid,
    sourceBaseFormula: getDamageFormula(baseSystem) || null,
    tags: ['force-power']
  });
}

function hydrateBespokeWeapon(itemData, { raw, actorName }) {
  const formula = parsePrintedDamage(raw);
  if (!formula) return itemData;

  const names = [normalize(itemData.name), normalize(stripAttackSyntax(raw))].filter(Boolean);
  const definition = names.map((name) => BESPOKE_WEAPONS.get(name)).find(Boolean);
  if (!definition) return itemData;

  const damageType = inferPrintedType(raw, definition.damageType);
  const hydrated = foundry.utils.deepClone(itemData);
  const attackName = itemData.name ?? definition.label;
  const slug = `statblock-bespoke-${normalize(actorName)}-${normalize(attackName)}`.replace(/\s+/g, '-');

  hydrated.system ??= {};
  hydrated.system.sourceWeaponBaseSlug = `bespoke-${normalize(definition.label).replace(/\s+/g, '-')}`;
  hydrated.system.sourceWeaponBasePack = null;
  hydrated.system.sourceWeaponBaseType = damageType;

  return applyCanonicalDamageFields(hydrated, {
    raw,
    actorName,
    attackName,
    slug,
    formula,
    damageType,
    delivery: 'weapon',
    hydrationPolicy: 'bespoke-missing-weapon-printed-override',
    sourceType: 'nonheroic-statblock-bespoke-weapon',
    sourceUuid: null,
    sourceBaseFormula: null,
    tags: ['bespoke-weapon', ...definition.tags]
  });
}

export async function hydrateNpcWeaponFromForceOrBespokeFallback(itemData, context = {}) {
  const forceHydrated = await hydrateForcePower(itemData, context);
  if (forceHydrated?.system?.statblockHydrated) return forceHydrated;
  return hydrateBespokeWeapon(itemData, context);
}

export function clearNpcForcePowerIndex() {
  forcePowerIndexPromise = null;
}
