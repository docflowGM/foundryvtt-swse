// scripts/actors/v2/character-actor.js
// V2 Contract: Configuration remains in primary state (system.*).
// Only computed mechanical effects are mirrored into system.derived.
// Droid configuration stays in system.droidSystems (not derived).

import combatActions from "/systems/foundryvtt-swse/data/combat-actions.json" with { type: "json" };
import speciesTraits from "/systems/foundryvtt-swse/data/species-traits.json" with { type: "json" };
import { FeatActionsMapper } from "/systems/foundryvtt-swse/scripts/utils/feat-actions-mapper.js";
import { EncumbranceEngine } from "/systems/foundryvtt-swse/scripts/engine/encumbrance/EncumbranceEngine.js";
import { InventoryEngine } from "/systems/foundryvtt-swse/scripts/engine/inventory/InventoryEngine.js";
import { DSPEngine } from "/systems/foundryvtt-swse/scripts/engine/darkside/dsp-engine.js";
import { normalizeSkillMap } from "/systems/foundryvtt-swse/scripts/utils/skill-normalization.js";

/**
 * Compute the minimal v2-derived fields for Characters.
 * Writes into system.derived.
 *
 * NOTE: Condition Track derived values are owned by SWSEV2BaseActor.
 */
export function computeCharacterDerived(actor, system) {
  system.derived ??= {};
  system.derived.defenses ??= {};
  system.derived.damage ??= {};
  system.derived.identity ??= {};
  system.derived.hp ??= {};
  system.derived.skills ??= {};
  system.derived.attacks ??= {};
  system.derived.feats ??= {};
  system.derived.talents ??= {};
  system.derived.forceTechniques ??= {};
  system.derived.forceSecrets ??= {};
  system.derived.starshipManeuvers ??= {};
  system.derived.actions ??= {};
  system.derived.encumbrance ??= {};
  system.derived.racialAbilities ??= [];
  system.derived.inventory ??= {
    weapons: [],
    armor: [],
    equipment: [],
    consumables: [],
    misc: []
  };

  // ========================================================================
  // PHASE 2: Derived values now owned by DerivedCalculator
  // These values are computed asynchronously and populated into system.derived.*
  // This function initializes defaults for immediate use, but authority is DerivedCalculator
  // ========================================================================

  // Initialize defaults as proper objects with .total property (will be overwritten by DerivedCalculator async)
  // Phase 6: Fixed contract mismatch — defenses must be objects with .total, not bare numbers
  if (!system.derived.defenses.fortitude || typeof system.derived.defenses.fortitude !== 'object') {
    system.derived.defenses.fortitude = { base: 10, total: 10, adjustment: 0, stateBonus: 0 };
  }
  if (!system.derived.defenses.reflex || typeof system.derived.defenses.reflex !== 'object') {
    system.derived.defenses.reflex = { base: 10, total: 10, adjustment: 0, stateBonus: 0 };
  }
  if (!system.derived.defenses.will || typeof system.derived.defenses.will !== 'object') {
    system.derived.defenses.will = { base: 10, total: 10, adjustment: 0, stateBonus: 0 };
  }
  if (!system.derived.defenses.flatFooted || typeof system.derived.defenses.flatFooted !== 'object') {
    system.derived.defenses.flatFooted = { base: 10, total: 10, adjustment: 0, stateBonus: 0 };
  }

  // DT initialized but will be overwritten by DerivedCalculator
  // Phase 6: Ensure damage.threshold is always a number
  if (!system.derived.damage?.threshold || typeof system.derived.damage.threshold !== 'number') {
    system.derived.damage.threshold = 10;
  }

  mirrorIdentity(actor, system);
  mirrorHp(system);
  mirrorSkills(system);
  mirrorAttacks(actor, system);
  mirrorFeats(actor, system);
  mirrorTalents(actor, system);
  mirrorForceTechniques(actor, system);
  mirrorForceSecrets(actor, system);
  mirrorStarshipManeuvers(actor, system);
  mirrorRacialAbilities(system);
  mirrorActions(actor, system);
  mirrorEncumbrance(actor, system);
  mirrorInventory(actor, system);
}

