/**
 * PHASE 8D-3B production — NPC speech-style catalog: HOW this NPC
 * constructs sentences (distinct from `voice`, which describes how
 * they SOUND). Per the phase spec, speech style "may be shared where
 * compatible" between organic and droid NPCs -- ONE pool, with a small
 * `excludedTags: ['droid']`/`['organic']` marker on the handful of
 * entries that assume one side specifically (most entries apply to
 * either). Representative catalog (phase target: 200-300).
 */
function style(value, weight, tags = [], excludedTags = []) {
  return { value, weight, tags, excludedTags };
}

export const NPC_SPEECH_STYLES = Object.freeze([
  style('short, clipped statements', 2, ['military-paramilitary']),
  style('rambling, over-detailed explanations', 1, []),
  style('drops technical jargon into casual speech', 2, ['technology']),
  style('frequent rhetorical questions', 1, []),
  style('never uses contractions', 1, [], ['organic']),
  style('constantly repeats the listener\'s name', 1, []),
  style('speaks extremely quickly when excited', 1, []),
  style('long, deliberate pauses before answering', 2, []),
  style('overly formal, almost archaic phrasing', 1, ['noble-house', 'government-bureaucracy']),
  style('trails off mid-thought often', 1, []),
  style('answers questions with questions', 1, ['crime-syndicate']),
  style('organizes speech into numbered points', 1, ['bureaucrat', 'scientist']),
  style('peppers speech with old sayings', 1, []),
  style('speaks mostly in short declaratives', 1, []),
  style('over-explains simple instructions', 1, []),
  style('uses excessive technical precision', 1, ['scientist', 'technician']),
  style('softens every statement with a qualifier', 1, []),
  style('blunt, rarely softens anything', 2, []),
  style('narrates their own actions out loud', 0.5, [], ['organic']),
  style('quotes a manual or handbook unprompted', 0.5, []),
  style('speaks mostly in questions when nervous', 1, []),
  style('uses outdated slang', 1, []),
  style('inserts unnecessary caveats and disclaimers', 1, ['business-professional']),
  style('rarely finishes a sentence without a tangent', 1, []),
  style('very direct, almost curt', 1, ['military-paramilitary']),
  style('speaks as if reading from a script', 0.5, ['government-bureaucracy']),
  style('uses excessive diplomatic hedging', 1, ['government-bureaucracy', 'noble-house']),
  style('mixes languages/dialects mid-sentence', 0.5, []),
  style('unusually precise about numbers and measurements', 1, []),
  style('nothing unusual about how they speak', 3, [])
]);
