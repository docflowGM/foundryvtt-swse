/**
 * Prestige Talent Macros
 * Provides macro-callable functions for Prestige Class talent requirement checking
 * Allows users to verify eligibility for prestige class advancement
 */

import PrestigeTalentMechanics from "/systems/foundryvtt-swse/scripts/engine/talent/prestige-talent-mechanics.js";
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

export class PrestigeTalentMacros {

  /**
   * Macro: Check all prestige class eligibility
   * Usage: game.swse.macros.checkPrestigeClassEligibilityMacro(actor)
   */
  static async checkPrestigeClassEligibilityMacro(actor = null) {
    const selectedActor = actor || game.user.character;

    if (!selectedActor) {
      ui.notifications.error('Please select a character to check prestige class eligibility');
      return;
    }

    const eligibleClasses = PrestigeTalentMechanics.getEligiblePrestigeClasses(selectedActor);
    const requirements = PrestigeTalentMechanics.getPrestigeClassRequirementSummary(selectedActor);

    const eligible = Object.entries(requirements)
      .filter(([_, met]) => met)
      .map(([className, _]) => `✓ ${className}`)
      .join('\n');

    const ineligible = Object.entries(requirements)
      .filter(([_, met]) => !met)
      .map(([className, _]) => `✗ ${className}`)
      .join('\n');

    const message = `
      <h3>${selectedActor.name} - Prestige Class Eligibility</h3>
      <hr>
      <h4>Eligible Classes (${eligibleClasses.length}):</h4>
      <p>${eligible || 'None'}</p>
      <hr>
      <h4>Ineligible Classes (${Object.keys(requirements).length - eligibleClasses.length}):</h4>
      <p style="font-size: 12px;">${ineligible || 'None'}</p>
    `;

    ui.notifications.info(message);

    SWSELogger.log(`SWSE Talents | ${selectedActor.name} checked prestige class eligibility (${eligibleClasses.length} eligible)`);
  }

  /**
   * Macro: Check specific prestige class requirements
   * Usage: game.swse.macros.checkPrestigeClassRequirementsMacro(actor, prestigeClassName)
   */
  static async checkPrestigeClassRequirementsMacro(actor = null, prestigeClassName = null) {
    const selectedActor = actor || game.user.character;

    if (!selectedActor) {
      ui.notifications.error('Please select a character');
      return;
    }

    if (!prestigeClassName) {
      ui.notifications.error('Please specify a prestige class name');
      return;
    }

    const details = PrestigeTalentMechanics.getPrestigeClassRequirementDetails(selectedActor, prestigeClassName);

    const statusIcon = details.met ? '✓' : '✗';
    const statusClass = details.met ? 'talent-eligible' : 'talent-ineligible';

    const talentsList = details.talentsHave.length > 0
      ? details.talentsHave.map(t => `  • ${t}`).join('\n')
      : '  (None)';

    const message = `
      <h3 style="color: ${details.met ? 'green' : 'red'};">${statusIcon} ${prestigeClassName}</h3>
      <hr>
      <h4>Talent Requirements:</h4>
      <p>${details.talentsNeeded.join('<br>')}</p>
      <hr>
      <h4>Current Talents:</h4>
      <p style="font-family: monospace; white-space: pre-wrap;">${talentsList}</p>
      <hr>
      <p><strong>Status:</strong> ${details.met ? 'ELIGIBLE ✓' : 'NOT ELIGIBLE - Missing talents'}</p>
    `;

    ui.notifications.info(message);

    SWSELogger.log(`SWSE Talents | ${selectedActor.name} checked requirements for ${prestigeClassName}: ${details.met ? 'ELIGIBLE' : 'INELIGIBLE'}`);
  }

  /**
   * Macro: Check Bounty Hunter requirements (2 Awareness talents)
   */
  static async checkBountyHunterMacro(actor = null) {
    const selectedActor = actor || game.user.character;

    if (!selectedActor) {
      ui.notifications.error('Please select a character');
      return;
    }

    const details = PrestigeTalentMechanics.getPrestigeClassRequirementDetails(selectedActor, 'Bounty Hunter');
    const message = details.met
      ? `${selectedActor.name} is eligible for Bounty Hunter! Has ${PrestigeTalentMechanics.getAwarenessTalentCount(selectedActor)}/2 Awareness talents. ✓`
      : `${selectedActor.name} is not yet eligible for Bounty Hunter. Has ${PrestigeTalentMechanics.getAwarenessTalentCount(selectedActor)}/2 Awareness talents needed. ✗`;

    ui.notifications.info(message);
  }

