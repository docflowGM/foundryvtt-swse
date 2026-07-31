/**
 * Follower Mutation Planning
 *
 * MUTATION-GOVERNANCE ADDENDUM (correction pass).
 *
 * A review of the first mutation-governance addendum found that
 * `FollowerCreator.createFollowerFromMutation`'s preflight block — the code
 * that resolves derived follower state and builds the follower Actor
 * payload before any persisted mutation — assigned to an undeclared
 * `actorData` variable. Because ES modules always run in strict mode, that
 * assignment threw a `ReferenceError` on every single follower creation;
 * the preflight's own `catch` swallowed it and returned `null`. The bug
 * went unnoticed because the only tests written against this code path
 * exercised the pure transaction *coordinator* (`runFollowerMutationTransaction`)
 * with mock steps, never the actual preflight logic — there was no test
 * that could have caught a bug in code that itself cannot be loaded
 * through the Node Foundry-shim (`follower-creator.js` transitively imports
 * `scripts/apps/base/swse-application-v2.js` via `SWSEDialogV2`, which needs
 * the full `foundry.applications.api` surface the shim does not model).
 *
 * The fix is not just correcting the missing declaration — it is moving
 * this preflight-building logic, and the pure helper functions it depends
 * on, into a module with ZERO Foundry-adjacent imports, so the exact code
 * that runs in production can be imported and executed directly in a Node
 * test. `FollowerCreator`'s own static helper methods (`_getFixedFollowerProfileFromChoices`,
 * `_resolveFollowerDroidSystems`, etc.) become thin delegates to the
 * functions here, so none of their many existing call sites throughout
 * follower-creator.js needed to change.
 */

import { getFollowerTalentConfig } from '/systems/foundryvtt-swse/scripts/engine/crew/follower-talent-config.js';

export function choiceArray(value) {
  if (Array.isArray(value)) return value.filter(Boolean).map(v => String(v).trim()).filter(Boolean);
  if (value === null || value === undefined || value === '') return [];
  return [String(value).trim()].filter(Boolean);
}

export function uniqueList(values) {
  return Array.from(new Set((values || []).filter(Boolean).map(v => String(v).trim()).filter(Boolean)));
}

export function clonePlain(value) {
  if (value === null || value === undefined) return value;
  try {
    return structuredClone(value);
  } catch (_err) {
    try {
      return JSON.parse(JSON.stringify(value));
    } catch (_jsonErr) {
      return value;
    }
  }
}

export function getGrantingTalentNameFromMutation(followerMutation = {}) {
  return followerMutation.grantingTalentName
    || followerMutation.slotTalentName
    || followerMutation.persistentChoices?.grantingTalentName
    || null;
}

export function getGrantingTalentItemIdFromMutation(followerMutation = {}) {
  return followerMutation.grantingTalentItemId
    || followerMutation.slotTalentItemId
    || followerMutation.persistentChoices?.grantingTalentItemId
    || null;
}

export function getGrantingTalentTreeIdFromMutation(followerMutation = {}) {
  return followerMutation.talentTreeId
    || followerMutation.slotTalentTreeId
    || followerMutation.grantingTalentTreeId
    || followerMutation.persistentChoices?.talentTreeId
    || followerMutation.persistentChoices?.slotTalentTreeId
    || followerMutation.persistentChoices?.grantingTalentTreeId
    || null;
}

export function getFollowerGrantConfig(followerMutation = {}, persistentChoices = {}) {
  const grantingTalentName = getGrantingTalentNameFromMutation(followerMutation)
    || persistentChoices?.grantingTalentName
    || null;
  if (!grantingTalentName) return null;
  const treeId = getGrantingTalentTreeIdFromMutation(followerMutation)
    || persistentChoices?.slotTalentTreeId
    || persistentChoices?.talentTreeId
    || persistentChoices?.grantingTalentTreeId
    || null;
  return getFollowerTalentConfig(grantingTalentName, { treeId })
    || getFollowerTalentConfig(grantingTalentName, persistentChoices)
    || null;
}

export function getFixedFollowerProfileFromChoices(persistentChoices = {}, followerMutation = {}) {
  const profile = persistentChoices?.fixedFollowerProfile
    || followerMutation?.followerState?.fixedFollowerProfile
    || followerMutation?.fixedFollowerProfile
    || getFollowerGrantConfig(followerMutation, persistentChoices)?.fixedFollowerProfile
    || null;
  return profile && typeof profile === 'object' ? profile : null;
}

