import { SWSELogger } from '../../utils/logger.js';
import { DamageSystem } from '../damage-system.js';

/**
 * Enhanced Roll System for SWSE
 * This integrates with the actor system and automatically applies
 * condition penalties, Force Point bonuses, and other modifiers.
 */
export class SWSERoll {

  /**
   * Roll an attack with a weapon
   * This automatically includes BAB, ability mod, condition penalties, etc.
   */
  static async rollAttack(actor, weapon, options = {}) {
    const rollData = actor.getRollData();

    // Build the formula step by step so we can see what's happening
    let formula = '1d20';
    let parts = [];

    // Base Attack Bonus
    if (actor.system.bab) {
      formula += ' + @bab';
      parts.push(`BAB ${actor.system.bab >= 0 ? '+' : ''}${actor.system.bab}`);
    }

    // Ability modifier (STR for melee, DEX for ranged)
    const abilityKey = weapon.system.attackAttribute || 'str';
    formula += ` + @${abilityKey}`;
    parts.push(`${abilityKey.toUpperCase()} ${rollData[abilityKey] >= 0 ? '+' : ''}${rollData[abilityKey]}`);

    // Weapon bonus
    if (weapon.system.attackBonus) {
      formula += ` + ${weapon.system.attackBonus}`;
      parts.push(`Weapon +${weapon.system.attackBonus}`);
    }

    // Condition penalty (automatically applied)
    if (rollData.conditionPenalty) {
      formula += ' + @conditionPenalty';
      parts.push(`Condition ${rollData.conditionPenalty}`);
    }

    // Create and evaluate the roll
    const roll = new Roll(formula, rollData);
    await roll.evaluate({async: true});

    // Check for critical threat
    const d20Result = roll.terms[0].results[0].result;
    const isCrit = d20Result >= (weapon.system.critRange || 20);

    // Create detailed message
    const messageContent = `
      <div class="swse-attack-roll ${isCrit ? 'critical-threat' : ''}">
        <div class="roll-header">
          <img src="${weapon.img}" alt="${weapon.name}">
          <h3>${weapon.name} Attack</h3>
        </div>
        <div class="roll-result">
          <h4 class="dice-total">${roll.total}</h4>
          <div class="dice-formula">${roll.formula}</div>
        </div>
        <div class="roll-breakdown">
          <div class="dice-rolls">d20: ${d20Result}</div>
          <div class="modifiers">${parts.join(', ')}</div>
        </div>
        ${isCrit ? '<div class="crit-indicator">CRITICAL THREAT!</div>' : ''}
        <div class="roll-actions">
          <button class="roll-damage" data-weapon-id="${weapon.id}">
            <i class="fas fa-burst"></i> Roll Damage
          </button>
        </div>
      </div>
    `;

    const message = await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({actor: actor}),
      content: messageContent,
      roll: roll,
      sound: CONFIG.sounds.dice
    });

    // Dice So Nice integration
    if (game.dice3d) {
      await game.dice3d.showForRoll(roll, game.user, true);
    }

    return {roll, message, isCrit};
  }

  /**
   * Roll damage for a weapon
   */
  static async rollDamage(actor, weapon, options = {}) {
    const rollData = actor.getRollData();

    // Start with base damage
    let formula = weapon.system.damage || '1d6';
    let parts = [];

    // Add ability modifier for melee
    if (!weapon.system.ranged) {
      const strMod = rollData.str;
      formula += ' + @str';
      parts.push(`STR ${strMod >= 0 ? '+' : ''}${strMod}`);
    }

    // Add half level (heroic characters only)
    if (actor.type === 'character') {
      formula += ' + @halfLevel';
      parts.push(`½ Level +${rollData.halfLevel}`);
    }

    // Critical hit?
    if (options.critical) {
      formula = `(${formula}) * 2`;
      parts.push('CRITICAL!');
    }

    const roll = new Roll(formula, rollData);
    await roll.evaluate({async: true});

    const messageContent = `
      <div class="swse-damage-roll">
        <div class="roll-header">
          <img src="${weapon.img}" alt="${weapon.name}">
          <h3>${weapon.name} Damage</h3>
        </div>
        <div class="roll-result">
          <h4 class="dice-total">${roll.total}</h4>
          <div class="damage-type">${weapon.system.damageType || 'energy'}</div>
        </div>
        <div class="roll-breakdown">
          <div class="dice-formula">${roll.formula}</div>
          <div class="modifiers">${parts.join(', ')}</div>
        </div>
        <div class="damage-application">
          <button class="apply-damage" data-damage="${roll.total}">
            <i class="fas fa-heart-broken"></i> Apply to Target
          </button>
        </div>
      </div>
    `;

    const message = await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({actor: actor}),
      content: messageContent,
      roll: roll,
      sound: CONFIG.sounds.dice
    });

    if (game.dice3d) {
      await game.dice3d.showForRoll(roll, game.user, true);
    }

    return {roll, message};
  }

  /**
   * Roll a skill check
   */
  static async rollSkill(actor, skillKey, options = {}) {
    const skill = actor.system.skills[skillKey];
    if (!skill) {
      ui.notifications.warn(game.i18n.format('SWSE.Notifications.Rolls.SkillNotFound', {skill: skillKey}));
      return;
    }

    const rollData = actor.getRollData();

    // Build formula
    let formula = '1d20';
    let parts = [];

    // Add skill total (includes everything)
    formula += ` + ${skill.total}`;

    // Build breakdown
    const halfLevel = Math.floor(actor.system.level / 2);
    parts.push(`½ Level +${halfLevel}`);

    if (skill.trained) {
      parts.push('Trained +5');
    }

    if (skill.focus > 0) {
      parts.push(`Focus +${skill.focus * 5}`);
    }

    if (rollData.conditionPenalty) {
      parts.push(`Condition ${rollData.conditionPenalty}`);
    }

    const roll = new Roll(formula, rollData);
    await roll.evaluate({async: true});

    // Skill check results can be compared to DCs
    const dcExamples = {
      easy: 10,
      medium: 15,
      hard: 20,
      heroic: 25
    };

    let successLevel = '';
    for (const [level, dc] of Object.entries(dcExamples)) {
      if (roll.total >= dc) {
        successLevel = level;
      }
    }

    const messageContent = `
      <div class="swse-skill-roll">
        <div class="roll-header">
          <h3>${skillKey.charAt(0).toUpperCase() + skillKey.slice(1)} Check</h3>
        </div>
        <div class="roll-result">
          <h4 class="dice-total">${roll.total}</h4>
          <div class="success-level">Beats ${successLevel.toUpperCase()} DC</div>
        </div>
        <div class="roll-breakdown">
          <div class="modifiers">${parts.join(', ')}</div>
        </div>
      </div>
    `;

    const message = await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({actor: actor}),
      content: messageContent,
      roll: roll,
      sound: CONFIG.sounds.dice
    });

    if (game.dice3d) {
      await game.dice3d.showForRoll(roll, game.user, true);
    }

    return {roll, message};
  }

  /**
   * Roll Use the Force check with full flavor text and descriptions
   */
  static async rollUseTheForce(actor, power, options = {}) {
    const skill = actor.system.skills.useTheForce;

    if (!skill || !skill.trained) {
      ui.notifications.warn('Use the Force requires training to use');
      return;
    }

    // Check if power is already spent
    if (power.system.spent) {
      ui.notifications.warn(`${power.name} has already been used. Rest or regain Force Powers to use it again.`);
      return;
    }

    // Determine if this is a dark side or light side power
    const isDarkSide = power.system.tags?.includes('dark-side') || power.system.discipline === 'dark-side';
    const isLightSide = power.system.tags?.includes('light-side') || power.system.discipline === 'light-side';
    const darkSideScore = actor.system.darkSideScore || 0;

    // Check Force Point restrictions based on descriptors
    const canUseForcePointOnCheck = !(isDarkSide || (isLightSide && darkSideScore >= 1));

    // Check if power has optional Force Point enhancement
    let spendForcePoint = false;
    let forcePointUsed = false;

    if (power.system.forcePointEffect && power.system.forcePointEffect.trim() !== '') {
      // Show dialog asking if player wants to spend Force Point
      const fpAvailable = actor.system.forcePoints?.value || 0;

      if (fpAvailable > 0) {
        spendForcePoint = await new Promise((resolve) => {
          new Dialog({
            title: `${power.name} - Force Point Enhancement`,
            content: `
              <div class="force-point-dialog">
                <p><strong>Force Point Enhancement Available:</strong></p>
                <div class="fp-effect">${power.system.forcePointEffect}</div>
                <p style="margin-top: 1rem;"><strong>Force Points:</strong> ${fpAvailable}/${actor.system.forcePoints.max}</p>
                <p>Spend 1 Force Point for this enhanced effect?</p>
              </div>
            `,
            buttons: {
              yes: {
                icon: '<i class="fas fa-hand-sparkles"></i>',
                label: 'Spend Force Point',
                callback: () => resolve(true)
              },
              no: {
                icon: '<i class="fas fa-times"></i>',
                label: 'No, Use Normally',
                callback: () => resolve(false)
              }
            },
            default: 'yes',
            close: () => resolve(false)
          }).render(true);
        });

        if (spendForcePoint) {
          await actor.spendForcePoint(`enhancing ${power.name}`);
          forcePointUsed = true;
        }
      }
    }

    // Load Force power descriptions for flavor text
    let descriptions = null;
    try {
      const response = await fetch('systems/swse/data/force-power-descriptions.json');
      descriptions = await response.json();
    } catch (error) {
      SWSELogger.warn('SWSE | Could not load Force power descriptions:', error);
    }

    // Get random intro and manifestation based on discipline
    const discipline = power.system.discipline || 'telekinetic';
    const powerName = power.name;

    let intro = '';
    let manifestation = '';

    // Check if power has specific description
    if (descriptions?.specific[powerName]) {
      intro = descriptions.specific[powerName].description;
      manifestation = descriptions.specific[powerName].manifestation;
    } else if (descriptions?.disciplines[discipline]) {
      // Use discipline-based description
      const disciplineData = descriptions.disciplines[discipline];
      const introOptions = disciplineData.intro || [];
      const manifestOptions = disciplineData.manifestation || [];

      intro = introOptions[Math.floor(Math.random() * introOptions.length)] || '';
      manifestation = manifestOptions[Math.floor(Math.random() * manifestOptions.length)] || '';
    }

    const dc = power.system.useTheForce || 15;
    const rollData = actor.getRollData();

    const roll = new Roll(`1d20 + ${skill.total}`, rollData);
    await roll.evaluate({async: true});

    const success = roll.total >= dc;
    const d20Result = roll.terms[0].results[0].result;
    const isNatural20 = d20Result === 20;

    // Build DC chart display with achieved effects highlighted
    let dcChartHtml = '';
    let achievedEffects = [];
    if (power.system.dcChart && power.system.dcChart.length > 0) {
      dcChartHtml = '<div class="force-dc-chart"><strong>Use the Force DC Chart:</strong><ul>';

      // Sort DCs to show them in order
      const sortedDCs = [...power.system.dcChart].sort((a, b) => a.dc - b.dc);

      for (const dcEntry of sortedDCs) {
        const achieved = roll.total >= dcEntry.dc;
        const cssClass = achieved ? 'dc-achieved' : 'dc-not-achieved';
        const icon = achieved ? '✓' : '✗';

        dcChartHtml += `<li class="${cssClass}"><strong>${icon} DC ${dcEntry.dc}:</strong> ${dcEntry.effect || dcEntry.description}</li>`;

        if (achieved) {
          achievedEffects.push({
            dc: dcEntry.dc,
            effect: dcEntry.effect || dcEntry.description
          });
        }
      }
      dcChartHtml += '</ul></div>';
    }

    // Build special/warning text
    let specialHtml = '';
    if (power.system.special) {
      specialHtml = `<div class="force-special">${power.system.special}</div>`;
    }

    const messageContent = `
      <div class="swse-force-power-use ${isDarkSide ? 'dark-side-power' : ''} ${success ? 'success' : 'failure'}">
        <h3><i class="fas fa-hand-sparkles"></i> ${actor.name} uses ${powerName}</h3>

        ${intro ? `
          <div class="force-intro">
            <em>${actor.name} ${intro}</em>
          </div>
        ` : ''}

        <div class="roll-section">
          <div class="roll-header">
            <h4>Use the Force Check</h4>
          </div>
          <div class="roll-result">
            <div class="dice-rolls">d20: ${d20Result}</div>
            <h4 class="dice-total">${roll.total}</h4>
            <div class="dc-target">DC ${dc}</div>
            <div class="result ${success ? 'success' : 'failure'}">
              ${success ? '✓ SUCCESS' : '✗ FAILURE'}
            </div>
          </div>
        </div>

        ${success && manifestation ? `
          <div class="force-manifestation">
            ${manifestation}
          </div>
        ` : ''}

        <div class="power-details">
          <div class="power-stats">
            <span class="power-level">Level ${power.system.powerLevel}</span>
            <span class="power-discipline">${discipline}</span>
            <span class="power-time">${power.system.time}</span>
            ${isDarkSide ? '<span class="dark-side-tag"><i class="fas fa-skull"></i> Dark Side</span>' : ''}
          </div>

          <div class="power-range">
            <strong>Range:</strong> ${power.system.range} | <strong>Target:</strong> ${power.system.target}
          </div>

          ${dcChartHtml}

          ${achievedEffects.length > 0 ? `
            <div class="achieved-effects">
              <h4><i class="fas fa-check-circle"></i> Effects Achieved:</h4>
              <ul>
                ${achievedEffects.map(e => `<li><strong>DC ${e.dc}:</strong> ${e.effect}</li>`).join('')}
              </ul>
            </div>
          ` : success ? `
            <div class="power-effect">
              ${power.system.effect}
            </div>
          ` : `
            <div class="power-failed">
              <em>The Force does not answer your call...</em>
            </div>
          `}

          ${forcePointUsed ? `
            <div class="force-point-enhanced">
              <h4><i class="fas fa-hand-sparkles"></i> Force Point Enhancement</h4>
              <div class="fp-enhanced-effect">
                ${power.system.forcePointEffect}
              </div>
              <div class="fp-spent-notice">
                <i class="fas fa-info-circle"></i> 1 Force Point spent
              </div>
            </div>
          ` : ''}

          ${specialHtml}
        </div>
      </div>
    `;

    const message = await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({actor: actor}),
      content: messageContent,
      roll: roll,
      sound: CONFIG.sounds.dice,
      flags: {
        swse: {
          type: 'force-power',
          powerId: power.id,
          isDarkSide: isDarkSide,
          success: success
        }
      }
    });

    if (game.dice3d) {
      await game.dice3d.showForRoll(roll, game.user, true);
    }

    // Mark power as spent (regardless of success/failure)
    await power.update({'system.spent': true});
    ui.notifications.info(`${power.name} has been used. Rest or regain Force Powers to use it again.`);

    // Increase Dark Side Score if using [Dark Side] power
    if (isDarkSide) {
      const newDarkSideScore = (actor.system.darkSideScore || 0) + 1;
      await actor.update({'system.darkSideScore': newDarkSideScore});
      ui.notifications.warn(`Dark Side Score increased to ${newDarkSideScore}`);
    }

    // Apply Force Point cost if successful
    if (success && power.system.forcePointCost) {
      await actor.spendForcePoint(`activating ${power.name}`);
    }

    // Check for natural 20 - regain all spent Force Powers
    if (isNatural20) {
      await this._regainAllForcePowers(actor);
      ui.notifications.info(`<strong>Natural 20!</strong> All Force Powers have been regained!`);
    }

    return {roll, message, success, isNatural20};
  }

  /**
   * Regain all spent Force Powers for an actor
   * @private
   */
  static async _regainAllForcePowers(actor) {
    const spentPowers = actor.items.filter(i =>
      (i.type === 'forcepower' || i.type === 'force-power') && i.system.spent
    );

    for (const power of spentPowers) {
      await power.update({'system.spent': false});
    }

    return spentPowers.length;
  }

  /**
   * Roll a combat action check against a DC
   * @param {Actor} actor - The actor performing the action
   * @param {string} skillKey - The skill to roll (e.g., 'acrobatics', 'deception')
   * @param {Object} actionData - The combat action data including name, DC, outcome
   * @param {Object} options - Additional options
   * @returns {Object} {roll, message, success}
   */
  static async rollCombatActionCheck(actor, skillKey, actionData, options = {}) {
    const skill = actor.system.skills[skillKey];

    if (!skill) {
      ui.notifications.warn(`Skill ${skillKey} not found on actor`);
      return;
    }

    // Check if skill requires training
    if (skill.requiresTraining && !skill.trained) {
      ui.notifications.warn(`${this._getSkillDisplayName(skillKey)} requires training to use`);
      return;
    }

    const rollData = actor.getRollData();
    const dc = actionData.dc?.value || 10;
    const dcType = actionData.dc?.type || 'flat';

    // Only roll for flat DCs - expressions and opposed checks are handled differently
    if (dcType !== 'flat') {
      ui.notifications.info(`${actionData.name} uses ${dcType} DC - see action description for details`);
      return;
    }

    // Build formula
    let formula = '1d20';
    let parts = [];

    // Add skill total (includes everything)
    formula += ` + ${skill.total}`;

    // Build breakdown
    const halfLevel = Math.floor(actor.system.level / 2);
    parts.push(`½ Level +${halfLevel}`);

    if (skill.trained) {
      parts.push('Trained +5');
    }

    if (skill.focus > 0) {
      parts.push(`Focus +${skill.focus * 5}`);
    }

    const abilityMod = rollData[skill.ability];
    parts.push(`${skill.ability.toUpperCase()} ${abilityMod >= 0 ? '+' : ''}${abilityMod}`);

    if (rollData.conditionPenalty) {
      parts.push(`Condition ${rollData.conditionPenalty}`);
    }

    const roll = new Roll(formula, rollData);
    await roll.evaluate({async: true});

    const success = roll.total >= dc;
    const d20Result = roll.terms[0].results[0].result;

    // Build message content
    const messageContent = `
      <div class="swse-combat-action-roll ${success ? 'success' : 'failure'}">
        <div class="roll-header">
          <h3><i class="fas fa-fist-raised"></i> ${actionData.name}</h3>
          <div class="skill-name">${this._getSkillDisplayName(skillKey)} Check</div>
        </div>
        <div class="roll-result">
          <h4 class="dice-total">${roll.total}</h4>
          <div class="dc-target">DC ${dc}</div>
          <div class="result ${success ? 'success' : 'failure'}">
            ${success ? '✓ SUCCESS' : '✗ FAILURE'}
          </div>
        </div>
        <div class="roll-breakdown">
          <div class="dice-rolls">d20: ${d20Result}</div>
          <div class="modifiers">${parts.join(', ')}</div>
        </div>
        ${success && actionData.outcome ? `
          <div class="action-outcome">
            <strong>Outcome:</strong> ${actionData.outcome}
          </div>
        ` : ''}
        ${actionData.when ? `
          <div class="action-condition">
            <em>${actionData.when}</em>
          </div>
        ` : ''}
        <div class="action-type">
          <span class="badge ${actionData.actionType}">${actionData.actionType} action</span>
        </div>
      </div>
    `;

    const message = await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({actor: actor}),
      content: messageContent,
      roll: roll,
      sound: CONFIG.sounds.dice,
      flags: {
        swse: {
          type: 'combat-action-check',
          actionName: actionData.name,
          skillKey: skillKey,
          dc: dc,
          success: success
        }
      }
    });

    if (game.dice3d) {
      await game.dice3d.showForRoll(roll, game.user, true);
    }

    return {roll, message, success};
  }

  /**
   * Get display name for a skill key
   */
  static _getSkillDisplayName(skillKey) {
    const skillNames = {
      acrobatics: 'Acrobatics',
      climb: 'Climb',
      deception: 'Deception',
      endurance: 'Endurance',
      gatherInformation: 'Gather Information',
      initiative: 'Initiative',
      jump: 'Jump',
      knowledge: 'Knowledge',
      mechanics: 'Mechanics',
      perception: 'Perception',
      persuasion: 'Persuasion',
      pilot: 'Pilot',
      ride: 'Ride',
      stealth: 'Stealth',
      survival: 'Survival',
      swim: 'Swim',
      treatInjury: 'Treat Injury',
      useComputer: 'Use Computer',
      useTheForce: 'Use the Force'
    };

    return skillNames[skillKey] || skillKey.charAt(0).toUpperCase() + skillKey.slice(1);
  }
}

// Make available globally for macros and modules
window.SWSERoll = SWSERoll;

// Hook into chat messages to handle button clicks
Hooks.on("renderChatMessageHTML", (message, html) => {
    // Note: html is now an HTMLElement, wrap in $() for jQuery: $(html).find(...)

  // Roll damage button
  $(html).find('.roll-damage').click(async (event) => {
    const weaponId = event.currentTarget.dataset.weaponId;
    const speaker = message.speaker;
    const actor = game.actors.get(speaker.actor);
    const weapon = actor?.items.get(weaponId);

    if (actor && weapon) {
      await SWSERoll.rollDamage(actor, weapon);
    }
  });

  // Apply damage button
  $(html).find('.apply-damage').click(async (event) => {
    const damage = parseInt(event.currentTarget.dataset.damage);
    const tokens = canvas.tokens.controlled;

    if (tokens.length === 0) {
      ui.notifications.warn('Select target token(s) first');
      return;
    }

    for (const token of tokens) {
      await token.actor.applyDamage(damage, {checkThreshold: true});
    }
  });
});