  /**
   * Macro: Check Force Adept requirements (3 Force talents)
   */
  static async checkForceAdeptMacro(actor = null) {
    const selectedActor = actor || game.user.character;

    if (!selectedActor) {
      ui.notifications.error('Please select a character');
      return;
    }

    const details = PrestigeTalentMechanics.getPrestigeClassRequirementDetails(selectedActor, 'Force Adept');
    const count = PrestigeTalentMechanics.getForceTalentCount(selectedActor);
    const message = details.met
      ? `${selectedActor.name} is eligible for Force Adept! Has ${count}/3 Force talents. ✓`
      : `${selectedActor.name} is not yet eligible for Force Adept. Has ${count}/3 Force talents needed. ✗`;

    ui.notifications.info(message);
  }

  /**
   * Macro: Check Elite Trooper requirements (4 different talent trees)
   */
  static async checkEliteTrooperMacro(actor = null) {
    const selectedActor = actor || game.user.character;

    if (!selectedActor) {
      ui.notifications.error('Please select a character');
      return;
    }

    const status = PrestigeTalentMechanics.getEliteTrooperTalentStatus(selectedActor);
    const met = PrestigeTalentMechanics.hasEliteTrooperTalents(selectedActor);

    const statusList = Object.entries(status)
      .map(([tree, has]) => `${has ? '✓' : '✗'} ${tree}`)
      .join('\n  ');

    const message = `
      <h3>${selectedActor.name} - Elite Trooper Requirements</h3>
      <p>Needs 1 talent from each of 4 trees:</p>
      <p style="font-family: monospace; white-space: pre-wrap;">  ${statusList}</p>
      <hr>
      <p><strong>Status:</strong> ${met ? 'ELIGIBLE ✓' : 'NOT ELIGIBLE ✗'}</p>
    `;

    ui.notifications.info(message);
  }

  /**
   * Macro: Check Officer requirements (3 different talent trees)
   */
  static async checkOfficerMacro(actor = null) {
    const selectedActor = actor || game.user.character;

    if (!selectedActor) {
      ui.notifications.error('Please select a character');
      return;
    }

    const details = PrestigeTalentMechanics.getPrestigeClassRequirementDetails(selectedActor, 'Officer');
    const message = details.met
      ? `${selectedActor.name} is eligible for Officer! Has talents from Leadership, Commando, and Veteran trees. ✓`
      : `${selectedActor.name} is not yet eligible for Officer. Missing talents from one or more required trees. ✗`;

    ui.notifications.info(message);
  }

  /**
   * Macro: Check Infiltrator requirements (2 Camouflage/Spy talents)
   */
  static async checkInfiltratorMacro(actor = null) {
    const selectedActor = actor || game.user.character;

    if (!selectedActor) {
      ui.notifications.error('Please select a character');
      return;
    }

    const details = PrestigeTalentMechanics.getPrestigeClassRequirementDetails(selectedActor, 'Infiltrator');
    const talentList = details.talentsHave.filter(t => !t.includes('/')).join(', ');
    const message = details.met
      ? `${selectedActor.name} is eligible for Infiltrator! Has talents: ${talentList}. ✓`
      : `${selectedActor.name} is not yet eligible for Infiltrator. Has ${details.talentsHave[0]}.✗`;

    ui.notifications.info(message);
  }

  /**
   * Macro: Check Assassin requirements (Dastardly Strike)
   */
  static async checkAssassinMacro(actor = null) {
    const selectedActor = actor || game.user.character;

    if (!selectedActor) {
      ui.notifications.error('Please select a character');
      return;
    }

    const has = PrestigeTalentMechanics.hasDastardlyStrike(selectedActor);
    const message = has
      ? `${selectedActor.name} is eligible for Assassin! Has Dastardly Strike talent. ✓`
      : `${selectedActor.name} is not yet eligible for Assassin. Needs Dastardly Strike talent. ✗`;

    ui.notifications.info(message);
  }

  /**
   * Macro: Check Master Privateer requirements (2 from Misfortune/Smuggling/Spacer)
   */
  static async checkMasterPrivateerMacro(actor = null) {
    const selectedActor = actor || game.user.character;

    if (!selectedActor) {
      ui.notifications.error('Please select a character');
      return;
    }

    const details = PrestigeTalentMechanics.getPrestigeClassRequirementDetails(selectedActor, 'Master Privateer');
    const message = details.met
      ? `${selectedActor.name} is eligible for Master Privateer! ✓`
      : `${selectedActor.name} is not yet eligible for Master Privateer. ${details.talentsHave[0]} ✗`;

    ui.notifications.info(message);
  }

  /**
   * Macro: Check Pathfinder requirements (2 from Awareness/Camouflage/Survivor)
   */
  static async checkPathfinderMacro(actor = null) {
    const selectedActor = actor || game.user.character;

    if (!selectedActor) {
      ui.notifications.error('Please select a character');
      return;
    }

    const details = PrestigeTalentMechanics.getPrestigeClassRequirementDetails(selectedActor, 'Pathfinder');
    const message = details.met
      ? `${selectedActor.name} is eligible for Pathfinder! ✓`
      : `${selectedActor.name} is not yet eligible for Pathfinder. ${details.talentsHave[0]} ✗`;

    ui.notifications.info(message);
  }