export function usesNoStartingCredits(persistentChoices = {}, followerMutation = {}) {
  const profile = getFixedFollowerProfileFromChoices(persistentChoices, followerMutation);
  const cfg = getFollowerGrantConfig(followerMutation, persistentChoices);
  return profile?.noStartingCredits === true || cfg?.noStartingCredits === true;
}

export function resolveFollowerName(owner, templateType, persistentChoices = {}) {
  const explicitName = String(persistentChoices?.followerName || '').trim();
  if (explicitName) return explicitName.replace(/\s+/g, ' ');

  const ownerName = String(owner?.name || 'Owner').trim().replace(/\s+/g, ' ') || 'Owner';
  const templateKey = String(templateType || 'follower').trim().toLowerCase();
  const templateLabels = {
    aggressive: 'Aggressive Follower',
    defensive: 'Defensive Follower',
    utility: 'Utility Follower'
  };
  const fallbackTemplateLabel = templateKey
    ? `${templateKey.charAt(0).toUpperCase()}${templateKey.slice(1)} Follower`
    : 'Follower';
  return `${ownerName}'s ${templateLabels[templateKey] || fallbackTemplateLabel}`;
}

/**
 * Normalize the shared droid-builder payload for follower actor writes.
 * Droid followers use the normal DroidBuilderStep state shape, not a
 * follower-only optional-system list. These helpers preserve that payload
 * while still filling the older baseSystems/optionalSystems compatibility
 * fields consumed by existing sheet/deriver code.
 */
export function resolveFollowerDroidSystems(droidConfig = {}) {
  const systems = droidConfig.droidSystems && typeof droidConfig.droidSystems === 'object'
    ? structuredClone(droidConfig.droidSystems)
    : null;

  const baseSystems = Array.isArray(droidConfig.baseSystems) ? structuredClone(droidConfig.baseSystems) : [];
  const optionalSystems = Array.isArray(droidConfig.optionalSystems) ? structuredClone(droidConfig.optionalSystems) : [];
  const allowedOptionalCategories = Array.isArray(droidConfig.allowedOptionalCategories)
    ? Array.from(droidConfig.allowedOptionalCategories)
    : [];

  if (systems) {
    systems.baseSystems = Array.isArray(systems.baseSystems) ? systems.baseSystems : baseSystems;
    systems.optionalSystems = Array.isArray(systems.optionalSystems) ? systems.optionalSystems : optionalSystems;
    systems.allowedOptionalCategories = Array.isArray(systems.allowedOptionalCategories)
      ? systems.allowedOptionalCategories
      : allowedOptionalCategories;
    return systems;
  }

  return { baseSystems, optionalSystems, allowedOptionalCategories };
}

export function resolveFollowerDroidCredits(persistentChoices = {}, droidConfig = {}) {
  const builderCredits = droidConfig.droidCredits && typeof droidConfig.droidCredits === 'object'
    ? structuredClone(droidConfig.droidCredits)
    : {};
  const base = Number(
    builderCredits.base
    ?? builderCredits.budget
    ?? persistentChoices.startingCredits
    ?? 0
  );
  const spent = Number(builderCredits.spent ?? droidConfig.spentCredits ?? 0);
  const remaining = Number.isFinite(Number(builderCredits.remaining))
    ? Number(builderCredits.remaining)
    : Math.max(0, base - spent);
  const lost = Number(builderCredits.lost ?? droidConfig.lostCredits ?? Math.max(0, base - spent));

  return {
    ...builderCredits,
    base,
    budget: Number(builderCredits.budget ?? base),
    spent,
    remaining,
    lost,
    unspentCreditsLost: true,
    allowOverflow: false
  };
}

/**
 * Build the complete follower creation payload (the pre-mutation
 * "preflight") from a follower mutation bundle. Throws on malformed input
 * (e.g. a missing `followerState`) — the caller is expected to treat that
 * as "nothing has been persisted yet, so there is nothing to roll back."
 *
 * This is the exact logic `FollowerCreator.createFollowerFromMutation`
 * runs before starting its mutation transaction; it is a plain function
 * (not a class method) specifically so it can be imported and executed
 * directly in a Node test with no Foundry shim required.
 *
 * @param {{id: string, name: string}} owner
 * @param {object} followerMutation
 * @returns {{
 *   actorData: object, speciesName: string|null, templateType: string|null,
 *   persistentChoices: object, followerState: object, targetHeroicLevel: number|null,
 *   fixedProfile: object|null, isDroidFollower: boolean,
 *   grantingTalentName: string|null, grantingTalentItemId: string|null
 * }}
 */
