/**
 * FollowerSkillsStep
 *
 * Uses the mature SkillsStep UI/details rail. Follower-specific rule authority is
 * limited to the available skill set:
 * - Utility followers choose 1 trained skill from every skill except Use the Force.
 * - Aggressive/Defensive followers skip this step; Endurance is granted by the
 *   template and mirrored when the template is selected.
 */

import { SkillsStep } from '../skills-step.js';
import { swseLogger } from '/systems/foundryvtt-swse/scripts/utils/logger.js';

function skillName(skill) {
  return String(skill?.name || skill?.label || skill?.displayName || skill?.id || skill?.key || '').trim();
}

function isUseTheForce(skill) {
  const normalized = skillName(skill).toLowerCase().replace(/[^a-z0-9]/g, '');
  return normalized === 'usetheforce';
}

export class FollowerSkillsStep extends SkillsStep {
  async onStepEnter(shell) {
    this._followerTemplateType = String(
      shell?.progressionSession?.draftSelections?.templateType
      || shell?.progressionSession?.dependencyContext?.persistentChoices?.templateType
      || ''
    ).toLowerCase();

    await super.onStepEnter(shell);

    if (this._followerTemplateType === 'utility') {
      this._allowedCount = 1;
      this._availableSkills = (this._allSkills || [])
        .filter(skill => !isUseTheForce(skill))
        .map(skill => ({
          ...skill,
          canTrain: true,
          available: true,
          alwaysVisible: true,
          isClassSkill: true,
          followerTemplateSkill: true,
        }))
        .sort((a, b) => skillName(a).localeCompare(skillName(b)));
      this._skillDerivation = {
        mode: 'follower-utility-all-skills',
        fallbackReason: null,
        classSkillRefs: this._availableSkills.length,
        classSkillMatches: this._availableSkills.length,
        backgroundSkillRefs: 0,
        backgroundSkillMatches: 0,
        speciesSkillRefs: 0,
        speciesSkillMatches: 0,
        trainedSelectionMatches: this._availableSkills.length,
        skills: this._availableSkills,
      };
      this._pruneUnavailableSelections();
      this._trainedCount = Array.from(this._trainedSkills.values()).filter(s => s.trained).length;
    } else {
      this._allowedCount = 0;
      this._availableSkills = [];
      this._trainedSkills.clear();
      this._trainedCount = 0;
      this._mirrorFollowerSkills(shell, this._followerTemplateType === 'aggressive' || this._followerTemplateType === 'defensive' ? ['Endurance'] : []);
    }

    swseLogger.log('[FollowerSkillsStep] Using normal skill UI with follower template authority', {
      templateType: this._followerTemplateType,
      allowedCount: this._allowedCount,
      availableSkills: this._availableSkills.length,
      trainedCount: this._trainedCount,
    });
  }

  _resolveAllowedSkillCount(shell, character) {
    const templateType = String(
      shell?.progressionSession?.draftSelections?.templateType
      || shell?.progressionSession?.dependencyContext?.persistentChoices?.templateType
      || ''
    ).toLowerCase();
    return templateType === 'utility' ? 1 : 0;
  }

  _deriveAvailableSkills(shell) {
    const templateType = String(
      shell?.progressionSession?.draftSelections?.templateType
      || shell?.progressionSession?.dependencyContext?.persistentChoices?.templateType
      || ''
    ).toLowerCase();
    if (templateType !== 'utility') {
      return {
        mode: 'follower-template-skip',
        fallbackReason: null,
        classSkillRefs: 0,
        classSkillMatches: 0,
        backgroundSkillRefs: 0,
        backgroundSkillMatches: 0,
        speciesSkillRefs: 0,
        speciesSkillMatches: 0,
        trainedSelectionMatches: 0,
        skills: [],
      };
    }
    const skills = (this._allSkills || [])
      .filter(skill => !isUseTheForce(skill))
      .map(skill => ({
        ...skill,
        canTrain: true,
        available: true,
        alwaysVisible: true,
        isClassSkill: true,
        followerTemplateSkill: true,
      }))
      .sort((a, b) => skillName(a).localeCompare(skillName(b)));
    return {
      mode: 'follower-utility-all-skills',
      fallbackReason: null,
      classSkillRefs: skills.length,
      classSkillMatches: skills.length,
      backgroundSkillRefs: 0,
      backgroundSkillMatches: 0,
      speciesSkillRefs: 0,
      speciesSkillMatches: 0,
      trainedSelectionMatches: skills.length,
      skills,
    };
  }

  async onStepExit(shell) {
    if (this._followerTemplateType !== 'utility') {
      this._mirrorFollowerSkills(shell, this._followerTemplateType === 'aggressive' || this._followerTemplateType === 'defensive' ? ['Endurance'] : []);
      return;
    }
    await super.onStepExit(shell);
    this._mirrorFollowerSkills(shell);
  }

  async onItemCommitted(id, shell) {
    await super.onItemCommitted(id, shell);
    this._mirrorFollowerSkills(shell);
  }

  async onItemDeselected(id, shell) {
    await super.onItemDeselected?.(id, shell);
    this._mirrorFollowerSkills(shell);
  }

  _pruneUnavailableSelections() {
    const allowedIds = new Set((this._availableSkills || []).flatMap(skill => [skill.id, skill.key, skill._id, skill.name, skill.label].filter(Boolean)));
    for (const key of Array.from(this._trainedSkills.keys())) {
      if (!allowedIds.has(key)) this._trainedSkills.delete(key);
    }
    const trained = Array.from(this._trainedSkills.entries()).filter(([, value]) => value?.trained);
    if (trained.length > 1) {
      this._trainedSkills.clear();
      const [key, value] = trained[0];
      this._trainedSkills.set(key, value);
    }
  }

  _mirrorFollowerSkills(shell, explicit = null) {
    const byKey = new Map((this._availableSkills || []).flatMap(skill => [
      [skill.id, skill], [skill.key, skill], [skill._id, skill], [skill.name, skill], [skill.label, skill]
    ].filter(([key]) => key)));
    const selected = Array.isArray(explicit)
      ? explicit
      : Array.from(this._trainedSkills.entries())
        .filter(([, value]) => value?.trained)
        .map(([key]) => skillName(byKey.get(key)) || key)
        .filter(Boolean);
    if (shell?.progressionSession?.draftSelections) {
      shell.progressionSession.draftSelections.skillChoices = selected;
      shell.progressionSession.draftSelections.followerSkills = selected;
    }
  }

  getBlockingIssues() {
    if (this._followerTemplateType !== 'utility') return [];
    return super.getBlockingIssues();
  }

  getSelection() {
    if (this._followerTemplateType !== 'utility') {
      const selected = this._followerTemplateType === 'aggressive' || this._followerTemplateType === 'defensive' ? ['Endurance'] : [];
      return { selected, count: selected.length, isComplete: true };
    }
    return super.getSelection();
  }

  getMentorContext() {
    if (this._followerTemplateType === 'utility') return 'Utility followers can learn one practical trained skill. Every non-Force skill is available as a class skill.';
    return 'This template has its follower skill package locked in. Continuing will skip manual skill training.';
  }
}
