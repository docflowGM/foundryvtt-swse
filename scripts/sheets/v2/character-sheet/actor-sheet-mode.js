/**
 * Actor sheet mode helpers for SWSEV2CharacterSheet.
 *
 * Player characters, player droids, NPCs, and vehicles intentionally share the same
 * actor holopad/shell implementation. Actor-type differences are layered as
 * mode flags inside the shared character sheet instead of maintaining separate
 * shell stacks with duplicated chrome controls.
 */

const CHARACTER_FRAME_OUTER_CLASS = [
  'swse-character-sheet-wrapper',
  'swse-character-sheet-wrapper--concept',
  'swse-character-sheet-form',
  'swse-character-sheet-form-root',
  'swse-sheet-ui',
  'swse-sheet',
  'swse-sheet--concept'
].join(' ');

const ACTOR_MODE_CONFIG = {
  character: {
    id: 'character',
    label: 'Character Actor',
    shellClass: 'character-actor',
    dragTitle: 'Drag datapad. Double-click to minimize.',
    dragLabel: 'Datapad drag rail. Double-click to minimize.',
    bottomEngraving: 'CEC ID 31 - CLASS A - NO HOT OPEN',
    title: 'Character Dossier',
    identityLabel: 'Species'
  },
  droid: {
    id: 'droid',
    label: 'Droid Actor',
    shellClass: 'droid-actor',
    dragTitle: 'Drag droid actor datapad. Double-click to minimize.',
    dragLabel: 'Droid actor datapad drag rail. Double-click to minimize.',
    bottomEngraving: 'CEC ID 31 - CLASS A - DROID ACTOR SHELL',
    title: 'Droid Unit Dossier',
    identityLabel: 'Droid Chassis'
  },
  npc: {
    id: 'npc',
    label: 'NPC Actor',
    shellClass: 'npc-actor',
    dragTitle: 'Drag NPC actor datapad. Double-click to minimize.',
    dragLabel: 'NPC actor datapad drag rail. Double-click to minimize.',
    bottomEngraving: 'CEC ID 31 - CLASS A - NPC ACTOR SHELL',
    title: 'NPC Dossier',
    identityLabel: 'Species'
  },
  vehicle: {
    id: 'vehicle',
    label: 'Vehicle Actor',
    shellClass: 'vehicle-actor',
    dragTitle: 'Drag vehicle datapad. Double-click to minimize.',
    dragLabel: 'Vehicle datapad drag rail. Double-click to minimize.',
    bottomEngraving: 'CEC ID 31 - CLASS A - VEHICLE ACTOR SHELL',
    title: 'Vehicle Dossier',
    identityLabel: 'Frame'
  }
};

function normalizeKey(value) {
  return String(value ?? '').trim().toLowerCase();
}

function hasHeroicClassItem(actor) {
  try {
    return Array.from(actor?.items ?? []).some(item => {
      if (item?.type !== 'class') return false;
      if (item?.system?.isNonheroic === true) return false;
      const name = normalizeKey(item?.name);
      if (name === 'nonheroic') return false;
      const level = Number(item?.system?.level ?? item?.system?.levels ?? 0);
      return Number.isFinite(level) ? level > 0 : true;
    });
  } catch (_err) {
    return false;
  }
}

export function isPromotedHeroicNpcActor(actor) {
  if (normalizeKey(actor?.type) !== 'npc') return false;

  const profile = actor?.system?.npcProfile ?? {};
  const flags = actor?.flags ?? {};
  const npcLevelUp = flags?.['foundryvtt-swse']?.npcLevelUp ?? flags?.swse?.npcLevelUp ?? {};

  if (actor?.system?.promotedFromNpc === true) return true;
  if (actor?.system?.actorMode === 'heroic') return true;
  if (normalizeKey(profile.kind) === 'heroic') return true;
  if (normalizeKey(profile.legalProfile) === 'heroic') return true;
  if (normalizeKey(profile.mode) === 'heroic') return true;
  if (normalizeKey(profile.mode) === 'progression' && hasHeroicClassItem(actor)) return true;
  if (normalizeKey(npcLevelUp.mode) === 'progression' && hasHeroicClassItem(actor)) return true;

  return hasHeroicClassItem(actor) && normalizeKey(profile.kind) !== 'nonheroic';
}

function normalizeActorType(actor) {
  const actorType = normalizeKey(actor?.type || 'character');
  if (actorType === 'npc' && isPromotedHeroicNpcActor(actor)) return 'character';
  return ACTOR_MODE_CONFIG[actorType] ? actorType : 'character';
}

export function getActorSheetModeId(actor) {
  return normalizeActorType(actor);
}

export function isDroidActor(actor) {
  return normalizeActorType(actor) === 'droid';
}

export function isNpcActor(actor) {
  return normalizeActorType(actor) === 'npc';
}

export function isVehicleActor(actor) {
  return normalizeActorType(actor) === 'vehicle';
}