const RESOURCE_TICK_CAP = 100;


function safeNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * PHASE 7: Build canonical class display string (multiclass format: "Jedi 3 / Soldier 2")
 *
 * CANONICAL BUILDER for all identity/class summary displays — sheet reads system.derived.identity.classDisplay,
 * never rebuilds it.
 *
 * CRITICAL CONTRACT:
 * - Preserves exact actor class progression order (no heroic-first sorting)
 * - Formats as "ClassName Level" joined by " / "
 * - Used by mirrorIdentity() to populate system.derived.identity.classDisplay
 * - Sheet displays consume derived.identity.classDisplay or buildIdentityViewModel()
 *
 * @param {Array} classLevels - progression.classLevels array [{class, level}, ...]
 * @param {string} fallbackClassName - Single class name if multiclass unavailable
 * @returns {string} Formatted class display or fallback
 */
function buildClassDisplay(classLevels, fallbackClassName) {
  if (!Array.isArray(classLevels) || classLevels.length === 0) {
    return fallbackClassName || '—';
  }

  // Build from classLevels in exact order (no reordering, no heroic-first sorting)
  // Each class progression entry is formatted as "ClassName Level"
  return classLevels
    .map(cl => {
      // Format: "ClassName Level" or "classId Level" if name unavailable
      const displayName = typeof cl === 'object' ? cl.class : cl;
      const displayLevel = typeof cl === 'object' ? cl.level : 1;
      return `${displayName} ${displayLevel}`;
    })
    .join(' / ');
}

function mirrorIdentity(actor, system) {
  const i = system.derived.identity;
  // PHASE 7: All identity values are inputs, but we mirror them into derived so sheets can remain derived-first.
  // Sheet should NEVER rebuild identity strings — read from this bundle instead.
  i.level = safeNumber(system.level, 1);

  // Phase 3B: Prefer canonical system.class.name, fall back to legacy paths
  // system.className and system.class (as string) are deprecated, kept for compatibility only
  i.className = system.class?.name ?? system.className ?? system.class ?? '';

  // PHASE 7: Build full class display including multiclass format ("Jedi 3 / Soldier 2")
  // from progression.classLevels (authoritative multiclass tracking)
  i.classDisplay = buildClassDisplay(system.progression?.classLevels ?? [], i.className);

  i.species = system.species?.name ?? system.species ?? '';
  i.gender = system.gender ?? '';
  i.background = system.background?.name ?? system.background ?? '';
  i.size = system.size ?? '';
  i.destinyType = system.destiny?.type ?? '';
  i.destinyPoints = {
    value: safeNumber(system.destinyPoints?.value, 0),
    max: safeNumber(system.destinyPoints?.max, 0)
  };
  i.forcePoints = {
    value: safeNumber(system.forcePoints?.value, 0),
    max: safeNumber(system.forcePoints?.max, 0)
  };

  i.destinyPointsDisplay = buildTickDisplay(i.destinyPoints.value, i.destinyPoints.max, RESOURCE_TICK_CAP);
  i.forcePointsDisplay = buildTickDisplay(i.forcePoints.value, i.forcePoints.max, RESOURCE_TICK_CAP);
  i.bab = safeNumber(system.bab?.total ?? system.bab ?? system.baseAttackBonus, 0);
  i.speed = safeNumber(system.speed?.total ?? system.speed ?? system.movement?.speed, 0);
  i.darkSideScore = DSPEngine.getValue(actor);

  // Abilities (total + mod) are already prepared by the legacy data model.
  // Phase 6: Build as array for template iteration (skills-panel uses #each derived.identity.abilities)
  const ABILITY_KEYS = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
  const ABILITY_LABELS = { 'str': 'Strength', 'dex': 'Dexterity', 'con': 'Constitution', 'int': 'Intelligence', 'wis': 'Wisdom', 'cha': 'Charisma' };

  i.abilities = [];
  const abilities = system.abilities ?? {};
  for (const key of ABILITY_KEYS) {
    const a = abilities[key] ?? {};
    const total = safeNumber(a.total ?? a.value ?? a.base, 10);
    const mod = safeNumber(a.mod, Math.floor((total - 10) / 2));
    i.abilities.push({
      key,
      label: ABILITY_LABELS[key],
      total,
      mod
    });
  }

  i.name = actor?.name ?? '';
}

