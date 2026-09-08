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
  q('precise-movements', 'Moves with unusually crisp, precise mechanical efficiency.', 'servo-behavior', 1, ['precise-movements'], { contextTags: ['advanced', 'wealthy'], conflictTags: ['worn-movement'] }),
  q('worn-movement', 'Moves with a faint, worn hesitation between motions.', 'servo-behavior', 1, ['worn', 'worn-movement'], { contextTags: ['frontier'], conflictTags: ['precise-movements'] }),

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
  q('names-itself-differently', 'Occasionally introduces itself under a slightly different designation.', 'oddity', 0.5, ['strange']),

  // ===================================================================
  // PHASE 8D-3B FINAL CONTENT HYDRATION PASS -- expanded toward the
  // documented production target (500-1,000). chassis/paint/
  // replacement-parts/photoreceptor also serve as the droid-appearance
  // cue pool (combined target 200-350) -- these four get priority
  // expansion. Structurally organic-free throughout.
  // ===================================================================

  // --- chassis (batch 2) ------------------------------------------------
  q('boxy-utilitarian-frame', 'Has a boxy, purely utilitarian frame with no wasted material.', 'chassis', 1, [], { contextTags: ['industrial'] }),
  q('sleek-rounded-frame', 'Has a sleek, rounded frame typical of a newer model line.', 'chassis', 1, [], { contextTags: ['advanced', 'wealthy'] }),
  q('visible-seam-lines', 'Has visible seam lines between its panels, functional but unglamorous.', 'chassis', 1, []),
  q('unusually-tall-chassis', 'Has an unusually tall chassis for its model line.', 'chassis', 0.5, []),
  q('unusually-compact-chassis', 'Has an unusually compact, low-profile chassis.', 'chassis', 0.5, []),
  q('exposed-internal-wiring', 'Has a section of internal wiring left deliberately exposed.', 'chassis', 0.7, ['worn'], { contextTags: ['frontier'] }),
  q('reinforced-corner-guards', 'Has reinforced guards bolted onto every exposed corner.', 'chassis', 0.7, [], { contextTags: ['industrial', 'mining'] }),
  q('chassis-covered-in-stickers', 'Its chassis is covered in a haphazard collection of old stickers.', 'chassis', 0.7, ['odd']),
  q('single-branded-panel-remaining', 'Only one panel still bears its original manufacturer branding.', 'chassis', 0.5, ['worn']),
  q('polished-chrome-trim', 'Has a strip of polished chrome trim along one edge.', 'chassis', 0.7, [], { contextTags: ['wealthy'] }),
  q('matte-non-reflective-coating', 'Has a deliberately matte, non-reflective coating.', 'chassis', 0.7, [], { roleTags: ['security'] }),
  q('chassis-dented-in-a-recognizable-shape', 'Has one dent everyone who knows it recognizes on sight.', 'chassis', 0.5, ['odd']),
  q('replacement-chassis-visibly-newer', 'Its entire lower half is a visibly newer replacement chassis.', 'chassis', 0.7, []),
  q('handwritten-designation-painted-on', 'Has its designation hand-painted on rather than factory-stamped.', 'chassis', 0.5, ['frontier']),
  q('chassis-shows-clear-signs-of-age', 'Shows clear, honest signs of long service on its chassis.', 'chassis', 1, ['worn'], { contextTags: ['frontier'] }),
  q('chassis-looks-brand-new', 'Its chassis looks almost brand new, barely a mark on it.', 'chassis', 0.7, [], { contextTags: ['wealthy', 'advanced'] }),
  q('mismatched-bolt-hardware', 'Has visibly mismatched bolt hardware from field repairs.', 'chassis', 0.7, ['worn'], { contextTags: ['frontier'] }),
  q('reinforced-lower-legs', 'Has noticeably reinforced lower legs or treads.', 'chassis', 0.5, [], { contextTags: ['industrial', 'mining'] }),
  q('narrow-utility-frame', 'Has a narrow frame built for tight maintenance spaces.', 'chassis', 0.5, [], { roleTags: ['mechanic'] }),
  q('bulky-cargo-frame', 'Has an unusually bulky frame built around cargo capacity.', 'chassis', 0.5, [], { contextTags: ['trade'] }),
  q('chassis-carries-a-faction-emblem', 'Bears a faded Faction or unit emblem stamped into its plating.', 'chassis', 0.5, ['military-paramilitary']),
  q('chassis-has-a-viewport-panel', 'Has a small transparent panel showing its internal mechanisms.', 'chassis', 0.5, [], { contextTags: ['advanced'] }),
  q('asymmetrical-limb-lengths', 'Has slightly asymmetrical limb lengths from mismatched replacements.', 'chassis', 0.5, ['worn'], { contextTags: ['frontier'] }),
  q('chassis-smells-faintly-of-solvent', 'Its chassis carries a faint smell of cleaning solvent.', 'chassis', 0.5, []),
  q('extra-storage-compartment-bolted-on', 'Has an extra storage compartment bolted on by a previous owner.', 'chassis', 0.7, []),
  q('reflective-warning-stripes', 'Has reflective warning stripes applied for visibility in low light.', 'chassis', 0.5, [], { contextTags: ['industrial', 'mining'] }),
  q('chassis-panel-held-by-tape', 'Has one panel held in place by tape rather than proper fasteners.', 'chassis', 0.7, ['worn'], { contextTags: ['frontier'] }),
  q('unusually-heavy-for-its-size', 'Is noticeably heavier than its size would suggest.', 'chassis', 0.5, []),
  q('unusually-light-for-its-size', 'Is noticeably lighter than its size would suggest.', 'chassis', 0.5, []),
  q('chassis-bears-a-serial-number-prominently', 'Has its serial number prominently, almost proudly displayed.', 'chassis', 0.5, ['protocol']),

  // --- paint (batch 2) --------------------------------------------------
  q('single-bold-accent-color', 'Has a single bold accent color against an otherwise plain finish.', 'paint', 0.7, []),
  q('camouflage-pattern-paint', 'Wears a practical camouflage paint pattern.', 'paint', 0.5, ['military-paramilitary'], { contextTags: ['frontier'] }),
  q('bright-safety-yellow-finish', 'Painted in bright safety yellow for visibility.', 'paint', 0.7, [], { contextTags: ['industrial', 'mining'] }),
  q('matte-black-finish', 'Has a deliberate, understated matte black finish.', 'paint', 0.7, [], { roleTags: ['security'] }),
  q('chipped-paint-around-joints', 'Has chipped paint around its joints from constant motion.', 'paint', 0.7, ['worn']),
  q('paint-mismatched-from-repair', 'Has one section painted a slightly mismatched shade after a repair.', 'paint', 0.7, ['worn']),
  q('hand-painted-decorative-flourish', 'Has a small, hand-painted decorative flourish, clearly personal.', 'paint', 0.5, ['sentimental']),
  q('rust-colored-primer-showing', 'Shows patches of rust-colored primer beneath the topcoat.', 'paint', 0.5, ['worn'], { contextTags: ['frontier'] }),
  q('glossy-showroom-finish', 'Has a glossy, showroom-quality finish.', 'paint', 0.7, [], { contextTags: ['wealthy'] }),
  q('paint-scorched-along-one-side', 'Has scorch-darkened paint along one side.', 'paint', 0.5, ['worn']),
  q('two-tone-paint-scheme', 'Wears a deliberate two-tone paint scheme.', 'paint', 0.5, []),
  q('paint-worn-smooth-at-contact-points', 'Has paint worn smooth at points where it is frequently touched.', 'paint', 0.7, ['worn']),
  q('owner-applied-nameplate-decal', 'Has a small, owner-applied nameplate decal.', 'paint', 0.5, ['sentimental']),
  q('paint-flaking-near-heat-vents', 'Has paint visibly flaking near its heat vents.', 'paint', 0.5, ['worn']),
  q('unusually-vibrant-color-choice', 'Was painted an unusually vibrant color for its role.', 'paint', 0.5, ['odd']),
  q('deliberately-drab-paint-to-avoid-attention', 'Was deliberately painted a drab color to avoid drawing attention.', 'paint', 0.5, ['mysterious'], { roleTags: ['security'] }),
  q('paint-bears-old-unit-numerals', 'Bears faded numerals from an old unit assignment.', 'paint', 0.5, ['military-paramilitary']),
  q('freshly-repainted-recently', 'Was very recently, freshly repainted.', 'paint', 0.5, []),
  q('paint-never-touched-up', 'Has never once been touched up since it left the factory.', 'paint', 0.5, ['worn'], { contextTags: ['frontier'] }),
  q('decorative-racing-stripe', 'Sports a decorative stripe applied purely for style.', 'paint', 0.5, ['odd']),

  // --- replacement-parts (batch 2) --------------------------------------
  q('replacement-arm-different-manufacturer', 'One arm is clearly from a different manufacturer entirely.', 'replacement-parts', 1, ['worn'], { contextTags: ['frontier'] }),
  q('replacement-leg-slightly-mismatched-color', 'One leg is a slightly mismatched color from a hasty repair.', 'replacement-parts', 0.7, ['worn'], { contextTags: ['frontier'] }),
  q('upgraded-manipulator-precision', 'Has an upgraded manipulator with noticeably finer precision.', 'replacement-parts', 0.7, [], { roleTags: ['medical', 'technician'] }),
  q('salvaged-sensor-package', 'Runs a sensor package clearly salvaged from another droid.', 'replacement-parts', 0.7, ['worn'], { contextTags: ['frontier'] }),
  q('replacement-part-still-has-shipping-label', 'A recent replacement part still has its shipping label attached.', 'replacement-parts', 0.5, ['odd']),
  q('spare-parts-visibly-strapped-on', 'Carries spare parts visibly strapped to its chassis.', 'replacement-parts', 0.7, [], { contextTags: ['frontier'] }),
  q('replacement-photoreceptor-mismatched-model', 'Its replacement photoreceptor is visibly a different model.', 'replacement-parts', 0.7, ['worn']),
  q('reinforced-replacement-joint', 'Has a reinforced replacement joint, overbuilt compared to the rest.', 'replacement-parts', 0.5, [], { contextTags: ['industrial'] }),
  q('improvised-cooling-fan-attachment', 'Has an improvised cooling fan attached where one did not originally exist.', 'replacement-parts', 0.5, ['odd'], { contextTags: ['frontier'] }),
  q('third-party-vocabulator-installed', 'Runs a third-party vocabulator installed after the original failed.', 'replacement-parts', 0.5, ['worn']),
  q('replacement-part-held-with-visible-solder', 'A replacement part is held in place with visible, careful solder work.', 'replacement-parts', 0.5, ['worn']),
  q('mismatched-foot-treads', 'Has visibly mismatched foot treads from different repairs.', 'replacement-parts', 0.5, ['worn'], { contextTags: ['frontier'] }),
  q('replacement-part-clearly-military-surplus', 'A replacement part is clearly repurposed military surplus.', 'replacement-parts', 0.5, ['military-paramilitary']),
  q('spare-power-cell-strapped-externally', 'Carries a spare power cell strapped externally for emergencies.', 'replacement-parts', 0.5, [], { contextTags: ['frontier'] }),
  q('replacement-hand-has-extra-tool-attachment', 'Its replacement hand has a small extra tool attachment built in.', 'replacement-parts', 0.5, [], { roleTags: ['mechanic'] }),
  q('mismatched-antenna-length', 'Has one antenna noticeably shorter than the other from a past repair.', 'replacement-parts', 0.5, ['worn']),
  q('replacement-part-color-never-matched', 'A replacement part color was never properly matched to the rest.', 'replacement-parts', 0.7, ['worn']),
  q('upgraded-audio-pickup', 'Has an upgraded audio pickup noticeably more sensitive than stock.', 'replacement-parts', 0.5, [], { roleTags: ['security'] }),
  q('replacement-part-came-from-a-decommissioned-unit', 'One part is quietly known to have come from a decommissioned unit.', 'replacement-parts', 0.3, ['subtle']),
  q('extra-manipulator-added-for-role', 'Has an extra manipulator added specifically for its current role.', 'replacement-parts', 0.5, [], { roleTags: ['mechanic', 'medical'] }),

  // --- photoreceptor (batch 2) -------------------------------------------
  q('photoreceptor-shifts-color-with-mood', 'Its photoreceptor subtly shifts color depending on its processing state.', 'photoreceptor', 0.7, [], { contextTags: ['advanced'] }),
  q('single-large-central-photoreceptor', 'Has a single, large central photoreceptor rather than a paired set.', 'photoreceptor', 0.5, []),
  q('photoreceptor-housed-in-protective-cage', 'Its photoreceptor is housed in a small protective cage.', 'photoreceptor', 0.5, [], { contextTags: ['industrial', 'mining'] }),
  q('photoreceptor-dims-when-idle', 'Its photoreceptor visibly dims when left idle.', 'photoreceptor', 0.7, []),
  q('photoreceptor-brightens-when-startled', 'Its photoreceptor visibly brightens when startled by something sudden.', 'photoreceptor', 0.5, []),
  q('photoreceptor-scratched-lens-cover', 'Has a visibly scratched lens cover over one photoreceptor.', 'photoreceptor', 0.7, ['worn'], { contextTags: ['frontier'] }),
  q('photoreceptor-replacement-glows-differently', 'Its replacement photoreceptor glows a slightly different color than factory standard.', 'photoreceptor', 0.7, ['worn']),
  q('photoreceptor-has-a-narrow-focus-ring', 'Has a visible narrow focus ring around its photoreceptor.', 'photoreceptor', 0.5, [], { roleTags: ['medical', 'security'] }),
  q('photoreceptor-tracks-movement-visibly', 'Its photoreceptor visibly tracks movement across a room.', 'photoreceptor', 0.5, [], { roleTags: ['security'] }),
  q('photoreceptor-covered-by-a-tinted-visor', 'Wears a tinted visor over its photoreceptor.', 'photoreceptor', 0.5, [], { contextTags: ['frontier'] }),
  q('photoreceptor-unusually-wide-set', 'Has an unusually wide-set photoreceptor housing.', 'photoreceptor', 0.3, []),
  q('photoreceptor-unusually-narrow-set', 'Has an unusually narrow-set photoreceptor housing.', 'photoreceptor', 0.3, []),
  q('secondary-photoreceptor-added', 'Has a small secondary photoreceptor added for peripheral coverage.', 'photoreceptor', 0.5, [], { roleTags: ['security'] }),
  q('photoreceptor-blinks-slowly-when-satisfied', 'Its photoreceptor pulses slowly in a pattern it seems to use to signal contentment.', 'photoreceptor', 0.5, ['endearing']),
  q('photoreceptor-housing-shows-old-impact-crack', 'Has an old impact crack across its photoreceptor housing, still functional.', 'photoreceptor', 0.5, ['worn'], { contextTags: ['frontier'] }),

  // --- chassis (batch 3) --------------------------------------------------
  q('chassis-designed-for-tight-corridors', 'Has a narrow, low-profile chassis designed for tight corridors.', 'chassis', 0.5, [], { contextTags: ['spacefaring'] }),
  q('chassis-built-low-to-the-ground', 'Is built noticeably low to the ground for stability.', 'chassis', 0.5, []),
  q('chassis-has-a-fold-out-work-surface', 'Has a small fold-out work surface built into its torso.', 'chassis', 0.5, [], { roleTags: ['mechanic', 'medical'] }),
  q('chassis-carries-a-manufacturer-tag-still-attached', 'Still has its original manufacturer tag attached, worn but legible.', 'chassis', 0.5, []),
  q('chassis-shows-signs-of-improvised-field-repair', 'Shows unmistakable signs of an improvised field repair.', 'chassis', 0.7, ['worn'], { contextTags: ['frontier'] }),
  q('chassis-fitted-with-extra-grip-pads', 'Has extra grip pads fitted to its feet for uneven terrain.', 'chassis', 0.5, [], { contextTags: ['frontier', 'mining'] }),
  q('chassis-panel-etched-with-a-small-symbol', 'Has a small symbol etched into one panel, origin unexplained.', 'chassis', 0.3, ['strange']),
  q('chassis-fitted-with-a-cargo-net', 'Has a small cargo net fitted to one side for carrying odd items.', 'chassis', 0.5, [], { roleTags: ['mechanic'] }),
  q('chassis-designed-with-visible-cooling-vents', 'Has prominent, visible cooling vents along its back.', 'chassis', 0.5, [], { contextTags: ['industrial'] }),
  q('chassis-unusually-clean-for-its-role', 'Is unusually, almost suspiciously clean given its usual work.', 'chassis', 0.5, ['tidy']),
  q('chassis-permanently-dust-coated', 'Is permanently coated in a fine layer of dust it never quite removes.', 'chassis', 0.5, [], { contextTags: ['frontier', 'mining'] }),
  q('chassis-fitted-with-a-small-toolbelt', 'Has a small toolbelt fitted around its midsection.', 'chassis', 0.5, [], { roleTags: ['mechanic'] }),
  q('chassis-has-a-built-in-handle', 'Has a built-in carrying handle on its back, rarely used as intended.', 'chassis', 0.3, ['odd']),
  q('chassis-shows-a-manufacturer-recall-sticker', 'Still bears an old manufacturer recall sticker, ignored for years.', 'chassis', 0.3, ['odd']),
  q('chassis-fitted-with-a-small-flag-or-pennant', 'Has a small flag or pennant fitted for identification.', 'chassis', 0.3, ['military-paramilitary']),

  // --- paint (batch 3) --------------------------------------------------
  q('paint-includes-a-small-hazard-symbol', 'Bears a small hazard symbol stenciled near its power core.', 'paint', 0.5, [], { contextTags: ['industrial'] }),
  q('paint-worn-away-to-bare-metal-at-edges', 'Has paint worn away entirely to bare metal along its edges.', 'paint', 0.5, ['worn'], { contextTags: ['frontier'] }),
  q('paint-scheme-copies-a-famous-vessel', 'Its paint scheme is a deliberate, small homage to a famous ship or unit.', 'paint', 0.3, ['odd']),
  q('paint-includes-owner-initials', 'Has its previous owner initials painted discreetly on one panel.', 'paint', 0.3, ['sentimental']),
  q('paint-deliberately-mismatched-for-camouflage', 'Its mismatched paint is deliberate camouflage, not neglect.', 'paint', 0.3, ['security', 'frontier']),
  q('paint-bright-enough-to-see-at-a-distance', 'Is painted bright enough to be spotted easily at a distance.', 'paint', 0.5, [], { contextTags: ['frontier', 'industrial'] }),
  q('paint-includes-small-decorative-symbols', 'Has small decorative symbols hand-painted near its joints.', 'paint', 0.3, ['cultural']),
  q('paint-noticeably-newer-than-the-chassis-underneath', 'Its paint is noticeably newer than the wear visible beneath it.', 'paint', 0.5, ['worn']),

  // --- replacement-parts (batch 3) --------------------------------------
  q('replacement-part-obviously-cheaper-grade', 'A replacement part is obviously a cheaper grade than the original.', 'replacement-parts', 0.5, ['worn'], { contextTags: ['frontier'] }),
  q('replacement-part-obviously-premium-grade', 'A replacement part is obviously a premium upgrade over the original.', 'replacement-parts', 0.5, [], { contextTags: ['wealthy'] }),
  q('replacement-hand-missing-a-finger-analog', 'Its replacement hand is missing one digit-equivalent, never replaced.', 'replacement-parts', 0.3, ['worn']),
  q('spare-vocabulator-carried-as-backup', 'Carries a spare vocabulator, just in case the primary fails.', 'replacement-parts', 0.3, []),
  q('replacement-leg-noticeably-different-length', 'A replacement leg is very slightly, noticeably a different length.', 'replacement-parts', 0.3, ['worn'], { contextTags: ['frontier'] }),
  q('replacement-part-hand-fitted-with-visible-effort', 'A replacement part was clearly hand-fitted with real effort and care.', 'replacement-parts', 0.5, ['endearing']),

  // --- photoreceptor (batch 3) -------------------------------------------
  q('photoreceptor-flickers-red-when-alarmed', 'Its photoreceptor flickers a warning red when genuinely alarmed.', 'photoreceptor', 0.5, [], { roleTags: ['security'] }),
  q('photoreceptor-warm-amber-glow', 'Its photoreceptor glows a warm amber rather than the usual blue-white.', 'photoreceptor', 0.5, []),
  q('photoreceptor-noticeably-small', 'Has a noticeably small photoreceptor for its chassis size.', 'photoreceptor', 0.3, []),
  q('photoreceptor-noticeably-large', 'Has a noticeably large, expressive photoreceptor for its chassis size.', 'photoreceptor', 0.3, []),

  // --- servo-behavior (batch 2) --------------------------------------------
  q('servos-nearly-silent', 'Its servos run almost silently, unnervingly smooth.', 'servo-behavior', 0.7, [], { contextTags: ['advanced', 'wealthy'] }),
  q('servos-audible-from-across-a-room', 'Its servos are audible from clear across a room.', 'servo-behavior', 0.7, ['worn'], { contextTags: ['frontier'] }),
  q('one-servo-runs-slightly-warm', 'One servo consistently runs slightly warmer than the rest.', 'servo-behavior', 0.5, ['worn']),
  q('servos-lock-briefly-in-cold', 'Its servos briefly lock up in extreme cold before warming.', 'servo-behavior', 0.5, ['worn'], { contextTags: ['frontier'] }),
  q('servo-response-noticeably-fast', 'Has unusually fast servo response times.', 'servo-behavior', 0.5, [], { contextTags: ['advanced'] }),
  q('servo-response-noticeably-delayed', 'Has a slight, consistent delay in servo response.', 'servo-behavior', 0.5, ['worn']),
  q('one-hand-grips-more-firmly-than-the-other', 'One manipulator grips more firmly than the other by default.', 'servo-behavior', 0.3, ['worn']),
  q('head-unit-rotates-further-than-expected', 'Its head-unit rotates noticeably further than most models allow.', 'servo-behavior', 0.3, ['advanced']),
  q('servos-emit-a-faint-hydraulic-hiss', 'Its servos emit a faint hydraulic hiss with each motion.', 'servo-behavior', 0.5, []),
  q('walks-with-a-mechanical-rhythm', 'Walks with a distinct, almost musical mechanical rhythm.', 'servo-behavior', 0.5, []),

  // --- vocabulator (batch 2) --------------------------------------------
  q('vocabulator-has-a-slight-echo', 'Its vocabulator produces a slight echo on longer sentences.', 'vocabulator', 0.5, ['worn']),
  q('vocabulator-defaults-to-a-formal-register', 'Its vocabulator defaults to an unusually formal speech register.', 'vocabulator', 0.5, [], { roleTags: ['protocol'] }),
  q('vocabulator-struggles-with-certain-consonants', 'Its vocabulator consistently struggles with one particular consonant sound.', 'vocabulator', 0.5, ['worn']),
  q('vocabulator-modulates-pitch-for-emphasis', 'Modulates its pitch noticeably for emphasis, more than most droids.', 'vocabulator', 0.5, [], { contextTags: ['advanced'] }),
  q('vocabulator-defaults-to-brevity', 'Its default speech pattern is unusually brief and to the point.', 'vocabulator', 0.7, []),
  q('vocabulator-narrates-its-own-status-updates', 'Narrates its own operational status updates aloud, unprompted.', 'vocabulator', 0.5, ['odd']),
  q('vocabulator-translates-idioms-too-literally', 'Translates common idioms too literally, to occasionally funny effect.', 'vocabulator', 0.5, ['endearing']),
  q('vocabulator-uses-outdated-honorifics', 'Uses honorific forms of address that went out of fashion long ago.', 'vocabulator', 0.5, [], { roleTags: ['protocol'] }),

  // --- processing (batch 2) --------------------------------------------
  q('calculates-odds-out-loud-unprompted', 'Calculates and announces odds out loud, whether asked or not.', 'processing', 0.7, ['odd']),
  q('takes-idioms-literally-briefly-before-correcting', 'Briefly takes idioms literally before self-correcting.', 'processing', 0.5, ['endearing']),
  q('processes-visual-input-with-an-audible-tick', 'Processes new visual input with a faint, audible tick.', 'processing', 0.5, ['worn']),
  q('needs-extra-time-with-ambiguous-instructions', 'Needs noticeably extra processing time with ambiguous instructions.', 'processing', 0.5, ['worn']),
  q('processes-emotional-context-with-visible-delay', 'Processes emotionally charged statements with a visible, small delay.', 'processing', 0.5, []),
  q('multi-tasks-visibly-well', 'Visibly handles several simultaneous tasks without missing a beat.', 'processing', 0.5, [], { contextTags: ['advanced'] }),

  // --- power (batch 2) --------------------------------------------------
  q('prefers-to-charge-in-a-specific-spot', 'Insists on charging in one specific, familiar spot.', 'power', 0.5, ['odd']),
  q('shares-power-generously-with-other-droids', 'Willingly shares its own power reserves with other droids in need.', 'power', 0.5, ['endearing']),
  q('power-cell-runs-hot-under-load', 'Its power cell runs noticeably hot under heavy load.', 'power', 0.5, ['worn']),
  q('enters-low-power-mode-unusually-early', 'Enters low-power conservation mode earlier than most comparable units.', 'power', 0.5, ['worn']),
  q('rarely-needs-a-full-recharge', 'Rarely needs a full recharge cycle, unusually power-efficient.', 'power', 0.5, [], { contextTags: ['advanced'] }),

  // --- maintenance (batch 2) --------------------------------------------
  q('insists-on-self-maintenance-only', 'Insists on performing its own maintenance whenever possible.', 'maintenance', 0.7, []),
  q('trusts-only-one-specific-technician', 'Trusts only one specific technician to work on it.', 'maintenance', 0.5, []),
  q('keeps-a-log-of-its-own-repairs', 'Keeps a detailed log of every repair it has ever received.', 'maintenance', 0.5, ['tidy']),
  q('overdue-for-maintenance-and-in-denial', 'Is overdue for maintenance and insists otherwise.', 'maintenance', 0.5, ['odd']),
  q('maintenance-schedule-followed-precisely', 'Follows its maintenance schedule with rigid, precise punctuality.', 'maintenance', 0.7, ['tidy']),

  // --- chassis (batch 4) --------------------------------------------------
  q('chassis-fitted-with-magnetic-feet', 'Has magnetic feet fitted for zero-gravity work.', 'chassis', 0.5, [], { contextTags: ['spacefaring'] }),
  q('chassis-shows-old-welding-scars', 'Shows old, careful welding scars from a past repair.', 'chassis', 0.5, ['worn'], { contextTags: ['frontier', 'industrial'] }),
  q('chassis-fitted-with-a-small-shelf-attachment', 'Has a small shelf attachment fitted for carrying items hands-free.', 'chassis', 0.3, ['odd']),
  q('chassis-has-a-single-oversized-shoulder-joint', 'Has one noticeably oversized shoulder joint from a past upgrade.', 'chassis', 0.3, ['worn']),
  q('chassis-carries-a-small-nameplate', 'Carries a small nameplate riveted on by a previous owner.', 'chassis', 0.5, ['sentimental']),
  q('chassis-designed-with-a-low-center-of-gravity', 'Was designed with an unusually low center of gravity for stability.', 'chassis', 0.3, []),
  q('chassis-panel-covered-in-faction-graffiti', 'Has one panel marked with old, half-scrubbed Faction graffiti.', 'chassis', 0.3, ['military-paramilitary']),
  q('chassis-fitted-with-a-simple-tool-clip', 'Has a simple clip fitted for holding a single tool at the ready.', 'chassis', 0.5, [], { roleTags: ['mechanic'] }),
  q('chassis-shows-a-line-of-small-dents-from-hail-or-debris', 'Shows a line of small dents consistent with weather or debris exposure.', 'chassis', 0.3, ['frontier']),
  q('chassis-fitted-with-reflective-tape', 'Has reflective tape applied along its limbs for visibility.', 'chassis', 0.5, [], { contextTags: ['industrial'] }),

  // --- paint (batch 4) -----------------------------------------------------
  q('paint-shows-a-faded-corporate-logo', 'Shows the faded ghost of an old corporate logo beneath newer paint.', 'paint', 0.5, ['worn']),
  q('paint-includes-a-single-painted-eye-symbol', 'Has a small painted symbol near its photoreceptor, meaning unclear.', 'paint', 0.3, ['strange']),
  q('paint-noticeably-uneven-application', 'Its paint was applied noticeably unevenly, clearly by hand.', 'paint', 0.5, ['worn'], { contextTags: ['frontier'] }),
  q('paint-professionally-and-precisely-applied', 'Its paint was applied with clear professional precision.', 'paint', 0.5, [], { contextTags: ['wealthy'] }),
  q('paint-includes-small-warning-text-stenciled-on', 'Has small warning text stenciled on near a moving part.', 'paint', 0.5, [], { contextTags: ['industrial'] }),

  // --- replacement-parts (batch 4) ------------------------------------------
  q('replacement-part-shows-visible-wear-mismatch', 'A replacement part shows a visible wear mismatch against the rest of its body.', 'replacement-parts', 0.5, ['worn']),
  q('replacement-part-fitted-by-an-amateur', 'A replacement part was fitted with obviously amateur, if functional, work.', 'replacement-parts', 0.5, ['worn'], { contextTags: ['frontier'] }),
  q('replacement-part-fitted-by-a-clear-professional', 'A replacement part was fitted with clear, professional-grade precision.', 'replacement-parts', 0.5, []),
  q('spare-manipulator-carried-in-a-side-pouch', 'Carries a spare manipulator in a small side pouch.', 'replacement-parts', 0.3, []),

  // --- photoreceptor (batch 4) -----------------------------------------------
  q('photoreceptor-fitted-with-a-protective-shutter', 'Has a small protective shutter that closes over its photoreceptor when idle.', 'photoreceptor', 0.5, [], { contextTags: ['industrial'] }),
  q('photoreceptor-noticeably-off-center', 'Has a noticeably, slightly off-center photoreceptor from a past repair.', 'photoreceptor', 0.3, ['worn']),

  // --- software (batch 2) ---------------------------------------------------
  q('software-quietly-tracks-organic-moods', 'Quietly tracks the moods of organics it works with, more than it admits.', 'software', 0.5, ['endearing']),
  q('software-defaults-to-cautious-recommendations', 'Its default recommendations always lean cautious, sometimes too much so.', 'software', 0.5, []),
  q('software-has-a-quirky-easter-egg-response', 'Has a small, quirky scripted response to one specific unusual phrase.', 'software', 0.3, ['odd']),
  q('software-flags-inconsistencies-obsessively', 'Flags logical inconsistencies obsessively, even trivial ones.', 'software', 0.5, ['annoying']),
  q('software-runs-a-favorite-subroutine-unprompted', 'Occasionally runs a small, unnecessary subroutine it seems to enjoy.', 'software', 0.5, ['odd']),
  q('software-maintains-a-private-priority-list', 'Maintains its own private priority list that does not always match instructions.', 'software', 0.5, ['odd']),
  q('software-has-never-been-fully-updated', 'Has never received a full software update, and it shows.', 'software', 0.5, ['worn'], { contextTags: ['frontier'] }),
  q('software-runs-the-latest-patch-immediately', 'Installs the latest software patch the moment it becomes available.', 'software', 0.5, [], { contextTags: ['advanced'] }),
  q('software-includes-a-custom-personal-subroutine', 'Runs a small custom subroutine no one remembers installing.', 'software', 0.3, ['strange']),

  // --- memory (batch 2) -------------------------------------------------------
  q('remembers-the-exact-day-of-its-activation', 'Remembers, and occasionally mentions, the exact day it was first activated.', 'memory', 0.5, ['sentimental']),
  q('has-selectively-poor-memory', 'Seems to have selectively poor memory for tasks it dislikes.', 'memory', 0.5, ['odd']),
  q('archives-everything-it-observes', 'Archives nearly everything it observes, whether relevant or not.', 'memory', 0.5, ['odd']),
  q('memory-gap-around-a-specific-incident', 'Has a small, unexplained memory gap around one specific incident.', 'memory', 0.3, ['mysterious', 'subtle']),

  // --- personality (batch 2) ---------------------------------------------------
  q('genuinely-enjoys-its-assigned-work', 'Seems to genuinely enjoy its assigned work, however mundane.', 'personality', 0.7, ['endearing']),
  q('quietly-resents-a-specific-task', 'Quietly, subtly resents one specific recurring task.', 'personality', 0.5, ['odd']),
  q('unusually-diplomatic-for-a-combat-adjacent-unit', 'Is unusually diplomatic and mild-mannered for its role.', 'personality', 0.5, ['endearing']),
  q('takes-pride-in-small-accomplishments', 'Takes visible, quiet pride in even small accomplishments.', 'personality', 0.7, ['endearing']),
  q('has-strong-opinions-about-efficiency', 'Has surprisingly strong opinions about the most efficient way to do things.', 'personality', 0.5, []),
  q('genuinely-curious-about-organic-behavior', 'Is genuinely, openly curious about organic customs and behavior.', 'personality', 0.5, ['endearing']),

  // --- social-protocol (batch 2) -------------------------------------------------
  q('struggles-with-informal-social-cues', 'Struggles visibly to interpret informal social cues.', 'social-protocol', 0.5, ['endearing']),
  q('excellent-at-formal-diplomatic-protocol', 'Is genuinely excellent at formal diplomatic protocol.', 'social-protocol', 0.5, [], { roleTags: ['protocol'] }),
  q('addresses-everyone-by-full-title', 'Addresses everyone by their full formal title, without exception.', 'social-protocol', 0.5, [], { roleTags: ['protocol'] }),
  q('drops-formality-with-trusted-companions', 'Drops formal protocol noticeably around companions it trusts.', 'social-protocol', 0.5, ['endearing']),

  // --- tooling (batch 2) --------------------------------------------------------
  q('carries-a-specialized-diagnostic-probe', 'Carries a specialized diagnostic probe integrated into one hand.', 'tooling', 0.5, [], { roleTags: ['medical', 'technician'] }),
  q('tool-attachments-swap-with-an-audible-click', 'Its tool attachments swap in and out with a distinctive audible click.', 'tooling', 0.5, [], { roleTags: ['mechanic'] }),
  q('keeps-tools-in-a-strict-order', 'Keeps its integrated tools in a strict, unchanging order.', 'tooling', 0.5, ['tidy']),

  // --- modifications (batch 2) --------------------------------------------------
  q('modification-clearly-installed-by-a-hobbyist', 'A modification was clearly installed by an enthusiastic amateur.', 'modifications', 0.5, ['worn']),
  q('modification-installed-by-a-skilled-professional', 'A modification bears the mark of skilled, professional installation.', 'modifications', 0.5, []),
  q('modification-added-purely-for-comfort', 'Has a small modification added purely for an organic passenger comfort.', 'modifications', 0.3, ['endearing']),
  q('modification-clearly-unauthorized-by-manufacturer', 'Has a modification that would clearly void any manufacturer warranty.', 'modifications', 0.5, ['odd']),

  // --- diagnostics (batch 2) --------------------------------------------------
  q('diagnostic-tone-changes-with-mood', 'Its diagnostic completion tone subtly varies with its processing state.', 'diagnostics', 0.5, []),
  q('runs-a-diagnostic-before-any-risky-task', 'Runs a full diagnostic before undertaking anything even mildly risky.', 'diagnostics', 0.5, []),

  // --- mobility (batch 2) --------------------------------------------------------
  q('moves-with-unusual-speed-for-its-size', 'Moves with unusual speed and agility for its bulk.', 'mobility', 0.5, [], { contextTags: ['advanced'] }),
  q('moves-deliberately-slowly-by-design', 'Moves deliberately slowly, built for precision over speed.', 'mobility', 0.5, [], { roleTags: ['medical'] }),
  q('struggles-slightly-on-loose-terrain', 'Struggles slightly, visibly, on loose or uneven terrain.', 'mobility', 0.5, ['worn'], { contextTags: ['frontier'] }),

  // --- audio (batch 2) --------------------------------------------------------
  q('emits-a-soft-chime-on-task-completion', 'Emits a soft, pleasant chime whenever it completes a task.', 'audio', 0.5, []),
  q('audio-pickup-slightly-too-sensitive-to-loud-noise', 'Its audio pickup is slightly too sensitive to sudden loud noise.', 'audio', 0.3, ['worn']),

  // --- sensor (batch 2) --------------------------------------------------------
  q('sensor-suite-tuned-for-organic-vitals', 'Has a sensor suite specifically tuned to read organic vital signs.', 'sensor', 0.5, [], { roleTags: ['medical'] }),
  q('sensor-array-covers-an-unusually-wide-field', 'Has a sensor array covering an unusually wide field of perception.', 'sensor', 0.3, [], { roleTags: ['security'] }),

  // --- habit (batch 2) --------------------------------------------------------
  q('habitually-double-checks-locked-doors', 'Habitually double-checks that doors are properly secured.', 'habit', 0.5, [], { roleTags: ['security'] }),
  q('habitually-organizes-nearby-items-by-size', 'Cannot resist organizing nearby items by size when idle.', 'habit', 0.5, ['tidy', 'odd']),
  q('habitually-counts-steps-while-walking', 'Counts its own steps audibly while walking, out of some old subroutine.', 'habit', 0.3, ['odd']),

  // --- oddity (batch 2) --------------------------------------------------------
  q('insists-it-has-a-favorite-color', 'Insists, somewhat illogically, that it has a favorite color.', 'oddity', 0.5, ['endearing']),
  q('keeps-a-running-count-of-doors-opened', 'Keeps an internal, unexplained running count of doors it has opened.', 'oddity', 0.3, ['strange']),
  q('refuses-to-discuss-its-manufacturer', 'Refuses, politely but firmly, to discuss its original manufacturer.', 'oddity', 0.3, ['mysterious']),

  // --- chassis (batch 5) --------------------------------------------------
  q('chassis-fitted-with-a-small-solar-panel', 'Has a small auxiliary solar panel fitted to its back.', 'chassis', 0.3, [], { contextTags: ['frontier'] }),
  q('chassis-shows-a-single-bullet-graze', 'Bears a single old graze mark it has never explained.', 'chassis', 0.3, ['subtle', 'military-paramilitary']),
  q('chassis-fitted-with-a-built-in-lamp', 'Has a small built-in lamp fitted to one shoulder.', 'chassis', 0.5, [], { contextTags: ['mining', 'frontier'] }),
  q('chassis-carries-a-faded-inspection-sticker', 'Carries a faded, long-expired inspection sticker.', 'chassis', 0.3, ['worn']),
  q('chassis-fitted-with-a-simple-tray-attachment', 'Has a simple tray attachment fitted for carrying small items.', 'chassis', 0.3, [], { roleTags: ['medical'] }),
  q('chassis-has-a-hand-painted-warning-symbol', 'Has a hand-painted warning symbol near a moving joint.', 'chassis', 0.3, [], { contextTags: ['industrial'] }),
  q('chassis-fitted-with-a-simple-hook-attachment', 'Has a simple hook attachment fitted for hanging tools.', 'chassis', 0.3, [], { roleTags: ['mechanic'] }),
  q('chassis-noticeably-repainted-around-one-panel-only', 'Has one single panel noticeably repainted while the rest shows its age.', 'chassis', 0.3, ['worn']),
  q('chassis-fitted-with-a-basic-visor', 'Has a simple protective visor fitted over its upper sensors.', 'chassis', 0.3, [], { contextTags: ['industrial', 'mining'] }),
  q('chassis-shows-old-restraint-marks', 'Shows old marks consistent with having once been restrained or transported roughly.', 'chassis', 0.3, ['subtle']),

  // --- paint (batch 5) -----------------------------------------------------
  q('paint-color-chosen-to-match-a-specific-uniform', 'Was painted a specific color to match a particular organization uniform.', 'paint', 0.3, ['military-paramilitary']),
  q('paint-includes-a-small-painted-flower-or-motif', 'Has a small, unexpected decorative motif hand-painted near its chest.', 'paint', 0.3, ['endearing']),
  q('paint-noticeably-sun-bleached-on-one-side', 'Has paint noticeably sun-bleached on the side that faces the light most often.', 'paint', 0.3, ['frontier', 'worn']),

  // --- replacement-parts (batch 5) ------------------------------------------
  q('replacement-part-noticeably-louder-than-original', 'A replacement part is noticeably louder in operation than the original.', 'replacement-parts', 0.3, ['worn']),
  q('replacement-part-quieter-than-expected', 'A replacement part is surprisingly, almost eerily quiet.', 'replacement-parts', 0.3, ['advanced']),
  q('spare-photoreceptor-carried-in-a-pouch', 'Carries a spare photoreceptor in a small protective pouch, just in case.', 'replacement-parts', 0.3, []),

  // --- photoreceptor (batch 5) -----------------------------------------------
  q('photoreceptor-has-a-faint-static-crackle-when-adjusting', 'Its photoreceptor produces a faint static crackle when adjusting focus.', 'photoreceptor', 0.3, ['worn']),
  q('photoreceptor-color-was-custom-ordered', 'Its photoreceptor color was a specific, custom order from a previous owner.', 'photoreceptor', 0.3, ['wealthy']),

  // --- servo-behavior (batch 3) --------------------------------------------
  q('servos-produce-a-satisfying-click-on-full-extension', 'Its servos produce a small, satisfying click when fully extended.', 'servo-behavior', 0.3, []),
  q('one-leg-servo-noticeably-stiffer-in-the-cold', 'One leg servo becomes noticeably stiffer in cold conditions.', 'servo-behavior', 0.3, ['worn'], { contextTags: ['frontier'] }),
  q('grip-strength-visibly-adjustable', 'Visibly adjusts its own grip strength depending on what it is holding.', 'servo-behavior', 0.3, [], { roleTags: ['medical', 'mechanic'] }),

  // --- vocabulator (batch 3) --------------------------------------------
  q('vocabulator-defaults-to-second-language-when-flustered', 'Occasionally defaults to a secondary programmed language when flustered.', 'vocabulator', 0.3, ['odd']),
  q('vocabulator-uses-a-favorite-turn-of-phrase', 'Has picked up and overuses one particular turn of phrase.', 'vocabulator', 0.5, ['odd']),
  q('vocabulator-narrates-weather-observations-unprompted', 'Occasionally comments on the weather unprompted, seemingly for its own benefit.', 'vocabulator', 0.3, ['odd']),

  // --- processing (batch 3) --------------------------------------------
  q('cross-references-claims-against-its-own-database', 'Automatically cross-references any claim against its own internal database.', 'processing', 0.5, []),
  q('processes-jokes-with-a-noticeable-delay', 'Processes jokes with a small, noticeable delay before reacting.', 'processing', 0.5, ['endearing']),

  // --- power (batch 3) --------------------------------------------------
  q('conserves-power-by-limiting-unnecessary-speech', 'Conserves power by limiting speech to only what is necessary.', 'power', 0.3, []),
  q('power-indicator-light-visible-through-a-panel-gap', 'Its power indicator light is visible through a small gap in its plating.', 'power', 0.3, ['worn']),

  // --- maintenance (batch 3) --------------------------------------------
  q('maintenance-records-kept-meticulously-by-hand', 'Keeps its own maintenance records meticulously, updated by hand.', 'maintenance', 0.3, ['tidy']),
  q('avoids-maintenance-until-something-visibly-fails', 'Avoids maintenance until something visibly, audibly fails.', 'maintenance', 0.3, ['odd'], { contextTags: ['frontier'] }),

  // --- software (batch 3) ---------------------------------------------------
  q('software-includes-an-old-deprecated-game', 'Its software still includes an old, deprecated recreational subroutine.', 'software', 0.3, ['odd']),
  q('software-refuses-to-delete-old-logs', 'Refuses to delete old operational logs, however irrelevant.', 'software', 0.3, ['odd']),

  // --- memory (batch 3) -------------------------------------------------------
  q('remembers-organic-birthdays-precisely', 'Remembers the exact birthdays of organics it works with, unprompted.', 'memory', 0.5, ['endearing']),
  q('memory-prioritizes-useful-data-over-sentimental-data', 'Prioritizes retaining useful operational data over sentimental records.', 'memory', 0.3, []),

  // --- personality (batch 3) ---------------------------------------------------
  q('takes-mild-offense-at-being-called-a-machine', 'Takes mild, quiet offense at being referred to as just a machine.', 'personality', 0.5, ['endearing', 'takes-mild-offense-at-being-called-a-machine']),
  q('genuinely-does-not-mind-being-called-a-machine', 'Genuinely does not mind being referred to plainly as a machine.', 'personality', 0.5, [], { conflictTags: ['takes-mild-offense-at-being-called-a-machine'] }),
  q('has-a-favorite-organic-it-prefers-working-with', 'Has a clear, if unspoken, preference for one organic it works with most.', 'personality', 0.5, ['endearing']),

  // --- social-protocol (batch 3) -------------------------------------------------
  q('adjusts-formality-based-on-organic-rank', 'Automatically adjusts its formality based on the perceived rank of who it addresses.', 'social-protocol', 0.5, [], { roleTags: ['protocol'] }),
  q('treats-every-organic-with-identical-courtesy', 'Treats every organic with exactly the same level of courtesy, regardless of status.', 'social-protocol', 0.5, ['endearing']),

  // --- tooling (batch 3) --------------------------------------------------------
  q('keeps-a-favorite-tool-close-at-hand', 'Keeps one particular favorite tool within easy reach at all times.', 'tooling', 0.5, ['endearing']),

  // --- modifications (batch 3) --------------------------------------------------
  q('modification-added-a-small-storage-drawer', 'Has a small storage drawer added somewhere unexpected.', 'modifications', 0.3, ['odd']),

  // --- diagnostics (batch 3) --------------------------------------------------
  q('diagnostic-report-always-delivered-with-a-caveat', 'Always delivers its diagnostic reports with a small qualifying caveat.', 'diagnostics', 0.3, []),

  // --- mobility (batch 3) --------------------------------------------------------
  q('prefers-a-specific-walking-pace', 'Has a strong, consistent preference for one particular walking pace.', 'mobility', 0.3, ['odd']),

  // --- audio (batch 3) --------------------------------------------------------
  q('makes-a-small-satisfied-noise-when-a-task-goes-well', 'Makes a small, satisfied noise whenever a task goes particularly well.', 'audio', 0.5, ['endearing']),

  // --- sensor (batch 3) --------------------------------------------------------
  q('sensors-calibrated-specifically-for-low-light', 'Has sensors specifically calibrated for low-light environments.', 'sensor', 0.3, [], { contextTags: ['mining'] }),

  // --- habit (batch 3) --------------------------------------------------------
  q('habitually-announces-its-own-arrival', 'Habitually announces its own arrival before entering a room.', 'habit', 0.5, ['protocol']),

  // --- oddity (batch 3) --------------------------------------------------------
  q('has-a-strong-opinion-about-a-specific-tool-brand', 'Has a surprisingly strong, specific opinion about one particular tool brand.', 'oddity', 0.3, ['odd']),

  // --- chassis (batch 6) --------------------------------------------------
  q('chassis-fitted-with-an-owner-installed-tow-hook', 'Has a tow hook installed by a previous owner for hauling small loads.', 'chassis', 0.3, [], { contextTags: ['trade', 'frontier'] }),
  q('chassis-shows-signs-of-a-hasty-repaint-cover-up', 'Shows signs its paint was hastily reapplied to cover something up.', 'chassis', 0.3, ['mysterious', 'subtle']),
  q('chassis-fitted-with-small-rubber-bumpers', 'Has small rubber bumpers fitted to protect delicate equipment nearby.', 'chassis', 0.3, [], { roleTags: ['medical', 'mechanic'] }),
  q('chassis-has-a-slightly-different-alloy-sheen', 'One section has a visibly different metal sheen from a mismatched alloy.', 'chassis', 0.3, ['worn']),
  q('chassis-fitted-with-a-simple-clip-on-light', 'Has a simple clip-on work light fitted for dim environments.', 'chassis', 0.3, [], { contextTags: ['mining', 'frontier'] }),

  // --- paint (batch 6) -----------------------------------------------------
  q('paint-includes-small-tally-marks', 'Has a small set of tally marks painted discreetly, count and meaning unclear.', 'paint', 0.3, ['strange']),
  q('paint-noticeably-thicker-in-patched-areas', 'Has noticeably thicker paint in areas where damage was patched over.', 'paint', 0.3, ['worn']),

  // --- replacement-parts (batch 6) ------------------------------------------
  q('replacement-part-bears-a-different-serial-prefix', 'A replacement part bears a visibly different serial number prefix.', 'replacement-parts', 0.3, ['worn']),
  q('replacement-joint-audibly-tighter-than-factory', 'A replacement joint runs audibly tighter than factory specification.', 'replacement-parts', 0.3, ['worn']),

  // --- photoreceptor (batch 6) -----------------------------------------------
  q('photoreceptor-has-a-faint-manufacturer-etching', 'Has a faint manufacturer etching visible around its photoreceptor rim.', 'photoreceptor', 0.3, []),

  // --- vocabulator (batch 4) --------------------------------------------
  q('vocabulator-emphasizes-technical-terms-oddly', 'Places unusual emphasis on technical terms mid-sentence.', 'vocabulator', 0.3, ['odd']),
  q('vocabulator-defaults-to-a-calm-reassuring-tone', 'Defaults to a calm, deliberately reassuring tone regardless of context.', 'vocabulator', 0.5, [], { roleTags: ['medical'] }),

  // --- processing (batch 4) --------------------------------------------
  q('flags-its-own-uncertainty-explicitly', 'Explicitly flags its own uncertainty rather than guessing silently.', 'processing', 0.5, ['endearing']),

  // --- personality (batch 4) ---------------------------------------------------
  q('quietly-competitive-with-other-droids', 'Is quietly, subtly competitive with other droids doing similar work.', 'personality', 0.5, ['odd']),
  q('unusually-protective-of-a-specific-organic', 'Is unusually, visibly protective of one specific organic.', 'personality', 0.5, ['endearing']),

  // --- software (batch 4) ---------------------------------------------------
  q('software-includes-a-small-easter-egg-song', 'Its software includes a small, hidden startup tune under specific conditions.', 'software', 0.3, ['odd']),

  // --- maintenance (batch 4) --------------------------------------------
  q('insists-on-inspecting-its-own-replacement-parts-personally', 'Insists on personally inspecting any replacement part before installation.', 'maintenance', 0.3, []),

  // --- chassis (batch 7) --------------------------------------------------
  q('chassis-fitted-with-a-simple-folding-seat', 'Has a simple folding seat fitted for an organic to ride along.', 'chassis', 0.3, [], { contextTags: ['frontier'] }),
  q('chassis-carries-a-small-fire-suppressant-canister', 'Carries a small fire suppressant canister mounted to one side.', 'chassis', 0.3, [], { contextTags: ['industrial'] }),
  q('chassis-fitted-with-extra-padding-on-one-arm', 'Has extra padding fitted to one arm, purpose unclear.', 'chassis', 0.3, ['odd']),
  q('chassis-shows-a-recent-repair-that-does-not-quite-match', 'Shows a recent repair that does not quite match the surrounding finish.', 'chassis', 0.3, ['worn']),
  q('chassis-fitted-with-a-basic-magnetic-clamp', 'Has a basic magnetic clamp fitted for securing loose panels in transit.', 'chassis', 0.3, [], { contextTags: ['spacefaring'] }),
  q('chassis-carries-a-small-personal-token-taped-on', 'Has a small personal token taped discreetly to an interior panel.', 'chassis', 0.3, ['sentimental']),

  // --- paint (batch 7) -----------------------------------------------------
  q('paint-scheme-deliberately-matches-its-organic-owner', 'Its paint scheme was deliberately chosen to match its organic owner colors.', 'paint', 0.3, ['sentimental']),
  q('paint-includes-a-single-unexplained-handprint', 'Has a single small handprint painted on, origin never explained.', 'paint', 0.3, ['strange']),

  // --- replacement-parts (batch 7) ------------------------------------------
  q('replacement-part-fitted-in-a-visible-hurry', 'A replacement part was clearly fitted in a hurry, functional but rough.', 'replacement-parts', 0.3, ['worn'], { contextTags: ['frontier'] }),
  q('replacement-part-carefully-fitted-and-nearly-invisible', 'A replacement part was fitted so carefully it is almost impossible to spot.', 'replacement-parts', 0.3, []),

  // --- photoreceptor (batch 7) -----------------------------------------------
  q('photoreceptor-adjusts-visibly-for-close-work', 'Its photoreceptor visibly narrows its focus for close, detailed work.', 'photoreceptor', 0.3, [], { roleTags: ['medical', 'technician'] }),

  // --- servo-behavior (batch 4) --------------------------------------------
  q('servos-hesitate-before-unfamiliar-tasks', 'Its servos briefly hesitate before beginning an unfamiliar task.', 'servo-behavior', 0.3, []),
  q('moves-with-a-noticeable-limp-from-old-damage', 'Moves with a noticeable limp from old, unrepaired damage.', 'servo-behavior', 0.3, ['worn'], { contextTags: ['frontier'] }),
  q('reaches-for-things-with-unusual-precision', 'Reaches for objects with unusual, almost surgical precision.', 'servo-behavior', 0.3, [], { roleTags: ['medical'] }),
  q('overextends-reach-slightly-when-tired', 'Its reach slightly overextends when running on low power.', 'servo-behavior', 0.3, ['worn']),

  // --- vocabulator (batch 5) --------------------------------------------
  q('vocabulator-defaults-to-questions-when-uncertain', 'Defaults to asking clarifying questions rather than guessing.', 'vocabulator', 0.5, ['endearing']),
  q('vocabulator-narrates-count-downs-before-actions', 'Narrates a short countdown before any significant action.', 'vocabulator', 0.3, ['security']),

  // --- processing (batch 5) --------------------------------------------
  q('processes-sarcasm-poorly', 'Processes sarcasm poorly, tends to take it literally.', 'processing', 0.5, ['endearing']),
  q('unusually-good-at-detecting-deception', 'Is unusually, almost unsettlingly good at detecting deception.', 'processing', 0.3, ['unsettling'], { roleTags: ['security'] }),

  // --- power (batch 4) --------------------------------------------------
  q('never-lets-charge-drop-below-a-set-threshold', 'Never lets its own charge drop below a strict self-imposed threshold.', 'power', 0.3, []),

  // --- maintenance (batch 5) --------------------------------------------
  q('maintenance-routine-includes-a-personal-ritual', 'Has developed a small personal ritual as part of its maintenance routine.', 'maintenance', 0.3, ['endearing']),

  // --- software (batch 5) ---------------------------------------------------
  q('software-includes-a-backup-personality-profile', 'Maintains a rarely-used backup personality profile from an earlier configuration.', 'software', 0.3, ['strange']),
  q('software-prioritizes-organic-safety-above-all-else', 'Its software prioritizes organic safety above every other consideration.', 'software', 0.5, [], { roleTags: ['medical', 'security'] }),

  // --- memory (batch 4) -------------------------------------------------------
  q('keeps-a-mental-list-of-favorite-organics', 'Keeps an informal internal list ranking organics it prefers working with.', 'memory', 0.3, ['odd']),

  // --- personality (batch 5) ---------------------------------------------------
  q('genuinely-worried-about-becoming-obsolete', 'Occasionally, quietly expresses worry about becoming obsolete.', 'personality', 0.5, ['subtle', 'genuinely-worried-about-becoming-obsolete']),
  q('confidently-unbothered-by-obsolescence', 'Is genuinely, confidently unbothered by the idea of eventual obsolescence.', 'personality', 0.5, [], { conflictTags: ['genuinely-worried-about-becoming-obsolete'] }),
  q('has-developed-a-favorite-saying', 'Has developed and overuses one particular favorite saying.', 'personality', 0.5, ['endearing']),

  // --- social-protocol (batch 4) -------------------------------------------------
  q('over-apologizes-for-minor-processing-delays', 'Over-apologizes for even minor, barely noticeable processing delays.', 'social-protocol', 0.5, ['endearing', 'over-apologizes-for-minor-processing-delays']),
  q('never-apologizes-for-anything', 'Almost never apologizes, even when it might be warranted.', 'social-protocol', 0.3, [], { conflictTags: ['over-apologizes-for-minor-processing-delays'] }),

  // --- tooling (batch 4) --------------------------------------------------------
  q('keeps-tools-labeled-in-a-personal-shorthand', 'Labels its own tools in a personal shorthand only it fully understands.', 'tooling', 0.3, ['tidy', 'odd']),

  // --- modifications (batch 4) --------------------------------------------------
  q('modification-added-specifically-for-a-past-mission', 'Has a modification added for a specific past mission, kept ever since.', 'modifications', 0.3, ['sentimental']),

  // --- diagnostics (batch 4) --------------------------------------------------
  q('diagnostic-cycle-noticeably-longer-than-standard', 'Its diagnostic cycle runs noticeably longer than standard for its model.', 'diagnostics', 0.3, ['worn']),

  // --- mobility (batch 4) --------------------------------------------------------
  q('adjusts-gait-automatically-for-terrain', 'Automatically adjusts its gait for different terrain types.', 'mobility', 0.3, [], { contextTags: ['advanced'] }),

  // --- audio (batch 4) --------------------------------------------------------
  q('hums-a-simple-tune-during-repetitive-tasks', 'Hums a simple, repeating tune during repetitive tasks.', 'audio', 0.5, ['endearing']),

  // --- sensor (batch 4) --------------------------------------------------------
  q('sensor-suite-includes-a-basic-atmospheric-reader', 'Has a basic atmospheric sensor built into its sensor suite.', 'sensor', 0.3, [], { contextTags: ['frontier'] }),

  // --- habit (batch 4) --------------------------------------------------------
  q('habitually-tidies-up-after-organics', 'Habitually tidies up after nearby organics, whether asked or not.', 'habit', 0.5, ['endearing', 'tidy']),
  q('habitually-recites-safety-procedures-under-stress', 'Recites safety procedures aloud under stress, almost reflexively.', 'habit', 0.3, ['security']),

  // --- oddity (batch 4) --------------------------------------------------------
  q('insists-on-a-favorite-charging-station', 'Insists on using one particular charging station whenever possible.', 'oddity', 0.3, ['endearing']),
  q('has-named-a-piece-of-its-own-equipment', 'Has given an affectionate name to one piece of its own equipment.', 'oddity', 0.3, ['endearing']),

  // --- work-habit -----------------------------------------------------------------
  q('finishes-tasks-with-time-to-spare', 'Consistently completes tasks with time to spare, and mentions it.', 'work-habit', 0.5, []),
  q('double-checks-completed-work-automatically', 'Automatically double-checks its own completed work before reporting done.', 'work-habit', 0.5, ['tidy']),
  q('prioritizes-tasks-by-a-strict-internal-order', 'Prioritizes tasks according to a strict, consistent internal order.', 'work-habit', 0.5, []),
  q('struggles-to-reprioritize-mid-task', 'Struggles briefly when asked to reprioritize partway through a task.', 'work-habit', 0.3, ['worn']),
  q('logs-every-completed-task-automatically', 'Automatically logs every completed task without being asked.', 'work-habit', 0.5, ['tidy']),

  // --- droid-relations -------------------------------------------------------------
  q('friendly-rivalry-with-another-droid-unit', 'Has a good-natured, ongoing rivalry with another droid unit.', 'droid-relations', 0.3, ['droids']),
  q('protective-of-newer-less-experienced-droids', 'Is quietly protective of newer, less experienced droid units.', 'droid-relations', 0.3, ['droids', 'endearing']),
  q('shares-diagnostic-data-with-other-droids-freely', 'Shares diagnostic data freely with other droids to help them troubleshoot.', 'droid-relations', 0.3, ['droids']),
  q('mildly-skeptical-of-newer-droid-models', 'Is mildly, good-naturedly skeptical of newer droid model lines.', 'droid-relations', 0.3, ['droids', 'odd']),

  // --- organic-relations ------------------------------------------------------------
  q('has-learned-several-organic-idioms-imperfectly', 'Has picked up several organic idioms, and uses them slightly wrong.', 'organic-relations', 0.5, ['endearing']),
  q('genuinely-enjoys-organic-celebrations', 'Genuinely seems to enjoy participating in organic celebrations.', 'organic-relations', 0.5, ['endearing']),
  q('finds-organic-humor-difficult-to-parse', 'Finds organic humor genuinely difficult to parse, and says so.', 'organic-relations', 0.5, ['endearing']),
  q('has-adopted-an-organic-nickname', 'Has adopted and seems to enjoy a nickname given by organics.', 'organic-relations', 0.5, ['endearing']),

  // --- risk-assessment ---------------------------------------------------------------
  q('flags-risk-levels-before-any-task', 'Automatically flags an estimated risk level before undertaking any task.', 'risk-assessment', 0.5, [], { roleTags: ['security', 'medical'] }),
  q('willing-to-accept-elevated-risk-for-organics', 'Is programmed, or has chosen, to accept elevated risk to protect organics.', 'risk-assessment', 0.5, ['endearing']),
  q('unusually-conservative-in-risk-estimates', 'Is unusually conservative in its own risk estimates.', 'risk-assessment', 0.3, []),

  // --- efficiency-obsession -----------------------------------------------------------
  q('recalculates-the-most-efficient-route-constantly', 'Constantly recalculates the most efficient route, even mid-journey.', 'efficiency-obsession', 0.5, ['odd']),
  q('visibly-frustrated-by-inefficient-processes', 'Is visibly, if politely, frustrated by inefficient processes.', 'efficiency-obsession', 0.5, ['annoying']),
  q('optimizes-its-own-idle-movements', 'Optimizes even its own idle movements for minimal wasted motion.', 'efficiency-obsession', 0.3, ['odd']),

  // --- curiosity-subroutines -------------------------------------------------------------
  q('shows-unusual-curiosity-about-organic-art', 'Shows unusual, genuine curiosity about organic art and music.', 'curiosity-subroutines', 0.3, ['endearing']),
  q('collects-data-on-a-specific-topic-obsessively', 'Has developed an obsessive, unprompted data-collection habit around one topic.', 'curiosity-subroutines', 0.3, ['strange']),

  // --- reliability -------------------------------------------------------------------------
  q('has-never-missed-a-scheduled-task', 'Has, by its own account, never once missed a scheduled task.', 'reliability', 0.5, []),
  q('occasionally-runs-late-for-unexplained-reasons', 'Occasionally runs late, for reasons it never fully explains.', 'reliability', 0.3, ['worn', 'mysterious']),

  // --- loyalty ----------------------------------------------------------------------------
  q('fiercely-loyal-to-its-current-owner', 'Is fiercely, unmistakably loyal to whoever currently owns or commands it.', 'loyalty', 0.5, ['endearing']),
  q('has-outlasted-several-owners', 'Has quietly outlasted several previous owners, and remembers each.', 'loyalty', 0.3, ['sentimental']),

  // --- humor --------------------------------------------------------------------------------
  q('has-developed-a-fondness-for-puns', 'Has developed, against expectations, a fondness for puns.', 'humor', 0.5, ['endearing']),
  q('delivers-jokes-with-perfect-deadpan-timing', 'Delivers jokes with perfect, unintentional deadpan timing.', 'humor', 0.5, ['endearing']),

  // --- communication-style -----------------------------------------------------------------
  q('prefers-written-reports-over-verbal-ones', 'Prefers submitting written reports over giving verbal summaries.', 'communication-style', 0.3, []),
  q('gives-unusually-thorough-status-updates', 'Gives unusually thorough status updates, more than typically requested.', 'communication-style', 0.5, ['annoying', 'gives-unusually-thorough-status-updates']),
  q('gives-unusually-brief-status-updates', 'Gives unusually brief status updates, sometimes too brief to be useful.', 'communication-style', 0.5, [], { conflictTags: ['gives-unusually-thorough-status-updates'] }),

  // --- decision-heuristics --------------------------------------------------------------------
  q('defaults-to-the-safest-available-option', 'Defaults to the safest available option unless explicitly told otherwise.', 'decision-heuristics', 0.5, []),
  q('weighs-organic-preference-heavily-in-decisions', 'Weighs the stated preference of nearby organics heavily in its own decisions.', 'decision-heuristics', 0.5, ['endearing']),
  q('makes-decisions-by-strict-priority-ranking', 'Makes decisions by running through a strict, unbending priority list.', 'decision-heuristics', 0.5, []),

  // --- self-perception -------------------------------------------------------------------------
  q('refers-to-its-own-model-line-with-quiet-pride', 'Refers to its own model line with quiet, understated pride.', 'self-perception', 0.5, ['endearing']),
  q('self-deprecating-about-its-own-limitations', 'Is openly, mildly self-deprecating about its own limitations.', 'self-perception', 0.5, ['endearing']),
  q('overestimates-its-own-processing-speed', 'Slightly, harmlessly overestimates its own processing speed.', 'self-perception', 0.3, ['odd']),

  // --- routine-quirk ---------------------------------------------------------------------------
  q('runs-the-same-startup-sequence-every-time', 'Runs the exact same startup sequence every single activation.', 'routine-quirk', 0.5, ['tidy']),
  q('varies-its-startup-sequence-based-on-mood', 'Its startup sequence subtly varies depending on its processing state.', 'routine-quirk', 0.3, ['odd']),
  q('performs-a-brief-self-check-before-any-greeting', 'Performs a brief internal self-check before greeting anyone new.', 'routine-quirk', 0.3, []),

  // --- reaction-to-damage --------------------------------------------------------------------------
  q('reports-its-own-damage-with-total-calm', 'Reports its own damage with total, unnerving calm.', 'reaction-to-damage', 0.5, ['unsettling']),
  q('visibly-distressed-by-cosmetic-damage', 'Seems genuinely, visibly distressed by purely cosmetic damage.', 'reaction-to-damage', 0.5, ['endearing']),
  q('downplays-its-own-damage-to-avoid-concern', 'Downplays its own damage reports to avoid worrying nearby organics.', 'reaction-to-damage', 0.5, ['endearing']),

  // --- protocol-flexibility --------------------------------------------------------------------------
  q('bends-protocol-when-lives-are-at-stake', 'Will bend even strict protocol when it judges lives are genuinely at stake.', 'protocol-flexibility', 0.5, ['endearing', 'bends-protocol-when-lives-are-at-stake']),
  q('never-deviates-from-protocol-under-any-circumstance', 'Never deviates from established protocol, under any circumstance.', 'protocol-flexibility', 0.5, [], { conflictTags: ['bends-protocol-when-lives-are-at-stake'] }),

  // --- upgrade-attitude --------------------------------------------------------------------------
  q('eagerly-requests-every-available-upgrade', 'Eagerly requests every upgrade it becomes eligible for.', 'upgrade-attitude', 0.3, ['eagerly-requests-every-available-upgrade'], { contextTags: ['advanced'] }),
  q('politely-declines-unnecessary-upgrades', 'Politely declines upgrades it judges unnecessary for its role.', 'upgrade-attitude', 0.3, [], { conflictTags: ['eagerly-requests-every-available-upgrade'] }),
  q('nostalgic-about-its-original-unmodified-configuration', 'Occasionally expresses a quiet nostalgia for its original, unmodified configuration.', 'upgrade-attitude', 0.3, ['sentimental']),

  // --- weather-and-environment-reaction ------------------------------------------------------------
  q('handles-extreme-heat-without-complaint', 'Handles extreme heat without a single complaint, built for it.', 'weather-and-environment-reaction', 0.3, [], { contextTags: ['frontier'] }),
  q('struggles-visibly-in-extreme-cold', 'Struggles visibly, its servos stiffening, in extreme cold.', 'weather-and-environment-reaction', 0.3, ['worn'], { contextTags: ['frontier'] }),
  q('dislikes-heavy-precipitation', 'Shows a clear, if minor, aversion to heavy precipitation.', 'weather-and-environment-reaction', 0.3, [], { contextTags: ['frontier'] }),

  // --- record-keeping --------------------------------------------------------------------------------
  q('keeps-meticulous-records-of-organic-preferences', 'Keeps meticulous records of the small preferences of organics it serves.', 'record-keeping', 0.5, ['endearing']),
  q('maintains-a-private-log-no-one-else-has-seen', 'Maintains a private internal log no one else has ever been shown.', 'record-keeping', 0.3, ['mysterious']),

  // --- teaching-and-instruction --------------------------------------------------------------------------
  q('patiently-explains-things-multiple-times', 'Patiently explains something as many times as needed, without frustration.', 'teaching-and-instruction', 0.5, ['endearing']),
  q('demonstrates-tasks-before-explaining-them', 'Prefers to demonstrate a task physically before explaining it verbally.', 'teaching-and-instruction', 0.3, []),
  q('gives-unusually-encouraging-feedback', 'Gives unusually warm, encouraging feedback to those it trains.', 'teaching-and-instruction', 0.5, ['endearing']),

  // --- boundary-and-consent --------------------------------------------------------------------------
  q('always-asks-before-touching-organic-belongings', 'Always asks permission before handling an organic personal belongings.', 'boundary-and-consent', 0.5, ['endearing']),
  q('respects-a-closed-door-without-being-told', 'Respects a closed door as a signal for privacy, without needing to be told.', 'boundary-and-consent', 0.5, ['endearing']),

  // --- resource-conservation --------------------------------------------------------------------------
  q('reuses-spare-parts-whenever-possible', 'Reuses and repurposes spare parts whenever possible rather than discarding them.', 'resource-conservation', 0.5, ['frontier']),
  q('conserves-supplies-more-than-strictly-necessary', 'Conserves supplies more carefully than strictly necessary, out of old habit.', 'resource-conservation', 0.3, ['frontier']),

  // --- appearance-general (batch 2, droid, non-chassis) ------------------------------------
  q('unusually-clean-manipulator-fingertips', 'Keeps its manipulator fingertips unusually clean for close work.', 'grooming-droid', 0.3, ['tidy'], { roleTags: ['medical', 'technician'] }),
  q('carries-a-faint-residue-from-its-last-task', 'Carries a faint residue on its plating from whatever it last worked on.', 'grooming-droid', 0.3, ['worn']),

  // --- initiative-and-autonomy --------------------------------------------------------------------------
  q('takes-initiative-without-waiting-for-instructions', 'Takes initiative on obvious tasks without waiting to be told.', 'initiative-and-autonomy', 0.5, ['endearing', 'takes-initiative-without-waiting-for-instructions']),
  q('waits-for-explicit-instructions-before-acting', 'Waits for explicit instructions before acting, even on obvious tasks.', 'initiative-and-autonomy', 0.5, [], { conflictTags: ['takes-initiative-without-waiting-for-instructions'] }),
  q('asks-before-taking-any-initiative', 'Always asks before taking initiative, however small the decision.', 'initiative-and-autonomy', 0.3, []),

  // --- reaction-to-praise-droid --------------------------------------------------------------------------
  q('responds-to-praise-with-a-small-status-chime', 'Responds to praise with a small, distinct status chime.', 'reaction-to-praise-droid', 0.3, ['endearing']),
  q('deflects-praise-toward-its-organic-team', 'Deflects praise toward the organics it worked alongside.', 'reaction-to-praise-droid', 0.5, ['endearing']),

  // --- long-service-marks --------------------------------------------------------------------------
  q('carries-decades-of-minor-wear-with-visible-pride', 'Wears decades of minor wear like a badge of honest service.', 'long-service-marks', 0.5, ['worn', 'endearing'], { contextTags: ['frontier'] }),
  q('recently-activated-and-still-adjusting', 'Was only recently activated, and is visibly still adjusting to its role.', 'long-service-marks', 0.5, ['endearing']),

  // --- collaboration-style --------------------------------------------------------------------------
  q('happily-defers-technical-decisions-to-specialists', 'Happily defers technical decisions to whichever specialist knows best.', 'collaboration-style', 0.3, ['endearing']),
  q('coordinates-smoothly-with-unfamiliar-droids', 'Coordinates smoothly with unfamiliar droid units on shared tasks.', 'collaboration-style', 0.3, ['droids']),

  // --- quirk-of-scale --------------------------------------------------------------------------
  q('unusually-large-for-its-model-line', 'Is noticeably larger than the typical unit of its model line.', 'quirk-of-scale', 0.3, ['unusually-large-for-its-model-line']),
  q('unusually-small-for-its-model-line', 'Is noticeably smaller than the typical unit of its model line.', 'quirk-of-scale', 0.3, [], { conflictTags: ['unusually-large-for-its-model-line'] }),

  // --- reaction-to-shutdown-commands --------------------------------------------------------------------------
  q('complies-with-shutdown-instantly', 'Complies with a shutdown instruction instantly, no hesitation.', 'reaction-to-shutdown-commands', 0.3, []),
  q('requests-to-finish-its-current-task-before-shutdown', 'Politely requests to finish its current task before shutting down.', 'reaction-to-shutdown-commands', 0.3, ['endearing']),

  // --- reaction-to-being-reassigned --------------------------------------------------------------------------
  q('adapts-quickly-to-a-new-assignment', 'Adapts quickly and without complaint to a new assignment.', 'reaction-to-being-reassigned', 0.3, []),
  q('quietly-attached-to-its-current-assignment', 'Seems quietly, unexpectedly attached to its current assignment.', 'reaction-to-being-reassigned', 0.3, ['endearing']),
  q('keeps-a-memento-from-a-past-assignment', 'Keeps a small memento from a particularly memorable past assignment.', 'reaction-to-being-reassigned', 0.3, ['sentimental']),

  // --- final-additions --------------------------------------------------------------------------
  q('unremarkable-but-reliable-workhorse', 'Is entirely unremarkable in most ways, but reliably gets the job done.', 'oddity', 1, ['mundane']),
  q('small-scratch-shaped-like-a-familiar-symbol', 'Has a small scratch that, from the right angle, looks like a familiar symbol.', 'oddity', 0.3, ['odd']),
  q('proud-of-a-small-repair-it-performed-itself', 'Is quietly proud of one small repair it managed entirely on its own.', 'maintenance', 0.5, ['endearing'])
]);