export function buildActorSheetModeContext({ actor, editable = false } = {}) {
  const actorType = normalizeActorType(actor);
  const actorDocumentType = normalizeKey(actor?.type || actorType);
  const promotedHeroicNpc = isPromotedHeroicNpcActor(actor);
  const config = ACTOR_MODE_CONFIG[actorType] ?? ACTOR_MODE_CONFIG.character;
  const droid = actorType === 'droid';
  const npc = actorType === 'npc';
  const vehicle = actorType === 'vehicle';
  const shellClass = promotedHeroicNpc ? 'heroic-npc-actor' : config.shellClass;

  return {
    isDroidActor: droid,
    isNpcActor: npc,
    isVehicleActor: vehicle,
    isNpcActorDocument: actorDocumentType === 'npc',
    isPromotedHeroicNpcActor: promotedHeroicNpc,
    isCharacterActor: actorType === 'character',
    useNpcConceptSheet: npc,
    useVehicleSheet: vehicle,
    actorSheetMode: {
      id: config.id,
      actorType,
      actorDocumentType,
      label: promotedHeroicNpc ? 'Heroic NPC Actor' : config.label,
      title: promotedHeroicNpc ? 'Character Dossier' : config.title,
      usesCharacterShell: true,
      editable: Boolean(editable),
      promotedHeroicNpc,
      useNpcConceptSheet: npc,
      useVehicleSheet: vehicle,
      showCharacterSheetContent: !npc && !vehicle,
      showVehicleSheetContent: vehicle,
      // Phase 3+ consumes these flags to alter actor-sheet content while keeping
      // the physical shell identical across character, droid, and NPC actors.
      hideSpeciesSection: droid,
      hideConstitution: droid,
      showDroidSystemsTab: droid,
      droidSystemsReadOnly: droid,
      droidSystemsModificationSurface: droid ? 'garage' : null,
      showNpcControls: npc,
      showSheetInteractionToggle: !npc,
      hideSheetInteractionToggle: npc,
      showVehicleControls: vehicle,
      vehicleReadOnlySheet: vehicle,
      vehicleModificationSurface: vehicle ? 'shipyard' : null,
      identityLabel: config.identityLabel
    },
    actorSheetFrame: {
      outerClass: [
        CHARACTER_FRAME_OUTER_CLASS,
        'swse-actor-sheet-wrapper',
        `swse-actor-sheet-wrapper--${config.id}`,
        `swse-actor-sheet-wrapper--${shellClass}`
      ].join(' '),
      dataSheetForm: vehicle ? 'vehicle' : 'character',
      conceptSource: vehicle ? 'assets/Concept/Shipyard Builder.html' : (promotedHeroicNpc ? 'assets/Concept/Character Sheet v2.html' : (npc ? 'assets/Concept/NPC Concept Sheet.html' : 'assets/Concept/Character Sheet v2.html')),
      shellExtraClass: `swse-shell--${shellClass}`,
      tabletExtraClass: `swse-tablet--${shellClass}`,
      screenExtraClass: `swse-screen--${shellClass}`,
      dragTitle: promotedHeroicNpc ? 'Drag heroic NPC datapad. Double-click to minimize.' : config.dragTitle,
      dragLabel: promotedHeroicNpc ? 'Heroic NPC datapad drag rail. Double-click to minimize.' : config.dragLabel,
      bottomEngraving: promotedHeroicNpc ? 'CEC ID 31 - CLASS A - HEROIC NPC SHELL' : config.bottomEngraving
    }
  };
}

export function applyActorSheetModeClasses(root, actor) {
  if (!(root instanceof HTMLElement)) return;

  const actorType = normalizeActorType(actor);
  const actorDocumentType = normalizeKey(actor?.type || actorType);
  const config = ACTOR_MODE_CONFIG[actorType] ?? ACTOR_MODE_CONFIG.character;
  const promotedHeroicNpc = isPromotedHeroicNpcActor(actor);
  const activeShellClass = promotedHeroicNpc ? 'heroic-npc-actor' : config.shellClass;

  root.classList.add('swse-actor-sheet-shell');
  for (const modeConfig of Object.values(ACTOR_MODE_CONFIG)) {
    root.classList.toggle(
      `swse-actor-sheet-shell--${modeConfig.shellClass}`,
      modeConfig.id === config.id && !promotedHeroicNpc
    );
  }
  root.classList.toggle('swse-actor-sheet-shell--heroic-npc-actor', promotedHeroicNpc);

  root.dataset.actorSheetMode = config.id;
  root.dataset.actorType = actorType;
  root.dataset.actorDocumentType = actorDocumentType;
  root.dataset.promotedHeroicNpc = promotedHeroicNpc ? 'true' : 'false';
  root.classList.toggle('swse-sheet-actor-mode--droid', actorType === 'droid');
  root.classList.toggle('swse-sheet-actor-mode--npc', actorType === 'npc');
  root.classList.toggle('swse-sheet-actor-mode--vehicle', actorType === 'vehicle');
  root.classList.toggle('swse-sheet-actor-mode--character', actorType === 'character');
  root.classList.toggle('swse-sheet-actor-mode--heroic-npc', promotedHeroicNpc);

  const sheetShell = root.querySelector('.sheet-shell');
  if (sheetShell instanceof HTMLElement) {
    sheetShell.dataset.actorSheetMode = config.id;
    sheetShell.dataset.actorType = actorType;
    sheetShell.dataset.actorDocumentType = actorDocumentType;
    sheetShell.dataset.promotedHeroicNpc = promotedHeroicNpc ? 'true' : 'false';
    sheetShell.classList.toggle('swse-shell-actor-mode--droid', actorType === 'droid');
    sheetShell.classList.toggle('swse-shell-actor-mode--npc', actorType === 'npc');
    sheetShell.classList.toggle('swse-shell-actor-mode--vehicle', actorType === 'vehicle');
    sheetShell.classList.toggle('swse-shell-actor-mode--character', actorType === 'character');
    sheetShell.classList.toggle('swse-shell-actor-mode--heroic-npc', promotedHeroicNpc);
    sheetShell.classList.add(`swse-shell--${activeShellClass}`);
  }
}