function mirrorHp(system) {
  const hp = system.hp ?? {};
  system.derived.hp.value = safeNumber(hp.value, 0);
  system.derived.hp.max = safeNumber(hp.max, 0);
  system.derived.hp.temp = safeNumber(hp.temp, 0);
}

function mirrorSkills(system) {
  const skills = normalizeSkillMap(system.skills);
  const list = [];

  for (const [key, s] of Object.entries(skills)) {
    if (!s || key === 'pilot') continue;

    const total = safeNumber(s.legacyStaticTotal ? s.legacyTotal : s.total, 0);
    const trained = s.trained === true;
    const focused = s.focused === true;
    const ability = typeof s.selectedAbility === 'string' ? s.selectedAbility : (s.ability ?? '');
    list.push({
      key,
      label: humanizeSkillKey(key),
      total,
      trained,
      focused,
      ability
    });
  }

  list.sort((a, b) => a.label.localeCompare(b.label));
  system.derived.skills.list = list;
}


function normalizeAttackEntry(attack = {}, actor = null) {
  const attackBonus = Number(
    attack.attackTotal ??
    attack.attackBonus ??
    attack.toHit ??
    attack.total ??
    0
  ) || 0;

  const damageFormula =
    attack.damageFormula ??
    attack.damage ??
    attack.damageRoll ??
    attack.formula ??
    "—";

  const critRange =
    attack.critRange ??
    attack.criticalRange ??
    attack.crit ?? 
    "20";

  const critMult =
    attack.critMult ??
    attack.criticalMultiplier ??
    attack.multiplier ??
    "x2";

  const range =
    attack.range ??
    attack.rangeText ??
    attack.increment ??
    "—";

  const sourceType =
    attack.sourceType ??
    attack.originType ??
    attack.type ??
    "weapon";

  const tags = Array.isArray(attack.tags)
    ? attack.tags
    : Array.isArray(attack.weaponProperties)
    ? attack.weaponProperties
    : [];

  const weaponProperties = Array.isArray(attack.weaponProperties)
    ? attack.weaponProperties
    : tags;

  const attackBreakdown =
    attack.breakdown?.attack ??
    attack.attackBreakdown ??
    attack.breakdown ??
    "";

  const damageBreakdown =
    attack.breakdown?.damage ??
    attack.damageBreakdown ??
    "";

  const sourceId = attack.sourceId ?? attack.itemId ?? attack.weaponId ?? attack.id ?? null;
  const weaponId = attack.weaponId ?? attack.itemId ?? (sourceType === "weapon" ? sourceId : null);
  const weaponName = attack.weaponName ?? (sourceType === "weapon" ? attack.name : null);
  const weaponType = attack.weaponType ?? attack.category ?? attack.type ?? sourceType;

  return {
    id: attack.id ?? attack._id ?? attack.itemId ?? attack.name ?? crypto.randomUUID?.() ?? Math.random().toString(36).slice(2),
    name: attack.name ?? "Attack",
    img: attack.img ?? attack.image ?? "",
    type: attack.type ?? sourceType,
    sourceType,
    sourceId,
    weaponId,
    weaponName,
    weaponType,
    attackTotal: attackBonus,
    attackBonus,
    damageFormula,
    damage: damageFormula,
    critRange,
    critMult,
    range,
    ammo: attack.ammo ?? attack.ammunition ?? null,
    actionType: attack.actionType ?? attack.cost ?? "standard",
    notes: attack.notes ?? "",
    tags,
    weaponProperties,
    breakdown: {
      attack: attackBreakdown,
      damage: damageBreakdown
    }
  };
}