  /**
   * Macro: Get list of prestige classes actor is eligible for
   */
  static async getEligiblePrestigeClassesMacro(actor = null) {
    const selectedActor = actor || game.user.character;

    if (!selectedActor) {
      ui.notifications.error('Please select a character');
      return;
    }

    const eligible = PrestigeTalentMechanics.getEligiblePrestigeClasses(selectedActor);

    if (eligible.length === 0) {
      ui.notifications.warn(`${selectedActor.name} is not yet eligible for any prestige classes.`);
      return;
    }

    const classList = eligible.map((cls, idx) => `${idx + 1}. ${cls}`).join('\n');

    const message = `
      <h3>${selectedActor.name} - Available Prestige Classes</h3>
      <p>${selectedActor.name} is eligible for <strong>${eligible.length}</strong> prestige class(es):</p>
      <p style="font-family: monospace; white-space: pre-wrap;">${classList}</p>
    `;

    ui.notifications.info(message);

    SWSELogger.log(`SWSE Talents | ${selectedActor.name} is eligible for ${eligible.length} prestige classes: ${eligible.join(', ')}`);
  }

  /**
   * Macro: Compare two prestige classes
   */
  static async comparePrestigeClassesMacro(actor = null, class1 = null, class2 = null) {
    const selectedActor = actor || game.user.character;

    if (!selectedActor) {
      ui.notifications.error('Please select a character');
      return;
    }

    if (!class1 || !class2) {
      ui.notifications.error('Please specify two prestige class names to compare');
      return;
    }

    const details1 = PrestigeTalentMechanics.getPrestigeClassRequirementDetails(selectedActor, class1);
    const details2 = PrestigeTalentMechanics.getPrestigeClassRequirementDetails(selectedActor, class2);

    const message = `
      <h3>${selectedActor.name} - Prestige Class Comparison</h3>
      <hr>
      <h4>${class1}</h4>
      <p><strong>Status:</strong> ${details1.met ? 'ELIGIBLE ✓' : 'INELIGIBLE ✗'}</p>
      <p><strong>Requirements:</strong> ${details1.talentsNeeded.join(', ')}</p>
      <p><strong>Current Talents:</strong> ${details1.talentsHave.join(', ') || 'None'}</p>
      <hr>
      <h4>${class2}</h4>
      <p><strong>Status:</strong> ${details2.met ? 'ELIGIBLE ✓' : 'INELIGIBLE ✗'}</p>
      <p><strong>Requirements:</strong> ${details2.talentsNeeded.join(', ')}</p>
      <p><strong>Current Talents:</strong> ${details2.talentsHave.join(', ') || 'None'}</p>
    `;

    ui.notifications.info(message);
  }

  /**
   * Macro: Get detailed prestige class roadmap
   * Shows which prestige classes are possible and what talents are needed
   */
  static async getPrestigeClassRoadmapMacro(actor = null) {
    const selectedActor = actor || game.user.character;

    if (!selectedActor) {
      ui.notifications.error('Please select a character');
      return;
    }

    const requirements = PrestigeTalentMechanics.getPrestigeClassRequirementSummary(selectedActor);
    const eligible = Object.entries(requirements).filter(([_, met]) => met).map(([cls, _]) => cls);
    const close = Object.entries(requirements)
      .filter(([_, met]) => !met)
      .filter(([cls, _]) => {
        // Find classes that are "close" (might just need 1 more talent)
        const details = PrestigeTalentMechanics.getPrestigeClassRequirementDetails(selectedActor, cls);
        return details.talentsHave.some && details.talentsHave.length > 0;
      })
      .map(([cls, _]) => cls)
      .slice(0, 5);

    const eligibleList = eligible.length > 0
      ? eligible.map(cls => `✓ ${cls}`).join('\n  ')
      : 'None yet';

    const closeList = close.length > 0
      ? close.map(cls => `~ ${cls}`).join('\n  ')
      : 'None';

    const message = `
      <h3>${selectedActor.name} - Prestige Class Roadmap</h3>
      <hr>
      <h4>Currently Eligible (${eligible.length}):</h4>
      <p style="font-family: monospace; white-space: pre-wrap;">  ${eligibleList}</p>
      <hr>
      <h4>Close to Eligible (${close.length}):</h4>
      <p style="font-family: monospace; white-space: pre-wrap;">  ${closeList}</p>
      <hr>
      <p><em>Note: This shows talent-based prestige classes only. Some prestige classes have different requirements (BAB, feats, skills).</em></p>
    `;

    ui.notifications.info(message);
  }
}

export default PrestigeTalentMacros;
