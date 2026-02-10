/**
 * Mentor Prose Generator
 *
 * Transforms engine explanation bullets into diegetic narrative prose
 * for the mentor "review" section in the Store UI.
 *
 * This layer preserves the engine's factual explanations while converting
 * them to a more interpretive, character-focused narrative voice.
 */

export class MentorProseGenerator {
  /**
   * Generate mentor review prose from engine explanations
   * @param {Object} suggestion - Suggestion object from engine
   * @param {Object} charContext - Character context
   * @returns {String} Narrative mentor review (2-3 sentences)
   */
  static generateMentorReview(suggestion, charContext) {
    try {
      if (!suggestion || !suggestion.explanations) {
        return null;
      }

      const itemType = suggestion.armorId ? 'armor' :
                       suggestion.weaponId ? 'weapon' :
                       suggestion.gearId ? 'gear' : 'item';

      // Select narrative generator based on item type
      if (itemType === 'armor') {
        return this._generateArmorMentorReview(suggestion, charContext);
      } else if (itemType === 'weapon') {
        return this._generateWeaponMentorReview(suggestion, charContext);
      } else if (itemType === 'gear') {
        return this._generateGearMentorReview(suggestion, charContext);
      }

      return null;
    } catch (err) {
      console.error('[MentorProse] Generation failed:', err);
      return null;
    }
  }

  /**
   * Generate armor-specific mentor review
   * @private
   */
  static _generateArmorMentorReview(suggestion, charContext) {
    const explanations = suggestion.explanations || [];
    const role = charContext.primaryRole || 'fighter';
    const hasArmorMastery = charContext.talents?.armorMastery ?? false;
    const isNoArmor = suggestion.armorId === 'NO_ARMOR';

    if (isNoArmor) {
      return this._generateNoArmorReview(charContext);
    }

    // Extract key facts from explanations
    const hasMobilityTalent = explanations.some(e =>
      e.toLowerCase().includes('armor mastery') ||
      e.toLowerCase().includes('move')
    );

    const hasSurvivalFit = explanations.some(e =>
      e.toLowerCase().includes('survivor') ||
      e.toLowerCase().includes('role') ||
      e.toLowerCase().includes('defense')
    );

    const isExpensive = explanations.some(e =>
      e.toLowerCase().includes('premium') ||
      e.toLowerCase().includes('investment')
    );

    const scales = explanations.some(e =>
      e.toLowerCase().includes('scales') ||
      e.toLowerCase().includes('level')
    );

    // Build narrative based on facts
    const sentences = [];

    // Primary: character + armor relationship
    if (hasMobilityTalent) {
      if (role === 'defender' || role === 'tank') {
        sentences.push(
          `You've trained to fight in armor, and at this level that training ` +
          `finally pays off. With your Armor Mastery, heavy armor scales with you ` +
          `instead of holding you back.`
        );
      } else if (role === 'striker' || role === 'mobile') {
        sentences.push(
          `You've learned to move naturally in combat armor now. That restriction ` +
          `you felt before? Gone. This armor lets you maintain your speed.`
        );
      } else {
        sentences.push(
          `Your training in armor movement means you can wear this without ` +
          `sacrificing mobility. It's a tactical advantage at your level.`
        );
      }
    } else if (hasSurvivalFit) {
      if (role === 'defender' || role === 'tank') {
        sentences.push(
          `As a defender, armor is your language. This piece speaks directly ` +
          `to how you fight—protective, reliable, and built to hold ground.`
        );
      } else if (role === 'striker') {
        sentences.push(
          `This armor doesn't match your natural playstyle, but it's built well ` +
          `enough to protect you without dragging you down.`
        );
      } else {
        sentences.push(
          `This armor fits your defensive posture at this level.`
        );
      }
    }

    // Secondary: level/scaling context
    if (scales) {
      sentences.push(
        `It scales with your level rather than falling behind, which matters at ` +
        `higher tiers where raw soak usually becomes irrelevant.`
      );
    }

    // Tertiary: tradeoff acknowledgment
    if (!hasMobilityTalent && role === 'striker') {
      sentences.push(
        `It's slower than going unarmored, yes—but you're building durability, ` +
        `not speed.`
      );
    } else if (role === 'defender' || role === 'tank') {
      sentences.push(
        `It's slower than lighter options, yes—but you're built to hold the line, ` +
        `not dance around it.`
      );
    }

    return sentences.slice(0, 3).join(' ');
  }