function mirrorAttacks(actor, system) {
  const weapons = (actor?.items ?? []).filter(i => i.type === 'weapon');
  const list = [];

  for (const w of weapons) {
    // PHASE 4: Include equipped weapons OR natural weapons with autoEquipped flag
    const equipped = w.system?.equipped === true;
    const isAutoEquipped = w.flags?.swse?.autoEquipped === true;
    if (!equipped && !isAutoEquipped) continue;

    const data = w.system ?? {};
    const resources = buildResourcesFromItem(w, RESOURCE_TICK_CAP);

    const rawAttack = {
      id: w.id,
      itemId: w.id,
      sourceId: w.id,
      sourceType: 'weapon',
      name: w.name,
      img: w.img ?? '',
      damage: data.damage ?? '',
      damageFormula: data.damage ?? '',
      range: data.rangeFormatted ?? (typeof data.range === "string" ? data.range : data.range?.value) ?? 'Melee',
      type: data.weaponType ?? data.category ?? 'weapon',
      notes: data.notes ?? '',
      actionId: `item:${w.id}:attack`,
      resources,
      critRange: data.critRange ?? data.criticalRange ?? '20',
      critMult: data.critMult ?? data.criticalMultiplier ?? 'x2',
      weaponProperties: Array.isArray(data.weaponProperties)
        ? data.weaponProperties
        : Array.isArray(data.properties)
        ? data.properties
        : [],
      tags: Array.isArray(data.tags)
        ? data.tags
        : Array.isArray(data.weaponProperties)
        ? data.weaponProperties
        : Array.isArray(data.properties)
        ? data.properties
        : [],
      attackTotal:
        data.attackTotal ??
        data.attackBonus ??
        data.toHit ??
        0,
      breakdown: {
        attack: data.attackBreakdown ?? '',
        damage: data.damageBreakdown ?? ''
      },
      ammo: data.ammo ?? data.ammunition ?? null,
      actionType: data.actionType ?? data.cost ?? 'standard'
    };

    list.push(normalizeAttackEntry(rawAttack, actor));
  }

  system.derived.attacks.list = list;
}


function mirrorFeats(actor, system) {
  const feats = (actor?.items ?? []).filter(i => i.type === 'feat');
  const list = [];
  const groupsByKey = new Map();

  for (const f of feats) {
    const data = f.system ?? {};
    const key = String(data.featType ?? data.type ?? 'general').toLowerCase().trim() || 'general';
    const entry = {
      id: f.id,
      name: f.name,
      featType: key,
      featTypeLabel: titleCase(splitCamel(key)),
      prerequisite: data.prerequisite ?? '',
      summary: summarizeText(data.benefit ?? data.description ?? data.normalText ?? '', 160)
    };
    list.push(entry);

    if (!groupsByKey.has(key)) groupsByKey.set(key, []);
    groupsByKey.get(key).push(entry);
  }

  list.sort((a, b) => a.name.localeCompare(b.name));

  const groups = [];
  for (const [key, items] of Array.from(groupsByKey.entries()).sort((a, b) => a[0].localeCompare(b[0]))) {
    items.sort((a, b) => a.name.localeCompare(b.name));
    groups.push({
      key,
      label: titleCase(splitCamel(key)),
      count: items.length,
      items
    });
  }

  system.derived.feats.list = list;
  system.derived.feats.groups = groups;
}

function mirrorTalents(actor, system) {
  const talents = (actor?.items ?? []).filter(i => i.type === 'talent');
  const list = [];
  const groupsByKey = new Map();

  for (const t of talents) {
    const data = t.system ?? {};
    const keyRaw = data.tree ?? data.talent_tree ?? data.talentTree ?? 'Unsorted';
    const key = String(keyRaw || 'Unsorted').trim() || 'Unsorted';
    const entry = {
      id: t.id,
      name: t.name,
      tree: key,
      sourceClass: data.class ?? data.sourceClass ?? '',
      prerequisite: data.prerequisites ?? '',
      summary: summarizeText(data.benefit ?? data.description ?? '', 160)
    };
    list.push(entry);

    if (!groupsByKey.has(key)) groupsByKey.set(key, []);
    groupsByKey.get(key).push(entry);
  }

  list.sort((a, b) => a.name.localeCompare(b.name));

  const groups = [];
  for (const [key, items] of Array.from(groupsByKey.entries()).sort((a, b) => a[0].localeCompare(b[0]))) {
    items.sort((a, b) => a.name.localeCompare(b.name));
    groups.push({
      key,
      label: key,
      count: items.length,
      items
    });
  }

  system.derived.talents.list = list;
  system.derived.talents.groups = groups;
}

