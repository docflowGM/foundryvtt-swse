import { SWSEV2CharacterSheet } from '/systems/foundryvtt-swse/scripts/sheets/v2/character-sheet.js';
import { DefenseCalculator } from '/systems/foundryvtt-swse/scripts/actors/derived/defense-calculator.js';
import { FollowerCreator } from '/systems/foundryvtt-swse/scripts/apps/follower-creator.js';
import { InventoryEngine } from '/systems/foundryvtt-swse/scripts/engine/inventory/InventoryEngine.js';
import { PortraitUploadController } from '/systems/foundryvtt-swse/scripts/sheets/v2/shared/PortraitUploadController.js';
import { SWSEStore } from '/systems/foundryvtt-swse/scripts/apps/store/store-main.js';
import { buildVirtualUnarmedWeapon } from '/systems/foundryvtt-swse/scripts/engine/combat/unarmed-attack-helper.js';
import { ActorEngine } from '/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js';
import { getHeroicLevel } from '/systems/foundryvtt-swse/scripts/actors/derived/level-split.js';
import { swseLogger } from '/systems/foundryvtt-swse/scripts/utils/logger.js';

const REGISTERED = Symbol.for('swse.followerNpcSheetParity.v3');
const CONTEXT_PATCHED = Symbol.for('swse.followerNpcSheetParity.context.v3');
const EVENTS_PATCHED = Symbol.for('swse.followerNpcSheetParity.events.v3');
const DEFENSE_PATCHED = Symbol.for('swse.followerNpcSheetParity.defense.v3');
const FEAT_PATCHED = Symbol.for('swse.followerNpcSheetParity.feats.v3');

const SKILLS = [
  ['acrobatics', 'Acrobatics', 'dex'],
  ['climb', 'Climb', 'str'],
  ['deception', 'Deception', 'cha'],
  ['endurance', 'Endurance', 'con'],
  ['gatherInformation', 'Gather Information', 'cha'],
  ['initiative', 'Initiative', 'dex'],
  ['jump', 'Jump', 'str'],
  ['knowledgeBureaucracy', 'Knowledge (Bureaucracy)', 'int'],
  ['knowledgeGalacticLore', 'Knowledge (Galactic Lore)', 'int'],
  ['knowledgeLifeSciences', 'Knowledge (Life Sciences)', 'int'],
  ['knowledgePhysicalSciences', 'Knowledge (Physical Sciences)', 'int'],
  ['knowledgeSocialSciences', 'Knowledge (Social Sciences)', 'int'],
  ['knowledgeTactics', 'Knowledge (Tactics)', 'int'],
  ['knowledgeTechnology', 'Knowledge (Technology)', 'int'],
  ['mechanics', 'Mechanics', 'int'],
  ['perception', 'Perception', 'wis'],
  ['persuasion', 'Persuasion', 'cha'],
  ['pilot', 'Pilot', 'dex'],
  ['ride', 'Ride', 'dex'],
  ['stealth', 'Stealth', 'dex'],
  ['survival', 'Survival', 'wis'],
  ['swim', 'Swim', 'str'],
  ['treatInjury', 'Treat Injury', 'wis'],
  ['useComputer', 'Use Computer', 'int'],
  ['useTheForce', 'Use the Force', 'cha'],
];

function normalize(value) {
  return String(value || '').trim().toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9]+/g, '');
}

