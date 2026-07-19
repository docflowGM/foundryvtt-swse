const SPECIAL_MODE_PATTERNS = Object.freeze([
  /\bwith\s+rapid\s+shot\b/i,
  /\bwith\s+rapid\s+strike\b/i,
  /\bwith\s+power\s+attack\b/i,
  /\bwith\s+mighty\s+swing\b/i,
  /\bwith\s+burst\s+fire\b/i,
  /\bwith\s+autofire\b/i,
  /\bautofire\b/i,
  /\brapid\s+shot\b/i,
  /\brapid\s+strike\b/i,
  /\bpower\s+attack\b/i,
  /\bmighty\s+swing\b/i,
  /\bdouble\s+attack\b/i,
  /\btriple\s+attack\b/i,
  /\bsalvo\b/i,
  /\bbarrage\b/i,
  /\bmaximum\s+firepower\b/i
]);

const AREA_PATTERNS = Object.freeze([
  /\bautofire\b/i,
  /\bburst\s+fire\b/i,
  /\bgrenade\b/i,
  /\bsplash\b/i,
  /\bblast\b/i,
  /\bcone\b/i,
  /\bline\b/i
]);

const NAME_ALIASES = Object.freeze(new Map([
  ['hold out blaster', 'hold out blaster pistol'],
  ['heavy pistol', 'heavy blaster pistol'],
  ['blaster', 'blaster pistol'],
  ['light saber', 'lightsaber'],
  ['double bladed saber', 'double bladed lightsaber'],
  ['short saber', 'short lightsaber'],
  ['sporting pistol', 'sporting blaster pistol'],
  ['sporting rifle', 'sporting blaster rifle']
]));

let weaponIndexPromise = null;

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
  let text = cleanText(raw);
  text = text.replace(/\s+[+-]\d+(?:\s*\/\s*[+-]?\d+)*(?:\*+)?(?=\s|\()/, ' ');
  text = text.replace(/\s*\([^)]*\)\s*/g, ' ');
  for (const pattern of SPECIAL_MODE_PATTERNS) text = text.replace(pattern, ' ');
  text = text.replace(/\b(?:melee|ranged)\b\s*/i, ' ');
  return cleanText(text.replace(/[,:;]+$/g, ''));
}