function mirrorForceTechniques(actor, system) {
  const techniques = (actor?.items ?? []).filter(i => i.type === 'feat' && (i.system?.tags ?? []).includes('force_technique'));
  const list = [];

  for (const t of techniques) {
    const data = t.system ?? {};
    const entry = {
      id: t.id,
      name: t.name,
      prerequisite: data.prerequisite ?? '',
      summary: summarizeText(data.benefit ?? data.description ?? data.normalText ?? '', 160)
    };
    list.push(entry);
  }

  list.sort((a, b) => a.name.localeCompare(b.name));
  system.derived.forceTechniques.list = list;
  system.derived.forceTechniques.count = list.length;
}

function mirrorForceSecrets(actor, system) {
  const secrets = (actor?.items ?? []).filter(i => i.type === 'feat' && (i.system?.tags ?? []).includes('force_secret'));
  const list = [];

  for (const s of secrets) {
    const data = s.system ?? {};
    const entry = {
      id: s.id,
      name: s.name,
      prerequisite: data.prerequisite ?? '',
      summary: summarizeText(data.benefit ?? data.description ?? data.normalText ?? '', 160)
    };
    list.push(entry);
  }

  list.sort((a, b) => a.name.localeCompare(b.name));
  system.derived.forceSecrets.list = list;
  system.derived.forceSecrets.count = list.length;
}

function mirrorStarshipManeuvers(actor, system) {
  const maneuvers = (actor?.items ?? []).filter(i => i.type === 'maneuver');
  const list = [];

  for (const m of maneuvers) {
    const data = m.system ?? {};
    const entry = {
      id: m.id,
      name: m.name,
      summary: summarizeText(data.benefit ?? data.description ?? data.normalText ?? '', 160)
    };
    list.push(entry);
  }

  list.sort((a, b) => a.name.localeCompare(b.name));
  system.derived.starshipManeuvers.list = list;
  system.derived.starshipManeuvers.count = list.length;
}