function finite(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function signed(value) {
  const number = finite(value, 0);
  return number >= 0 ? `+${number}` : String(number);
}

function listLikeValues(value) {
  if (Array.isArray(value)) return value;
  if (value instanceof Set) return Array.from(value);
  if (typeof value === 'string') return value.trim() ? [value] : [];
  if (!value || typeof value !== 'object') return [];
  return Object.entries(value)
    .filter(([, state]) => state !== false && state !== null && state !== undefined && state !== 0)
    .map(([key, state]) => typeof state === 'string' ? state : key);
}

function truthyState(value) {
  if (value === true || Number(value) === 1) return true;
  if (value && typeof value === 'object') {
    return truthyState(value.value ?? value.current ?? value.active ?? value.equipped ?? value.state);
  }
  return ['true', '1', 'yes', 'equipped', 'worn', 'held', 'readied', 'ready', 'on', 'active'].includes(String(value || '').toLowerCase());
}

function isFollower(actor) {
  const profile = actor?.system?.npcProfile || {};
  return actor?.type === 'npc' && (
    actor?.system?.isFollower === true
    || actor?.system?.progression?.isFollower === true
    || profile.kind === 'follower'
    || profile.legalProfile === 'follower'
    || actor?.flags?.swse?.follower?.isFollower === true
    || actor?.getFlag?.('foundryvtt-swse', 'isFollower') === true
  );
}

function ownerForFollower(actor) {
  const ownerId = actor?.system?.npcProfile?.owner?.actorId
    || actor?.flags?.swse?.follower?.ownerId
    || actor?.getFlag?.('foundryvtt-swse', 'ownerId')
    || null;
  return ownerId ? game?.actors?.get?.(String(ownerId).replace(/^Actor\./, '')) : null;
}

function followerLevel(actor) {
  const owner = ownerForFollower(actor);
  return Math.max(1, finite(owner ? getHeroicLevel(owner) : 0, 0) || finite(actor?.system?.level, 1));
}

function abilityCandidate(raw = null) {
  if (!raw || typeof raw !== 'object') return null;
  const hasComponents = ['base', 'racial', 'species', 'enhancement', 'temp', 'temporary']
    .some(key => raw[key] !== undefined && raw[key] !== null && raw[key] !== '');
  const base = finite(raw.base, 10);
  const racial = finite(raw.racial ?? raw.species, 0);
  const enhancement = finite(raw.enhancement, 0);
  const temp = finite(raw.temp ?? raw.temporary, 0);
  const componentTotal = base + racial + enhancement + temp;
  const explicit = Number(raw.total ?? raw.value ?? raw.score);
  const score = hasComponents ? componentTotal : (Number.isFinite(explicit) ? explicit : 10);
  return {
    score,
    meaningful: score !== 10 || racial !== 0 || enhancement !== 0 || temp !== 0,
  };
}

function abilityScore(actor, key) {
  const canonical = abilityCandidate(actor?.system?.attributes?.[key]);
  const legacy = abilityCandidate(actor?.system?.abilities?.[key]);
  const derived = abilityCandidate(actor?.system?.derived?.attributes?.[key]);
  if (canonical?.meaningful) return canonical.score;
  if (legacy?.meaningful) return legacy.score;
  if (derived?.meaningful) return derived.score;
  return canonical?.score ?? legacy?.score ?? derived?.score ?? 10;
}

function abilityMod(actor, key) {
  return Math.floor((abilityScore(actor, key) - 10) / 2);
}

function conditionPenalty(actor) {
  const direct = Number(actor?.system?.derived?.damage?.conditionPenalty);
  if (Number.isFinite(direct)) return direct;
  const raw = Number(actor?.system?.conditionTrack?.current ?? actor?.system?.conditionTrack?.value ?? 0) || 0;
  if (raw < 0) return raw;
  return [0, -1, -2, -5, -10, 0][raw] ?? 0;
}

function templateType(actor) {
  const raw = String(
    actor?.flags?.swse?.follower?.templateType
    || actor?.system?.progression?.followerTemplateType
    || actor?.system?.progression?.followerTemplate
    || actor?.system?.followerType
    || actor?.system?.npcProfile?.template
    || ''
  ).toLowerCase();
  if (raw.includes('aggressive')) return 'aggressive';
  if (raw.includes('defensive')) return 'defensive';
  if (raw.includes('utility')) return 'utility';
  return '';
}

function templateDefenseBonus(actor, defense) {
  const explicit = actor?.system?.progression?.followerTemplateDefenseBonus || {};
  const direct = finite(explicit?.[defense], NaN);
  if (Number.isFinite(direct)) return direct;
  const type = templateType(actor);
  if (type === 'aggressive' && defense === 'fortitude') return 2;
  if (type === 'defensive' && defense === 'reflex') return 2;
  if (type === 'utility' && defense === 'will') return 2;
  return 0;
}

function speciesPassiveTotal(actor, targets = []) {
  const passive = actor?.flags?.swse?.speciesPassiveBonuses || {};
  const wanted = new Set(targets.map(normalize));
  let total = 0;
  for (const [target, entries] of Object.entries(passive)) {
    if (!wanted.has(normalize(target))) continue;
    for (const entry of Array.isArray(entries) ? entries : [entries]) total += finite(entry?.value ?? entry, 0);
  }
  return total;
}

function skillRows(actor) {
  const level = followerLevel(actor);
  const halfLevel = Math.floor(level / 2);
  const penalty = conditionPenalty(actor);
  const progressionTrained = new Set(listLikeValues(actor?.system?.progression?.trainedSkills).map(normalize));

  return SKILLS.map(([key, label, defaultAbility]) => {
    const state = actor?.system?.skills?.[key] || {};
    const selectedAbility = String(state.selectedAbility || state.ability || defaultAbility).toLowerCase().slice(0, 3);
    const trained = state.trained === true || progressionTrained.has(normalize(key)) || progressionTrained.has(normalize(label));
    const focused = state.focused === true;
    const misc = finite(state.miscMod, 0)
      + speciesPassiveTotal(actor, [key, `skill.${key}`, `skills.${key}`])
      + finite(actor?.system?.progression?.skillPenalties?.[key], 0);
    const total = abilityMod(actor, selectedAbility)
      + halfLevel
      + (trained ? 5 : 0)
      + (focused ? 5 : 0)
      + misc
      + penalty;

    return {
      key,
      id: key,
      label,
      ability: selectedAbility,
      total: signed(total),
      rawTotal: total,
      trained,
      focused,
      canRoll: true,
      isDerived: true,
      editPath: null,
      trainedEditPath: `system.skills.${key}.trained`,
      focusedEditPath: `system.skills.${key}.focused`,
      source: 'follower-derived',
      breakdown: {
        ability: abilityMod(actor, selectedAbility),
        halfLevel,
        trained: trained ? 5 : 0,
        focused: focused ? 5 : 0,
        misc,
        condition: penalty,
      },
    };
  });
}

function applyFollowerContext(context, actor) {
  if (!isFollower(actor) || !context?.npcConcept) return context;
  const concept = context.npcConcept;
  const rows = skillRows(actor);
  concept.skills = rows;
  concept.hasSkills = true;
  concept.trainedSkillCount = rows.filter(row => row.trained).length;
  concept.initiative = 'Acts with owner';
  concept.canRollInitiative = false;

  const derivedDefenses = actor?.system?.derived?.defenses || {};
  const fallback = {
    reflex: 10 + followerLevel(actor) + abilityMod(actor, 'dex') + templateDefenseBonus(actor, 'reflex'),
    fortitude: 10 + followerLevel(actor) + abilityMod(actor, 'con') + templateDefenseBonus(actor, 'fortitude'),
    will: 10 + followerLevel(actor) + abilityMod(actor, 'wis') + templateDefenseBonus(actor, 'will'),
  };
  const valueFor = (key) => {
    const value = Number(derivedDefenses?.[key]?.total);
    return Number.isFinite(value) && value >= 1 ? value : fallback[key];
  };
  const fort = valueFor('fortitude');
  const ref = valueFor('reflex');
  const will = valueFor('will');
  const dt = Math.max(fort, finite(actor?.system?.damageThreshold?.total ?? actor?.system?.damageThreshold, fort));
  concept.defenseChips = [
    { key: 'ref', label: 'REF', value: ref },
    { key: 'fort', label: 'FORT', value: fort },
    { key: 'will', label: 'WILL', value: will },
    { key: 'dt', label: 'DT', value: dt },
  ];
  concept.editDefenses = { reflex: ref, fortitude: fort, will, flatFooted: Math.max(1, ref - Math.max(0, abilityMod(actor, 'dex'))) };

  concept.gear = (concept.gear || []).map(row => {
    const item = actor.items?.get?.(row.id);
    const equipped = item ? truthyState(item.system?.equipped) || truthyState(item.system?.isEquipped) || truthyState(item.system?.equippable?.equipped) : false;
    return {
      ...row,
      equippable: !!item && ['armor', 'weapon', 'shield', 'equipment'].includes(item.type),
      equipped,
      equipLabel: equipped ? 'Unequip' : 'Equip',
    };
  });
  return context;
}

function patchContext() {
  const proto = SWSEV2CharacterSheet?.prototype;
  if (!proto || proto[CONTEXT_PATCHED] || typeof proto._prepareContext !== 'function') return;
  const original = proto._prepareContext;
  proto._prepareContext = async function patchedNpcContext(options = {}) {
    const context = await original.call(this, options);
    return applyFollowerContext(context, this.actor);
  };
  Object.defineProperty(proto, CONTEXT_PATCHED, { value: true });
}

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

function injectPortrait(sheet, root, signal) {
  const zone = root.querySelector('.swse-npc-dossier-portrait');
  const image = zone?.querySelector('img');
  if (!zone || !image) return;
  zone.dataset.role = 'actor-portrait-dropzone';
  image.dataset.role = 'actor-portrait-image';
  PortraitUploadController.bind(root, { actor: sheet.actor, signal });
}

function injectSkillControls(sheet, root, signal) {
  if (!isFollower(sheet.actor)) return;
  const derivedRows = new Map(skillRows(sheet.actor).map(row => [row.key, row]));
  root.querySelectorAll('.swse-npc-skill-edit-row').forEach(row => {
    const rollButton = row.querySelector('[data-skill]');
    const key = rollButton?.dataset?.skill;
    if (!key || row.querySelector('[data-follower-skill-controls]')) return;

    const totalEditor = row.querySelector('.swse-npc-skill-edit-row__total');
    if (totalEditor) totalEditor.remove();

    const state = derivedRows.get(key) || { trained: false, focused: false };
    const controls = document.createElement('div');
    controls.dataset.followerSkillControls = 'true';
    controls.className = 'skill-toggles swse-npc-skill-toggles';
    controls.innerHTML = `
      <label class="skill-checkbox" title="Trained"><span>T</span><input type="checkbox" data-follower-skill-state="trained" ${state.trained ? 'checked' : ''}></label>
      <label class="skill-checkbox" title="Focused"><span>F</span><input type="checkbox" data-follower-skill-state="focused" ${state.focused ? 'checked' : ''}></label>
    `;
    row.appendChild(controls);

    controls.querySelectorAll('[data-follower-skill-state]').forEach(input => {
      input.addEventListener('change', async event => {
        event.preventDefault();
        event.stopPropagation();
        const field = event.currentTarget.dataset.followerSkillState;
        await ActorEngine.updateActor(sheet.actor, {
          [`system.skills.${key}.${field}`]: event.currentTarget.checked,
        }, {
          source: 'follower-skill-toggle',
          meta: { guardKey: `follower-skill:${key}:${field}` },
        });
        await sheet.render(false);
      }, { signal });
    });
  });
}

function injectUnarmedAttack(sheet, root, signal) {
  if (sheet.actor?.type === 'vehicle') return;
  const list = root.querySelector('.swse-npc-attack-list');
  if (!list || list.querySelector('[data-virtual-unarmed]')) return;
  list.querySelector('.swse-npc-empty-state')?.remove();
  const weapon = buildVirtualUnarmedWeapon(sheet.actor);
  const attackBonus = finite(sheet.actor.system?.baseAttackBonus, 0) + abilityMod(sheet.actor, 'str');
  const card = document.createElement('article');
  card.className = 'swse-npc-attack-item';
  card.dataset.virtualUnarmed = 'true';
  card.innerHTML = `
    <div class="swse-npc-attack-head"><strong>${weapon.name}</strong><span>Virtual · Melee</span></div>
    <div class="swse-npc-attack-meta"><span>Attack ${signed(attackBonus)}</span><span>Damage ${weapon.system?.damage || '1d4'}</span></div>
    <p class="swse-npc-attack-notes">Always available; does not require an owned weapon item.</p>
    <div class="swse-npc-attack-actions"><button type="button" class="swse-npc-mini-btn swse-npc-mini-btn--primary" data-action="roll-follower-unarmed">Roll</button></div>
  `;
  list.prepend(card);
  card.querySelector('[data-action="roll-follower-unarmed"]')?.addEventListener('click', async event => {
    event.preventDefault();
    event.stopPropagation();
    await sheet._runCanonicalAttackWithPreroll(weapon, {
      source: 'npc-virtual-unarmed',
      sourceElement: event.currentTarget,
      companionSource: event.currentTarget,
      sheet,
      showRollCompanion: true,
    });
  }, { signal });
}

function injectGearControls(sheet, root, signal) {
  const gearTab = root.querySelector('section.tab[data-tab="gear"]');
  if (!gearTab) return;
  const header = gearTab.querySelector('.swse-npc-card__header');
  const badges = header?.querySelector('.swse-npc-badges') || header;
  if (badges && !badges.querySelector('[data-action="open-follower-store"]')) {
    const storeButton = document.createElement('button');
    storeButton.type = 'button';
    storeButton.className = 'swse-npc-mini-btn swse-npc-mini-btn--primary';
    storeButton.dataset.action = 'open-follower-store';
    storeButton.textContent = 'Store';
    badges.appendChild(storeButton);
    storeButton.addEventListener('click', async event => {
      event.preventDefault();
      event.stopPropagation();
      await SWSEStore.open(sheet.actor, {
        entryOrigin: 'follower-npc-gear',
        onCheckoutComplete: async () => sheet.render(false),
        onClose: async () => sheet.render(false),
      });
    }, { signal });
  }

  gearTab.querySelectorAll('.swse-npc-gear-row').forEach(row => {
    const itemButton = row.querySelector('[data-item-id]');
    const itemId = itemButton?.dataset?.itemId;
    const item = itemId ? sheet.actor.items?.get?.(itemId) : null;
    if (!item || !['armor', 'weapon', 'shield', 'equipment'].includes(item.type) || row.querySelector('[data-action="equip-follower-item"]')) return;
    const equipped = truthyState(item.system?.equipped) || truthyState(item.system?.isEquipped) || truthyState(item.system?.equippable?.equipped);
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `swse-npc-mini-btn ${equipped ? 'is-equipped' : ''}`;
    button.dataset.action = 'equip-follower-item';
    button.dataset.itemId = item.id;
    button.textContent = equipped ? 'Unequip' : 'Equip';
    row.appendChild(button);
    button.addEventListener('click', async event => {
      event.preventDefault();
      event.stopPropagation();
      await InventoryEngine.toggleEquip(sheet.actor, item.id);
      await sheet.render(false);
    }, { signal });
  });
}

function patchEvents() {
  const proto = SWSEV2CharacterSheet?.prototype;
  if (!proto || proto[EVENTS_PATCHED] || typeof proto._wireNpcConceptSheetEvents !== 'function') return;
  const original = proto._wireNpcConceptSheetEvents;
  proto._wireNpcConceptSheetEvents = function patchedNpcEvents(root, signal) {
    const result = original.call(this, root, signal);
    if (this.actor?.type !== 'npc') return result;
    injectPortrait(this, root, signal);
    injectSkillControls(this, root, signal);
    injectUnarmedAttack(this, root, signal);
    injectGearControls(this, root, signal);
    return result;
  };
  Object.defineProperty(proto, EVENTS_PATCHED, { value: true });
}

function patchFeatDeduplication() {
  if (FollowerCreator[FEAT_PATCHED] || typeof FollowerCreator._addFeatByName !== 'function') return;
  const original = FollowerCreator._addFeatByName.bind(FollowerCreator);
  FollowerCreator._addFeatByName = async function patchedAddFollowerFeat(follower, featName, grantMetadata = null) {
    const target = normalize(featName);
    if (Array.from(follower?.items || []).some(item => item?.type === 'feat' && normalize(item.name) === target)) return false;
    return original(follower, featName, grantMetadata);
  };
  Object.defineProperty(FollowerCreator, FEAT_PATCHED, { value: true });
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
  patchContext();
  patchFollowerDefenses();
  patchEvents();
  patchFeatDeduplication();
  Hooks.once('ready', () => globalThis.setTimeout?.(() => repairFollowerDuplicateFeats(), 1000));
}
