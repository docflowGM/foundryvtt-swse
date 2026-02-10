/**
 * SWSE Level-Up Diff Viewer
 * Displays changes before finalizing progression
 */

import { swseLogger } from '../../utils/logger.js';

/**
 * Compute differences between before and after states
 * @param {Object} before - Snapshot before changes
 * @param {Object} after - Snapshot after changes
 * @returns {Object} - Diff object with changes
 */
export function computeDiff(before, after) {
  const diff = {};

  // HP changes
  diff.hp = {
    before: before.system?.hp?.max || 0,
    after: after.system?.hp?.max || 0,
    delta: (after.system?.hp?.max || 0) - (before.system?.hp?.max || 0)
  };

  // Level changes
  diff.level = {
    before: before.system?.level || 0,
    after: after.system?.level || 0,
    delta: (after.system?.level || 0) - (before.system?.level || 0)
  };

  // Class levels
  const beforeClasses = (before.items || [])
    .filter(i => i.type === 'class')
    .map(i => `${i.name} ${i.system?.level || 1}`);

  const afterClasses = (after.items || [])
    .filter(i => i.type === 'class')
    .map(i => `${i.name} ${i.system?.level || 1}`);

  diff.classes = {
    before: beforeClasses,
    after: afterClasses
  };

  // Feats added
  const beforeFeatIds = new Set(
    (before.items || [])
      .filter(i => i.type === 'feat')
      .map(i => i._id)
  );

  diff.featsAdded = (after.items || [])
    .filter(i => i.type === 'feat' && !beforeFeatIds.has(i._id))
    .map(i => i.name);

  // Talents added
  const beforeTalentIds = new Set(
    (before.items || [])
      .filter(i => i.type === 'talent')
      .map(i => i._id)
  );

  diff.talentsAdded = (after.items || [])
    .filter(i => i.type === 'talent' && !beforeTalentIds.has(i._id))
    .map(i => i.name);

  // Force powers added
  const beforeForcePowerIds = new Set(
    (before.items || [])
      .filter(i => i.type === 'forcepower')
      .map(i => i._id)
  );

  diff.forcePowersAdded = (after.items || [])
    .filter(i => i.type === 'forcepower' && !beforeForcePowerIds.has(i._id))
    .map(i => i.name);

  // Skills trained
  const beforeTrainedSkills = before.system?.progression?.trainedSkills || [];
  const afterTrainedSkills = after.system?.progression?.trainedSkills || [];

  diff.skillsAdded = afterTrainedSkills.filter(s => !beforeTrainedSkills.includes(s));

  // Ability score changes
  diff.abilities = {};
  const abilities = ['str', 'dex', 'con', 'int', 'wis', 'cha'];

  for (const ability of abilities) {
    const beforeValue = before.system?.abilities?.[ability]?.base || 10;
    const afterValue = after.system?.abilities?.[ability]?.base || 10;

    if (beforeValue !== afterValue) {
      diff.abilities[ability] = {
        before: beforeValue,
        after: afterValue,
        delta: afterValue - beforeValue
      };
    }
  }

  // BAB changes
  diff.bab = {
    before: before.system?.combat?.bab || 0,
    after: after.system?.combat?.bab || 0,
    delta: (after.system?.combat?.bab || 0) - (before.system?.combat?.bab || 0)
  };

  // Defense changes
  diff.defenses = {
    reflex: {
      before: before.system?.defenses?.reflex?.total || 10,
      after: after.system?.defenses?.reflex?.total || 10
    },
    fortitude: {
      before: before.system?.defenses?.fortitude?.total || 10,
      after: after.system?.defenses?.fortitude?.total || 10
    },
    will: {
      before: before.system?.defenses?.will?.total || 10,
      after: after.system?.defenses?.will?.total || 10
    }
  };

  return diff;
}

/**
 * Show diff dialog with before/after comparison
 * @param {Object} diff - Diff object from computeDiff
 */