function mirrorActions(actor, system) {
  const out = system.derived.actions;
  const list = [];
  const map = {};

  // ---------------------------------------------------------------------
  // 1) Universal combat actions (static definitions)
  // ---------------------------------------------------------------------
  for (let i = 0; i < (combatActions?.length ?? 0); i++) {
    const a = combatActions[i] ?? {};
    const action = a.action ?? {};
    const actionType = String(action.type ?? "standard").toLowerCase();

    // Coup de Grace (index 9) is executable; others are not
    const isExecutable = (i === 9) ? true : false;

    const entry = {
      key: `combat:${i}`,
      name: a.name ?? "(Unnamed Action)",
      actionType,
      actionTypeLabel: titleCase(splitCamel(actionType)),
      cost: safeNumber(action.cost, 1),
      description: summarizeText(a.notes ?? a.text ?? "", 180),
      sourceType: "combat",
      sourceLabel: "Combat",
      sourceName: "Combat Actions",
      itemId: null,
      executable: isExecutable,
      resources: []
    };
    list.push(entry);
    map[entry.key] = entry;
  }

  // ---------------------------------------------------------------------
  // 2) Feat / Talent combat actions (from feat-combat-actions.json)
  // ---------------------------------------------------------------------
  try {
    const available = FeatActionsMapper.getAvailableActions(actor) ?? [];
    for (const a of available) {
      const sourceType = a.source === "talent" ? "talent" : a.source === "feat" ? "feat" : "universal";
      const sourceLabel = sourceType === "feat" ? "Feat" : sourceType === "talent" ? "Talent" : "Universal";
      const actionType = String(a.actionType ?? "standard").toLowerCase();

      const entry = {
        key: `ft:${a.key ?? a.name}`,
        name: a.name ?? "(Unnamed Action)",
        actionType,
        actionTypeLabel: titleCase(splitCamel(actionType)),
        cost: safeNumber(a.actionCost, 1),
        description: summarizeText(a.description ?? "", 180),
        sourceType,
        sourceLabel,
        sourceName: a.itemName ?? sourceLabel,
        itemId: a.itemId ?? null,
        active: a.isActive === true,
        executable: a.toggleable === true,
        execute: a.toggleable === true ? { kind: "featActionToggle", actionKey: a.key } : null,
        resources: []
      };
      list.push(entry);
      map[entry.key] = entry;
    }
  } catch (_e) {
    // Fail-soft: actions are a read-only panel; do not break derived prep if mapper throws.
  }

  // ---------------------------------------------------------------------
  // 3) Item-linked actions (simple read-only affordances)
  // ---------------------------------------------------------------------
  const owned = actor?.items ?? [];
  for (const it of owned) {
    if (!it?.id) continue;
    const type = it.type;
    const sys = it.system ?? {};
    const equipped = sys.equipped === true;

    // Weapons: show an "Attack" action for equipped weapons.
    if (type === "weapon" && equipped) {
      const resources = buildResourcesFromItem(it, RESOURCE_TICK_CAP);
      const entry = {
        key: `item:${it.id}:attack`,
        name: `Attack: ${it.name}`,
        actionType: "standard",
        actionTypeLabel: "Standard",
        cost: 1,
        description: summarizeText(sys.notes ?? sys.description ?? "", 140),
        sourceType: "item",
        sourceLabel: "Item",
        sourceName: it.name,
        itemId: it.id,
        executable: true,
        useLabel: "Attack",
        execute: { kind: "item", itemId: it.id },
        resources
      };
      list.push(entry);
      map[entry.key] = entry;
    }

    // Poisons: show a use action for applying to a target or coating a weapon.
    if (type === "poison") {
      const entry = {
        key: `item:${it.id}:poison`,
        name: `Use Poison: ${it.name}`,
        actionType: "standard",
        actionTypeLabel: "Standard",
        cost: 1,
        description: summarizeText(sys.description ?? sys.trigger ?? "", 140),
        sourceType: "item",
        sourceLabel: "Item",
        sourceName: it.name,
        itemId: it.id,
        executable: true,
        useLabel: "Use Poison",
        execute: { kind: "item", itemId: it.id },
        resources: []
      };
      list.push(entry);
      map[entry.key] = entry;
    }

    // Force powers: show a "Use" action.
    if (type === "force-power") {
      const entry = {
        key: `item:${it.id}:use`,
        name: `Use: ${it.name}`,
        actionType: String(sys.actionType ?? sys.time ?? "standard").toLowerCase(),
        actionTypeLabel: titleCase(splitCamel(String(sys.actionType ?? sys.time ?? "standard").toLowerCase())),
        cost: 1,
        description: summarizeText(sys.description ?? sys.effect ?? "", 140),
        sourceType: "item",
        sourceLabel: "Item",
        sourceName: it.name,
        itemId: it.id,
        executable: true,
        useLabel: "Use",
        execute: { kind: "item", itemId: it.id },
        resources: []
      };
      list.push(entry);
      map[entry.key] = entry;
    }

    // Any owned item with an activation flag is executable as a toggle (e.g., shields).
    if (typeof sys.activated === "boolean") {
      const resources = buildResourcesFromItem(it, RESOURCE_TICK_CAP);
      const entry = {
        key: `item:${it.id}:toggle`,
        name: `${sys.activated ? "Deactivate" : "Activate"}: ${it.name}`,
        actionType: "swift",
        actionTypeLabel: "Swift",
        cost: 1,
        description: summarizeText(sys.description ?? sys.notes ?? "", 140),
        sourceType: "item",
        sourceLabel: "Item",
        sourceName: it.name,
        itemId: it.id,
        executable: true,
        useLabel: sys.activated ? "Deactivate" : "Activate",
        execute: { kind: "itemToggleActivated", itemId: it.id },
        resources
      };
      list.push(entry);
      map[entry.key] = entry;
    }
  }

  // ---------------------------------------------------------------------
  // Group by Source -> Action Type (precomputed for templates; no helpers)
  // ---------------------------------------------------------------------
  const orderSource = ["combat", "universal", "feat", "talent", "item"];
  const orderType = ["standard", "move", "swift", "reaction", "free", "modifier", "other"];

  const bySource = new Map();
  for (const a of list) {
    const sKey = a.sourceType ?? "other";
    if (!bySource.has(sKey)) {
      bySource.set(sKey, {
        key: sKey,
        label: a.sourceLabel ?? titleCase(splitCamel(sKey)),
        count: 0,
        _byType: new Map()
      });
    }
    const g = bySource.get(sKey);
    g.count++;
    const tKey = a.actionType ?? "other";
    if (!g._byType.has(tKey)) {
      g._byType.set(tKey, { key: tKey, label: titleCase(splitCamel(tKey)), items: [] });
    }
    g._byType.get(tKey).items.push(a);
  }

  const groups = Array.from(bySource.values()).sort((a, b) => {
    const ai = orderSource.indexOf(a.key);
    const bi = orderSource.indexOf(b.key);
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
  });

  for (const g of groups) {
    const subgroups = Array.from(g._byType.values()).sort((a, b) => {
      const ai = orderType.indexOf(a.key);
      const bi = orderType.indexOf(b.key);
      return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
    });
    for (const sg of subgroups) {
      sg.items.sort((a, b) => String(a.name ?? "").localeCompare(String(b.name ?? "")));
      sg.count = sg.items.length;
    }
    g.subgroups = subgroups;
    delete g._byType;
  }

  out.list = list;
  out.groups = groups;
  out.count = list.length;
  out.map = map;
}