  /**
   * Generate weapon-specific mentor review
   * @private
   */
  static _generateWeaponMentorReview(suggestion, charContext) {
    const explanations = suggestion.explanations || [];
    const role = charContext.primaryRole || 'fighter';
    const charStr = charContext.attributes?.str ?? 0;
    const charDex = charContext.attributes?.dex ?? 0;

    // Extract key facts
    const hasHighDamage = explanations.some(e =>
      e.toLowerCase().includes('exceptional') ||
      e.toLowerCase().includes('high damage') ||
      e.toLowerCase().includes('strong finishing')
    );

    const hasAccuracy = explanations.some(e =>
      e.toLowerCase().includes('accurate') ||
      e.toLowerCase().includes('consistency')
    );

    const attributeMatch = explanations.some(e =>
      e.toLowerCase().includes('aligns with') ||
      e.toLowerCase().includes('compatible with')
    );

    const attributeMismatch = explanations.some(e =>
      e.toLowerCase().includes('poor fit') ||
      e.toLowerCase().includes('doesn\'t align')
    );

    const sentences = [];

    // Primary: damage/impact
    if (hasHighDamage) {
      if (role === 'striker') {
        sentences.push(
          `This weapon speaks your language—high impact, finish-focused. ` +
          `Every swing counts.`
        );
      } else if (role === 'defender' || role === 'tank') {
        sentences.push(
          `This isn't a finesse weapon; it's a statement. Built for raw impact ` +
          `when you need to end an encounter.`
        );
      } else {
        sentences.push(
          `This weapon delivers serious impact. It's the kind of thing you bring ` +
          `when you need to matter.`
        );
      }
    }

    // Attribute + playstyle fit
    if (attributeMatch) {
      const attr = charStr > charDex ? 'strength' : 'dexterity';
      sentences.push(
        `It matches your natural ${attr} advantage, which means you won't be ` +
        `fighting the weapon—it'll work with your instincts.`
      );
    }

    if (hasAccuracy && !attributeMismatch) {
      sentences.push(
        `It's accurate too, which means your hits land where you intend them. ` +
        `That reliability matters.`
      );
    }

    // Role-specific context
    if (role === 'mobile') {
      sentences.push(
        `For someone who moves like you do, this keeps you effective without ` +
        `anchoring you down.`
      );
    }

    return sentences.slice(0, 3).join(' ');
  }

  /**
   * Generate "No Armor" special case review
   * @private
   */
  static _generateNoArmorReview(charContext) {
    const role = charContext.primaryRole || 'fighter';
    const charDex = charContext.attributes?.dex ?? 0;
    const hasArmorTalents = !!(
      charContext.talents?.armoredDefense ||
      charContext.talents?.improvedArmoredDefense ||
      charContext.talents?.armorMastery
    );

    if (hasArmorTalents) {
      return (
        `Your armor talents are sitting unused without equipped armor. ` +
        `All that training in defensive positioning? It needs a shell to work. ` +
        `Come back to this when you don't have armor synergies.`
      );
    }

    if (charDex > 1) {
      return (
        `Your reflexes alone are already strong at this level. Adding armor ` +
        `would slow you more than it helps. Trust your speed and training over ` +
        `raw soak. You're faster than you are tough.`
      );
    }

    return (
      `At this point in your career, armor isn't adding much value. Your ` +
      `Heroic Level defense is handling the workload. Save the credits.`
    );
  }

  /**
   * Generate gear-specific mentor review
   * @private
   */
  static _generateGearMentorReview(suggestion, charContext) {
    const explanations = suggestion.explanations || [];
    const role = charContext.primaryRole || 'generalist';

    // Extract key facts
    const isUtility = explanations.some(e =>
      e.toLowerCase().includes('utility')
    );

    const isPassive = explanations.some(e =>
      e.toLowerCase().includes('always available') ||
      e.toLowerCase().includes('passive')
    );

    const isQuick = explanations.some(e =>
      e.toLowerCase().includes('quick') ||
      e.toLowerCase().includes('reaction')
    );

    const roleMatch = explanations.some(e =>
      e.toLowerCase().includes('role') ||
      e.toLowerCase().includes('excellent for')
    );

    const sentences = [];

    // Primary: utility + activation
    if (isPassive) {
      sentences.push(
        `This is always there when you need it. No action cost, no setup. ` +
        `It just works.`
      );
    } else if (isQuick) {
      sentences.push(
        `This activates fast. When the moment comes, you won't be stuck waiting ` +
        `for a full action.`
      );
    } else if (isUtility) {
      sentences.push(
        `This is the kind of gear that solves problems. It gives you options ` +
        `you wouldn't have otherwise.`
      );
    }

    // Role fit
    if (roleMatch) {
      sentences.push(
        `It fits how you actually fight—not how gear designers think people should fight.`
      );
    }

    return sentences.slice(0, 2).join(' ');
  }

  /**
   * Generate mentor basis note (contextual explanation)
   * @param {Object} charContext - Character context
   * @returns {String} Basis explanation (one line)
   */
  static generateMentorBasis(charContext) {
    const parts = [];

    if (charContext.primaryRole) {
      parts.push(`your ${charContext.primaryRole} role`);
    }

    const talentList = [];
    if (charContext.talents?.armoredDefense) talentList.push('Armored Defense');
    if (charContext.talents?.improvedArmoredDefense) talentList.push('Improved Armored Defense');
    if (charContext.talents?.armorMastery) talentList.push('Armor Mastery');

    if (talentList.length > 0) {
      parts.push(`talents (${talentList.join(', ')})`);
    }

    if (parts.length > 0) {
      return `This assessment is based on ${parts.join(' and ')}.`;
    }

    return null;
  }
}

export default MentorProseGenerator;