export function buildFollowerCreationPreflight(owner, followerMutation) {
  const {
    speciesName,
    templateType,
    persistentChoices,
    followerState,
    targetHeroicLevel
  } = followerMutation;

  const grantingTalentName = getGrantingTalentNameFromMutation(followerMutation);
  const grantingTalentItemId = getGrantingTalentItemIdFromMutation(followerMutation);
  const fixedProfile = getFixedFollowerProfileFromChoices(persistentChoices, followerMutation);
  const noStartingCredits = usesNoStartingCredits(persistentChoices, followerMutation);
  const resolvedSpeciesName = fixedProfile?.speciesName || speciesName;
  const droidConfig = persistentChoices?.droidConfig?.isDroid ? persistentChoices.droidConfig : null;
  const isDroidFollower = !!droidConfig;
  const droidSystems = isDroidFollower ? resolveFollowerDroidSystems(droidConfig) : undefined;
  const droidCredits = isDroidFollower ? resolveFollowerDroidCredits(persistentChoices, droidConfig) : undefined;
  const followerName = resolveFollowerName(owner, templateType, persistentChoices);

  const actorData = {
    name: followerName,
    type: 'npc',
    system: {
      level: targetHeroicLevel ?? followerState.level,
      race: resolvedSpeciesName,
      isFollower: true,
      isDroid: isDroidFollower,
      noConstitution: isDroidFollower,
      droidSize: droidConfig?.size || null,
      size: droidConfig?.size || fixedProfile?.size || followerState.size || undefined,
      speed: droidConfig?.speed || fixedProfile?.speed || followerState.speed || undefined,
      movement: isDroidFollower ? { walk: droidConfig?.speed || 6 } : (fixedProfile?.movement || followerState.movement || undefined),
      attributes: followerState.abilities,
      abilities: followerState.abilities,
      hp: followerState.hp,
      credits: (isDroidFollower || noStartingCredits) ? 0 : Number(persistentChoices?.startingCredits || 0),
      droidSystems,
      droidCredits,
      baseAttackBonus: followerState.baseAttackBonus ?? followerState.bab,
      progression: {
        followerChoices: persistentChoices,
        followerTemplate: templateType,
        followerName,
        fixedFollowerProfile: fixedProfile ? clonePlain(fixedProfile) : null,
        creatureKind: fixedProfile?.creatureKind || null,
        noStartingCredits,
        isFollower: true
      },
      npcProfile: {
        kind: 'follower',
        creatureKind: fixedProfile?.creatureKind || null,
        speciesType: fixedProfile?.speciesType || null,
        fixedProfileId: fixedProfile?.id || null,
        traitNotes: Array.isArray(fixedProfile?.ruleNotes) ? Array.from(fixedProfile.ruleNotes) : [],
        owner: {
          actorId: owner.id,
          talent: grantingTalentName ? { id: grantingTalentItemId, name: grantingTalentName } : null
        },
        template: templateType,
        displayName: followerName
      }
    },
    flags: {
      swse: {
        follower: {
          ownerId: owner.id,
          templateType: templateType,
          followerName,
          grantingTalent: grantingTalentName,
          grantingTalentItemId,
          isFollower: true,
          fixedFollowerProfileId: fixedProfile?.id || null,
          fixedSpeciesName: fixedProfile?.speciesName || null,
          creatureKind: fixedProfile?.creatureKind || null,
          noStartingCredits
        }
      },
      'foundryvtt-swse': {
        isFollower: true,
        isDroid: isDroidFollower,
        fixedFollowerProfile: fixedProfile ? clonePlain(fixedProfile) : null,
        npcLevelUp: {
          mode: 'statblock'
        }
      }
    }
  };

  return {
    actorData,
    speciesName,
    templateType,
    persistentChoices,
    followerState,
    targetHeroicLevel,
    fixedProfile,
    isDroidFollower,
    grantingTalentName,
    grantingTalentItemId
  };
}