function buildResourcesFromItem(item, cap) {
  const sys = item?.system ?? {};
  const resources = [];

  const ammo = sys.ammunition ?? sys.weapon?.ammunition;
  if (ammo && (ammo.max ?? ammo.value ?? 0) > 0) {
    const current = safeNumber(ammo.current ?? ammo.value, 0);
    const max = safeNumber(ammo.max ?? ammo.value, 0);
    resources.push({
      kind: "ammo",
      label: "Ammo",
      ...buildTickDisplay(current, max, cap)
    });
  }

  const charges = sys.charges;
  if (charges && (charges.max ?? charges.value ?? 0) > 0) {
    const current = safeNumber(charges.current ?? charges.value, 0);
    const max = safeNumber(charges.max ?? charges.value, 0);
    resources.push({
      kind: "charges",
      label: "Charges",
      ...buildTickDisplay(current, max, cap)
    });
  }

  return resources;
}

function buildTickDisplay(current, max, cap) {
  const c = clampNumber(current, 0, Number.isFinite(max) ? max : 0);
  const m = Math.max(0, safeNumber(max, 0));

  const displayMax = Math.min(m, cap);
  const isCapped = m > cap;

  const filledCount = displayMax === 0 ? 0 : Math.round((c / Math.max(1, m)) * displayMax);

  const sizeClass = tickSizeClass(displayMax);
  const ticks = Array.from({ length: displayMax }, (_v, i) => ({ filled: i < filledCount }));

  const labelText = isCapped ? `${c}/${m} (cap ${cap})` : `${c}/${m}`;

  return {
    current: c,
    max: m,
    displayMax,
    filledCount,
    sizeClass,
    isCapped,
    labelText,
    ticks
  };
}

function tickSizeClass(maxTicks) {
  const n = Number(maxTicks);
  if (!Number.isFinite(n) || n <= 0) return "ticks-md";
  if (n <= 6) return "ticks-xl";
  if (n <= 12) return "ticks-lg";
  if (n <= 24) return "ticks-md";
  if (n <= 60) return "ticks-sm";
  return "ticks-xs";
}

function clampNumber(value, min, max) {
  const n = Number(value);
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
}

