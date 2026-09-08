/**
 * PHASE 8D-3B production — droid NPC flavor-quality catalog.
 *
 * STRUCTURALLY SEPARATE from `npc-flavor-qualities-organic.js` -- a
 * dedicated content authority for mechanical beings, not the organic
 * pool with a few words swapped for "servo"/"chassis". `npc/npc-flavor.js`'s
 * `selectNpcFlavorQualities({ kind: 'droid', ... })` reads ONLY this
 * pool; a droid NPC can never roll an organic-only quality and vice
 * versa (see that module's header for why the boundary is structural,
 * not tag-based). Covers physical/mechanical quirks (chassis, servos,
 * paint, replacement parts, sensors) AND software/personality quirks
 * (memory, protocol habits, vocabulator oddities) -- a droid should
 * feel like it has a personality, not just a damage report.
 *
 * Same entry shape as the organic catalog (`{ id, text, category,
 * weight, tags, roleTags, contextTags, conflictTags }`) -- one shared
 * selection engine, two distinct content pools, per the phase spec's
 * explicit "shared mechanics, separate content" architecture.
 *
 * HARD RULE (restated): purely narrative. "One arm moves slowly" never
 * becomes an attack penalty; "damaged photoreceptor" never becomes a
 * Perception penalty; nothing here alters an Actor's mechanical
 * condition.
 */

function q(id, text, category, weight, tags, extra = {}) {
  return { id: `droid.${id}`, text, category, weight, tags, roleTags: [], contextTags: [], conflictTags: [], ...extra };
}

