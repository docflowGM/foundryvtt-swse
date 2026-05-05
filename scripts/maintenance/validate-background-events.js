#!/usr/bin/env node
/**
 * Validate Background Event structured abilities against data/backgrounds.json.
 */

import { readFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { BACKGROUND_EVENT_ABILITIES } from '../data/background-events.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '../..');
const backgroundsPath = path.join(root, 'data/backgrounds.json');

const payload = JSON.parse(await readFile(backgroundsPath, 'utf8'));
const events = payload.events || [];
const errors = [];
const warnings = [];

for (const [eventId, eventDef] of Object.entries(BACKGROUND_EVENT_ABILITIES)) {
  const jsonEvent = events.find((event) => event.id === eventId);
  if (!jsonEvent) {
    errors.push(`Missing event in data/backgrounds.json: ${eventId}`);
    continue;
  }

  if (!Array.isArray(jsonEvent.relevantSkills) || jsonEvent.relevantSkills.length !== eventDef.relevantSkills.length) {
    errors.push(`${eventId}: relevantSkills missing or count mismatch`);
  }

  if (Number(jsonEvent.skillChoiceCount || 0) !== eventDef.skillChoiceCount) {
    errors.push(`${eventId}: skillChoiceCount should be ${eventDef.skillChoiceCount}`);
  }

  if (!Array.isArray(jsonEvent.specialAbilities) || jsonEvent.specialAbilities.length !== eventDef.specialAbilities.length) {
    errors.push(`${eventId}: specialAbilities missing or count mismatch`);
    continue;
  }

  for (const ability of jsonEvent.specialAbilities) {
    if (!ability.id || !ability.name || !ability.type || !ability.description) {
      errors.push(`${eventId}: ability ${ability.id || '(missing id)'} is missing id/name/type/description`);
    }
  }
}

for (const event of events) {
  if (!BACKGROUND_EVENT_ABILITIES[event.id]) {
    warnings.push(`Event has no structured ability definition: ${event.id}`);
  }
}

for (const warning of warnings) {
  console.warn(`Warning: ${warning}`);
}

if (errors.length) {
  for (const error of errors) {
    console.error(`Error: ${error}`);
  }
  process.exit(1);
}

console.log(`Background Event validation passed (${events.length} events, ${warnings.length} warnings).`);