function summarizeText(text, maxLen = 140) {
  const raw = String(text ?? '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
  if (!raw) return '';
  const firstSentence = raw.split(/(?<=[.!?])\s+/)[0] ?? raw;
  const clipped = firstSentence.length > maxLen ? `${firstSentence.slice(0, maxLen - 1)}…` : firstSentence;
  return clipped;
}

function titleCase(str) {
  return String(str)
    .trim()
    .replace(/\s+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

function humanizeSkillKey(key) {
  // e.g. knowledgeBureaucracy -> Knowledge (Bureaucracy)
  if (key.startsWith('knowledge') && key.length > 'knowledge'.length) {
    const suffix = key.slice('knowledge'.length);
    return `Knowledge (${splitCamel(suffix).trim()})`;
  }
  return splitCamel(key)
    .replace(/^use the force$/i, 'Use the Force')
    .replace(/^use computer$/i, 'Use Computer')
    .replace(/^treat injury$/i, 'Treat Injury')
    .replace(/^gather information$/i, 'Gather Information');
}

function mirrorEncumbrance(actor, system) {
  const encState = EncumbranceEngine.calculateEncumbrance(actor);
  system.derived.encumbrance.state = encState.state;
  system.derived.encumbrance.label = encState.label;
  system.derived.encumbrance.total = encState.totalWeight;
  system.derived.encumbrance.lightLoad = encState.lightLoad;
  system.derived.encumbrance.mediumLoad = encState.mediumLoad;
  system.derived.encumbrance.heavyLoad = encState.heavyLoad;
  system.derived.encumbrance.overloadThreshold = encState.overloadThreshold;
  system.derived.encumbrance.skillPenalty = encState.skillPenalty;
  system.derived.encumbrance.speedMultiplier = encState.speedMultiplier;
  system.derived.encumbrance.runMultiplier = encState.runMultiplier;
  system.derived.encumbrance.removeDexToReflex = encState.removeDexToReflex;
  system.derived.encumbrance.affectedSkills = encState.affectedSkills;
}

/**
 * Pre-index species traits for O(1) lookup
 * Built once at module load
 */
const speciesMap = new Map(
  speciesTraits.map(s => [s.name.toLowerCase(), s])
);

function mirrorRacialAbilities(system) {
  const raceKey = system.race ?? '';

  if (!raceKey) {
    system.derived.racialAbilities = [];
    return;
  }

  // O(1) lookup by species name (case-insensitive)
  const speciesData = speciesMap.get(raceKey.toLowerCase());

  if (!speciesData) {
    system.derived.racialAbilities = [];
    return;
  }

  const abilities = [];

  const addAbilities = (list = []) => {
    for (const ability of list) {
      abilities.push({
        id: ability.id ?? `${raceKey}-${ability.name}`,
        name: ability.name,
        summary: ability.description ?? "",
        source: "racial",
        race: raceKey
      });
    }
  };

  addAbilities(speciesData.structuralTraits ?? []);
  addAbilities(speciesData.activatedAbilities ?? []);
  addAbilities(speciesData.conditionalTraits ?? []);

  system.derived.racialAbilities = abilities;
}

function mirrorInventory(actor, system) {
  const groups = {
    weapons: [],
    armor: [],
    equipment: [],
    consumables: [],
    misc: []
  };

  for (const item of actor.items) {
    // Exclude non-gear document types from the inventory ledger entirely.
    if (!["weapon", "armor", "equipment", "consumable", "misc", "ammo"].includes(item.type)) {
      continue;
    }

    const entry = {
      id: item.id,
      name: item.name,
      quantity: item.system.quantity ?? 1,
      equipped: item.system.equipped ?? false,
      weight: item.system.weight ?? 0,
      summary: item.system.description ?? ""
    };

    switch (item.type) {
      case "weapon":
        groups.weapons.push(entry);
        break;

      case "armor":
        groups.armor.push(entry);
        break;

      case "equipment":
        groups.equipment.push(entry);
        break;

      case "consumable":
        groups.consumables.push(entry);
        break;

      case "ammo":
      case "misc":
        groups.misc.push(entry);
        break;

      default:
        // Should never reach here due to the filter at the start
        groups.misc.push(entry);
    }
  }

  system.derived.inventory = groups;
}

function splitCamel(str) {
  return String(str)
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/_/g, ' ')
    .trim()
    .replace(/\b\w/g, c => c.toUpperCase());
}
