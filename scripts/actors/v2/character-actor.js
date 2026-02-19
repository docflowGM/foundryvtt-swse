// scripts/actors/v2/character-actor.js
// V2 Contract: Configuration remains in primary state (system.*).
// Only computed mechanical effects are mirrored into system.derived.
// Droid configuration stays in system.droidSystems (not derived).

import combatActions from "../../../data/combat-actions.json" with { type: "json" };
import { FeatActionsMapper } from "../../utils/feat-actions-mapper.js";
import { EncumbranceEngine } from "../../engine/encumbrance/EncumbranceEngine.js";
import { PrerequisiteEngine } from "../../engine/prerequisites/PrerequisiteEngine.js";

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
  system.derived.actions ??= {};
  system.derived.encumbrance ??= {};

  // ========================================================================
  // PHASE 2: Derived values now owned by DerivedCalculator
  // These values are computed asynchronously and populated into system.derived.*
  // This function initializes defaults for immediate use, but authority is DerivedCalculator
  // ========================================================================

  // Initialize defaults (will be overwritten by DerivedCalculator async)
  if (!system.derived.defenses.fort) {
    system.derived.defenses.fort = 10;
  }
  if (!system.derived.defenses.ref) {
    system.derived.defenses.ref = 10;
  }
  if (!system.derived.defenses.will) {
    system.derived.defenses.will = 10;
  }
  if (!system.derived.defenses.flatFooted) {
    system.derived.defenses.flatFooted = 10;
  }

  // DT initialized but will be overwritten by DerivedCalculator
  if (!system.derived.damage?.threshold) {
    system.derived.damage.threshold = system.derived.defenses.fort || 10;
  }

  mirrorIdentity(actor, system);
  mirrorHp(system);
  mirrorSkills(system);
  mirrorAttacks(actor, system);
  mirrorFeats(actor, system);
  mirrorTalents(actor, system);
  mirrorActions(actor, system);
  mirrorEncumbrance(actor, system);
}

const RESOURCE_TICK_CAP = 100;


function safeNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function mirrorIdentity(actor, system) {
  const i = system.derived.identity;
  // All of these are inputs, but we mirror them into derived so v2 sheets can remain derived-first.
  i.level = safeNumber(system.level, 1);
  i.className = system.class?.name ?? system.className ?? system.class ?? '';
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
  i.darkSideScore = safeNumber(system.darkSideScore ?? system.darkSide?.score, 0);

  // Abilities (total + mod) are already prepared by the legacy data model.
  i.abilities = {};
  const abilities = system.abilities ?? system.attributes ?? {};
  for (const key of ['str', 'dex', 'con', 'int', 'wis', 'cha']) {
    const a = abilities[key] ?? {};
    i.abilities[key] = {
      total: safeNumber(a.total ?? a.value ?? a.base, 10),
      mod: safeNumber(a.mod, Math.floor((safeNumber(a.total ?? a.value ?? a.base, 10) - 10) / 2))
    };
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
  const skills = system.skills ?? {};
  const list = [];

  for (const [key, s] of Object.entries(skills)) {
    if (!s) continue;
    const total = safeNumber(s.total, 0);
    const trained = s.trained === true;
    const focused = s.focused === true;
    const ability = s.selectedAbility ?? s.ability ?? '';
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

function mirrorAttacks(actor, system) {
  const weapons = (actor?.items ?? []).filter(i => i.type === 'weapon');
  const list = [];

  for (const w of weapons) {
    const equipped = w.system?.equipped === true;
    if (!equipped) continue;
    const data = w.system ?? {};
    const resources = buildResourcesFromItem(w, RESOURCE_TICK_CAP);
    list.push({
      id: w.id,
      name: w.name,
      damage: data.damage ?? '',
      range: data.rangeFormatted ?? (typeof data.range === "string" ? data.range : data.range?.value) ?? 'Melee',
      type: data.weaponType ?? data.category ?? '',
      notes: data.notes ?? '',
      actionId: `item:${w.id}:attack`,
      resources
    });
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
      executable: false,
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

    // Force powers: show a "Use" action.
    if (type === "forcepower") {
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

function splitCamel(str) {
  return String(str)
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/_/g, ' ')
    .trim()
    .replace(/\b\w/g, c => c.toUpperCase());
}
