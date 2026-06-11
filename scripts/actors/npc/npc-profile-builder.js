/**
 * NPC Profile Builder
 *
 * Constructs NPC context view-model for sheet rendering.
 * Phase 2 scope: build stable fields that make NPC UI explicit and mode-aware.
 *
 * Returns fully serializable object safe for AppV2 structuredClone.
 */

import {
  getNpcMode,
  getNpcKind,
  getNpcProfileState,
  isNpcStatblockMode
} from './npc-mode-adapter.js';

import { getHeroicLevel } from '/systems/foundryvtt-swse/scripts/actors/derived/level-split.js';
import { NpcProgressionEngine } from '/systems/foundryvtt-swse/scripts/engine/progression/npc-progression-engine.js';
import { NpcLegalReviewEngine } from '/systems/foundryvtt-swse/scripts/engine/npc-legal-review/NpcLegalReviewEngine.js';
import { NpcReviewRepairEngine } from '/systems/foundryvtt-swse/scripts/engine/npc-legal-review/NpcReviewRepairEngine.js';

const NPC_STAT_SKILLS = [
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
  ['useTheForce', 'Use the Force', 'cha']
];

const NPC_SKILL_KEY_ALIASES = Object.fromEntries(NPC_STAT_SKILLS.flatMap(([key, label]) => {
  const canonical = normalizeSkillToken(key);
  const display = normalizeSkillToken(label);
  return [[canonical, key], [display, key]];
}));

