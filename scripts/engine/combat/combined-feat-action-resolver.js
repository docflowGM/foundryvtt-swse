/**
 * CombinedFeatActionResolver
 *
 * Checks for "combined feat" pairs from the KotOR Campaign Guide and returns
 * synthetic combat-action cards for interaction effects that warrant an explicit
 * action lane entry (swift-action draws, reference cards, etc.).
 *
 * Combined feats handled here:
 *   #2 Dodge + Running Attack           → reaction reference card (AoOs not automated)
 *   #3 DWM I + Quick Draw              → swift action card "Draw Two Weapons"
 *   #4 Force Training + Improved Disarm → standard reference card (+5 UTF, auto-applied)
 *   #5 Quick Draw + WP(Lightsabers)    → swift action card "Draw & Ignite Lightsaber"
 *
 * Combined feats #1 (Dodge + Charging Fire) and #6 (Weapon Focus + Weapon Finesse)
 * are handled elsewhere:
 *   #1 → roll-config.js (charging label / penalty reduction)
 *   #6 → combat-option-resolver.js (collectCombinedFeatModifiers)
 */

// ─── helpers ─────────────────────────────────────────────────────────────────

function actorItems(actor) {
  try { return Array.from(actor?.items ?? []); } catch { return []; }
}

/** Returns true if the actor owns ALL of the named feat items. */
function hasFeat(actor, ...names) {
  const wanted = names.map(n => n.trim().toLowerCase());
  const items = actorItems(actor);
  return wanted.every(name =>
    items.some(i =>
      String(i?.type ?? '').toLowerCase() === 'feat' &&
      String(i?.name ?? '').trim().toLowerCase() === name
    )
  );
}

/** Returns true if the actor has a "Weapon Proficiency" feat with a choice
 *  that matches the given weapon group (e.g. 'lightsabers'). */
function hasWeaponProficiencyForGroup(actor, group) {
  const target = group.trim().toLowerCase();
  for (const item of actorItems(actor)) {
    if (String(item?.type ?? '').toLowerCase() !== 'feat') continue;
    if (String(item?.name ?? '').trim().toLowerCase() !== 'weapon proficiency') continue;
    // Choice stored at flags.swse.choices.weaponProficiency
    const raw = (
      item?.flags?.swse?.choices?.weaponProficiency ??
      item?.flags?.swse?.choices?.weapon_proficiency ??
      item?.system?.selectedChoice ??
      ''
    );
    const choice = String(raw).trim().toLowerCase();
    if (choice.includes(target)) return true;
  }
  return false;
}

// ─── card factory ────────────────────────────────────────────────────────────

function makeCard(overrides) {
  return {
    key: '',
    id: '',
    sourceActionId: '',
    sourceItemId: 'combined-feat',
    itemType: 'feat',
    sourceType: 'combined-feat',
    sourceName: '',
    name: '',
    label: '',
    actionType: 'standard',
    type: 'standard',
    cost: 1,
    notes: '',
    description: '',
    relatedSkills: [],
    resources: ['Combined Feat'],
    executable: false,
    useLabel: 'Reference',
    manualResolution: true,
    resolutionMode: 'reference',
    spendAction: false,
    isAttack: false,
    requiresSelectedChoice: false,
    choiceMissing: false,
    selectedChoiceLabel: '',
    disabledReason: '',
    requiredContext: [],
    targetHint: '',
    ruleData: { resolutionMode: 'reference' },
    ...overrides,
  };
}

// ─── public API ──────────────────────────────────────────────────────────────

