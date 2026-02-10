/**
 * Mentor Judgment Renderer (SSOT)
 *
 * Maps (mentorId, atomId, intensity) → short phrase.
 * Pure lookup: loads data from JSON; contains NO dialogue strings.
 */
import { INTENSITY_ATOMS } from './mentor-intensity-atoms.js';
import { getJudgmentLine, resolveMentorId } from './mentor-dialogue-registry.js';

function normalizeIntensityToAtom(intensity) {
  if (typeof intensity === 'string') {
    const key = intensity.toLowerCase().trim();
    if (INTENSITY_ATOMS[key]) {return INTENSITY_ATOMS[key];}
    if (Object.values(INTENSITY_ATOMS).includes(key)) {return key;}
  }

  if (typeof intensity === 'number' && Number.isFinite(intensity)) {
    const scale = Math.max(0, Math.min(1, intensity));
    if (scale < 0.2) {return INTENSITY_ATOMS.very_low;}
    if (scale < 0.4) {return INTENSITY_ATOMS.low;}
    if (scale < 0.6) {return INTENSITY_ATOMS.medium;}
    if (scale < 0.8) {return INTENSITY_ATOMS.high;}
    return INTENSITY_ATOMS.very_high;
  }

  return INTENSITY_ATOMS.medium;
}

export async function renderJudgmentAtom(mentorId, atomId, intensity = INTENSITY_ATOMS.medium) {
  const resolvedMentorId = resolveMentorId(mentorId);
  const intensityAtom = normalizeIntensityToAtom(intensity);

  if (atomId === 'silence') {return '';}

  const line = await getJudgmentLine(resolvedMentorId, atomId, intensityAtom);
  return line || '';
}