function normalizeText(value) {
  return String(value ?? '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
}

function normalizeSkillToken(value) {
  return normalizeText(value).toLowerCase().replace(/[^a-z0-9]/g, '');
}

function safeNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function readNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function abilityScoreFromSystem(system, key) {
  const attr = system?.attributes?.[key] ?? system?.abilities?.[key] ?? {};
  if (typeof attr === 'number') return attr;
  return readNumber(attr?.total)
    ?? readNumber(attr?.score)
    ?? readNumber(attr?.value)
    ?? (readNumber(attr?.base ?? 10) + safeNumber(attr?.racial, 0) + safeNumber(attr?.enhancement, 0) + safeNumber(attr?.temp, 0));
}

function abilityModFromSystem(system, key) {
  const attr = system?.attributes?.[key] ?? system?.abilities?.[key] ?? {};
  const explicit = readNumber(attr?.mod ?? attr?.modifier);
  if (explicit !== null) return explicit;
  return Math.floor((abilityScoreFromSystem(system, key) - 10) / 2);
}

function skillKeyFromLabel(value) {
  const token = normalizeSkillToken(value);
  return NPC_SKILL_KEY_ALIASES[token] || value;
}

function parseSignedNumber(value) {
  const match = normalizeText(value).match(/[+-]\d+/);
  if (!match) return null;
  const n = Number(match[0]);
  return Number.isFinite(n) ? n : null;
}

function parseBeastSkillTotals(beastData = {}) {
  const out = new Map();
  const values = Array.isArray(beastData?.skills) ? beastData.skills : [];
  for (const rawEntry of values) {
    const entry = normalizeText(rawEntry);
    if (!entry) continue;
    const parts = entry.split(/,(?=\s*[^,]*[+-]\d+)/g).map(p => p.trim()).filter(Boolean);
    for (const part of parts.length ? parts : [entry]) {
      const match = part.match(/^(.+?)\s+([+-]\d+)/);
      if (!match) continue;
      const key = skillKeyFromLabel(match[1]);
      if (!key) continue;
      out.set(key, Number(match[2]));
    }
  }
  const direct = [
    ['perception', beastData?.perception],
    ['initiative', beastData?.initiative]
  ];
  for (const [key, value] of direct) {
    const n = readNumber(value);
    if (n !== null && !out.has(key)) out.set(key, n);
  }
  return out;
}

export class NpcProfileBuilder {
  /**
   * Build NPC profile context for sheet rendering.
   *
   * @param {Actor} actor - NPC actor
   * @returns {Object} Serializable context fields
   */
  static buildContext(actor) {
    if (!actor || actor.type !== 'npc') {
      return this._getEmptyContext();
    }

    const npcProfileState = getNpcProfileState(actor);
    const npcMode = getNpcMode(actor);
    const npcKind = getNpcKind(actor);

    // Resolve owner data for followers/minions
    const ownerData = this._resolveOwnerData(actor);
    const hasOwner = !!ownerData;

    // Resolve rider data for mounts
    const riderData = this._resolveRiderData(actor);
    const hasRider = !!riderData;

    // Build serializable link card objects for open-related-actor action
    let ownerLink = { actorId: null, name: null, img: null, type: null, kind: null };
    if (['follower', 'minion', 'privateer'].includes(npcKind)) {
      const ownerId =
        actor.system?.npcProfile?.owner?.actorId ||
        actor?.flags?.swse?.follower?.ownerId ||
        actor?.flags?.swse?.minion?.ownerId ||
        null;

      if (ownerId) {
        const owner = game.actors?.get(ownerId);
        if (owner) {
          ownerLink = {
            actorId: ownerId,
            name: owner.name || null,
            img: owner.img || null,
            type: owner.type || null,
            kind: owner.system?.npcProfile?.kind || null
          };
        }
      }
    }
    const hasOwnerLink = Boolean(ownerLink.actorId);

    let riderLink = { actorId: null, name: null, img: null, type: null, kind: null };
    if (npcKind === 'mount') {
      const riderId = actor.system?.npcProfile?.mount?.riderActorId || null;
      if (riderId) {
        const rider = game.actors?.get(riderId);
        if (rider) {
          riderLink = {
            actorId: riderId,
            name: rider.name || null,
            img: rider.img || null,
            type: rider.type || null,
            kind: rider.system?.npcProfile?.kind || null
          };
        }
      }
    }
    const hasRiderLink = Boolean(riderLink.actorId);

    // Resolve beast summary (Phase 4)
    const beastSummary = this._getBeastSummary(actor);

    // Resolve mount summary (Phase 4)
    const mountSummary = this._getMountSummary(actor);
    const mountRiderResolved = mountSummary?.riderName !== null;
    const mountRiderUnresolved = npcKind === 'mount' && !mountRiderResolved;

    // Resolve follower summary (Phase 3)
    const followerSummary = this._getFollowerSummary(actor);
    const hasFollowerSummary = !!followerSummary;
    const dependentNpcKinds = ['follower', 'minion', 'privateer'];
    const followerOwnerUnresolved = dependentNpcKinds.includes(npcKind) && !followerSummary?.isOwnerResolved;

    // Resolve progression summary
    const progressionSummary = this._getProgressionSummary(actor);

    // Phase 3: Play Mode/statblock quick-reference context. This is read-only and
    // intentionally tolerates noncanonical imported/compendium shapes.
    const playStatblock = this._getPlayStatblockSummary(actor, npcProfileState);

    // Phase 8: read-only Legal Review context. This identifies Play/Legal issues
    // without mutating/import-normalizing the actor.
    let npcLegalReview = null;
    try {
      npcLegalReview = NpcLegalReviewEngine.buildReport(actor);
    } catch (err) {
      console.error('Error building NPC legal review context:', err);
      npcLegalReview = {
        profileLabel: npcProfileState.labels.legalProfile,
        legalStateLabel: 'Unavailable',
        summary: { ok: 0, info: 0, warn: 0, error: 1, review: 1, total: 1 },
        progressionSkeleton: null,
        groups: [{
          id: 'error',
          label: 'Legal Review Error',
          checks: [{
            id: 'legal-review-error',
            label: 'Legal Review',
            severity: 'error',
            tone: 'error',
            status: 'Fix Needed',
            message: err?.message || 'Unable to build Legal Review context.',
            detail: null,
            action: null,
            canAutoFix: false,
            requiresGm: false
          }]
        }],
        note: 'Legal Review failed to prepare.'
      };
    }

    // Phase 9: safe Review & Repair plan. This is non-mutating context only;
    // actions are explicitly triggered by GM/user controls.
    let npcRepairPlan = null;
    try {
      npcRepairPlan = NpcReviewRepairEngine.buildPlan(actor);
    } catch (err) {
      console.error('Error building NPC repair plan context:', err);
      npcRepairPlan = {
        safeFixes: [],
        proposals: [],
        progressionSkeleton: null,
        classItemProposal: null,
        canProposeClassItems: false,
        canApplySafeFixes: false,
        canMarkGmApproved: false,
        note: 'Review & Repair plan failed to prepare.'
      };
    }

    // Determine which panels to show
    const showProgressionPanel = npcMode === 'progression';
    const showOwnerPanel = dependentNpcKinds.includes(npcKind) && (hasOwner || hasOwnerLink || hasFollowerSummary);
    const showBeastPanel = npcKind === 'beast';
    const showMountPanel = npcKind === 'mount';
    const showRelationshipsTab = dependentNpcKinds.includes(npcKind) || npcKind === 'mount';

    // Generate descriptions
    const profileDescription = this._getProfileDescription(npcKind, npcMode);
    const authorityDescription = this._getAuthorityDescription(npcMode, npcKind);

    // Phase 3: Follower-specific descriptions
    let followerAuthorityDescription = null;
    let followerScalingDescription = null;
    if (dependentNpcKinds.includes(npcKind) && hasFollowerSummary) {
      if (npcMode === 'statblock') {
        followerAuthorityDescription =
          'This follower uses published statblock values as the primary authority for abilities.';
      } else if (npcMode === 'progression') {
        followerAuthorityDescription =
          'This follower uses progression-driven calculations, typically scaled to the owner\'s heroic level.';
      }

      if (followerSummary.scalingMode === 'Progression-scaled') {
        followerScalingDescription =
          `Scales from owner's heroic level (currently ${followerSummary.ownerHeroicLevel || '—'}).`;
      } else if (followerSummary.scalingMode === 'Statblock-fixed') {
        followerScalingDescription = 'Uses fixed statblock values; not scaled to owner level.';
      }
    }

    // Phase 5: Top-level helper fields (mirrored from progressionSummary for convenience)
    const hasMixedProgressionTracks = progressionSummary?.hasMixedTracks ?? false;
    const canLaunchNpcLevelUp = progressionSummary?.canLaunchLevelUp ?? false;
    const hasNpcProgressionSnapshot = progressionSummary?.hasSnapshot ?? false;
    const canRevertNpcProgression = progressionSummary?.revertAvailable ?? false;
    const npcProgressionAdvisory = progressionSummary?.advisory ?? null;

    return {
      // Mode + subtype (stable, canonical, non-mutating inference)
      npcKind,
      npcMode,
      npcProfileState,
      npcKindLabel: npcProfileState.labels.kind,
      npcModeLabel: npcProfileState.labels.mode,
      npcSourceAuthority: npcProfileState.sourceAuthority,
      npcSourceAuthorityLabel: npcProfileState.labels.sourceAuthority,
      npcLegalProfile: npcProfileState.legalProfile,
      npcLegalProfileLabel: npcProfileState.labels.legalProfile,
      npcLegalState: npcProfileState.legalState,
      npcLegalStateLabel: npcProfileState.labels.legalState,
      npcProfileMissing: npcProfileState.profileMissing,
      npcImported: npcProfileState.imported,
      npcHasRawImport: npcProfileState.hasRawImport,
      npcHasBeastData: npcProfileState.hasBeastData,
      npcHasClassItems: npcProfileState.hasClassItems,
      npcClassItemCount: npcProfileState.classItemCount,
      isPlayMode: npcProfileState.mode === 'play',
      isOwnerSyncMode: npcProfileState.mode === 'owner-sync',
      isHybridMode: npcProfileState.mode === 'hybrid',
      isLegalReviewMode: npcProfileState.mode === 'legal-review',
      isStatblockMode: npcProfileState.mode === 'play' || npcMode === 'statblock',
      isProgressionMode: npcMode === 'progression',

      // Subtype checks
      isHeroicNpc: npcKind === 'heroic',
      isNonheroicNpc: npcKind === 'nonheroic',
      isBeastNpc: npcKind === 'beast',
      isFollowerNpc: npcKind === 'follower',
      isMinionNpc: npcKind === 'minion' || npcKind === 'privateer',
      isPrivateerNpc: npcKind === 'privateer',
      isImportedNpc: npcKind === 'imported' || npcProfileState.imported,
      isMountNpc: npcKind === 'mount',

      // Attack authority (for combat tab)
      usesFlatStatblockAttacks: isNpcStatblockMode(actor),

      // Panel visibility
      showProgressionPanel,
      showOwnerPanel,
      showBeastPanel,
      showMountPanel,
      showRelationshipsTab,

      // Follower metadata
      hasOwner,
      ownerSummary: ownerData,
      followerTemplate: actor.system?.npcProfile?.template || actor.system?.followerType || null,

      // Mount metadata
      hasRider,
      riderSummary: riderData,

      // Beast metadata
      beastKind: actor.system?.npcProfile?.beastKind || null,
      beastSummary,

      // Mount metadata (Phase 4 expanded)
      mountSummary,
      mountRiderResolved,
      mountRiderUnresolved,

      // Follower metadata (Phase 3)
      hasFollowerSummary,
      followerSummary,
      followerOwnerUnresolved,
      followerAuthorityDescription,
      followerScalingDescription,

      // Progression summary (Phase 5 expanded)
      progressionSummary,

      // Phase 3: Play Mode/statblock quick-reference context
      playStatblock,

      // Phase 8: read-only Legal Review checklist
      npcLegalReview,

      // Phase 9: deterministic repair/GM approval plan
      npcRepairPlan,

      // Phase 5: Top-level helpers
      hasMixedProgressionTracks,
      canLaunchNpcLevelUp,
      hasNpcProgressionSnapshot,
      canRevertNpcProgression,
      npcProgressionAdvisory,

      // Relationship link cards (for open-related-actor action)
      ownerLink,
      hasOwnerLink,
      riderLink,
      hasRiderLink,

      // Descriptions
      profileDescription,
      authorityDescription
    };
  }

  /**
   * Resolve owner data for follower NPCs.
   * @private
   */
  static _resolveOwnerData(actor) {
    const kind = actor?.system?.npcProfile?.kind || actor?.flags?.swse?.minion?.kind || null;
    if (!actor || !['follower', 'minion', 'privateer'].includes(kind)) {
      return null;
    }

    const ownerId = actor.system?.npcProfile?.owner?.actorId
      || actor?.flags?.swse?.follower?.ownerId
      || actor?.flags?.swse?.minion?.ownerId
      || null;
    if (!ownerId) {
      return null;
    }

    const owner = game.actors?.get(ownerId);
    if (!owner) {
      return null;
    }

    const grantingTalent = actor.system?.npcProfile?.owner?.talent;
    const legacyTalent = actor.flags?.swse?.follower?.grantingTalent || actor.flags?.swse?.minion?.talentName || null;

    return {
      name: owner.name || 'Unknown Owner',
      talent: grantingTalent?.name || legacyTalent,
      template: actor.system?.npcProfile?.template || actor.system?.npcProfile?.kind || actor.system?.followerType || null,
      provenance: actor.system?.npcProfile?.owner?.actorId ? 'NPC profile contract' : 'Legacy dependent flag'
    };
  }

  /**
   * Resolve rider data for mount NPCs.
   * @private
   */
  static _resolveRiderData(actor) {
    if (!actor || actor.system?.npcProfile?.kind !== 'mount') {
      return null;
    }

    const riderId = actor.system?.npcProfile?.mount?.riderActorId;
    if (!riderId) {
      return null;
    }

    const rider = game.actors?.get(riderId);
    if (!rider) {
      return null;
    }

    return {
      name: rider.name || 'Unknown Rider',
      notes: actor.system?.npcProfile?.mount?.riderNotes || null
    };
  }

  /**
   * Get beast summary for display.
   * @private
   */
  static _getBeastSummary(actor) {
    if (!actor || getNpcKind(actor) !== 'beast') {
      return null;
    }

    const size = actor.system?.size || null;
    const intelligence = actor.system?.abilities?.int?.value ?? null;
    const speed = actor.system?.speed?.total ?? actor.system?.speed ?? null;
    const speedSummary = speed ? `${speed} ft.` : null;

    const weapons = actor.items?.filter((i) => i.type === 'weapon') || [];
    const beastData = this._getRawBeastData(actor);
    const parsedNaturalAttacks = this._getAttackRows(actor, [], null, beastData)
      .filter(row => row?.name && row?.name !== '—')
      .map(row => {
        const attack = row.attack && row.attack !== '—' ? ` ${row.attack}` : '';
        const damage = row.damage && row.damage !== '—' ? ` (${row.damage})` : '';
        return `${row.name}${attack}${damage}`;
      });
    const naturalAttackNames = weapons
      .map((w) => w.name || 'Unnamed Attack')
      .filter(Boolean);
    for (const attack of parsedNaturalAttacks) {
      if (attack && !naturalAttackNames.includes(attack)) naturalAttackNames.push(attack);
    }

    const abilities = actor.items?.filter((i) => {
      const types = ['feat', 'talent', 'class_feature'];
      return types.includes(i.type);
    }) || [];

    const specialAbilityNames = abilities
      .filter((a) => {
        const name = (a.name || '').toLowerCase();
        return (
          name.includes('ability') ||
          name.includes('special') ||
          name.includes('sense') ||
          name.includes('immunity')
        );
      })
      .map((a) => a.name || 'Unnamed Ability')
      .filter(Boolean);

    const traitNotes = actor.system?.npcProfile?.traitNotes || null;

    return {
      size,
      intelligence,
      speedSummary,
      naturalAttackNames,
      specialAbilityNames,
      traitNotes
    };
  }

  /**
   * Get mount summary for display.
   * @private
   */
  static _getMountSummary(actor) {
    if (!actor || getNpcKind(actor) !== 'mount') {
      return null;
    }

    const riderId = actor.system?.npcProfile?.mount?.riderActorId;
    const rider = riderId ? game.actors?.get(riderId) : null;
    const riderName = rider?.name || null;

    const battleTrained = actor.system?.npcProfile?.mount?.battleTrained ?? false;
    const saddle = actor.system?.npcProfile?.mount?.saddle || null;
    const passengerSlots = actor.system?.npcProfile?.mount?.passengerSlots ?? null;
    const carryingCapacity = actor.system?.npcProfile?.mount?.carryingCapacity || null;
    const mountedMovementNotes = actor.system?.npcProfile?.mount?.mountedMovementNotes || null;
    const notes = actor.system?.npcProfile?.mount?.notes || null;

    return {
      riderName,
      battleTrained,
      saddle,
      passengerSlots,
      carryingCapacity,
      mountedMovementNotes,
      notes
    };
  }

  /**
   * Get follower summary for display.
   * Supports both new npcProfile contract and legacy follower flags.
   * @private
   */
  static _getFollowerSummary(actor) {
    const npcKind = getNpcKind(actor);
    if (!actor || !['follower', 'minion', 'privateer'].includes(npcKind)) {
      return null;
    }

    let ownerName = null;
    let ownerActorId = null;
    let grantingTalentName = null;
    let templateName = null;
    let provenance = null;
    let ownerHeroicLevel = null;
    let isOwnerResolved = false;
    let isTemplateResolved = false;

    // Try new npcProfile contract first
    const ownerRef = actor.system?.npcProfile?.owner;
    if (ownerRef?.actorId) {
      ownerActorId = ownerRef.actorId;
      const owner = game.actors?.get(ownerActorId);
      if (owner) {
        ownerName = owner.name || 'Unknown Owner';
        isOwnerResolved = true;
        ownerHeroicLevel = getHeroicLevel(owner) || null;
      }
      if (ownerRef.talent?.name) {
        grantingTalentName = ownerRef.talent.name;
      }
      provenance = 'NPC profile contract';
    } else {
      // Fall back to legacy follower flags
      const legacyOwnerId = actor?.flags?.swse?.follower?.ownerId;
      if (legacyOwnerId) {
        ownerActorId = legacyOwnerId;
        const owner = game.actors?.get(legacyOwnerId);
        if (owner) {
          ownerName = owner.name || 'Unknown Owner';
          isOwnerResolved = true;
          ownerHeroicLevel = getHeroicLevel(owner) || null;
        }
        if (actor?.flags?.swse?.follower?.grantingTalent) {
          grantingTalentName = actor.flags.swse.follower.grantingTalent;
        }
        provenance = 'Legacy follower flag';
      }
    }

    if (!ownerActorId) {
      const minionOwnerId = actor?.flags?.swse?.minion?.ownerId;
      if (minionOwnerId) {
        ownerActorId = minionOwnerId;
        const owner = game.actors?.get(minionOwnerId);
        if (owner) {
          ownerName = owner.name || 'Unknown Owner';
          isOwnerResolved = true;
          ownerHeroicLevel = getHeroicLevel(owner) || null;
        }
        grantingTalentName = actor?.flags?.swse?.minion?.talentName || actor.system?.npcProfile?.owner?.talent?.name || null;
        provenance = 'Minion ownership flag';
      }
    }

    templateName = actor.system?.npcProfile?.template || actor.system?.npcProfile?.kind || actor.system?.followerType || null;
    isTemplateResolved = !!templateName;

    const profileState = getNpcProfileState(actor);
    const npcMode = profileState.mode === 'play' ? 'statblock' : profileState.mode;
    let scalingMode = null;
    if (npcMode === 'progression') {
      scalingMode = 'Progression-scaled';
    } else if (npcMode === 'statblock') {
      scalingMode = 'Statblock-fixed';
    }

    const currentFollowerLevel = actor.system?.level ?? null;
    const notes = actor.system?.npcProfile?.notes || null;

    let ownerHeroicLevelSync = null;
    if (isOwnerResolved && ownerActorId) {
      const ownerForLevel = game.actors?.get(ownerActorId);
      ownerHeroicLevelSync =
        ownerForLevel?.items
          ?.filter((c) => c.type === 'class' && !c.system?.isNonheroic)
          ?.reduce((sum, c) => sum + (Number(c.system?.level) || 0), 0) ?? null;
    }

    const ownerLevelDelta =
      ownerHeroicLevelSync !== null && currentFollowerLevel !== null
        ? ownerHeroicLevelSync - currentFollowerLevel
        : null;

    const canAdvance = ownerLevelDelta !== null && ownerLevelDelta > 0;
    const advanceReason = canAdvance
      ? `Owner is heroic level ${ownerHeroicLevelSync}; follower is at level ${currentFollowerLevel}.`
      : null;
    const canLaunchAdvance = canAdvance && Boolean(ownerActorId);

    return {
      ownerName,
      ownerActorId,
      grantingTalentName,
      templateName,
      dependentKind: npcKind,
      dependentKindLabel: npcKind === 'privateer' ? 'Privateer' : npcKind === 'minion' ? 'Minion' : 'Follower',
      provenance,
      scalingMode,
      ownerHeroicLevel,
      currentFollowerLevel,
      isOwnerResolved,
      isTemplateResolved,
      notes,
      canAdvance,
      advanceReason,
      ownerLevelDelta,
      canLaunchAdvance
    };
  }


  /**
   * Build Play Mode/statblock quick-reference context.
   *
   * This deliberately reads from imported/compendium/statblock shapes without
   * writing normalized data back to the actor. Play Mode is table usability, not
   * legality repair.
   * @private
   */
  static _getPlayStatblockSummary(actor, profileState = null) {
    if (!actor) {
      return this._emptyPlayStatblockSummary();
    }

    const system = actor.system ?? {};
    const raw = this._getRawImport(actor);
    const beastData = this._getRawBeastData(actor);
    const items = Array.from(actor.items ?? []);

    const abilities = this._getAbilityRows(system);
    const defenses = this._getDefenseRows(system, raw, beastData);
    const hp = this._getHpSummary(system, beastData);
    const skills = this._getSkillRows(system, beastData);
    const attacks = this._getAttackRows(actor, items, raw, beastData);
    const featureGroups = this._getFeatureGroups(items);
    const forcePowers = featureGroups.forcePowers;
    const specials = this._getSpecialRows(actor, raw, beastData, featureGroups);
    const sourceLines = this._getSourceLines(raw, beastData);

    const bab = this._firstDefined(
      system?.bab?.total,
      system?.bab?.value,
      system?.bab,
      system?.baseAttackBonus,
      beastData?.baseAttackBonus,
      raw?.BAB,
      raw?.BaseAttackBonus,
      raw?.['Base Attack Bonus']
    );

    const damageThreshold = this._firstDefined(
      system?.damageThreshold?.total,
      system?.damageThreshold?.value,
      system?.derived?.damageThreshold?.total,
      system?.derived?.threshold?.total,
      beastData?.damageThreshold,
      raw?.Threshold,
      raw?.['Damage Threshold'],
      raw?.DT
    );

    const speed = this._firstDefined(
      system?.speed?.total,
      system?.speed?.value,
      system?.speed,
      beastData?.speed,
      raw?.Speed
    );

    const senses = this._firstDefined(
      system?.senses,
      beastData?.senses,
      raw?.Senses
    );

    const languages = this._asDisplayList(this._firstDefined(system?.languages, raw?.Languages));

    const statblockWarnings = [];
    if (profileState?.profileMissing) {
      statblockWarnings.push('NPC profile metadata is inferred for display; it has not been written to the actor.');
    }
    if (profileState?.sourceAuthority === 'statblock') {
      statblockWarnings.push('Source/statblock values are authoritative in Play Mode; Legal Review can audit them later.');
    }
    if (!attacks.length) {
      statblockWarnings.push('No parsed attacks were found. Check raw source text or item data before combat use.');
    }
    if (profileState?.kind === 'beast' && !items.length) {
      statblockWarnings.push('Beast statblock has no itemized features; raw beast data is shown as the play reference.');
    }

    return {
      hasData: true,
      hp,
      defenses,
      abilities,
      attacks,
      skills,
      featureGroups,
      forcePowers,
      specials,
      sourceLines,
      warnings: statblockWarnings,
      hasWarnings: statblockWarnings.length > 0,
      bab: this._formatValue(bab),
      damageThreshold: this._formatValue(damageThreshold),
      speed: this._formatValue(speed),
      senses: this._formatValue(senses),
      languages,
      hasLanguages: languages.length > 0,
      rawAvailable: Boolean(raw),
      beastDataAvailable: Boolean(beastData)
    };
  }

  static _emptyPlayStatblockSummary() {
    return {
      hasData: false,
      hp: { value: '—', max: '—', temp: null, wounds: null },
      defenses: [],
      abilities: [],
      attacks: [],
      skills: [],
      featureGroups: { feats: [], talents: [], species: [], forcePowers: [], weapons: [], gear: [], other: [] },
      forcePowers: [],
      specials: [],
      sourceLines: [],
      warnings: [],
      hasWarnings: false,
      bab: '—',
      damageThreshold: '—',
      speed: '—',
      senses: '—',
      languages: [],
      hasLanguages: false,
      rawAvailable: false,
      beastDataAvailable: false
    };
  }

  static _getRawImport(actor) {
    return actor?.flags?.swse?.import?.raw
      ?? actor?.flags?.['foundryvtt-swse']?.import?.raw
      ?? actor?.system?.import?.raw
      ?? null;
  }

  static _getRawBeastData(actor) {
    return actor?.flags?.swse?.beastData
      ?? actor?.flags?.['foundryvtt-swse']?.beastData
      ?? actor?.system?.beastData
      ?? null;
  }

  static _firstDefined(...values) {
    for (const value of values) {
      if (value !== undefined && value !== null && value !== '') return value;
    }
    return null;
  }

  static _formatValue(value) {
    if (value === null || value === undefined || value === '') return '—';
    if (Array.isArray(value)) return value.filter(Boolean).join(', ') || '—';
    if (typeof value === 'object') {
      return Object.entries(value)
        .filter(([, v]) => v !== null && v !== undefined && v !== '')
        .map(([k, v]) => `${this._labelFromKey(k)} ${v}`)
        .join(', ') || '—';
    }
    return String(value);
  }

  static _labelFromKey(key) {
    return String(key ?? '')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/[_-]+/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase());
  }

  static _asDisplayList(value) {
    if (value === null || value === undefined || value === '') return [];
    if (Array.isArray(value)) return value.map(v => this._formatValue(v)).filter(v => v && v !== '—');
    if (typeof value === 'object') {
      return Object.entries(value)
        .filter(([, v]) => v !== null && v !== undefined && v !== false && v !== '')
        .map(([k, v]) => v === true ? this._labelFromKey(k) : `${this._labelFromKey(k)}: ${this._formatValue(v)}`);
    }
    return String(value).split(/[,;]\s*/).map(v => v.trim()).filter(Boolean);
  }

  static _getHpSummary(system, beastData = {}) {
    return {
      value: this._formatValue(this._firstDefined(system?.hp?.value, system?.health?.value, system?.derived?.hp?.value, beastData?.hitPoints)),
      max: this._formatValue(this._firstDefined(system?.hp?.max, system?.health?.max, system?.derived?.hp?.max, beastData?.hitPoints)),
      temp: this._firstDefined(system?.hp?.temp, system?.health?.temp),
      wounds: this._firstDefined(system?.wounds?.value, system?.damage?.wounds)
    };
  }

  static _getDefenseRows(system, raw = null, beastData = {}) {
    const defenses = system?.defenses ?? system?.derived?.defenses ?? {};
    const rows = [
      ['reflex', 'Reflex', defenses?.reflex, beastData?.reflexDefense ?? raw?.Reflex ?? raw?.['Reflex Defense']],
      ['fortitude', 'Fortitude', defenses?.fortitude ?? defenses?.fort, beastData?.fortitudeDefense ?? raw?.Fortitude ?? raw?.['Fortitude Defense']],
      ['will', 'Will', defenses?.will, beastData?.willDefense ?? raw?.Will ?? raw?.['Will Defense']],
      ['flatFooted', 'Flat-Footed', defenses?.flatFooted ?? defenses?.flatfooted, beastData?.flatFootedDefense ?? raw?.['Flat-Footed'] ?? raw?.['Flat Footed']]
    ];
    return rows.map(([key, label, data, statblockValue]) => ({
      key,
      label,
      value: this._formatValue(this._firstDefined(statblockValue, data?.total, data?.value, data))
    })).filter(row => row.value !== '—');
  }

  static _getAbilityRows(system) {
    const keys = [
      ['str', 'STR'], ['dex', 'DEX'], ['con', 'CON'], ['int', 'INT'], ['wis', 'WIS'], ['cha', 'CHA']
    ];
    return keys.map(([key, label]) => {
      const attr = system?.attributes?.[key] ?? system?.abilities?.[key] ?? {};
      const score = this._firstDefined(attr?.base, attr?.score, attr?.value, attr);
      const mod = this._firstDefined(attr?.mod, attr?.modifier, attr?.derived?.mod);
      return {
        key,
        label,
        score: this._formatValue(score),
        mod: mod === null ? null : this._formatSigned(mod)
      };
    }).filter(row => row.score !== '—');
  }

  static _formatSigned(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return this._formatValue(value);
    return n >= 0 ? `+${n}` : String(n);
  }

  static _getSkillRows(system, beastData = {}) {
    const skills = system?.skills ?? {};
    const explicitBeastTotals = parseBeastSkillTotals(beastData);
    const level = safeNumber(system?.level ?? system?.attributes?.level ?? beastData?.cl ?? beastData?.beastLevel, 0);
    const halfLevel = Math.floor(level / 2);

    const rows = NPC_STAT_SKILLS.map(([key, label, defaultAbility]) => {
      const data = skills?.[key] ?? {};
      const selectedAbility = data?.selectedAbility || data?.ability || defaultAbility;
      const trained = data?.trained === true || data?.isTrained === true;
      const focused = data?.focused === true || data?.focus === true;
      const explicit = explicitBeastTotals.get(key);
      const stored = this._firstDefined(data?.total, data?.mod, data?.modifier, data?.value, data?.bonus);
      const computed = abilityModFromSystem(system, selectedAbility)
        + halfLevel
        + (trained ? 5 : 0)
        + (focused ? 5 : 0)
        + safeNumber(data?.miscMod ?? data?.misc ?? data?.bonusMod, 0);
      const total = explicit ?? readNumber(stored) ?? computed;
      return {
        key,
        label: data?.label ?? data?.name ?? label,
        total: this._formatSigned(total),
        trained,
        focused,
        ability: selectedAbility
      };
    });

    for (const [rawKey, data] of Object.entries(skills)) {
      const key = skillKeyFromLabel(rawKey);
      if (rows.some(row => row.key === key)) continue;
      const total = this._firstDefined(data?.total, data?.mod, data?.modifier, data?.value, data?.bonus, 0);
      rows.push({
        key,
        label: data?.label ?? data?.name ?? this._labelFromKey(rawKey),
        total: this._formatSigned(total),
        trained: data?.trained === true || data?.isTrained === true,
        focused: data?.focused === true || data?.focus === true,
        ability: data?.selectedAbility || data?.ability || ''
      });
    }

    return rows.sort((a, b) => String(a.label).localeCompare(String(b.label)));
  }

  static _getFeatureGroups(items) {
    const toRow = item => ({
      id: item.id,
      name: item.name || 'Unnamed',
      type: item.type || 'item',
      img: item.img || null,
      summary: this._itemSummary(item)
    });

    return {
      feats: items.filter(i => i.type === 'feat').map(toRow),
      talents: items.filter(i => i.type === 'talent').map(toRow),
      species: items.filter(i => ['species', 'racialAbility', 'species-power'].includes(i.type)).map(toRow),
      forcePowers: items.filter(i => i.type === 'force-power').map(toRow),
      weapons: items.filter(i => i.type === 'weapon').map(toRow),
      gear: items.filter(i => ['equipment', 'armor', 'consumable', 'tool', 'gear'].includes(i.type)).map(toRow),
      other: items.filter(i => !['feat', 'talent', 'species', 'racialAbility', 'species-power', 'force-power', 'weapon', 'equipment', 'armor', 'consumable', 'tool', 'gear'].includes(i.type)).map(toRow)
    };
  }

  static _itemSummary(item) {
    const system = item?.system ?? {};
    return this._formatValue(this._firstDefined(
      system?.description?.value,
      system?.description,
      system?.summary,
      system?.text,
      system?.effect,
      system?.damage,
      system?.damageFormula
    ));
  }

  static _getAttackRows(actor, items, raw, beastData) {
    const rows = [];
    for (const weapon of items.filter(i => i.type === 'weapon')) {
      const sys = weapon.system ?? {};
      const attack = this._formatValue(this._firstDefined(sys?.attackBonus, sys?.attack?.bonus, sys?.bonus, sys?.toHit));
      const damage = this._formatValue(this._firstDefined(sys?.damage, sys?.damageFormula, sys?.damage?.formula, sys?.damage?.value));
      rows.push({
        id: weapon.id,
        itemId: weapon.id,
        name: weapon.name || 'Weapon',
        source: 'Item',
        mode: this._formatValue(this._firstDefined(sys?.weaponType, sys?.category, sys?.group, sys?.type)),
        attack,
        damage,
        attackBonus: this._parseAttackBonus(attack),
        damageFormula: this._normalizeDiceFormula(damage),
        canRollAttack: true,
        canRollDamage: Boolean(this._normalizeDiceFormula(damage)),
        notes: this._formatValue(this._firstDefined(sys?.description?.value, sys?.description, sys?.properties, sys?.special))
      });
    }

    const rawAttackKeys = ['Melee Weapons', 'Ranged Weapons', 'Melee', 'Ranged', 'Attacks', 'Attack Options', 'Special Actions'];
    for (const key of rawAttackKeys) {
      const value = raw?.[key];
      for (const line of this._asDisplayList(value)) {
        rows.push(this._parseAttackLine(line, key));
      }
    }

    for (const key of ['melee', 'ranged', 'naturalAttacks', 'attacks']) {
      for (const line of this._asDisplayList(beastData?.[key])) {
        rows.push(this._parseAttackLine(line, `Beast ${this._labelFromKey(key)}`));
      }
    }

    const seen = new Set();
    return rows.filter(row => {
      const sig = `${row.source}|${row.name}|${row.attack}|${row.damage}|${row.notes}`;
      if (seen.has(sig)) return false;
      seen.add(sig);
      return true;
    }).slice(0, 20);
  }

  static _parseAttackBonus(value) {
    const match = String(value ?? '').match(/[+-]?\d+/);
    if (!match) return null;
    const n = Number(match[0]);
    return Number.isFinite(n) ? n : null;
  }

  static _normalizeDiceFormula(value) {
    const raw = String(value ?? '').trim();
    if (!raw || raw === '—') return '';
    const formula = raw
      .replace(/[–—−]/g, '-')
      .replace(/×/g, '*')
      .replace(/\s+/g, '');
    if (!/^[0-9dD+\-*/().]+$/.test(formula)) return '';
    if (!/\d+d\d+/i.test(formula)) return '';
    return formula;
  }

  static _parseAttackLine(line, source) {
    const text = String(line ?? '').trim();
    const match = text.match(/^(.+?)\s+([+-]\d+)\s*([*†‡]+)?\s*\(([^)]+)\)(.*)$/u);
    if (match) {
      const damage = match[4].trim();
      return {
        id: null,
        itemId: null,
        name: match[1].trim(),
        source,
        mode: 'Statblock',
        attack: match[2],
        damage,
        attackBonus: this._parseAttackBonus(match[2]),
        damageFormula: this._normalizeDiceFormula(damage),
        canRollAttack: true,
        canRollDamage: Boolean(this._normalizeDiceFormula(damage)),
        notes: [match[3] ? 'Special attack marker' : '', match[5]?.trim() || ''].filter(Boolean).join(' · ')
      };
    }
    return { id: null, itemId: null, name: text || source, source, mode: 'Statblock', attack: '—', damage: '—', attackBonus: null, damageFormula: '', canRollAttack: false, canRollDamage: false, notes: text };
  }

  static _getSpecialRows(actor, raw, beastData, featureGroups) {
    const rows = [];
    const push = (label, value, source = 'Source') => {
      for (const entry of this._asDisplayList(value)) {
        rows.push({ label, value: entry, source });
      }
    };

    push('Immune', raw?.Immune ?? raw?.Immunities ?? actor?.system?.immunities, 'Raw');
    push('Resistances', raw?.Resistances ?? raw?.Resistance ?? actor?.system?.resistances, 'Raw');
    push('Special Qualities', raw?.['Special Qualities'] ?? raw?.SpecialQualities ?? raw?.SQ, 'Raw');
    push('Special Actions', raw?.['Special Actions'] ?? raw?.SpecialActions, 'Raw');
    push('Species Traits', raw?.['Species Traits'] ?? raw?.SpeciesTraits, 'Raw');
    push('Beast Traits', beastData?.traits ?? beastData?.specialQualities ?? beastData?.speciesTraits, 'Beast');
    push('Beast Ability Text', beastData?.abilityText, 'Beast');
    push('Senses', beastData?.senses ?? raw?.Senses, beastData ? 'Beast' : 'Raw');

    for (const item of [...featureGroups.species, ...featureGroups.other]) {
      const name = String(item.name ?? '').toLowerCase();
      if (name.includes('immune') || name.includes('resist') || name.includes('trait') || name.includes('special')) {
        rows.push({ label: item.type, value: item.name, source: 'Item' });
      }
    }

    return rows.slice(0, 24);
  }

  static _getSourceLines(raw, beastData) {
    const rows = [];
    const push = (label, value, source = 'Raw') => {
      for (const entry of this._asDisplayList(value)) {
        rows.push({ label, value: entry, source });
      }
    };

    for (const key of ['Class Levels', 'Nonheroic Level', 'Species', 'Race', 'Challenge Level', 'CL', 'Destiny', 'Force Points', 'Dark Side Score']) {
      push(this._labelFromKey(key), raw?.[key], 'Raw');
    }
    for (const key of ['cl', 'fightingSpace', 'reach', 'grapple', 'carryingCapacity']) {
      push(this._labelFromKey(key), beastData?.[key], 'Beast');
    }

    return rows.slice(0, 16);
  }

  /**
   * Get progression summary for display.
   * @private
   */
  static _getProgressionSummary(actor) {
    if (!actor) {
      return null;
    }

    const npcMode = getNpcMode(actor);
    const isProgression = npcMode === 'progression';

    const classes = actor.items?.filter((i) => i.type === 'class') || [];
    const heroicClasses = classes.filter((c) => c.system?.isNonheroic !== true);
    const nonheroicClasses = classes.filter((c) => c.system?.isNonheroic === true);

    const heroicLevel = heroicClasses.reduce((sum, c) => sum + (Number(c.system?.level) || 0), 0);
    const nonheroicLevel = nonheroicClasses.reduce((sum, c) => sum + (Number(c.system?.level) || 0), 0);
    const totalLevels = (heroicLevel || 0) + (nonheroicLevel || 0);

    const classNames = classes.map((c) => c.name || 'Unnamed Class').filter(Boolean);
    const classCount = classes.length;
    const hasMixedTracks = heroicLevel > 0 && nonheroicLevel > 0;

    // Kept as existing behavior
    const canLaunchLevelUp = true;

    const hasSnapshot = NpcProgressionEngine.hasSnapshot?.(actor) ?? false;
    const snapshotInfo = NpcProgressionEngine.getSnapshotInfo?.(actor);
    const snapshotLabel = snapshotInfo?.label ?? null;
    const revertAvailable = hasSnapshot;

    let advisory = null;
    if (hasMixedTracks) {
      advisory =
        'This NPC uses both heroic and nonheroic advancement tracks. Mixed progression is legal but uncommon.';
    }

    if (totalLevels === 0 && !isProgression) {
      return null;
    }

    return {
      heroicLevels: heroicLevel || 0,
      nonheroicLevels: nonheroicLevel || 0,
      totalLevels,
      classCount,
      classNames,
      hasMixedTracks,
      mode: npcMode,
      canLaunchLevelUp,
      hasSnapshot,
      snapshotLabel,
      revertAvailable,
      advisory
    };
  }

  /**
   * Generate profile description text.
   * @private
   */
  static _getProfileDescription(npcKind, npcMode) {
    const modeText = npcMode === 'progression' ? 'progression-based' : npcMode === 'owner-sync' ? 'owner-synced' : 'play-mode statblock';

    switch (npcKind) {
      case 'heroic':
        return `This is a heroic ${modeText} NPC.`;
      case 'nonheroic':
        return `This is a nonheroic ${modeText} NPC with limited advancement.`;
      case 'beast':
        return `This is a beast or creature operating in ${modeText} mode.`;
      case 'follower':
        return `This is a follower in ${modeText} mode, bound to an owner.`;
      case 'minion':
        return `This is a minion in ${modeText} mode, bound to an owner.`;
      case 'privateer':
        return `This is a privateer in ${modeText} mode, bound to an owner.`;
      case 'imported':
        return `This is an imported ${modeText} NPC. Use Play Mode unless Legal Review promotes it.`;
      case 'mount':
        return `This is a mount or steed in ${modeText} mode, available for riding.`;
      default:
        return `This NPC operates in ${modeText} mode.`;
    }
  }

  /**
   * Generate authority description text.
   * @private
   */
  static _getAuthorityDescription(npcMode, npcKind) {
    if (npcMode === 'statblock' || npcMode === 'play') {
      return 'This NPC uses source/statblock values as the primary authority. Missing progression legality does not block table use.';
    }

    if (npcMode === 'progression') {
      if (npcKind === 'follower') {
        return 'This follower uses progression-driven calculations scaled to the owner\'s level.';
      }
      return 'This NPC uses progression-driven calculations for abilities and bonuses.';
    }

    if (npcMode === 'owner-sync') {
      return 'This NPC is controlled by an owner-sync relationship. The owner relationship provides context for level/progression decisions.';
    }

    if (npcMode === 'hybrid') {
      return 'This NPC uses a hybrid authority model: source values are preserved while selected progression data may be normalized.';
    }

    return 'Authority mode unknown.';
  }

  /**
   * Return empty/safe context when actor is invalid.
   * @private
   */
  static _getEmptyContext() {
    return {
      npcKind: 'heroic',
      npcMode: 'statblock',
      npcProfileState: null,
      npcKindLabel: 'Heroic NPC',
      npcModeLabel: 'Play Mode',
      npcSourceAuthority: 'statblock',
      npcSourceAuthorityLabel: 'Statblock',
      npcLegalProfile: 'heroic',
      npcLegalProfileLabel: 'Heroic NPC',
      npcLegalState: 'unchecked',
      npcLegalStateLabel: 'Unchecked',
      npcProfileMissing: true,
      npcImported: false,
      npcHasRawImport: false,
      npcHasBeastData: false,
      npcHasClassItems: false,
      npcClassItemCount: 0,
      isPlayMode: true,
      isOwnerSyncMode: false,
      isHybridMode: false,
      isLegalReviewMode: false,
      isStatblockMode: true,
      isProgressionMode: false,
      isHeroicNpc: true,
      isNonheroicNpc: false,
      isBeastNpc: false,
      isFollowerNpc: false,
      isMinionNpc: false,
      isPrivateerNpc: false,
      isImportedNpc: false,
      isMountNpc: false,
      usesFlatStatblockAttacks: false,
      showProgressionPanel: false,
      showOwnerPanel: false,
      showBeastPanel: false,
      showMountPanel: false,
      showRelationshipsTab: false,
      hasOwner: false,
      ownerSummary: null,
      followerTemplate: null,
      hasRider: false,
      riderSummary: null,
      beastKind: null,
      beastSummary: null,
      mountSummary: null,
      hasFollowerSummary: false,
      followerSummary: null,
      followerOwnerUnresolved: false,
      followerAuthorityDescription: null,
      followerScalingDescription: null,
      mountRiderResolved: false,
      mountRiderUnresolved: false,
      progressionSummary: null,
      hasMixedProgressionTracks: false,
      canLaunchNpcLevelUp: false,
      hasNpcProgressionSnapshot: false,
      canRevertNpcProgression: false,
      npcProgressionAdvisory: null,
      ownerLink: { actorId: null, name: null, img: null, type: null, kind: null },
      hasOwnerLink: false,
      riderLink: { actorId: null, name: null, img: null, type: null, kind: null },
      hasRiderLink: false,
      profileDescription: 'NPC data unavailable.',
      authorityDescription: 'Unknown authority.'
    };
  }
}