function candidateNames(raw, itemName) {
  const values = [itemName, stripAttackSyntax(raw)].map(normalize).filter(Boolean);
  const expanded = [];
  for (const value of values) {
    expanded.push(value);
    const alias = NAME_ALIASES.get(value);
    if (alias) expanded.push(alias);
  }
  return [...new Set(expanded)];
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

function isWeaponPack(pack) {
  const collection = String(pack?.collection ?? pack?.metadata?.id ?? '');
  return pack?.documentName === 'Item' && /(?:^|\.)weapons(?:-|\.|$)/i.test(collection);
}

async function buildWeaponIndex() {
  const byName = new Map();
  const packs = [...(game.packs ?? [])].filter(isWeaponPack);

  for (const pack of packs) {
    let index;
    try {
      index = await pack.getIndex({ fields: ['name', 'type', 'system.damage', 'system.damageFormula', 'system.damageType', 'system.damageTypes', 'system.primaryType'] });
    } catch (error) {
      console.warn('[SWSE NPC Damage] Unable to index weapon pack', pack.collection, error);
      continue;
    }

    for (const entry of index ?? []) {
      if (entry.type && !['weapon', 'meleeWeapon', 'rangedWeapon'].includes(entry.type)) continue;
      const key = normalize(entry.name);
      if (!key) continue;
      const list = byName.get(key) ?? [];
      list.push({ pack, entry });
      byName.set(key, list);
    }
  }

  return byName;
}

async function getWeaponIndex() {
  weaponIndexPromise ??= buildWeaponIndex();
  return weaponIndexPromise;
}

function selectUniqueReference(candidates) {
  if (!candidates?.length) return null;
  if (candidates.length === 1) return candidates[0];

  const signatures = new Map();
  for (const candidate of candidates) {
    const system = candidate.entry.system ?? {};
    const signature = `${normalize(candidate.entry.name)}|${getDamageFormula(system)}|${getDamageType(system)}`;
    const current = signatures.get(signature);
    const isCatchAll = /\.weapons$/i.test(String(candidate.pack.collection));
    if (!current || (current.isCatchAll && !isCatchAll)) signatures.set(signature, { ...candidate, isCatchAll });
  }

  return signatures.size === 1 ? [...signatures.values()][0] : null;
}

async function resolveWeaponReference(raw, itemName) {
  const index = await getWeaponIndex();
  for (const name of candidateNames(raw, itemName)) {
    const selected = selectUniqueReference(index.get(name));
    if (!selected) continue;
    const document = await selected.pack.getDocument(selected.entry._id);
    if (document) return document;
  }
  return null;
}

function buildAttackMetadata(raw) {
  const isArea = AREA_PATTERNS.some((pattern) => pattern.test(raw));
  const isAutofire = /\bautofire\b/i.test(raw);
  const isBurstFire = /\bburst\s+fire\b/i.test(raw);
  const shape = /\bcone\b/i.test(raw) ? 'cone'
    : /\bline\b/i.test(raw) ? 'line'
      : /\bgrenade|burst|blast|splash\b/i.test(raw) ? 'burst'
        : isAutofire ? 'square'
          : null;

  return {
    attackShape: isArea ? (isAutofire ? 'autofire' : isBurstFire ? 'burst-fire' : shape ?? 'area') : 'single-target',
    attack: {
      isArea,
      isAutofire,
      isBurstFire,
      halfDamageOnMiss: isArea,
      noCriticalDouble: isArea,
      coverCanNegateMissDamage: isArea,
      attackRollMinimum: isArea ? 10 : null,
      defense: 'reflex'
    },
    area: {
      shape,
      radius: null,
      size: isAutofire ? 2 : null,
      originMode: /\bgrenade\b/i.test(raw) ? 'grid-intersection' : null,
      targetPolicy: isArea ? 'all-in-area' : 'single'
    }
  };
}

export async function hydrateNpcWeaponFromStatblockFallback(itemData, { raw, actorName } = {}) {
  const printedFormula = parsePrintedDamage(raw);
  if (!itemData || !printedFormula) return itemData;

  const weapon = await resolveWeaponReference(raw, itemData.name);
  if (!weapon) return itemData;

  const baseSystem = weapon.system?.toObject?.() ?? foundry.utils.deepClone(weapon.system ?? {});
  const damageType = getDamageType(baseSystem) || 'energy';
  const attackBonus = parsePrintedAttackBonus(raw);
  const metadata = buildAttackMetadata(raw);
  const hydrated = foundry.utils.deepClone(itemData);

  hydrated.system = foundry.utils.mergeObject(baseSystem, hydrated.system ?? {}, { inplace: false, recursive: true });
  hydrated.system.damage = printedFormula;
  hydrated.system.damageFormula = printedFormula;
  hydrated.system.damageType = damageType;
  hydrated.system.damageTypes = [damageType];
  hydrated.system.primaryType = damageType;
  hydrated.system.delivery = 'weapon';
  hydrated.system.attackShape = metadata.attackShape;
  hydrated.system.scale = 'character';
  hydrated.system.attack = metadata.attack;
  hydrated.system.area = metadata.area;
  hydrated.system.components = [{
    key: 'statblock-printed',
    label: itemData.name ?? weapon.name,
    formula: printedFormula,
    type: damageType,
    tags: ['base', damageType, 'statblock-printed']
  }];
  hydrated.system.riders = [];
  hydrated.system.sourceWeaponUuid = weapon.uuid;
  hydrated.system.sourceWeaponBaseSlug = weapon.id;
  hydrated.system.sourceWeaponBasePack = weapon.pack;
  hydrated.system.sourceWeaponBaseFormula = getDamageFormula(baseSystem) || null;
  hydrated.system.sourceWeaponBaseType = damageType;
  hydrated.system.damageProfileSlug = `statblock-fallback-${normalize(actorName)}-${normalize(itemData.name)}`.replace(/\s+/g, '-');
  hydrated.system.statblockHydrated = true;
  hydrated.system.statblockHydrationConfidence = 'printed-statblock';
  hydrated.system.statblockHydrationPolicy = 'exact-compendium-printed-override';
  hydrated.system.statblockPrintedFormula = printedFormula;
  hydrated.system.statblockFormulaMode = 'printed-override';
  hydrated.system.statblockPrintedAttackBonus = attackBonus;
  hydrated.system.statblockPrintedAttackHydratePolicy = 'metadata-only';
  hydrated.system.sourceAuthority = 'statblock';
  hydrated.system.playModeReference = true;
  hydrated.system.tags = [...new Set([...(hydrated.system.tags ?? []), 'statblock', 'printed-override'])];

  hydrated.flags = foundry.utils.mergeObject(hydrated.flags ?? {}, {
    swse: {
      import: {
        sourceAuthority: 'statblock',
        raw,
        damageProfile: {
          matched: true,
          slug: hydrated.system.damageProfileSlug,
          actorName: actorName ?? null,
          attackName: itemData.name ?? weapon.name,
          confidence: 'printed-statblock',
          hydrationPolicy: 'exact-compendium-printed-override',
          reviewRequired: false,
          printedFormula,
          formulaMode: 'printed-override',
          printedAttackBonus: attackBonus,
          printedAttackHydratePolicy: 'metadata-only',
          sourceWeaponUuid: weapon.uuid,
          sourceWeaponBaseFormula: getDamageFormula(baseSystem) || null
        }
      },
      damageProfile: {
        slug: hydrated.system.damageProfileSlug,
        sourceType: 'nonheroic-statblock-fallback',
        confidence: 'printed-statblock',
        hydrationPolicy: 'exact-compendium-printed-override',
        sourceWeaponUuid: weapon.uuid,
        printedFormula,
        formulaMode: 'printed-override',
        printedAttackBonus: attackBonus,
        printedAttackHydratePolicy: 'metadata-only'
      }
    }
  }, { inplace: false, recursive: true });

  return hydrated;
}

export function clearNpcStatblockWeaponIndex() {
  weaponIndexPromise = null;
}
