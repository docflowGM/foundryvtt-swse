#!/usr/bin/env node
/**
 * Validate mentor suggestion JSON shape.
 *
 * This is intentionally schema-light: it catches missing roots, empty mentor
 * entries, malformed phase maps, and suggestion mentors without personalities.
 */

import { readFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '../..');
const suggestionDir = path.join(root, 'data/dialogue/mentor-suggestions');

const VALID_PHASES = new Set(['early', 'mid', 'late']);
const NON_CONTEXT_KEYS = new Set(['rejection', 'scolding']);

async function readJson(fileName) {
  const fullPath = path.join(suggestionDir, fileName);
  return JSON.parse(await readFile(fullPath, 'utf8'));
}

function assertObject(value, label, errors) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    errors.push(`${label} must be an object`);
    return false;
  }
  return true;
}

function validateDialogueLeaf(value, label, errors) {
  if (typeof value === 'string') {
    return;
  }

  if (!assertObject(value, label, errors)) {
    return;
  }

  const hasAnyText = ['combined', 'observation', 'suggestion', 'respectClause', 'gentle', 'accepting', 'recovery', 'correction', 'reprimand', 'pressure']
    .some((key) => typeof value[key] === 'string' && value[key].trim().length > 0);

  if (!hasAnyText) {
    errors.push(`${label} has no dialogue text fields`);
  }
}

function validate() {
  return Promise.all([
    readJson('mentor-personalities.json'),
    readJson('mentor-suggestion-dialogues.json')
  ]).then(([personalityPayload, dialoguePayload]) => {
    const errors = [];
    const warnings = [];

    const personalities = personalityPayload.personalities;
    const dialogues = dialoguePayload.dialogues;

    assertObject(personalities, 'personalities', errors);
    assertObject(dialogues, 'dialogues', errors);

    if (errors.length) {
      return { errors, warnings };
    }

    for (const [mentorClass, personality] of Object.entries(personalities)) {
      assertObject(personality, `personalities.${mentorClass}`, errors);
      if (!personality.key) {
        warnings.push(`personalities.${mentorClass} has no key`);
      }
    }

    for (const [mentorClass, mentorDialogues] of Object.entries(dialogues)) {
      if (!personalities[mentorClass]) {
        warnings.push(`dialogues.${mentorClass} has no matching personality entry`);
      }
      if (!assertObject(mentorDialogues, `dialogues.${mentorClass}`, errors)) {
        continue;
      }

      for (const [context, contextValue] of Object.entries(mentorDialogues)) {
        if (NON_CONTEXT_KEYS.has(context)) {
          validateDialogueLeaf(contextValue, `dialogues.${mentorClass}.${context}`, errors);
          continue;
        }

        if (!assertObject(contextValue, `dialogues.${mentorClass}.${context}`, errors)) {
          continue;
        }

        for (const [phase, phaseValue] of Object.entries(contextValue)) {
          if (!VALID_PHASES.has(phase)) {
            warnings.push(`dialogues.${mentorClass}.${context}.${phase} is not a standard phase`);
          }
          if (!assertObject(phaseValue, `dialogues.${mentorClass}.${context}.${phase}`, errors)) {
            continue;
          }

          for (const [specificType, leaf] of Object.entries(phaseValue)) {
            validateDialogueLeaf(leaf, `dialogues.${mentorClass}.${context}.${phase}.${specificType}`, errors);
          }
        }
      }
    }

    return { errors, warnings };
  });
}

const { errors, warnings } = await validate();

for (const warning of warnings) {
  console.warn(`Warning: ${warning}`);
}

if (errors.length) {
  for (const error of errors) {
    console.error(`Error: ${error}`);
  }
  process.exit(1);
}

console.log(`Mentor suggestion JSON validation passed (${warnings.length} warnings).`);