export class CombinedFeatActionResolver {
  /**
   * Return synthetic action cards for active combined-feat pairs on this actor.
   * The returned objects are compatible with the combat-action lane format used
   * by AbilityCombatActionResolver.
   *
   * @param {Actor} actor
   * @returns {Array} action card objects
   */
  static getActions(actor) {
    const cards = [];
    if (!actor) return cards;

    // ── #3 DWM I + Quick Draw → Swift "Draw Two Weapons" ─────────────────────
    if (hasFeat(actor, 'dual weapon mastery i', 'quick draw')) {
      cards.push(makeCard({
        key: 'combined:dwm1-quick-draw:draw-two-weapons',
        id: 'combined:dwm1-quick-draw:draw-two-weapons',
        sourceActionId: 'draw-two-weapons',
        sourceName: 'Dual Weapon Mastery I + Quick Draw',
        name: 'Draw Two Weapons',
        label: 'Draw Two Weapons',
        actionType: 'swift',
        type: 'swift',
        notes:
          'Combined Feat (KotOR CG): Draw two weapons simultaneously as a single Swift action. ' +
          'Both hands must be free and each weapon must be one-handed.',
        description:
          'Combined Feat: Draw two one-handed weapons as a single Swift action.',
        resources: ['Combined Feat', 'Once per round'],
      }));
    }

    // ── #5 Quick Draw + WP(Lightsabers) → Swift "Draw & Ignite Lightsaber" ───
    if (hasFeat(actor, 'quick draw') && hasWeaponProficiencyForGroup(actor, 'lightsabers')) {
      cards.push(makeCard({
        key: 'combined:quick-draw-lightsabers:draw-ignite',
        id: 'combined:quick-draw-lightsabers:draw-ignite',
        sourceActionId: 'draw-and-ignite-lightsaber',
        sourceName: 'Quick Draw + Weapon Proficiency (Lightsabers)',
        name: 'Draw & Ignite Lightsaber',
        label: 'Draw & Ignite Lightsaber',
        actionType: 'swift',
        type: 'swift',
        notes:
          'Combined Feat (KotOR CG): Draw and activate a lightsaber as a single Swift action. ' +
          'Use the "Activate Lightsaber" button on the weapon item after drawing.',
        description:
          'Combined Feat: Draw and ignite a lightsaber as a single Swift action.',
        resources: ['Combined Feat', 'Once per round'],
      }));
    }

    // ── #2 Dodge + Running Attack → reaction reference card ───────────────────
    if (hasFeat(actor, 'dodge', 'running attack')) {
      cards.push(makeCard({
        key: 'combined:dodge-running-attack:dodge-vs-aoo',
        id: 'combined:dodge-running-attack:dodge-vs-aoo',
        sourceActionId: 'dodge-running-attack-aoo',
        sourceName: 'Dodge + Running Attack',
        name: 'Dodge Bonus vs AoOs (Running)',
        label: 'Dodge Bonus vs AoOs (Running)',
        actionType: 'reaction',
        type: 'reaction',
        cost: 0,
        notes:
          'Combined Feat (KotOR CG): While using Running Attack, your Dodge bonus to Reflex Defense ' +
          'also applies against Attacks of Opportunity. AoOs are not automated — apply manually.',
        description:
          'While using Running Attack, Dodge bonus applies against Attacks of Opportunity.',
        resources: ['Combined Feat', 'Reference only'],
      }));
    }

    // ── #4 Force Training + Improved Disarm → Standard reference card ─────────
    if (hasFeat(actor, 'force training', 'improved disarm')) {
      cards.push(makeCard({
        key: 'combined:force-training-improved-disarm:force-disarm-utf-bonus',
        id: 'combined:force-training-improved-disarm:force-disarm-utf-bonus',
        sourceActionId: 'force-disarm-utf-bonus',
        sourceName: 'Force Training + Improved Disarm',
        name: 'Force Disarm: +5 UTF',
        label: 'Force Disarm: +5 UTF',
        actionType: 'standard',
        type: 'standard',
        notes:
          'Combined Feat (KotOR CG): When making a Force Disarm check, you gain a +5 bonus to ' +
          'Use the Force. This +5 is applied automatically when Force Disarm is rolled via the ' +
          'combat action lane.',
        description:
          'Combined Feat: +5 Use the Force bonus on Force Disarm checks.',
        relatedSkills: [{ skill: 'useTheForce', label: 'Use the Force' }],
        resources: ['Combined Feat', '+5 UTF on Force Disarm'],
      }));
    }

    return cards;
  }

  /**
   * Return extra situational bonus to add to a skill roll based on combined feats.
   * Called from the sheet's skill/combat-action roll path before posting the roll.
   *
   * @param {Actor}  actor
   * @param {string} skillKey  - e.g. 'useTheForce'
   * @param {string} actionId  - combat action ID, e.g. 'force_disarm'
   * @returns {number} bonus to add to situationalBonus
   */
  static getSkillBonus(actor, skillKey, actionId = '') {
    if (!actor) return 0;
    let bonus = 0;

    // #4 Force Training + Improved Disarm → +5 UTF on Force Disarm
    if (
      skillKey === 'useTheForce' &&
      String(actionId).toLowerCase().replace(/[-_\s]/g, '').includes('forcedisarm') &&
      hasFeat(actor, 'force training', 'improved disarm')
    ) {
      bonus += 5;
    }

    return bonus;
  }

  /**
   * Return true if the actor qualifies for the Dodge + Charging Fire combined feat
   * (charging Reflex penalty is -1 instead of -2).
   *
   * @param {Actor} actor
   * @returns {boolean}
   */
  static hasChargingFireDodge(actor) {
    return hasFeat(actor, 'dodge', 'charging fire');
  }
}