export const DROID_NPC_FLAVOR_QUALITIES = Object.freeze([
  // --- servo-behavior --------------------------------------------------
  q('servo-squeaks-left', 'One servo squeaks whenever it turns left.', 'servo-behavior', 1, ['worn', 'maintenance'], { contextTags: ['frontier'] }),
  q('slow-manipulator', 'One manipulator moves slightly slower than the other.', 'servo-behavior', 1, ['worn'], { contextTags: ['frontier'] }),
  q('joint-grit', 'Fine grit audibly crunches in one wrist joint.', 'servo-behavior', 0.7, ['worn'], { contextTags: ['mining', 'industrial'] }),
  q('overcorrects-turns', 'Slightly overcorrects on tight turns before settling.', 'servo-behavior', 0.7, []),
  q('whirs-when-idle', 'Emits a faint whir whenever left idle too long.', 'servo-behavior', 0.7, []),
  q('precise-movements', 'Moves with unusually crisp, precise mechanical efficiency.', 'servo-behavior', 1, [], { contextTags: ['advanced', 'wealthy'], conflictTags: ['worn-movement'] }),
  q('worn-movement', 'Moves with a faint, worn hesitation between motions.', 'servo-behavior', 1, ['worn'], { contextTags: ['frontier'], conflictTags: ['precise-movements'] }),

  // --- chassis --------------------------------------------------------
  q('mismatched-panel', 'Has one mismatched replacement panel.', 'chassis', 1, ['worn'], { contextTags: ['frontier'] }),
  q('dent-insists-factory', 'Has a dent it insists is factory-original.', 'chassis', 1, ['odd']),
  q('scorch-marks', 'Bears old scorch marks it has never bothered to buff out.', 'chassis', 0.7, ['worn']),
  q('engraved-ownership-marking', 'Bears an old, engraved ownership marking from a previous owner.', 'chassis', 0.7, []),
  q('replaced-limb', 'One limb is a visibly newer replacement than the rest of its chassis.', 'chassis', 1, []),
  q('nonstandard-antenna', 'Sports a nonstandard antenna, added at some point.', 'chassis', 0.7, []),
  q('decorative-plating', 'Has decorative plating that serves no functional purpose.', 'chassis', 0.7, [], { contextTags: ['wealthy'] }),
  q('oversized-manipulator', 'One manipulator is a mismatched, oversized replacement.', 'chassis', 0.7, ['worn'], { contextTags: ['frontier'] }),
  q('heavy-duty-plating', 'Reinforced with heavy-duty plating, well beyond its base spec.', 'chassis', 1, [], { contextTags: ['mining', 'industrial'] }),
  q('scratched-chassis', 'Its chassis is covered in small work-related scratches.', 'chassis', 1, ['worn'], { contextTags: ['mining', 'industrial'] }),

  // --- paint ------------------------------------------------------------
  q('faded-paint', 'Its paint has faded unevenly from long sun exposure.', 'paint', 1, ['worn'], { contextTags: ['frontier'] }),
  q('repainted-several-times', 'Has clearly been repainted several times over.', 'paint', 1, ['worn']),
  q('old-military-stencil', 'Carries the ghost of an old military unit stencil beneath its current paint.', 'paint', 0.7, []),
  q('custom-paint-job', 'Sports a custom, carefully-applied paint scheme.', 'paint', 1, [], { contextTags: ['wealthy'] }),
  q('corporate-standard-livery', 'Wears an unmistakably standardized corporate livery.', 'paint', 0.7, [], { contextTags: ['advanced', 'wealthy'] }),

  // --- replacement-parts ------------------------------------------------
  q('obsolete-replacement-parts', 'Frequently complains about needing obsolete replacement parts.', 'replacement-parts', 1, ['worn'], { contextTags: ['frontier'] }),
  q('jury-rigged-tool-mount', 'Has a jury-rigged tool mount bolted on unofficially.', 'replacement-parts', 1, [], { contextTags: ['frontier'], roleTags: ['mechanic'] }),
  q('salvaged-part-visible', 'One visible part is obviously salvaged from a different model.', 'replacement-parts', 1, ['worn'], { contextTags: ['frontier'] }),
  q('recent-firmware-upgrade', 'Recently received a noticeable firmware upgrade -- runs conspicuously smoothly.', 'replacement-parts', 0.7, [], { contextTags: ['advanced'] }),
  q('unnecessary-beverage-holder', 'Has an unnecessary beverage holder welded to its chassis.', 'replacement-parts', 0.7, ['odd']),
  q('external-memory-module', 'Has an external memory module bolted on, slightly too large.', 'replacement-parts', 0.7, []),

  // --- vocabulator -----------------------------------------------------
  q('skips-consonants', 'Its vocabulator occasionally skips a consonant mid-sentence.', 'vocabulator', 0.7, ['worn']),
  q('unnecessary-precise-measurements', 'Insists on using unnecessarily precise measurements in conversation.', 'vocabulator', 1, [], { roleTags: ['scientist', 'technician']}),
  q('corrects-organic-arithmetic', "Politely corrects organic characters' arithmetic, unprompted.", 'vocabulator', 0.7, ['annoying'], { roleTags: ['protocol'] }),
  q('outdated-slang', 'Uses noticeably outdated slang terms.', 'vocabulator', 0.7, []),
  q('overly-formal-diction', 'Speaks with excessively formal, textbook diction.', 'vocabulator', 1, [], { roleTags: ['protocol'] }),
  q('volume-randomly-shifts', 'Its speaker volume randomly shifts between sentences.', 'vocabulator', 0.7, ['worn']),
  q('uses-full-legal-names', "Refers to everyone by their full, formal legal name.", 'vocabulator', 1, [], { roleTags: ['protocol'] }),
  q('quotes-operating-manual', 'Frequently quotes its own original operating manual.', 'vocabulator', 0.7, ['odd']),

  // --- photoreceptor ------------------------------------------------------
  q('mismatched-photoreceptor-brightness', 'One photoreceptor is noticeably brighter than the other.', 'photoreceptor', 1, ['worn']),
  q('flickers-when-processing', 'Its photoreceptor flickers faintly while processing something complex.', 'photoreceptor', 0.7, []),
  q('custom-photoreceptor-housing', 'Has a custom-fitted photoreceptor housing, clearly non-standard.', 'photoreceptor', 0.7, [], { contextTags: ['wealthy'] }),
  q('slow-photoreceptor-adjustment', 'Its photoreceptor adjusts to light changes noticeably slowly.', 'photoreceptor', 0.7, ['worn']),

  // --- processing ---------------------------------------------------------
  q('pauses-before-answering', 'Pauses for a beat before answering even simple questions.', 'processing', 1, []),
  q('stops-midsentence-to-process', 'Occasionally stops mid-sentence for a few seconds before continuing.', 'processing', 1, ['worn']),
  q('treats-suggestions-as-orders', 'Treats casual suggestions as formal instructions.', 'processing', 1, ['odd']),
  q('runs-constant-self-diagnostics', 'Constantly runs unprompted self-diagnostics.', 'processing', 0.7, []),
  q('overthinks-simple-decisions', 'Visibly overthinks decisions that should be simple.', 'processing', 0.7, []),
  q('reboots-under-emotional-strain', 'Occasionally reboots when a conversation becomes emotionally complicated.', 'processing', 0.7, ['odd']),

  // --- power ---------------------------------------------------------
  q('announces-battery-percentage', 'Announces its remaining power percentage far too often.', 'power', 1, ['odd']),
  q('power-saving-idle-hum', 'Emits a low idle hum while conserving power.', 'power', 0.7, []),
  q('anxious-about-charging', 'Grows visibly anxious as its charge runs low.', 'power', 0.7, []),

  // --- maintenance ------------------------------------------------------
  q('constant-self-cleaning', 'Compulsively cleans and polishes its own plating.', 'maintenance', 1, ['tidy'], { contextTags: ['wealthy', 'advanced'] }),
  q('one-specific-panel-polished', 'Keeps polishing one specific panel, more than any other.', 'maintenance', 0.7, ['odd']),
  q('apologizes-before-maintenance', 'Apologizes before performing routine maintenance on itself.', 'maintenance', 0.7, ['endearing']),
  q('avoids-discussing-dents', 'Avoids discussing certain dents or scratches at all.', 'maintenance', 0.7, ['subtle']),
  q('carries-too-many-tools', 'Carries far more tools than its role strictly requires.', 'maintenance', 1, [], { roleTags: ['mechanic'] }),
  q('grease-stained-plating', 'Its lower plating is permanently stained with old grease.', 'maintenance', 1, [], { contextTags: ['mining', 'industrial'], roleTags: ['mechanic'] }),

  // --- software ---------------------------------------------------------
  q('outdated-map-database', 'Has an outdated star-map database and refuses to admit it.', 'software', 1, ['odd'], { contextTags: ['frontier'] }),
  q('corrupted-memory-sectors', 'Has several corrupted memory sectors it carefully avoids discussing.', 'software', 0.7, ['subtle'], { contextTags: ['frontier'] }),
  q('trivia-collection', 'Maintains an enormous, unsolicited collection of trivia.', 'software', 1, ['odd']),
  q('mispronounces-one-word', 'Consistently mispronounces one otherwise-common word.', 'software', 0.7, ['odd']),
  q('references-unremembered-events', 'Occasionally references events no one else seems to remember.', 'software', 0.7, ['unsettling']),
  q('obsolete-military-terminology', 'Uses obsolete military terminology out of old habit.', 'software', 0.7, []),
  q('hidden-sentimental-recordings', 'Stores old sentimental recordings but flatly denies doing so.', 'software', 0.7, ['subtle']),

  // --- memory -----------------------------------------------------------
  q('unexplained-wildlife-fascination', 'Has developed an unexplained fascination with local wildlife.', 'memory', 0.7, ['strange']),
  q('remembers-every-conversation', 'Recalls every prior conversation in exact, unsettling detail.', 'memory', 1, ['unsettling']),
  q('forgets-recent-instructions', 'Occasionally forgets an instruction given only minutes earlier.', 'memory', 0.5, ['worn']),

  // --- personality --------------------------------------------------------
  q('excessive-health-advice', 'Offers excessive, unsolicited health advice.', 'personality', 1, [], { roleTags: ['medical'] }),
  q('clinical-speech-pattern', 'Speaks with a clinical, detached precision.', 'personality', 1, [], { roleTags: ['medical'] }),
  q('cheerfully-morbid', 'Discusses grim topics with unsettling cheerfulness.', 'personality', 0.7, ['unsettling'], { roleTags: ['medical'] }),
  q('proud-of-service-record', 'Is quietly proud of its service record and mentions it often.', 'personality', 0.7, []),
  q('developed-a-sense-of-humor', 'Has developed a dry sense of humor its manufacturer never intended.', 'personality', 1, ['endearing']),

  // --- social-protocol ----------------------------------------------------
  q('excessive-etiquette', 'Insists on excessive, formal etiquette in every interaction.', 'social-protocol', 1, [], { roleTags: ['protocol'] }),
  q('asks-permission-unnecessarily', 'Asks permission before entering rooms it doesn\'t need permission to enter.', 'social-protocol', 1, ['endearing']),
  q('overly-polite-to-hostiles', 'Remains formally polite even to open threats.', 'social-protocol', 0.7, ['unsettling'], { roleTags: ['protocol'] }),
  q('social-awkwardness', 'Is visibly, endearingly awkward in casual social situations.', 'social-protocol', 1, [], { roleTags: ['protocol'] }),
  q('verbose-explanations', 'Gives far more verbose explanations than anyone asked for.', 'social-protocol', 1, ['annoying'], { roleTags: ['protocol'] }),

  // --- tooling -----------------------------------------------------------
  q('built-in-tool-mounts', 'Has built-in tool mounts bolted on for its role.', 'tooling', 1, [], { roleTags: ['mechanic'] }),
  q('scanner-clicking', 'Its integrated scanner clicks audibly when active.', 'tooling', 0.7, [], { roleTags: ['medical', 'security'] }),
  q('constant-diagnostic-scanning', 'Constantly runs a diagnostic scan on its surroundings.', 'tooling', 0.7, [], { roleTags: ['security'] }),

  // --- modifications ------------------------------------------------------
  q('unauthorized-modifications', 'Carries several unauthorized aftermarket modifications.', 'modifications', 1, [], { contextTags: ['frontier'] }),
  q('expensive-aftermarket-upgrade', 'Sports a conspicuously expensive aftermarket upgrade.', 'modifications', 1, [], { contextTags: ['wealthy', 'advanced'] }),
  q('personalized-voice-package', 'Runs a personalized, non-standard voice package.', 'modifications', 0.7, [], { contextTags: ['wealthy'] }),
  q('custom-tool-mount', 'Has a custom tool mount added by a previous owner.', 'modifications', 0.7, []),

  // --- diagnostics ------------------------------------------------------
  q('quiet-startup-melody', 'Plays a short startup melody it refuses to disable.', 'diagnostics', 1, ['odd']),
  q('irritated-chirp', 'Emits an irritated chirp whenever interrupted.', 'diagnostics', 1, ['odd']),
  q('runs-diagnostics-when-nervous', 'Runs an audible self-diagnostic whenever it seems uncertain.', 'diagnostics', 0.7, []),

  // --- mobility -----------------------------------------------------------
  q('faint-wheel-squeak', 'Has a faint, persistent wheel squeak.', 'mobility', 0.7, ['worn'], { contextTags: ['frontier'] }),
  q('careful-on-stairs', 'Moves with visible, deliberate caution on stairs or uneven terrain.', 'mobility', 0.7, []),
  q('slightly-off-gait', 'Its gait is very slightly, almost imperceptibly, off-balance.', 'mobility', 0.7, ['worn']),

  // --- audio -----------------------------------------------------------
  q('faint-clicking-while-processing', 'Makes a faint clicking noise while processing.', 'audio', 0.7, ['worn']),
  q('unwanted-startup-jingle', 'Its power-on sequence includes a jingle no one has managed to disable.', 'audio', 0.7, ['odd']),
  q('audible-cooling-fan', 'Has an audible cooling fan that kicks in during exertion.', 'audio', 0.7, []),

  // --- sensor -----------------------------------------------------------
  q('overly-sensitive-sensors', 'Its sensors are calibrated to an almost excessive sensitivity.', 'sensor', 0.7, [], { roleTags: ['security'] }),
  q('sensor-array-visibly-patched', 'Its sensor array has an obviously patched repair.', 'sensor', 0.7, ['worn'], { contextTags: ['frontier'] }),

  // --- habit --------------------------------------------------------------
  q('excessive-self-diagnostics', 'Insists on running excessive self-diagnostics before simple tasks.', 'habit', 0.7, []),
  q('keeps-a-tally', 'Keeps a private tally of something no one has ever asked about.', 'habit', 0.5, ['strange']),
  q('polishes-one-panel-obsessively', 'Obsessively polishes one particular panel above all others.', 'habit', 0.7, ['odd']),

  // --- oddity -----------------------------------------------------------
  q('unremarkable-droid', 'By most accounts, an entirely unremarkable, well-functioning droid.', 'oddity', 1.5, ['mundane']),
  q('collects-scrap-metal', 'Has a small, carefully organized collection of scrap metal.', 'oddity', 0.5, ['strange']),
  q('names-itself-differently', 'Occasionally introduces itself under a slightly different designation.', 'oddity', 0.5, ['strange'])
]);