export function showDiffDialog(diff) {
  let html = '<div class="swse-diff-viewer">';
  html += '<h2>Level-Up Changes</h2>';

  // Level and HP
  html += '<div class="diff-section">';
  html += `<h3>Character Progression</h3>`;
  html += `<p><strong>Level:</strong> ${diff.level.before} → ${diff.level.after} <span class="delta">(+${diff.level.delta})</span></p>`;
  html += `<p><strong>HP:</strong> ${diff.hp.before} → ${diff.hp.after} <span class="delta">(+${diff.hp.delta})</span></p>`;
  html += `<p><strong>BAB:</strong> ${diff.bab.before} → ${diff.bab.after} <span class="delta">(+${diff.bab.delta})</span></p>`;
  html += '</div>';

  // Class levels
  if (diff.classes.before.length > 0 || diff.classes.after.length > 0) {
    html += '<div class="diff-section">';
    html += `<h3>Class Levels</h3>`;
    html += `<p><strong>Before:</strong> ${diff.classes.before.join(', ') || 'None'}</p>`;
    html += `<p><strong>After:</strong> ${diff.classes.after.join(', ') || 'None'}</p>`;
    html += '</div>';
  }

  // Feats added
  if (diff.featsAdded.length > 0) {
    html += '<div class="diff-section">';
    html += `<h3>Feats Added</h3>`;
    html += '<ul>';
    diff.featsAdded.forEach(feat => {
      html += `<li>${feat}</li>`;
    });
    html += '</ul>';
    html += '</div>';
  }

  // Talents added
  if (diff.talentsAdded.length > 0) {
    html += '<div class="diff-section">';
    html += `<h3>Talents Added</h3>`;
    html += '<ul>';
    diff.talentsAdded.forEach(talent => {
      html += `<li>${talent}</li>`;
    });
    html += '</ul>';
    html += '</div>';
  }

  // Force powers added
  if (diff.forcePowersAdded && diff.forcePowersAdded.length > 0) {
    html += '<div class="diff-section">';
    html += `<h3>Force Powers Added</h3>`;
    html += '<ul>';
    diff.forcePowersAdded.forEach(power => {
      html += `<li>${power}</li>`;
    });
    html += '</ul>';
    html += '</div>';
  }

  // Skills added
  if (diff.skillsAdded.length > 0) {
    html += '<div class="diff-section">';
    html += `<h3>Skills Trained</h3>`;
    html += '<ul>';
    diff.skillsAdded.forEach(skill => {
      html += `<li>${skill}</li>`;
    });
    html += '</ul>';
    html += '</div>';
  }

  // Ability score increases
  if (Object.keys(diff.abilities).length > 0) {
    html += '<div class="diff-section">';
    html += `<h3>Ability Score Increases</h3>`;
    html += '<ul>';
    for (const [ability, change] of Object.entries(diff.abilities)) {
      html += `<li><strong>${ability.toUpperCase()}:</strong> ${change.before} → ${change.after} <span class="delta">(+${change.delta})</span></li>`;
    }
    html += '</ul>';
    html += '</div>';
  }

  // Defenses
  html += '<div class="diff-section">';
  html += `<h3>Defenses</h3>`;
  html += `<p><strong>Reflex:</strong> ${diff.defenses.reflex.before} → ${diff.defenses.reflex.after}</p>`;
  html += `<p><strong>Fortitude:</strong> ${diff.defenses.fortitude.before} → ${diff.defenses.fortitude.after}</p>`;
  html += `<p><strong>Will:</strong> ${diff.defenses.will.before} → ${diff.defenses.will.after}</p>`;
  html += '</div>';

  html += '</div>';

  // Add basic styling
  html += `
    <style>
      .swse-diff-viewer { padding: 10px; }
      .diff-section { margin-bottom: 15px; padding: 10px; border: 1px solid #ccc; border-radius: 5px; }
      .diff-section h3 { margin-top: 0; color: #4a90e2; }
      .delta { color: #27ae60; font-weight: bold; }
      .swse-diff-viewer ul { margin: 5px 0; padding-left: 20px; }
    </style>
  `;

  new Dialog({
    title: 'Level-Up Changes Preview',
    content: html,
    buttons: {
      ok: {
        label: 'OK',
        callback: () => {
          swseLogger.log('Diff dialog closed');
        }
      }
    },
    default: 'ok'
  }).render(true);
}

/**
 * Generate a text summary of changes for chat/logging
 * @param {Object} diff - Diff object from computeDiff
 * @returns {string} - Text summary
 */
export function generateDiffSummary(diff) {
  const lines = [];

  lines.push(`Level ${diff.level.before} → ${diff.level.after}`);
  lines.push(`HP: ${diff.hp.before} → ${diff.hp.after} (+${diff.hp.delta})`);

  if (diff.featsAdded.length > 0) {
    lines.push(`Feats: ${diff.featsAdded.join(', ')}`);
  }

  if (diff.talentsAdded.length > 0) {
    lines.push(`Talents: ${diff.talentsAdded.join(', ')}`);
  }

  if (diff.forcePowersAdded && diff.forcePowersAdded.length > 0) {
    lines.push(`Force Powers: ${diff.forcePowersAdded.join(', ')}`);
  }

  return lines.join(' | ');
}
