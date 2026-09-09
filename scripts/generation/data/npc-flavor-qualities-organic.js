/**
 * PHASE 8D-3B production — organic/living NPC flavor-quality catalog.
 *
 * HARD RULE (restated from `npc-concept.js`'s own header): a flavor
 * quality is a small, memorable, NARRATIVE-ONLY sensory/behavioral
 * detail ("smells faintly like soup", "keeps losing their stylus") --
 * it NEVER implies a mechanical modifier, condition, or Item. "Walks
 * with a limp" never becomes a speed penalty; "appears half asleep"
 * never becomes a Perception penalty. Exactly like every other
 * narrative field this generation ecosystem produces, a flavor quality
 * stays pure flavor unless a GM later, explicitly, resolves it through
 * an existing mechanical authority.
 *
 * STRUCTURAL SEPARATION FROM THE DROID CATALOG: this pool is for
 * LIVING/ORGANIC NPCs only. `npc/npc-flavor.js`'s
 * `selectNpcFlavorQualities()` looks up its source pool by `kind`
 * (`'living'` -> this file, `'droid'` -> `npc-flavor-qualities-droid.js`)
 * -- the boundary is enforced by that lookup itself, never by trusting
 * every entry here to correctly carry an `excludedTags: ['droid']`
 * marker. A handful of entries below still declare `requiresTags`/
 * `excludedTags` for finer-grained cases WITHIN the organic pool (e.g.
 * a quality that assumes hands/fingers is still not universal across
 * every playable Species) -- but the living/droid split itself is
 * structural, not tag-based.
 *
 * Entry shape: `{ id, text, category, weight, tags, roleTags,
 * contextTags, conflictTags, requiresTags, excludedTags }`. `id` is
 * IDENTITY (persisted on a generated NPC's `flavorNotes[].qualityId`);
 * `text` is presentation only, never itself the identity (matches this
 * whole generation ecosystem's existing "structured facts first"
 * discipline). `tags` are this quality's own thematic identity (used
 * for `conflictTags` cross-matching); `roleTags`/`contextTags` are
 * OPTIONAL soft-preference tags a caller can bias toward via an NPC's
 * rolled role or a Location's context, read the exact same way every
 * other Phase 8D-2/8D-3 pool's `tags` already are (`weightedPickWithPreference()`,
 * via `npc-flavor.js`'s `effectiveTags()` merge -- see that module's
 * header). `conflictTags` name tags that must NOT already be present
 * among an NPC's other selected qualities for this one to remain
 * eligible (e.g. an entry tagged `intense-eye-contact` and one carrying
 * `conflictTags: ['intense-eye-contact']` never co-occur on the same
 * NPC) -- lightweight tag-based exclusion, deliberately not a full
 * logical inference engine.
 *
 * Deliberately a MIX of mundane, funny, gross, subtle, professional,
 * endearing, annoying, and unsettling entries -- per the phase spec, if
 * every quality were bizarre none of them would feel distinctive.
 */

function q(id, text, category, weight, tags, extra = {}) {
  return { id: `organic.${id}`, text, category, weight, tags, roleTags: [], contextTags: [], conflictTags: [], requiresTags: [], excludedTags: [], ...extra };
}

export const ORGANIC_NPC_FLAVOR_QUALITIES = Object.freeze([
  // --- sensory ------------------------------------------------------
  q('smells-like-soup', 'Smells faintly like soup.', 'sensory', 1, ['odor', 'odd']),
  q('bad-breath', 'Has spectacularly bad breath.', 'sensory', 0.7, ['odor', 'unpleasant']),
  q('too-much-perfume', 'Wears far too much perfume or cologne.', 'sensory', 1, ['odor']),
  q('smells-like-motor-oil', 'Smells faintly of machine oil.', 'sensory', 1, ['odor'], { roleTags: ['mechanic'], contextTags: ['mining', 'industrial'] }),
  q('smells-like-ozone', 'Carries a faint smell of ozone and hot metal.', 'sensory', 0.7, ['odor'], { roleTags: ['technician'] }),
  q('very-loud-voice', 'Speaks far louder than the situation calls for.', 'sensory', 1, ['loud']),
  q('barely-audible-voice', 'Speaks so quietly others must lean in.', 'sensory', 1, ['quiet'], { conflictTags: ['loud'] }),
  q('booming-laugh', 'Has a booming, unmistakable laugh.', 'sensory', 1, ['loud']),
  q('unusual-eye-color', 'Has an unusually striking eye color.', 'sensory', 0.7, []),
  q('distinctive-scar', 'Carries a distinctive scar that draws the eye.', 'sensory', 1, ['appearance'], { roleTags: ['soldier', 'security'] }),
  q('constantly-sniffling', 'Constantly sniffling, as if perpetually fighting a cold.', 'sensory', 1, ['odd']),
  q('very-cold-hands', 'Has noticeably cold hands.', 'sensory', 0.7, ['very-cold-hands'], { requiresTags: ['organic-hands'] }),
  q('sweats-easily', 'Sweats easily, even in comfortable temperatures.', 'sensory', 0.7, []),
  q('unusually-tall', 'Strikingly tall for their species.', 'sensory', 0.7, ['unusually-tall'], { conflictTags: ['unusually-short'] }),
  q('unusually-short', 'Strikingly short for their species.', 'sensory', 0.7, ['unusually-short'], { conflictTags: ['unusually-tall'] }),

  // --- speech ---------------------------------------------------------
  q('whispers-everything', 'Whispers nearly everything, even mundane statements.', 'speech', 1, ['quiet']),
  q('says-names-constantly', "Uses people's names constantly in conversation.", 'speech', 1, ['social']),
  q('ends-sentences-like-questions', 'Ends declarative sentences like questions?', 'speech', 1, []),
  q('long-pauses', 'Leaves long, deliberate pauses before answering.', 'speech', 1, []),
  q('talks-fast-when-excited', 'Talks noticeably faster when excited.', 'speech', 1, []),
  q('formal-speech', 'Speaks with unusually formal, old-fashioned phrasing.', 'speech', 1, ['formal'], { roleTags: ['noble', 'diplomat'] }),
  q('drops-technical-jargon', 'Drops technical jargon into casual conversation.', 'speech', 1, [], { roleTags: ['technician', 'scientist'] }),
  q('corrects-pronunciation', "Frequently corrects other people's pronunciation.", 'speech', 0.7, ['annoying']),
  q('mild-stutter', 'Has a mild stutter that worsens under stress.', 'speech', 0.7, []),
  q('trails-off-mid-sentence', 'Often trails off mid-sentence, mind elsewhere.', 'speech', 1, []),
  q('repeats-last-word', 'Unconsciously repeats the last word of what someone just said.', 'speech', 0.7, ['odd']),
  q('speaks-in-lists', 'Organizes everything they say into numbered points.', 'speech', 0.7, [], { roleTags: ['bureaucrat', 'scientist'] }),

  // --- mannerism -------------------------------------------------------
  q('chews-gum-intensely', 'Intensely chews gum whenever someone else is speaking.', 'mannerism', 1, ['habit', 'social']),
  q('taps-fingers', 'Taps or drums their fingers when thinking.', 'mannerism', 1, ['nervous']),
  q('cracks-knuckles', 'Repeatedly cracks their knuckles.', 'mannerism', 1, [], { requiresTags: ['organic-hands'] }),
  q('bites-nails', 'Bites their nails when anxious.', 'mannerism', 0.7, ['nervous'], { requiresTags: ['organic-hands'] }),
  q('twirls-hair', 'Twirls a lock of hair when distracted.', 'mannerism', 0.7, [], { requiresTags: ['hair'] }),
  q('hums-while-working', 'Hums an old tune while working.', 'mannerism', 1, []),
  q('names-their-tools', 'Has affectionate names for their tools or equipment.', 'mannerism', 1, [], { roleTags: ['mechanic', 'technician'] }),
  q('counts-under-breath', 'Counts things under their breath without noticing.', 'mannerism', 0.7, ['odd']),
  q('clicks-pen-repeatedly', 'Clicks a pen or stylus repeatedly.', 'mannerism', 0.7, []),
  q('cleans-fingernails-with-tool', 'Cleans their fingernails with whatever tool is handy.', 'mannerism', 0.7, [], { requiresTags: ['organic-hands'] }),

  // --- body-language ----------------------------------------------------
  q('stands-too-close', "Stands closer than most people find comfortable.", 'body-language', 1, ['social']),
  q('never-sits-normally', 'Never sits in a chair normally -- backwards, cross-legged, on the armrest.', 'body-language', 1, []),
  q('folds-arms-constantly', 'Folds their arms almost constantly.', 'body-language', 1, []),
  q('intense-eye-contact', 'Maintains unnervingly intense eye contact.', 'body-language', 1, ['intense-eye-contact']),
  q('avoids-eye-contact', 'Rarely makes eye contact with anyone.', 'body-language', 1, [], { conflictTags: ['intense-eye-contact'] }),
  q('crosses-a-room-quietly', 'Moves through a room with unusual, deliberate quiet.', 'body-language', 0.7, []),
  q('fidgets-constantly', 'Fidgets constantly, unable to stay still.', 'body-language', 1, ['nervous']),
  q('perfect-posture', 'Maintains rigidly perfect posture at all times.', 'body-language', 1, ['perfect-posture'], { roleTags: ['soldier', 'security', 'noble'] }),
  q('slouches-badly', 'Slouches noticeably, regardless of the setting.', 'body-language', 1, [], { conflictTags: ['perfect-posture'] }),
  q('talks-with-hands', 'Talks constantly with their hands.', 'body-language', 1, [], { requiresTags: ['organic-hands'] }),

  // --- grooming ---------------------------------------------------------
  q('perfectly-polished-boots', 'Their boots are exceptionally, almost obsessively clean.', 'grooming', 1, ['tidy'], { roleTags: ['soldier', 'security'], contextTags: ['wealthy', 'advanced'] }),
  q('uneven-haircut', 'Has a slightly uneven haircut.', 'grooming', 1, ['uneven-haircut'], { requiresTags: ['hair'] }),
  q('constantly-fixes-collar', 'Constantly adjusts and fixes their collar.', 'grooming', 1, ['nervous']),
  q('immaculate-grooming', 'Immaculately groomed, not a hair out of place.', 'grooming', 1, ['tidy', 'immaculate-grooming'], { contextTags: ['wealthy', 'advanced'], conflictTags: ['uneven-haircut'] }),
  q('permanently-scruffy', 'Looks permanently scruffy no matter the occasion.', 'grooming', 1, [], { contextTags: ['frontier'], conflictTags: ['immaculate-grooming'] }),
  q('chipped-nail-polish', 'Wears nail polish that is always slightly chipped.', 'grooming', 0.7, [], { requiresTags: ['organic-hands'] }),
  q('elaborate-facial-hair', 'Maintains elaborate, carefully-shaped facial hair.', 'grooming', 0.7, [], { requiresTags: ['facial-hair'] }),

  // --- clothing -----------------------------------------------------------
  q('one-glove', 'Wears one glove for no apparent reason.', 'clothing', 0.7, ['odd']),
  q('ancient-jacket', 'Wears a jacket that has clearly seen decades of use.', 'clothing', 1, [], { contextTags: ['frontier'] }),
  q('absurdly-pristine-uniform', 'Wears an absurdly pristine, freshly-pressed uniform.', 'clothing', 1, [], { contextTags: ['wealthy', 'advanced'] }),
  q('mismatched-socks', 'Wears mismatched socks, visible or not.', 'clothing', 0.7, ['odd']),
  q('too-many-pockets', 'Wears a coat with far more pockets than seems necessary.', 'clothing', 1, []),
  q('always-overdressed', 'Always seems slightly overdressed for the occasion.', 'clothing', 1, [], { contextTags: ['wealthy'] }),
  q('patched-clothing', "Wears clothing that has been visibly patched and re-patched.", 'clothing', 1, [], { contextTags: ['frontier'] }),
  q('stain-on-sleeve', 'Has a small, stubborn stain on one sleeve.', 'clothing', 1, ['mundane']),
  q('dust-covered-clothing', 'Their clothing is perpetually dust-covered.', 'clothing', 1, [], { contextTags: ['mining', 'frontier'] }),
  q('hearing-protection-around-neck', 'Wears hearing protection around their neck out of habit.', 'clothing', 1, [], { contextTags: ['mining', 'industrial'] }),

  // --- food-drink -----------------------------------------------------------
  q('always-has-tea', 'Always seems to have a cup of tea or caf close at hand.', 'food-drink', 1, []),
  q('pockets-snacks', 'Pockets snacks from every meal "for later."', 'food-drink', 1, []),
  q('complains-about-local-caf', 'Complains about the local caf wherever they go.', 'food-drink', 0.7, ['annoying']),
  q('always-chewing-something', 'Always seems to be chewing on something.', 'food-drink', 0.7, []),
  q('picky-eater', 'Is an extremely picky eater and will say so at length.', 'food-drink', 0.7, ['annoying']),
  q('shares-food-generously', 'Generously shares food with anyone nearby.', 'food-drink', 1, ['endearing']),
  q('drinks-too-fast', 'Always finishes their drink faster than everyone else.', 'food-drink', 0.7, []),

  // --- possessions ------------------------------------------------------
  q('three-datapads', 'Carries three nearly identical datapads.', 'possessions', 1, ['professional']),
  q('lucky-coin', 'Carries an old coin they consider lucky.', 'possessions', 1, ['sentimental']),
  q('battered-hydrospanner', 'Carries a battered, well-used hydrospanner.', 'possessions', 1, [], { roleTags: ['mechanic'] }),
  q('keeps-losing-stylus', 'Keeps losing their stylus and borrowing someone else\'s.', 'possessions', 1, ['mundane']),
  q('folded-receipts', 'Keeps folded receipts stuffed in every pocket.', 'possessions', 1, ['mundane']),
  q('sentimental-trinket', 'Carries a small trinket they clearly won\'t explain the meaning of.', 'possessions', 1, ['sentimental']),
  q('always-carries-a-drink', 'Always seems to have a drink in hand.', 'possessions', 1, []),
  q('spare-parts-in-pockets', 'Has spare parts rattling around in every pocket.', 'possessions', 1, [], { roleTags: ['mechanic', 'technician'] }),
  q('carries-emergency-rations', 'Always carries emergency rations, just in case.', 'possessions', 1, [], { contextTags: ['frontier'] }),
  q('expensive-personal-device', 'Carries a conspicuously expensive personal device.', 'possessions', 1, [], { contextTags: ['wealthy', 'advanced'] }),

  // --- social -----------------------------------------------------------
  q('remembers-everyone', 'Remembers everyone they\'ve ever met, by name.', 'social', 1, ['endearing']),
  q('interrupts-constantly', 'Interrupts constantly, rarely on purpose.', 'social', 1, ['annoying']),
  q('apologizes-excessively', 'Apologizes excessively, even for minor things.', 'social', 1, []),
  q('name-drops-constantly', 'Name-drops important contacts constantly.', 'social', 1, [], { roleTags: ['business', 'criminal']}),
  q('overly-familiar', 'Treats new acquaintances like old friends immediately.', 'social', 1, ['endearing']),
  q('awkward-small-talk', 'Is visibly, painfully bad at small talk.', 'social', 1, []),
  q('generous-with-compliments', 'Is quick to offer sincere compliments.', 'social', 1, ['endearing']),
  q('gossips-constantly', 'Loves to gossip, whether or not it\'s their business.', 'social', 1, []),

  // --- professional ----------------------------------------------------
  q('labels-everything', 'Labels everything they own, meticulously.', 'professional', 1, ['tidy'], { roleTags: ['bureaucrat', 'scientist'] }),
  q('always-taking-notes', 'Is constantly taking notes, on nearly everything.', 'professional', 1, [], { roleTags: ['scientist', 'bureaucrat'] }),
  q('corrects-terminology', "Insists on correcting imprecise terminology.", 'professional', 0.7, ['annoying'], { roleTags: ['scientist', 'technician'] }),
  q('counts-inventory-obsessively', 'Counts and recounts inventory obsessively.', 'professional', 1, [], { roleTags: ['merchant'] }),
  q('keeps-a-ledger', 'Keeps a meticulous personal ledger of small debts owed.', 'professional', 1, [], { roleTags: ['merchant', 'business'] }),
  q('double-checks-everything', 'Double-checks everything, sometimes to a fault.', 'professional', 1, [], { roleTags: ['technician', 'pilot'] }),
  q('always-on-schedule', 'Is fixated on staying exactly on schedule.', 'professional', 1, [], { roleTags: ['bureaucrat'] }),

  // --- nervous-habit ------------------------------------------------------
  q('checks-nearest-exit', 'Constantly checks the nearest exit upon entering a room.', 'nervous-habit', 1, ['nervous'], { roleTags: ['soldier', 'security', 'criminal'] }),
  q('refuses-back-to-door', 'Refuses to sit with their back to a door.', 'nervous-habit', 1, ['nervous'], { roleTags: ['soldier', 'security', 'criminal'] }),
  q('scratches-neck-when-lying', 'Scratches the back of their neck when lying, even about small things.', 'nervous-habit', 1, ['tell']),
  q('nervous-laugh', 'Has a distinctive nervous laugh.', 'nervous-habit', 1, []),
  q('over-explains-simple-things', 'Over-explains even the simplest instructions.', 'nervous-habit', 0.7, ['annoying']),
  q('paces-when-thinking', 'Paces back and forth while thinking through a problem.', 'nervous-habit', 1, []),

  // --- personal -----------------------------------------------------------
  q('proud-of-hometown', 'Is proud of their hometown, at every opportunity.', 'personal', 1, []),
  q('obsessed-with-sport', 'Is obsessed with a particular sport or team.', 'personal', 1, []),
  q('talks-about-family', 'Talks about their family constantly, whether asked or not.', 'personal', 1, []),
  q('collects-something-odd', 'Collects something oddly specific.', 'personal', 1, ['strange']),
  q('sentimental-about-holidays', 'Gets sentimental around certain holidays or anniversaries.', 'personal', 0.7, []),
  q('quietly-homesick', 'Seems quietly homesick, though rarely says so directly.', 'personal', 0.7, ['subtle']),

  // --- environmental --------------------------------------------------
  q('always-cold', 'Always seems to be cold, regardless of the room temperature.', 'environmental', 1, ['always-cold']),
  q('hates-recycled-air', 'Constantly complains about recycled ship air.', 'environmental', 1, [], { contextTags: ['spacefaring'] }),
  q('sensitive-to-gravity-changes', 'Complains noticeably after a gravity change.', 'environmental', 0.7, [], { contextTags: ['spacefaring'] }),
  q('loves-natural-light', 'Seeks out natural light whenever possible.', 'environmental', 0.7, []),
  q('dislikes-crowds', 'Visibly uncomfortable in large crowds.', 'environmental', 1, []),

  // --- spacefaring ---------------------------------------------------------
  q('chronic-space-sickness', 'Suffers from chronic space sickness during transitions.', 'spacefaring', 1, [], { contextTags: ['spacefaring'] }),
  q('sleeps-in-flight-gear', 'Sleeps in their flight gear more often than not.', 'spacefaring', 0.7, [], { roleTags: ['pilot'], contextTags: ['spacefaring'] }),
  q('obsessed-with-hyperlane-trivia', 'Has an encyclopedic, unprompted knowledge of hyperlane trivia.', 'spacefaring', 0.7, [], { roleTags: ['pilot'], contextTags: ['spacefaring'] }),
  q('superstitious-about-launches', 'Has a small personal ritual before every launch.', 'spacefaring', 0.7, [], { roleTags: ['pilot'] }),
  q('names-their-ship-parts', 'Has affectionate nicknames for parts of their ship.', 'spacefaring', 0.7, [], { roleTags: ['pilot'] }),

  // --- technology ------------------------------------------------------
  q('distrusts-astromechs', 'Has an odd, mild distrust of astromech droids specifically.', 'technology', 0.7, []),
  q('overly-polite-to-droids', 'Is unusually, formally polite to every droid they meet.', 'technology', 1, ['endearing']),
  q('kicks-faulty-machinery', 'Kicks faulty machinery out of pure habit.', 'technology', 0.7, [], { roleTags: ['mechanic', 'technician'] }),
  q('distrusts-new-tech', 'Is openly distrustful of unfamiliar new technology.', 'technology', 0.7, [], { contextTags: ['frontier'] }),
  q('constantly-checks-messages', 'Constantly checks messages on a personal device.', 'technology', 1, [], { contextTags: ['wealthy', 'advanced'] }),
  q('talks-to-machinery', 'Talks to machinery as if it can understand.', 'technology', 0.7, ['odd']),

  // --- oddity -----------------------------------------------------------
  q('refuses-elevators', 'Refuses to use elevators or turbolifts when avoidable.', 'oddity', 0.5, ['strange']),
  q('names-every-weapon', 'Gives every weapon they own a name.', 'oddity', 0.7, ['strange']),
  q('watches-the-sky-often', 'Frequently glances at the sky, even indoors through a viewport.', 'oddity', 0.5, ['strange']),
  q('never-removes-hat', 'Almost never removes their hat or headgear.', 'oddity', 0.7, [], { requiresTags: ['headgear-compatible'] }),
  q('collects-foreign-currency', 'Collects old, out-of-circulation currency.', 'oddity', 0.5, ['strange']),
  q('reads-labels-aloud', 'Quietly reads labels and signs aloud without noticing.', 'oddity', 0.5, ['odd']),
  q('keeps-a-journal', 'Keeps a small personal journal they\'re cagey about.', 'oddity', 0.7, ['subtle']),
  q('unnervingly-calm', 'Remains unnervingly calm in situations that would rattle most people.', 'oddity', 0.7, ['unsettling']),
  q('laughs-at-wrong-moments', 'Occasionally laughs at moments no one else finds funny.', 'oddity', 0.5, ['unsettling']),
  q('mundane-uneventful', 'By most accounts, entirely unremarkable in person.', 'oddity', 1.5, ['mundane']),

  // ===================================================================
  // PHASE 8D-3B FINAL CONTENT HYDRATION PASS -- expanded toward the
  // documented production target (1,000-1,500). Deliberately organized
  // into many distinct micro-categories with real semantic variety
  // within each, per the phase spec's explicit warning against
  // low-quality padding or near-duplicate phrasing.
  // ===================================================================

  // --- sensory (batch 2) ----------------------------------------------
  q('smells-like-fresh-bread', 'Smells faintly of fresh-baked bread.', 'sensory', 0.7, ['odor']),
  q('smells-like-cleaning-solvent', 'Carries a faint smell of industrial cleaning solvent.', 'sensory', 0.7, ['odor'], { contextTags: ['industrial'] }),
  q('smells-like-livestock', 'Carries a faint smell of livestock or working animals.', 'sensory', 0.7, ['odor'], { contextTags: ['rural'] }),
  q('smells-like-incense', 'Smells faintly of incense.', 'sensory', 0.7, ['odor'], { contextTags: ['religion'] }),
  q('husky-voice', 'Has an unusually husky, low voice.', 'sensory', 1, []),
  q('unusually-high-voice', 'Has an unusually high-pitched voice for their frame.', 'sensory', 0.7, []),
  q('distinctive-freckles', 'Has a distinctive spray of freckles.', 'sensory', 0.7, []),
  q('mismatched-eyes', 'Has two slightly different-colored eyes.', 'sensory', 0.5, []),
  q('permanently-flushed-cheeks', 'Has permanently flushed, ruddy cheeks.', 'sensory', 0.7, []),
  q('very-warm-hands', 'Has noticeably warm hands.', 'sensory', 0.7, [], { requiresTags: ['organic-hands'], conflictTags: ['very-cold-hands'] }),
  q('crooked-smile', 'Has a distinctive, slightly crooked smile.', 'sensory', 0.7, []),
  q('gap-toothed-smile', 'Has a gap-toothed smile.', 'sensory', 0.5, []),
  q('deep-set-eyes', 'Has unusually deep-set, shadowed eyes.', 'sensory', 0.5, []),
  q('unusually-bright-smile', 'Has an unusually bright, disarming smile.', 'sensory', 1, ['endearing']),
  q('perpetual-five-oclock-shadow', 'Always seems to have a day-old stubble, however recently shaved.', 'sensory', 0.5, [], { requiresTags: ['facial-hair'] }),
  q('unusually-graceful-movement', 'Moves with unusual, almost deliberate grace.', 'sensory', 0.7, ['unusually-graceful-movement']),
  q('unusually-clumsy-movement', 'Is visibly, endearingly clumsy.', 'sensory', 0.7, [], { conflictTags: ['unusually-graceful-movement'] }),
  q('perpetually-sunburned', 'Always seems slightly sunburned.', 'sensory', 0.7, [], { contextTags: ['frontier'] }),
  q('very-loud-footsteps', 'Has surprisingly loud, heavy footsteps.', 'sensory', 0.7, ['very-loud-footsteps']),
  q('surprisingly-light-footsteps', 'Moves with surprisingly light, quiet footsteps.', 'sensory', 0.7, [], { conflictTags: ['very-loud-footsteps'] }),
  q('distinctive-cough', 'Has a distinctive, easily recognizable cough.', 'sensory', 0.5, []),
  q('unusually-pale-complexion', 'Has an unusually pale complexion.', 'sensory', 0.7, []),
  q('weathered-hands', 'Has visibly weathered, work-worn hands.', 'sensory', 0.7, [], { requiresTags: ['organic-hands'], contextTags: ['frontier', 'industrial'] }),
  q('very-fast-blinker', 'Blinks noticeably fast when concentrating.', 'sensory', 0.5, ['odd', 'very-fast-blinker']),
  q('rarely-blinks', 'Rarely blinks, which some find unsettling.', 'sensory', 0.7, ['unsettling'], { conflictTags: ['very-fast-blinker'] }),

  // --- speech (batch 2) ------------------------------------------------
  q('speaks-in-metaphors', 'Frequently speaks in elaborate metaphors.', 'speech', 0.7, []),
  q('avoids-direct-answers', 'Rarely gives a direct answer to a direct question.', 'speech', 0.7, []),
  q('over-apologizes-for-questions', 'Apologizes before asking even simple questions.', 'speech', 0.7, []),
  q('speaks-of-self-in-third-person', 'Occasionally refers to themselves in the third person.', 'speech', 0.5, ['odd']),
  q('uses-outdated-slang', 'Uses slang that went out of fashion years ago.', 'speech', 0.7, []),
  q('mixes-up-idioms', 'Regularly mixes up common idioms without noticing.', 'speech', 0.7, ['odd']),
  q('quotes-old-sayings', 'Peppers conversation with old sayings and proverbs.', 'speech', 0.7, []),
  q('speaks-very-precisely', 'Speaks with unusual, almost clinical precision.', 'speech', 0.7, [], { roleTags: ['scientist', 'medical'] }),
  q('trails-into-a-mumble', 'Often trails into an inaudible mumble at the end of sentences.', 'speech', 0.7, []),
  q('overuses-a-filler-word', 'Overuses a single filler word without noticing.', 'speech', 0.7, ['odd']),
  q('narrates-their-own-actions', 'Occasionally narrates their own actions out loud.', 'speech', 0.5, ['odd'], { excludedTags: [] }),
  q('speaks-with-a-slight-lisp', 'Speaks with a slight, barely noticeable lisp.', 'speech', 0.5, []),
  q('unusually-quick-talker', 'Talks noticeably faster than most people, all the time.', 'speech', 0.7, ['unusually-quick-talker']),
  q('unusually-slow-talker', 'Speaks noticeably slower than most people, all the time.', 'speech', 0.7, [], { conflictTags: ['unusually-quick-talker'] }),
  q('answers-questions-with-questions', 'Frequently answers questions with more questions.', 'speech', 0.7, []),
  q('uses-excessive-technical-terms', 'Uses far more technical terms than necessary.', 'speech', 0.7, [], { roleTags: ['scientist', 'technician'] }),
  q('speaks-with-a-regional-lilt', 'Speaks with a distinctive regional lilt.', 'speech', 0.7, [], { contextTags: ['frontier'] }),
  q('rarely-raises-their-voice', 'Almost never raises their voice, even when angry.', 'speech', 0.7, ['rarely-raises-their-voice']),
  q('easily-worked-up-verbally', 'Gets loud and animated quickly when discussing anything they care about.', 'speech', 0.7, [], { conflictTags: ['rarely-raises-their-voice'] }),
  q('narrates-plans-out-loud', 'Narrates plans out loud before acting on them.', 'speech', 0.7, []),
  q('speaks-only-when-spoken-to', 'Rarely speaks unless directly addressed.', 'speech', 0.7, ['speaks-only-when-spoken-to']),
  q('fills-every-silence', 'Cannot seem to tolerate silence, fills it constantly.', 'speech', 0.7, [], { conflictTags: ['speaks-only-when-spoken-to'] }),
  q('over-explains-directions', 'Gives far more detail in directions than needed.', 'speech', 0.7, ['annoying', 'over-explains-directions']),
  q('gives-frustratingly-vague-directions', 'Gives frustratingly vague directions.', 'speech', 0.7, ['annoying'], { conflictTags: ['over-explains-directions'] }),
  q('unusual-verbal-tic', 'Has a distinctive, unexplained verbal tic.', 'speech', 0.7, ['odd']),

  // --- mannerism (batch 2) ----------------------------------------------
  q('doodles-constantly', 'Doodles constantly on any available surface.', 'mannerism', 0.7, [], { requiresTags: ['organic-hands'] }),
  q('always-adjusting-equipment', 'Constantly adjusts and readjusts their equipment.', 'mannerism', 0.7, [], { roleTags: ['soldier', 'technician'] }),
  q('flips-a-coin-when-deciding', 'Flips a coin when genuinely undecided.', 'mannerism', 0.5, ['odd']),
  q('always-double-knots-laces', 'Always double-knots their laces or fastenings.', 'mannerism', 0.5, []),
  q('collects-small-trinkets', 'Collects a small trinket from every notable place they visit.', 'mannerism', 0.7, ['sentimental']),
  q('always-sits-facing-the-door', 'Always chooses the seat facing the door.', 'mannerism', 0.7, [], { roleTags: ['soldier', 'criminal', 'security'] }),
  q('twirls-a-small-object', 'Twirls a small object between their fingers when idle.', 'mannerism', 0.7, [], { requiresTags: ['organic-hands'] }),
  q('checks-the-time-obsessively', 'Checks the time far more often than necessary.', 'mannerism', 0.7, []),
  q('straightens-crooked-objects', 'Cannot resist straightening a crooked picture or object.', 'mannerism', 0.7, ['tidy', 'straightens-crooked-objects']),
  q('leaves-things-slightly-askew', 'Leaves things noticeably disordered without seeming to notice.', 'mannerism', 0.7, [], { conflictTags: ['straightens-crooked-objects'] }),
  q('hums-the-same-three-notes', 'Hums the same three notes when concentrating.', 'mannerism', 0.5, ['odd']),
  q('always-carries-a-small-tool', 'Always has a small tool or gadget within reach.', 'mannerism', 0.7, [], { roleTags: ['mechanic', 'technician'] }),
  q('cracks-their-neck', 'Cracks their neck when stressed.', 'mannerism', 0.5, []),
  q('taps-a-rhythm-on-surfaces', 'Taps out an idle rhythm on nearby surfaces.', 'mannerism', 0.7, []),
  q('smooths-clothing-repeatedly', 'Repeatedly smooths their clothing when nervous.', 'mannerism', 0.7, ['nervous']),
  q('adjusts-glasses-or-goggles', 'Frequently adjusts glasses or goggles, whether needed or not.', 'mannerism', 0.7, [], { requiresTags: ['organic-hands'] }),
  q('checks-pockets-repeatedly', 'Checks their pockets repeatedly for no clear reason.', 'mannerism', 0.7, ['nervous']),
  q('always-has-something-to-fidget-with', 'Always has some small object to fidget with.', 'mannerism', 0.7, ['nervous'], { requiresTags: ['organic-hands'] }),
  q('rubs-temples-when-thinking', 'Rubs their temples when working through a difficult problem.', 'mannerism', 0.7, []),
  q('paces-in-a-fixed-pattern', 'Paces in the exact same pattern every time.', 'mannerism', 0.5, ['odd']),

  // --- body-language (batch 2) -------------------------------------------
  q('leans-in-when-interested', 'Leans in noticeably when genuinely interested.', 'body-language', 0.7, []),
  q('leans-away-when-uncomfortable', 'Leans subtly away when uncomfortable.', 'body-language', 0.7, []),
  q('crosses-arms-when-skeptical', 'Crosses their arms visibly when skeptical.', 'body-language', 0.7, []),
  q('hands-always-in-pockets', 'Keeps their hands in their pockets almost constantly.', 'body-language', 0.7, [], { requiresTags: ['organic-hands'] }),
  q('rocks-back-on-heels', 'Rocks back on their heels when relaxed.', 'body-language', 0.5, []),
  q('stands-with-weight-on-one-leg', 'Habitually stands with their weight shifted onto one leg.', 'body-language', 0.5, []),
  q('unusually-still-when-listening', 'Becomes unusually, almost eerily still when listening closely.', 'body-language', 0.7, ['unsettling']),
  q('gestures-broadly', 'Gestures broadly and expansively when talking.', 'body-language', 0.7, [], { requiresTags: ['organic-hands'] }),
  q('keeps-hands-visible', 'Keeps their hands visible at all times, out of old habit.', 'body-language', 0.7, [], { roleTags: ['soldier', 'security', 'criminal'] }),
  q('shrinks-in-crowds', 'Visibly tries to take up less space in crowded rooms.', 'body-language', 0.7, ['shrinks-in-crowds']),
  q('takes-up-space-confidently', 'Takes up space confidently, regardless of the room.', 'body-language', 0.7, [], { conflictTags: ['shrinks-in-crowds'] }),
  q('mirrors-conversation-partners', 'Unconsciously mirrors the posture of whoever they are talking to.', 'body-language', 0.5, []),
  q('walks-with-a-purposeful-stride', 'Walks with an unusually purposeful, quick stride.', 'body-language', 0.7, ['walks-with-a-purposeful-stride']),
  q('walks-with-an-unhurried-gait', 'Walks with a slow, unhurried gait regardless of urgency.', 'body-language', 0.7, [], { conflictTags: ['walks-with-a-purposeful-stride'] }),
  q('leans-against-walls', 'Prefers to lean against a wall rather than stand freely.', 'body-language', 0.5, []),

  // --- grooming (batch 2) -------------------------------------------------
  q('unusually-neat-eyebrows', 'Has unusually well-groomed eyebrows.', 'grooming', 0.5, []),
  q('perpetually-wind-blown-hair', 'Their hair always looks slightly wind-blown.', 'grooming', 0.5, [], { requiresTags: ['hair'] }),
  q('meticulously-trimmed-nails', 'Keeps meticulously trimmed nails.', 'grooming', 0.5, ['tidy', 'meticulously-trimmed-nails'], { requiresTags: ['organic-hands'] }),
  q('bitten-nails', 'Has visibly bitten-down nails.', 'grooming', 0.5, ['nervous'], { requiresTags: ['organic-hands'], conflictTags: ['meticulously-trimmed-nails'] }),
  q('unusually-symmetrical-hairstyle', 'Wears their hair in a precisely symmetrical style.', 'grooming', 0.5, ['tidy'], { requiresTags: ['hair'] }),
  q('carefully-oiled-facial-hair', 'Keeps their facial hair carefully oiled and shaped.', 'grooming', 0.5, [], { requiresTags: ['facial-hair'] }),
  q('shaves-unevenly', 'Regularly shaves slightly unevenly.', 'grooming', 0.5, [], { requiresTags: ['facial-hair'] }),
  q('always-smells-of-soap', 'Always smells faintly of plain, unscented soap.', 'grooming', 0.5, ['odor', 'tidy']),
  q('wears-a-signature-fragrance', 'Wears a distinctive, easily recognizable fragrance.', 'grooming', 0.7, ['odor']),

  // --- clothing (batch 2) --------------------------------------------------
  q('always-wears-a-scarf', 'Almost always wears a scarf, regardless of climate.', 'clothing', 0.7, []),
  q('rolled-up-sleeves', 'Keeps their sleeves rolled up regardless of the weather.', 'clothing', 0.7, [], { contextTags: ['industrial', 'mining'] }),
  q('single-piece-of-jewelry', 'Wears a single, clearly sentimental piece of jewelry.', 'clothing', 0.7, ['sentimental']),
  q('wears-borrowed-clothing', 'Their clothing looks noticeably borrowed or hand-me-down.', 'clothing', 0.7, [], { contextTags: ['frontier'] }),
  q('color-coordinated-outfit', 'Their outfit is always carefully color-coordinated.', 'clothing', 0.7, ['tidy'], { contextTags: ['wealthy'] }),
  q('wears-the-same-outfit-often', 'Seems to wear the same outfit unusually often.', 'clothing', 0.7, []),
  q('a-pin-or-badge-worn-proudly', 'Wears a small pin or badge with visible pride.', 'clothing', 0.7, [], { roleTags: ['soldier', 'noble'] }),
  q('wears-protective-gear-indoors', 'Keeps protective gear on even when it is not strictly needed.', 'clothing', 0.7, [], { contextTags: ['industrial', 'mining'] }),
  q('unusually-formal-for-the-setting', 'Dresses noticeably more formally than the setting calls for.', 'clothing', 0.7, ['unusually-formal-for-the-setting'], { contextTags: ['wealthy'] }),
  q('unusually-casual-for-the-setting', 'Dresses noticeably more casually than the setting calls for.', 'clothing', 0.7, [], { conflictTags: ['unusually-formal-for-the-setting'] }),
  q('carries-a-spare-layer', 'Always carries a spare layer of clothing, just in case.', 'clothing', 0.5, [], { contextTags: ['frontier'] }),
  q('mended-clothing-visible', 'Wears clothing with visible, careful mending.', 'clothing', 0.7, [], { contextTags: ['frontier'] }),

  // --- food-drink (batch 2) --------------------------------------------------
  q('brings-food-to-share', 'Regularly brings food to share, unprompted.', 'food-drink', 0.7, ['endearing']),
  q('always-hungry', 'Always seems to be at least a little hungry.', 'food-drink', 0.7, []),
  q('never-finishes-a-meal', 'Rarely finishes an entire meal.', 'food-drink', 0.5, ['never-finishes-a-meal']),
  q('finishes-every-meal-completely', 'Always finishes every meal completely, out of habit.', 'food-drink', 0.5, [], { conflictTags: ['never-finishes-a-meal'] }),
  q('strong-opinions-about-caf', 'Has surprisingly strong opinions about how caf should be prepared.', 'food-drink', 0.7, []),
  q('eats-very-quickly', 'Eats noticeably quickly, out of old habit.', 'food-drink', 0.5, ['eats-very-quickly']),
  q('eats-very-slowly', 'Eats noticeably slowly, savoring every bite.', 'food-drink', 0.5, [], { conflictTags: ['eats-very-quickly'] }),
  q('carries-a-favorite-snack', 'Always carries a favorite snack, just in case.', 'food-drink', 0.5, []),
  q('suspicious-of-unfamiliar-food', 'Is visibly wary of unfamiliar food.', 'food-drink', 0.5, ['suspicious-of-unfamiliar-food'], { contextTags: ['frontier'] }),
  q('adventurous-eater', 'Will try any food at least once, no matter how strange.', 'food-drink', 0.5, [], { conflictTags: ['suspicious-of-unfamiliar-food'] }),

  // --- possessions (batch 2) -----------------------------------------------
  q('carries-a-family-photo', 'Carries an old, worn photo of family.', 'possessions', 1, ['sentimental']),
  q('carries-a-worn-letter', 'Carries a letter they have clearly read many times.', 'possessions', 0.7, ['sentimental']),
  q('always-has-a-notebook', 'Always has a small notebook on hand.', 'possessions', 0.7, []),
  q('carries-too-many-keys', 'Carries a keyring with far more keys than seems necessary.', 'possessions', 0.5, ['odd']),
  q('collects-mission-patches', 'Keeps a small collection of old mission or unit patches.', 'possessions', 0.7, ['sentimental'], { roleTags: ['soldier'] }),
  q('carries-a-multitool', 'Never seems to be without a well-worn multitool.', 'possessions', 0.7, [], { roleTags: ['mechanic', 'technician'] }),
  q('keeps-old-boarding-passes', 'Keeps a stack of old travel documents for no clear reason.', 'possessions', 0.5, ['sentimental']),
  q('carries-a-spare-battery-pack', 'Always has a spare power cell or battery pack.', 'possessions', 0.5, [], { contextTags: ['frontier'] }),
  q('carries-a-childhood-toy', 'Still carries a small toy from their childhood.', 'possessions', 0.7, ['sentimental']),
  q('collects-old-currency', 'Collects old, out-of-circulation coins or credits.', 'possessions', 0.5, ['strange']),

  // --- social (batch 2) ------------------------------------------------------
  q('remembers-small-details', 'Remembers small, easily-forgotten details about people.', 'social', 1, ['endearing']),
  q('bad-at-reading-the-room', 'Is visibly bad at reading a room social mood.', 'social', 0.7, ['bad-at-reading-the-room']),
  q('excellent-at-reading-the-room', 'Has an unusual knack for reading a room mood instantly.', 'social', 0.7, [], { conflictTags: ['bad-at-reading-the-room'] }),
  q('overly-formal-with-strangers', 'Is unusually formal with people they have just met.', 'social', 0.7, ['overly-formal-with-strangers']),
  q('instantly-friendly-with-strangers', 'Is instantly warm and friendly with total strangers.', 'social', 0.7, ['endearing'], { conflictTags: ['overly-formal-with-strangers'] }),
  q('quick-to-take-offense', 'Takes offense more quickly than most people would.', 'social', 0.7, ['quick-to-take-offense']),
  q('impossible-to-offend', 'Seems nearly impossible to offend or rattle.', 'social', 0.7, [], { conflictTags: ['quick-to-take-offense'] }),
  q('avoids-conflict-actively', 'Actively avoids conflict, even minor disagreements.', 'social', 0.7, ['avoids-conflict-actively']),
  q('enjoys-a-good-argument', 'Genuinely seems to enjoy a spirited argument.', 'social', 0.7, [], { conflictTags: ['avoids-conflict-actively'] }),
  q('quick-to-laugh', 'Laughs easily and often.', 'social', 1, ['endearing', 'quick-to-laugh']),
  q('rarely-laughs', 'Rarely laughs, even at genuinely funny things.', 'social', 0.7, [], { conflictTags: ['quick-to-laugh'] }),
  q('excellent-listener', 'Is an unusually good, attentive listener.', 'social', 1, ['endearing', 'excellent-listener']),
  q('poor-listener', 'Visibly struggles to focus while others are talking.', 'social', 0.5, ['annoying'], { conflictTags: ['excellent-listener'] }),

  // --- professional (batch 2) -----------------------------------------------
  q('always-early-to-shift', 'Is always noticeably early to work.', 'professional', 0.7, ['always-early-to-shift']),
  q('always-cutting-it-close', 'Always arrives at the last possible moment.', 'professional', 0.7, [], { conflictTags: ['always-early-to-shift'] }),
  q('meticulous-with-paperwork', 'Is meticulous, almost obsessive, about paperwork.', 'professional', 0.7, ['tidy', 'meticulous-with-paperwork'], { roleTags: ['bureaucrat'] }),
  q('avoids-paperwork', 'Avoids paperwork whenever possible.', 'professional', 0.7, [], { conflictTags: ['meticulous-with-paperwork'] }),
  q('proud-of-their-tools', 'Takes visible pride in the quality of their tools.', 'professional', 0.7, [], { roleTags: ['mechanic', 'technician'] }),
  q('trains-newcomers-patiently', 'Is unusually patient training newcomers.', 'professional', 0.7, ['endearing', 'trains-newcomers-patiently']),
  q('impatient-with-newcomers', 'Is visibly impatient with newcomers who ask questions.', 'professional', 0.5, ['annoying'], { conflictTags: ['trains-newcomers-patiently'] }),
  q('keeps-a-tidy-workspace', 'Keeps an unusually tidy workspace.', 'professional', 0.7, ['tidy', 'keeps-a-tidy-workspace']),
  q('keeps-a-chaotic-workspace', 'Works amid organized chaos only they understand.', 'professional', 0.7, [], { conflictTags: ['keeps-a-tidy-workspace'] }),
  q('takes-credit-quietly-well', 'Deflects credit for their own successes.', 'professional', 0.7, []),

  // --- nervous-habit (batch 2) ------------------------------------------------
  q('double-checks-locks', 'Always double-checks that doors are properly locked.', 'nervous-habit', 0.7, ['nervous'], { roleTags: ['criminal', 'security'] }),
  q('startles-easily', 'Startles more easily than most people.', 'nervous-habit', 0.7, ['nervous', 'startles-easily']),
  q('rarely-startles', 'Is remarkably difficult to startle.', 'nervous-habit', 0.7, [], { conflictTags: ['startles-easily'] }),
  q('bites-lower-lip', 'Bites their lower lip when concentrating.', 'nervous-habit', 0.5, ['nervous']),
  q('clears-throat-before-speaking', 'Clears their throat before nearly every statement.', 'nervous-habit', 0.5, ['nervous']),
  q('avoids-answering-immediately', 'Takes a noticeable pause before answering any question.', 'nervous-habit', 0.7, ['nervous']),
  q('fidgets-with-clothing', 'Fidgets with a loose thread or hem when anxious.', 'nervous-habit', 0.7, ['nervous']),

  // --- personal (batch 2) ------------------------------------------------------
  q('sentimental-about-old-songs', 'Gets visibly sentimental hearing certain old songs.', 'personal', 0.7, []),
  q('proud-parent-or-guardian', 'Talks proudly about a child or dependent at every opportunity.', 'personal', 0.7, []),
  q('estranged-from-family-hints', 'Occasionally lets slip hints of a strained family relationship.', 'personal', 0.5, ['subtle']),
  q('avid-reader', 'Is an avid, enthusiastic reader.', 'personal', 0.7, []),
  q('terrible-singer-sings-anyway', 'Is a genuinely terrible singer who sings anyway.', 'personal', 0.7, ['endearing']),
  q('secretly-talented-artist', 'Is quietly, unexpectedly talented at drawing or painting.', 'personal', 0.5, []),
  q('collects-plants', 'Keeps a small, carefully tended collection of plants.', 'personal', 0.7, []),
  q('devoted-to-a-pet', 'Talks fondly and often about a pet or companion animal.', 'personal', 0.7, ['endearing']),
  q('nostalgic-about-childhood', 'Frequently brings conversation back to childhood memories.', 'personal', 0.5, ['nostalgic-about-childhood']),
  q('avoids-discussing-the-past', 'Deflects any question about their personal history.', 'personal', 0.5, ['mysterious'], { conflictTags: ['nostalgic-about-childhood'] }),

  // --- environmental (batch 2) ---------------------------------------------
  q('always-too-warm', 'Always seems too warm, regardless of the room temperature.', 'environmental', 0.7, [], { conflictTags: ['always-cold'] }),
  q('prefers-dim-lighting', 'Seems to prefer dim lighting whenever given the choice.', 'environmental', 0.5, ['prefers-dim-lighting']),
  q('prefers-bright-lighting', 'Seems to prefer bright lighting whenever given the choice.', 'environmental', 0.5, [], { conflictTags: ['prefers-dim-lighting'] }),
  q('uncomfortable-in-silence', 'Is visibly uncomfortable in prolonged silence.', 'environmental', 0.5, ['uncomfortable-in-silence']),
  q('thrives-in-quiet-spaces', 'Visibly relaxes in quiet spaces.', 'environmental', 0.5, [], { conflictTags: ['uncomfortable-in-silence'] }),
  q('dislikes-enclosed-spaces', 'Is visibly uncomfortable in cramped or enclosed spaces.', 'environmental', 0.7, ['dislikes-enclosed-spaces']),
  q('dislikes-open-spaces', 'Seems more comfortable in enclosed spaces than open ones.', 'environmental', 0.5, [], { conflictTags: ['dislikes-enclosed-spaces'] }),

  // --- spacefaring (batch 2) ------------------------------------------------
  q('keeps-a-flight-log', 'Keeps a meticulous personal flight log.', 'spacefaring', 0.5, [], { roleTags: ['pilot'], contextTags: ['spacefaring'] }),
  q('names-every-ship-they-fly', 'Gives every ship they fly a personal name.', 'spacefaring', 0.5, [], { roleTags: ['pilot'], contextTags: ['spacefaring'] }),
  q('checks-hull-integrity-obsessively', 'Checks hull integrity readings more often than strictly necessary.', 'spacefaring', 0.5, [], { roleTags: ['pilot', 'mechanic'], contextTags: ['spacefaring'] }),
  q('uneasy-during-hyperspace-jumps', 'Grows visibly uneasy just before a hyperspace jump.', 'spacefaring', 0.5, [], { contextTags: ['spacefaring'] }),
  q('calm-during-turbulence', 'Stays remarkably calm during rough flight or turbulence.', 'spacefaring', 0.5, [], { roleTags: ['pilot'], contextTags: ['spacefaring'] }),
  q('collects-star-charts', 'Collects old or unusual star charts.', 'spacefaring', 0.5, ['strange'], { contextTags: ['spacefaring'] }),
  q('prefers-window-seats', 'Always prefers a window or viewport seat.', 'spacefaring', 0.5, [], { contextTags: ['spacefaring'] }),

  // --- technology (batch 2) ------------------------------------------------
  q('names-personal-devices', 'Gives personal devices affectionate names.', 'technology', 0.7, ['odd']),
  q('distrusts-automated-systems', 'Is visibly distrustful of fully automated systems.', 'technology', 0.7, [], { contextTags: ['frontier'] }),
  q('fascinated-by-new-gadgets', 'Is visibly fascinated by any new gadget.', 'technology', 0.7, [], { contextTags: ['advanced'] }),
  q('struggles-with-basic-tech', 'Struggles noticeably with even basic technology.', 'technology', 0.7, []),
  q('effortlessly-fixes-anything', 'Seems to effortlessly fix nearly any piece of broken equipment.', 'technology', 0.7, [], { roleTags: ['mechanic', 'technician'] }),
  q('keeps-outdated-equipment', 'Insists on keeping outdated equipment long past its useful life.', 'technology', 0.7, [], { contextTags: ['frontier'] }),
  q('always-has-the-newest-gear', 'Always seems to have the newest available gear.', 'technology', 0.7, [], { contextTags: ['wealthy', 'advanced'] }),
  q('reads-instruction-manuals-thoroughly', 'Reads every instruction manual cover to cover before use.', 'technology', 0.5, ['tidy', 'reads-instruction-manuals-thoroughly']),
  q('never-reads-instructions', 'Never reads instructions, figures it out by trial and error.', 'technology', 0.5, [], { conflictTags: ['reads-instruction-manuals-thoroughly'] }),

  // --- oddity (batch 2) ------------------------------------------------------
  q('never-uses-turbolifts', 'Prefers stairs to turbolifts whenever possible.', 'oddity', 0.5, []),
  q('collects-unusual-rocks', 'Collects unusual rocks or minerals from places they visit.', 'oddity', 0.5, ['strange']),
  q('superstitious-about-numbers', 'Has a private superstition about a particular number.', 'oddity', 0.5, ['strange']),
  q('talks-to-plants', 'Talks quietly to plants while tending them.', 'oddity', 0.5, ['odd']),
  q('keeps-a-lucky-routine', 'Follows the exact same routine before anything important.', 'oddity', 0.5, ['strange']),
  q('unusually-precise-about-time', 'Is unusually, almost obsessively precise about exact times.', 'oddity', 0.5, []),
  q('collects-buttons-or-pins', 'Collects buttons, pins, or small badges.', 'oddity', 0.5, ['strange']),
  q('avoids-stepping-on-cracks', 'Avoids stepping on visible cracks or seams in flooring.', 'oddity', 0.3, ['strange']),
  q('unnervingly-good-memory', 'Has an unnervingly precise memory for small details.', 'oddity', 0.5, ['unsettling', 'unnervingly-good-memory']),
  q('forgets-names-constantly', 'Forgets names almost immediately after hearing them.', 'oddity', 0.7, [], { conflictTags: ['unnervingly-good-memory'] }),

  // --- work-habit -------------------------------------------------------------
  q('finishes-tasks-early', 'Consistently finishes assigned tasks ahead of schedule.', 'work-habit', 0.7, []),
  q('works-best-under-deadline', 'Works noticeably better under a tight deadline.', 'work-habit', 0.7, []),
  q('takes-frequent-short-breaks', 'Takes frequent, short breaks throughout the day.', 'work-habit', 0.7, ['takes-frequent-short-breaks']),
  q('rarely-takes-breaks', 'Rarely stops for breaks, has to be reminded.', 'work-habit', 0.7, [], { conflictTags: ['takes-frequent-short-breaks'] }),
  q('makes-lists-for-everything', 'Makes a written list for nearly every task.', 'work-habit', 0.7, ['tidy', 'makes-lists-for-everything']),
  q('keeps-everything-in-their-head', 'Keeps everything in their head, rarely writes anything down.', 'work-habit', 0.7, [], { conflictTags: ['makes-lists-for-everything'] }),
  q('double-checks-their-own-work', 'Double-checks their own work compulsively.', 'work-habit', 0.7, []),
  q('delegates-readily', 'Delegates tasks readily and without much hesitation.', 'work-habit', 0.7, ['delegates-readily']),
  q('struggles-to-delegate', 'Struggles to hand off tasks to anyone else.', 'work-habit', 0.7, [], { conflictTags: ['delegates-readily'] }),
  q('prefers-working-alone', 'Clearly prefers working alone over collaborating.', 'work-habit', 0.7, ['prefers-working-alone']),
  q('thrives-in-team-settings', 'Visibly thrives when working as part of a team.', 'work-habit', 0.7, [], { conflictTags: ['prefers-working-alone'] }),
  q('cleans-up-immediately-after-finishing', 'Cleans up their workspace the moment a task is finished.', 'work-habit', 0.5, ['tidy', 'cleans-up-immediately-after-finishing']),
  q('leaves-a-trail-of-half-finished-tasks', 'Tends to leave a trail of half-finished tasks behind.', 'work-habit', 0.5, [], { conflictTags: ['cleans-up-immediately-after-finishing'] }),
  q('takes-detailed-meeting-notes', 'Takes unusually detailed notes during any meeting.', 'work-habit', 0.5, [], { roleTags: ['bureaucrat'] }),
  q('arrives-with-a-plan-already-made', 'Arrives at any discussion with a plan already prepared.', 'work-habit', 0.5, []),

  // --- financial ---------------------------------------------------------------
  q('haggles-over-everything', 'Haggles over the price of nearly everything, out of habit.', 'financial', 0.7, ['haggles-over-everything'], { roleTags: ['merchant']}),
  q('never-haggles', 'Pays the asking price without ever haggling.', 'financial', 0.5, [], { conflictTags: ['haggles-over-everything'] }),
  q('counts-change-carefully', 'Counts their change carefully every single time.', 'financial', 0.5, []),
  q('generous-tipper', 'Tips generously, more than most can afford.', 'financial', 0.5, ['endearing']),
  q('notoriously-frugal', 'Is notoriously frugal, even with small purchases.', 'financial', 0.7, ['notoriously-frugal']),
  q('surprisingly-generous', 'Is surprisingly generous with money when it matters.', 'financial', 0.7, ['endearing'], { conflictTags: ['notoriously-frugal'] }),
  q('keeps-a-hidden-emergency-fund', 'Keeps a small, carefully hidden emergency fund.', 'financial', 0.5, []),
  q('spends-impulsively', 'Spends impulsively on things that catch their eye.', 'financial', 0.7, ['spends-impulsively']),
  q('tracks-every-expense', 'Tracks every single expense in meticulous detail.', 'financial', 0.7, ['tidy'], { conflictTags: ['spends-impulsively'] }),
  q('always-splitting-the-bill-exactly', 'Insists on splitting any shared bill down to the exact credit.', 'financial', 0.5, []),

  // --- health --------------------------------------------------------------------
  q('takes-medication-on-a-strict-schedule', 'Takes a regular medication on a strict, visible schedule.', 'health', 0.7, []),
  q('ignores-minor-injuries', 'Tends to ignore minor injuries until they become a problem.', 'health', 0.7, ['ignores-minor-injuries']),
  q('overly-cautious-about-health', 'Is unusually cautious about minor health risks.', 'health', 0.7, [], { conflictTags: ['ignores-minor-injuries'] }),
  q('surprisingly-hardy', 'Seems remarkably resistant to minor illness.', 'health', 0.5, ['surprisingly-hardy']),
  q('gets-sick-easily', 'Seems to catch every minor illness going around.', 'health', 0.5, [], { conflictTags: ['surprisingly-hardy'] }),
  q('practices-a-daily-exercise-routine', 'Follows a strict, visible daily exercise routine.', 'health', 0.7, ['practices-a-daily-exercise-routine']),
  q('avoids-physical-exertion', 'Avoids physical exertion whenever possible.', 'health', 0.5, [], { conflictTags: ['practices-a-daily-exercise-routine'] }),
  q('naps-whenever-possible', 'Takes short naps whenever the opportunity allows.', 'health', 0.5, []),
  q('runs-on-very-little-sleep', 'Seems to function on remarkably little sleep.', 'health', 0.7, ['runs-on-very-little-sleep']),
  q('needs-a-lot-of-sleep', 'Clearly needs, and prioritizes, a lot of sleep.', 'health', 0.5, [], { conflictTags: ['runs-on-very-little-sleep'] }),

  // --- cultural ------------------------------------------------------------------
  q('observes-a-quiet-daily-ritual', 'Observes a small, quiet personal ritual every day.', 'cultural', 0.7, ['religion']),
  q('celebrates-obscure-holidays', 'Celebrates a holiday from home that no one nearby recognizes.', 'cultural', 0.7, ['community-tribe']),
  q('speaks-a-second-language-at-home', 'Slips into a second language when tired or emotional.', 'cultural', 0.7, ['cultural']),
  q('wears-cultural-jewelry-openly', 'Wears jewelry tied to their culture openly and without comment.', 'cultural', 0.5, ['community-tribe']),
  q('follows-a-dietary-tradition', 'Follows a dietary tradition tied to their upbringing.', 'cultural', 0.5, ['cultural']),
  q('marks-anniversaries-quietly', 'Marks certain private anniversaries quietly, without explaining why.', 'cultural', 0.5, ['subtle']),
  q('greets-people-in-an-old-fashioned-way', 'Greets people with an old-fashioned gesture from their homeworld.', 'cultural', 0.5, ['cultural']),
  q('proud-of-a-regional-dialect', 'Is visibly proud of their regional accent or dialect.', 'cultural', 0.5, ['frontier']),

  // --- hobby -------------------------------------------------------------------------
  q('amateur-poet', 'Writes poetry in private, rarely shares it.', 'hobby', 0.5, []),
  q('avid-collector-of-something-specific', 'Is an avid, focused collector of one specific thing.', 'hobby', 0.7, ['strange']),
  q('plays-a-musical-instrument-badly', 'Plays a musical instrument, with more enthusiasm than skill.', 'hobby', 0.7, ['endearing']),
  q('plays-a-musical-instrument-well', 'Plays a musical instrument with real, quiet skill.', 'hobby', 0.5, []),
  q('amateur-astronomer', 'Enjoys stargazing whenever the opportunity presents itself.', 'hobby', 0.5, []),
  q('enthusiastic-amateur-cook', 'Is an enthusiastic, if uneven, amateur cook.', 'hobby', 0.7, ['endearing']),
  q('builds-small-models', 'Builds small models or miniatures in their spare time.', 'hobby', 0.5, []),
  q('avid-gambler-low-stakes', 'Enjoys low-stakes games of chance whenever available.', 'hobby', 0.7, []),
  q('keeps-a-personal-garden', 'Tends a small personal garden or plot.', 'hobby', 0.7, []),
  q('enjoys-repairing-old-things', 'Genuinely enjoys repairing old, broken things.', 'hobby', 0.7, [], { roleTags: ['mechanic'] }),

  // --- family ------------------------------------------------------------------------
  q('sends-money-home-regularly', 'Sends part of their earnings home on a regular schedule.', 'family', 0.7, []),
  q('raising-a-younger-sibling', 'Is quietly helping raise a much younger sibling.', 'family', 0.7, []),
  q('caring-for-an-aging-relative', 'Is caring for an aging relative alongside their other work.', 'family', 0.7, []),
  q('estranged-but-hopeful', 'Rarely mentions a strained family relationship, but clearly hopes to mend it.', 'family', 0.5, ['subtle']),
  q('proud-of-a-family-trade', 'Is visibly proud of a trade passed down through their family.', 'family', 0.7, []),
  q('first-in-family-to-do-this-work', 'Is the first in their family to do this kind of work.', 'family', 0.5, []),
  q('keeps-in-touch-with-old-friends', 'Makes a real effort to keep in touch with old friends.', 'family', 0.5, ['endearing']),

  // --- recreational -----------------------------------------------------------------
  q('enthusiastic-sports-fan', 'Is an enthusiastic, occasionally loud fan of a particular sport.', 'recreational', 0.7, []),
  q('enjoys-solitary-walks', 'Takes long, solitary walks whenever they can.', 'recreational', 0.7, []),
  q('avid-card-player', 'Enjoys card games and rarely turns down an invitation to play.', 'recreational', 0.7, []),
  q('collects-stories-from-travelers', 'Loves collecting stories from travelers passing through.', 'recreational', 0.5, []),
  q('enjoys-puzzles', 'Genuinely enjoys puzzles and brain-teasers.', 'recreational', 0.5, []),
  q('prefers-quiet-evenings-in', 'Clearly prefers quiet evenings alone to going out.', 'recreational', 0.5, ['prefers-quiet-evenings-in']),
  q('always-up-for-a-social-outing', 'Is always eager to join a social outing.', 'recreational', 0.7, [], { conflictTags: ['prefers-quiet-evenings-in'] }),

  // --- memory ------------------------------------------------------------------------
  q('remembers-exact-dates', 'Remembers exact dates of minor events with unusual precision.', 'memory', 0.5, ['odd']),
  q('forgets-where-they-put-things', 'Constantly loses track of where they put small items.', 'memory', 0.7, []),
  q('excellent-with-faces-terrible-with-names', 'Never forgets a face, but is hopeless with names.', 'memory', 0.7, ['excellent-with-faces-terrible-with-names']),
  q('excellent-with-names-terrible-with-faces', 'Never forgets a name, but struggles to place faces.', 'memory', 0.5, [], { conflictTags: ['excellent-with-faces-terrible-with-names'] }),
  q('remembers-every-favor-owed', 'Remembers every favor owed to them, in exact detail.', 'memory', 0.7, ['remembers-every-favor-owed']),
  q('forgets-favors-owed', 'Genuinely forgets favors they are owed.', 'memory', 0.5, [], { conflictTags: ['remembers-every-favor-owed'] }),
  q('remembers-song-lyrics-easily', 'Remembers song lyrics far more easily than anything practical.', 'memory', 0.5, ['odd']),

  // --- travel ------------------------------------------------------------------------
  q('has-a-favorite-travel-route', 'Has a strong, specific preference for one travel route over others.', 'travel', 0.5, []),
  q('gets-restless-staying-in-one-place', 'Gets visibly restless after too long in one place.', 'travel', 0.7, ['frontier', 'gets-restless-staying-in-one-place']),
  q('deeply-attached-to-one-place', 'Is deeply attached to one particular place and rarely leaves.', 'travel', 0.7, [], { conflictTags: ['gets-restless-staying-in-one-place'] }),
  q('packs-lightly-out-of-habit', 'Packs remarkably lightly, out of long habit.', 'travel', 0.5, ['frontier', 'packs-lightly-out-of-habit']),
  q('overpacks-for-every-trip', 'Overpacks for even the shortest trip.', 'travel', 0.5, [], { conflictTags: ['packs-lightly-out-of-habit'] }),
  q('collects-souvenirs-from-every-stop', 'Collects a small souvenir from every place they visit.', 'travel', 0.5, ['sentimental']),
  q('gets-motion-sick-easily', 'Gets motion sick more easily than most.', 'travel', 0.5, ['gets-motion-sick-easily']),
  q('unbothered-by-rough-travel', 'Seems completely unbothered by rough or bumpy travel.', 'travel', 0.5, [], { conflictTags: ['gets-motion-sick-easily'] }),

  // --- communication -----------------------------------------------------------------
  q('prefers-written-messages', 'Clearly prefers written messages over live conversation.', 'communication', 0.7, ['prefers-written-messages']),
  q('prefers-face-to-face', 'Insists on face-to-face conversation whenever possible.', 'communication', 0.7, [], { conflictTags: ['prefers-written-messages'] }),
  q('slow-to-respond-to-messages', 'Is notoriously slow to respond to messages.', 'communication', 0.7, ['slow-to-respond-to-messages']),
  q('responds-to-messages-instantly', 'Responds to messages almost instantly, without fail.', 'communication', 0.5, [], { conflictTags: ['slow-to-respond-to-messages'] }),
  q('keeps-messages-extremely-brief', 'Keeps every written message extremely brief.', 'communication', 0.5, ['keeps-messages-extremely-brief']),
  q('writes-unusually-long-messages', 'Writes unusually long, detailed messages for simple matters.', 'communication', 0.5, [], { conflictTags: ['keeps-messages-extremely-brief'] }),
  q('uses-outdated-comm-etiquette', 'Uses formal comm etiquette that feels a generation out of date.', 'communication', 0.5, []),

  // --- safety ------------------------------------------------------------------------
  q('overly-cautious-with-equipment', 'Is unusually, sometimes excessively cautious with equipment.', 'safety', 0.7, ['overly-cautious-with-equipment'], { roleTags: ['technician', 'mechanic'] }),
  q('takes-unnecessary-risks', 'Takes small, unnecessary risks without seeming to notice.', 'safety', 0.5, [], { conflictTags: ['overly-cautious-with-equipment'] }),
  q('always-carries-a-first-aid-kit', 'Always carries a small first aid kit, just in case.', 'safety', 0.7, []),
  q('insists-on-safety-briefings', 'Insists on a brief safety check before any risky task.', 'safety', 0.7, ['insists-on-safety-briefings'], { roleTags: ['medical', 'technician'] }),
  q('skips-safety-checks-out-of-confidence', 'Skips routine safety checks out of sheer confidence.', 'safety', 0.5, [], { conflictTags: ['insists-on-safety-briefings'] }),

  // --- romantic -----------------------------------------------------------------------
  q('hopeless-romantic', 'Is openly, unabashedly a hopeless romantic.', 'romantic', 0.5, ['hopeless-romantic']),
  q('deeply-private-about-romance', 'Is extremely private about any romantic matters.', 'romantic', 0.7, ['subtle'], { conflictTags: ['hopeless-romantic'] }),
  q('married-to-the-job', 'Jokes, not entirely jokingly, about being married to the job.', 'romantic', 0.5, []),
  q('wears-a-token-from-a-partner', 'Wears a small token from a partner, rarely explained.', 'romantic', 0.5, ['sentimental']),
  q('awkward-around-romantic-topics', 'Gets visibly awkward whenever romance comes up in conversation.', 'romantic', 0.5, []),

  // --- religion-adjacent ---------------------------------------------------------------
  q('carries-a-small-prayer-token', 'Carries a small religious token, touched for reassurance.', 'religion-adjacent', 0.5, ['religion']),
  q('quotes-scripture-casually', 'Quotes religious texts casually in everyday conversation.', 'religion-adjacent', 0.5, ['religion']),
  q('privately-skeptical-of-faith', 'Is privately skeptical of the faith they were raised in.', 'religion-adjacent', 0.5, ['religion', 'subtle']),
  q('observes-a-moment-of-silence', 'Observes a brief moment of silence before meals or tasks.', 'religion-adjacent', 0.5, ['religion']),
  q('avoids-discussing-religion', 'Politely but firmly avoids discussing religion.', 'religion-adjacent', 0.5, []),

  // --- military-specific ----------------------------------------------------------------
  q('keeps-old-rank-insignia', 'Keeps an old rank insignia, though no longer entitled to wear it.', 'military-specific', 0.5, ['military-paramilitary']),
  q('still-uses-military-time', 'Still gives times in a strict military format out of habit.', 'military-specific', 0.5, ['military-paramilitary']),
  q('salutes-out-of-old-habit', 'Occasionally salutes out of old, unbroken habit.', 'military-specific', 0.5, ['military-paramilitary']),
  q('avoids-military-topics', 'Visibly steers conversation away from anything military.', 'military-specific', 0.5, ['military-paramilitary', 'subtle']),
  q('proud-of-old-unit', 'Speaks proudly, at length, about their old unit.', 'military-specific', 0.5, ['military-paramilitary']),

  // --- medical-specific -------------------------------------------------------------------
  q('excellent-bedside-manner', 'Has a genuinely reassuring bedside manner.', 'medical-specific', 0.7, ['medical', 'endearing']),
  q('clinically-detached-manner', 'Speaks about injuries and illness with clinical detachment.', 'medical-specific', 0.5, ['medical']),
  q('washes-hands-compulsively', 'Washes their hands more often than seems strictly necessary.', 'medical-specific', 0.5, ['medical']),
  q('always-checks-vital-signs-out-of-habit', "Checks a nearby person's vital signs out of pure habit.", 'medical-specific', 0.5, ['medical']),

  // --- droid-relations --------------------------------------------------------------------
  q('treats-droids-as-equals', 'Treats droids with the same courtesy as organics, without exception.', 'droid-relations', 0.7, ['endearing', 'droids']),
  q('mildly-uncomfortable-around-droids', 'Is mildly, visibly uncomfortable around droids.', 'droid-relations', 0.5, ['droids']),
  q('names-droids-they-work-with', 'Insists on using the proper designation of any droid rather than a generic label.', 'droid-relations', 0.5, ['droids']),
  q('overly-suspicious-of-droid-motives', 'Is oddly suspicious of droid motives, more than most.', 'droid-relations', 0.5, ['droids']),

  // --- appearance (batch 2) ------------------------------------------------------------
  q('unusually-symmetrical-features', 'Has unusually symmetrical, striking features.', 'sensory', 0.5, []),
  q('distinctive-walk-from-old-injury', 'Has a distinctive walk from an old, healed injury.', 'sensory', 0.5, []),
  q('unusually-broad-shoulders', 'Has unusually broad shoulders for their build.', 'sensory', 0.5, []),
  q('unusually-narrow-frame', 'Has an unusually narrow, wiry frame.', 'sensory', 0.5, []),
  q('permanently-furrowed-brow', 'Has a permanently furrowed, thoughtful brow.', 'sensory', 0.5, []),
  q('quick-easy-blush', 'Blushes easily and visibly.', 'sensory', 0.5, []),
  q('unusually-steady-gaze', 'Has an unusually steady, level gaze.', 'sensory', 0.5, []),

  // --- sensory (batch 3) -----------------------------------------------------------------
  q('smells-like-fresh-cut-grass', 'Smells faintly of fresh-cut vegetation.', 'sensory', 0.5, ['odor'], { contextTags: ['frontier'] }),
  q('smells-like-old-paper', 'Smells faintly of old paper and dust.', 'sensory', 0.5, ['odor'], { roleTags: ['bureaucrat'] }),
  q('smells-like-fuel', 'Carries a faint smell of vehicle fuel.', 'sensory', 0.5, ['odor'], { roleTags: ['pilot', 'mechanic'] }),
  q('unusually-resonant-laugh', 'Has an unusually resonant, memorable laugh.', 'sensory', 0.5, []),
  q('quiet-unassuming-presence', 'Has a quiet, easy-to-overlook presence.', 'sensory', 0.7, ['quiet-unassuming-presence']),
  q('commanding-physical-presence', 'Has a commanding presence that draws attention on entry.', 'sensory', 0.7, [], { conflictTags: ['quiet-unassuming-presence'] }),

  // --- pet-peeve -----------------------------------------------------------------------
  q('hates-being-interrupted', 'Has a visible, immediate reaction to being interrupted mid-sentence.', 'pet-peeve', 0.7, []),
  q('hates-tardiness', 'Has little patience for people who show up late.', 'pet-peeve', 0.7, []),
  q('hates-sloppy-work', 'Cannot stand sloppy or careless work.', 'pet-peeve', 0.7, []),
  q('hates-being-second-guessed', 'Bristles visibly at being second-guessed in front of others.', 'pet-peeve', 0.5, []),
  q('hates-loud-chewing', 'Is quietly bothered by the sound of loud chewing.', 'pet-peeve', 0.5, ['odd']),
  q('hates-unnecessary-formality', 'Finds unnecessary formality visibly irritating.', 'pet-peeve', 0.5, []),
  q('hates-vague-instructions', 'Gets visibly frustrated by vague or incomplete instructions.', 'pet-peeve', 0.7, []),
  q('hates-being-rushed', 'Reacts poorly to being rushed through a task.', 'pet-peeve', 0.7, []),
  q('hates-broken-promises', 'Takes broken promises unusually seriously, even small ones.', 'pet-peeve', 0.7, []),

  // --- routine -------------------------------------------------------------------------
  q('strict-morning-routine', 'Follows the exact same morning routine without fail.', 'routine', 0.7, ['tidy', 'strict-morning-routine']),
  q('chaotic-mornings', 'Mornings are visibly, endearingly chaotic for them.', 'routine', 0.5, [], { conflictTags: ['strict-morning-routine'] }),
  q('early-riser', 'Is a committed early riser, up well before most.', 'routine', 0.7, ['early-riser']),
  q('night-owl', 'Is a committed night owl, sharpest late in the day.', 'routine', 0.7, [], { conflictTags: ['early-riser'] }),
  q('same-order-every-time', 'Orders the exact same thing every single time.', 'routine', 0.5, ['same-order-every-time']),
  q('always-trying-something-new', 'Almost never orders the same thing twice.', 'routine', 0.5, [], { conflictTags: ['same-order-every-time'] }),
  q('meticulous-bedtime-routine', 'Has a precise, unvarying routine before sleep.', 'routine', 0.5, ['tidy']),

  // --- humor ---------------------------------------------------------------------------
  q('dry-deadpan-humor', 'Has a dry, deadpan sense of humor, easy to miss.', 'humor', 0.7, ['dry-deadpan-humor']),
  q('loud-boisterous-humor', 'Has a loud, boisterous sense of humor.', 'humor', 0.7, [], { conflictTags: ['dry-deadpan-humor'] }),
  q('terrible-puns', 'Cannot resist a terrible pun, however groan-worthy.', 'humor', 0.7, ['endearing']),
  q('rarely-jokes', 'Rarely jokes, treats most conversation seriously.', 'humor', 0.7, []),
  q('self-deprecating-humor', 'Leans heavily on self-deprecating humor.', 'humor', 0.7, []),
  q('laughs-at-their-own-jokes', 'Laughs at their own jokes before anyone else does.', 'humor', 0.5, ['endearing']),
  q('dark-gallows-humor', 'Has a dark, gallows sense of humor about difficult situations.', 'humor', 0.7, [], { roleTags: ['medical', 'soldier'] }),

  // --- trust ---------------------------------------------------------------------------
  q('slow-to-trust', 'Is notably slow to extend trust to new people.', 'trust', 0.7, ['slow-to-trust']),
  q('quick-to-trust', 'Extends trust quickly, sometimes too quickly.', 'trust', 0.7, [], { conflictTags: ['slow-to-trust'] }),
  q('never-forgets-a-betrayal', 'Never forgets, or fully forgives, a betrayal.', 'trust', 0.5, []),
  q('gives-second-chances-readily', 'Is unusually willing to give second chances.', 'trust', 0.7, ['endearing']),
  q('verifies-everything-independently', 'Insists on independently verifying anything important.', 'trust', 0.7, ['verifies-everything-independently']),
  q('takes-people-at-their-word', 'Tends to take people at their word without much scrutiny.', 'trust', 0.5, [], { conflictTags: ['verifies-everything-independently'] }),

  // --- leadership ------------------------------------------------------------------------
  q('leads-by-quiet-example', 'Leads by quiet example rather than giving orders.', 'leadership', 0.7, ['leads-by-quiet-example']),
  q('leads-with-loud-confidence', 'Leads with loud, visible confidence.', 'leadership', 0.7, [], { conflictTags: ['leads-by-quiet-example'] }),
  q('asks-for-input-before-deciding', 'Makes a point of asking for input before deciding anything major.', 'leadership', 0.7, ['asks-for-input-before-deciding']),
  q('decides-quickly-without-much-consultation', 'Decides quickly, with little consultation.', 'leadership', 0.7, [], { conflictTags: ['asks-for-input-before-deciding'] }),
  q('takes-blame-for-team-mistakes', 'Takes personal blame for a team failure, even when not fully at fault.', 'leadership', 0.7, ['endearing', 'takes-blame-for-team-mistakes']),
  q('deflects-blame-onto-others', 'Has a habit of deflecting blame onto others.', 'leadership', 0.5, [], { conflictTags: ['takes-blame-for-team-mistakes'] }),

  // --- teaching -------------------------------------------------------------------------
  q('teaches-through-stories', 'Teaches through stories and anecdotes rather than direct instruction.', 'teaching', 0.5, []),
  q('teaches-through-repetition', 'Teaches through strict, patient repetition.', 'teaching', 0.5, []),
  q('impatient-teacher', 'Is visibly impatient when explaining something a second time.', 'teaching', 0.5, ['annoying', 'impatient-teacher']),
  q('endlessly-patient-teacher', 'Shows endless patience when teaching, however many times it takes.', 'teaching', 0.7, ['endearing'], { conflictTags: ['impatient-teacher'] }),

  // --- planning ------------------------------------------------------------------------
  q('plans-everything-in-advance', 'Plans everything meticulously, far in advance.', 'planning', 0.7, ['tidy', 'plans-everything-in-advance']),
  q('improvises-constantly', 'Improvises constantly, rarely plans ahead.', 'planning', 0.7, [], { conflictTags: ['plans-everything-in-advance'] }),
  q('always-has-a-backup-plan', 'Always has a backup plan ready, just in case.', 'planning', 0.7, ['always-has-a-backup-plan']),
  q('commits-fully-with-no-backup', 'Commits fully to a plan with no backup in mind.', 'planning', 0.5, [], { conflictTags: ['always-has-a-backup-plan'] }),

  // --- curiosity -----------------------------------------------------------------------
  q('endlessly-curious', 'Is endlessly curious about how things work.', 'curiosity', 0.7, ['endearing', 'endlessly-curious']),
  q('incurious-about-most-things', 'Shows little curiosity beyond what directly concerns them.', 'curiosity', 0.5, [], { conflictTags: ['endlessly-curious'] }),
  q('asks-too-many-questions', 'Asks more questions than most people find comfortable.', 'curiosity', 0.5, ['annoying']),
  q('fascinated-by-other-cultures', 'Is visibly fascinated by unfamiliar cultures and customs.', 'curiosity', 0.5, []),

  // --- stubbornness --------------------------------------------------------------------
  q('stubborn-once-decided', 'Becomes remarkably stubborn once a decision is made.', 'stubbornness', 0.7, ['stubborn-once-decided']),
  q('easily-persuaded', 'Is fairly easily persuaded to change their mind.', 'stubbornness', 0.5, [], { conflictTags: ['stubborn-once-decided'] }),
  q('never-admits-a-mistake-out-loud', 'Rarely admits a mistake out loud, even when clearly wrong.', 'stubbornness', 0.5, ['never-admits-a-mistake-out-loud']),
  q('quick-to-admit-mistakes', 'Is unusually quick to admit when they are wrong.', 'stubbornness', 0.7, ['endearing'], { conflictTags: ['never-admits-a-mistake-out-loud'] }),

  // --- patience ------------------------------------------------------------------------
  q('endlessly-patient', 'Shows remarkable patience in almost any situation.', 'patience', 0.7, ['endearing', 'endlessly-patient']),
  q('short-fuse', 'Has a noticeably short fuse under pressure.', 'patience', 0.5, [], { conflictTags: ['endlessly-patient'] }),
  q('patient-with-people-impatient-with-tasks', 'Endlessly patient with people, visibly impatient with slow tasks.', 'patience', 0.5, []),

  // --- decision-making -------------------------------------------------------------------
  q('decides-quickly-and-confidently', 'Makes decisions quickly and sticks with them.', 'decision-making', 0.7, ['decides-quickly-and-confidently']),
  q('agonizes-over-small-decisions', 'Agonizes visibly over even small decisions.', 'decision-making', 0.7, [], { conflictTags: ['decides-quickly-and-confidently'] }),
  q('defers-decisions-to-others', 'Prefers to let someone else make the final call.', 'decision-making', 0.5, []),

  // --- emotional-expression ----------------------------------------------------------------
  q('wears-emotions-openly', 'Wears their emotions openly, easy to read.', 'emotional-expression', 0.7, ['wears-emotions-openly']),
  q('keeps-emotions-carefully-guarded', 'Keeps their emotions carefully guarded from view.', 'emotional-expression', 0.7, ['mysterious'], { conflictTags: ['wears-emotions-openly'] }),
  q('cries-easily-at-small-things', 'Tears up easily at small, unexpected moments.', 'emotional-expression', 0.5, ['cries-easily-at-small-things']),
  q('rarely-shows-strong-emotion', 'Rarely shows strong emotion, even under stress.', 'emotional-expression', 0.5, [], { conflictTags: ['cries-easily-at-small-things'] }),

  // --- conflict-style -------------------------------------------------------------------
  q('confronts-problems-head-on', 'Confronts problems directly, without hesitation.', 'conflict-style', 0.7, ['confronts-problems-head-on']),
  q('avoids-confrontation-when-possible', 'Avoids direct confrontation whenever there is another option.', 'conflict-style', 0.7, [], { conflictTags: ['confronts-problems-head-on'] }),
  q('uses-humor-to-defuse-tension', 'Uses humor reflexively to defuse tense situations.', 'conflict-style', 0.7, ['endearing']),
  q('goes-quiet-during-arguments', 'Goes noticeably quiet during arguments rather than engaging.', 'conflict-style', 0.5, []),

  // --- weather-seasonal ------------------------------------------------------------------
  q('loves-storms', 'Genuinely enjoys watching storms roll in.', 'weather-seasonal', 0.5, []),
  q('dislikes-extreme-heat', 'Handles extreme heat noticeably worse than others.', 'weather-seasonal', 0.5, [], { contextTags: ['frontier'] }),
  q('thrives-in-cold-climates', 'Seems unusually comfortable in cold climates.', 'weather-seasonal', 0.5, [], { contextTags: ['frontier'] }),
  q('gets-restless-during-long-seasons-indoors', 'Gets visibly restless during long stretches spent indoors.', 'weather-seasonal', 0.5, []),

  // --- bureaucratic --------------------------------------------------------------------
  q('quotes-regulations-from-memory', 'Can quote relevant regulations from memory, unprompted.', 'bureaucratic', 0.5, ['government-bureaucracy']),
  q('frustrated-by-red-tape', 'Is visibly, chronically frustrated by bureaucratic red tape.', 'bureaucratic', 0.7, ['government-bureaucracy']),
  q('thrives-within-clear-procedure', 'Genuinely thrives when working within clear procedure.', 'bureaucratic', 0.5, ['government-bureaucracy']),
  q('finds-loopholes-instinctively', 'Has an instinct for finding loopholes in any rule.', 'bureaucratic', 0.5, ['government-bureaucracy']),

  // --- entertainment ---------------------------------------------------------------------
  q('natural-storyteller', 'Is a natural, captivating storyteller.', 'entertainment', 0.7, ['endearing']),
  q('awkward-public-speaker', 'Is visibly awkward speaking in front of groups.', 'entertainment', 0.5, []),
  q('enjoys-being-the-center-of-attention', 'Clearly enjoys being the center of attention.', 'entertainment', 0.5, ['enjoys-being-the-center-of-attention']),
  q('avoids-being-the-center-of-attention', 'Actively avoids being the center of attention.', 'entertainment', 0.7, [], { conflictTags: ['enjoys-being-the-center-of-attention'] }),

  // --- academic -------------------------------------------------------------------------
  q('cites-sources-unprompted', 'Cites the source of a claim, even when not asked.', 'academic', 0.5, ['scientist']),
  q('skeptical-of-unverified-claims', 'Is visibly skeptical of any unverified claim.', 'academic', 0.5, ['scientist']),
  q('genuinely-loves-learning', 'Shows genuine, visible enthusiasm for learning something new.', 'academic', 0.7, ['endearing']),
  q('impatient-with-imprecision', 'Is visibly impatient with imprecise or sloppy statements.', 'academic', 0.5, ['scientist']),

  // --- competitive ------------------------------------------------------------------------
  q('turns-everything-into-a-competition', 'Has a habit of turning even mundane tasks into a competition.', 'competitive', 0.7, ['turns-everything-into-a-competition']),
  q('genuinely-indifferent-to-winning', 'Seems genuinely indifferent to winning or losing.', 'competitive', 0.5, [], { conflictTags: ['turns-everything-into-a-competition'] }),
  q('gracious-in-defeat', 'Is unusually gracious when they lose.', 'competitive', 0.5, ['endearing', 'gracious-in-defeat']),
  q('poor-loser', 'Is visibly, if briefly, a poor loser.', 'competitive', 0.5, [], { conflictTags: ['gracious-in-defeat'] }),

  // --- attention-to-detail ------------------------------------------------------------------
  q('notices-small-inconsistencies', 'Notices small inconsistencies that most people miss.', 'attention-to-detail', 0.7, ['notices-small-inconsistencies']),
  q('overlooks-obvious-details', 'Regularly overlooks details that seem obvious to everyone else.', 'attention-to-detail', 0.5, [], { conflictTags: ['notices-small-inconsistencies'] }),
  q('obsessive-about-precision', 'Is obsessive about precision in measurements or numbers.', 'attention-to-detail', 0.5, ['scientist', 'obsessive-about-precision']),
  q('big-picture-thinker', 'Focuses on the big picture, glosses over small details.', 'attention-to-detail', 0.5, [], { conflictTags: ['obsessive-about-precision'] }),

  // --- multitasking --------------------------------------------------------------------------
  q('juggles-multiple-tasks-well', 'Handles several tasks at once without visible strain.', 'multitasking', 0.7, ['juggles-multiple-tasks-well']),
  q('needs-to-finish-one-thing-at-a-time', 'Needs to finish one task fully before starting another.', 'multitasking', 0.5, [], { conflictTags: ['juggles-multiple-tasks-well'] }),
  q('easily-distracted-mid-task', 'Is easily distracted partway through a task.', 'multitasking', 0.5, ['easily-distracted-mid-task']),
  q('laser-focused-once-started', 'Becomes laser-focused once a task is underway.', 'multitasking', 0.7, [], { conflictTags: ['easily-distracted-mid-task'] }),

  // --- rule-following ------------------------------------------------------------------------
  q('follows-rules-to-the-letter', 'Follows rules to the exact letter, no exceptions.', 'rule-following', 0.7, ['government-bureaucracy', 'follows-rules-to-the-letter']),
  q('bends-rules-when-convenient', 'Bends the rules whenever it seems convenient.', 'rule-following', 0.7, [], { conflictTags: ['follows-rules-to-the-letter'] }),
  q('questions-rules-that-seem-arbitrary', 'Openly questions rules that seem arbitrary.', 'rule-following', 0.5, []),
  q('comfortable-in-gray-areas', 'Is unusually comfortable operating in moral gray areas.', 'rule-following', 0.5, ['crime-syndicate']),

  // --- authority-relations -------------------------------------------------------------------
  q('deferential-to-authority', 'Is quick to defer to anyone in a position of authority.', 'authority-relations', 0.5, ['military-paramilitary', 'deferential-to-authority']),
  q('skeptical-of-authority', 'Is instinctively skeptical of authority figures.', 'authority-relations', 0.5, [], { conflictTags: ['deferential-to-authority'] }),
  q('comfortable-challenging-superiors', 'Is comfortable challenging a superior when they disagree.', 'authority-relations', 0.5, []),
  q('uncomfortable-giving-orders', 'Is visibly uncomfortable giving orders, even when required to.', 'authority-relations', 0.5, []),

  // --- self-care -----------------------------------------------------------------------------
  q('neglects-their-own-needs', 'Tends to neglect their own needs while helping others.', 'self-care', 0.7, ['endearing', 'neglects-their-own-needs']),
  q('prioritizes-personal-wellbeing', 'Makes a visible point of prioritizing their own wellbeing.', 'self-care', 0.5, [], { conflictTags: ['neglects-their-own-needs'] }),
  q('keeps-a-strict-self-care-ritual', 'Keeps a small, strict self-care ritual no matter how busy.', 'self-care', 0.5, []),

  // --- navigation ----------------------------------------------------------------------------
  q('excellent-sense-of-direction', 'Has an unusually good sense of direction.', 'navigation', 0.5, ['frontier', 'excellent-sense-of-direction']),
  q('notoriously-poor-sense-of-direction', 'Gets lost with almost comic regularity.', 'navigation', 0.5, ['endearing'], { conflictTags: ['excellent-sense-of-direction'] }),
  q('memorizes-routes-instantly', 'Memorizes a route after walking it just once.', 'navigation', 0.5, []),

  // --- risk-tolerance ------------------------------------------------------------------------
  q('calculated-risk-taker', 'Takes risks, but only after careful calculation.', 'risk-tolerance', 0.5, ['calculated-risk-taker']),
  q('extremely-risk-averse', 'Is extremely risk-averse, even in low-stakes situations.', 'risk-tolerance', 0.5, [], { conflictTags: ['calculated-risk-taker'] }),
  q('thrill-seeker', 'Genuinely seems to enjoy a bit of risk and thrill.', 'risk-tolerance', 0.5, []),

  // --- optimism ------------------------------------------------------------------------------
  q('relentlessly-optimistic', 'Stays relentlessly optimistic, even when things go badly.', 'optimism', 0.7, ['endearing', 'relentlessly-optimistic']),
  q('reflexively-pessimistic', 'Assumes the worst outcome reflexively.', 'optimism', 0.5, [], { conflictTags: ['relentlessly-optimistic'] }),
  q('cautiously-hopeful', 'Tends to be cautiously, quietly hopeful about outcomes.', 'optimism', 0.5, []),

  // --- perfectionism -------------------------------------------------------------------------
  q('perfectionist-about-their-work', 'Holds their own work to an exacting, almost punishing standard.', 'perfectionism', 0.7, ['perfectionist-about-their-work']),
  q('comfortable-with-good-enough', 'Is genuinely comfortable with "good enough" rather than perfect.', 'perfectionism', 0.5, [], { conflictTags: ['perfectionist-about-their-work'] }),

  // --- procrastination -----------------------------------------------------------------------
  q('chronic-procrastinator', 'Is a chronic, if functional, procrastinator.', 'procrastination', 0.5, ['chronic-procrastinator']),
  q('never-procrastinates', 'Never puts off a task, however unpleasant.', 'procrastination', 0.5, [], { conflictTags: ['chronic-procrastinator'] }),

  // --- introvert-extrovert -------------------------------------------------------------------
  q('recharges-alone', 'Clearly needs time alone to recharge after socializing.', 'introvert-extrovert', 0.7, ['recharges-alone']),
  q('energized-by-crowds', 'Seems genuinely energized by being around people.', 'introvert-extrovert', 0.7, [], { conflictTags: ['recharges-alone'] }),

  // --- honesty -------------------------------------------------------------------------------
  q('painfully-honest', 'Is painfully, sometimes tactlessly honest.', 'honesty', 0.7, ['painfully-honest']),
  q('tells-comfortable-white-lies', 'Tells small, comfortable white lies to smooth things over.', 'honesty', 0.5, [], { conflictTags: ['painfully-honest'] }),
  q('terrible-liar', 'Is a genuinely terrible liar, easy to read.', 'honesty', 0.5, ['endearing', 'terrible-liar']),
  q('convincingly-dishonest-when-needed', 'Can be unnervingly convincing when they choose to lie.', 'honesty', 0.5, ['unsettling'], { conflictTags: ['terrible-liar'] }),

  // --- privacy -------------------------------------------------------------------------------
  q('fiercely-private', 'Is fiercely private about their personal life.', 'privacy', 0.7, ['subtle', 'fiercely-private']),
  q('shares-personal-details-freely', 'Shares personal details freely, sometimes surprisingly so.', 'privacy', 0.5, [], { conflictTags: ['fiercely-private'] }),

  // --- crisis-behavior -----------------------------------------------------------------------
  q('calm-in-a-crisis', 'Becomes noticeably calmer, not more anxious, during a crisis.', 'crisis-behavior', 0.7, ['calm-in-a-crisis']),
  q('freezes-under-sudden-pressure', 'Tends to freeze briefly under sudden, unexpected pressure.', 'crisis-behavior', 0.5, [], { conflictTags: ['calm-in-a-crisis'] }),
  q('takes-charge-in-emergencies', 'Instinctively takes charge when something goes wrong.', 'crisis-behavior', 0.5, []),

  // --- boredom -------------------------------------------------------------------------------
  q('cannot-sit-still-when-bored', 'Cannot sit still when bored, finds busywork instantly.', 'boredom', 0.5, ['cannot-sit-still-when-bored']),
  q('content-with-quiet-downtime', 'Is genuinely content during quiet, uneventful downtime.', 'boredom', 0.5, [], { conflictTags: ['cannot-sit-still-when-bored'] }),

  // --- criticism-handling ---------------------------------------------------------------------
  q('takes-criticism-gracefully', 'Takes even harsh criticism with surprising grace.', 'criticism-handling', 0.5, ['takes-criticism-gracefully']),
  q('bristles-at-criticism', 'Visibly bristles at any criticism, however constructive.', 'criticism-handling', 0.5, [], { conflictTags: ['takes-criticism-gracefully'] }),
  q('actively-seeks-feedback', 'Actively seeks out honest feedback, even when unflattering.', 'criticism-handling', 0.5, ['endearing']),

  // --- praise-handling -----------------------------------------------------------------------
  q('deflects-praise-immediately', 'Deflects praise immediately, redirects it to others.', 'praise-handling', 0.5, ['deflects-praise-immediately']),
  q('visibly-delighted-by-praise', 'Is visibly, openly delighted by praise.', 'praise-handling', 0.5, ['endearing'], { conflictTags: ['deflects-praise-immediately'] }),

  // --- change-handling -----------------------------------------------------------------------
  q('adapts-quickly-to-change', 'Adapts quickly and calmly to sudden change.', 'change-handling', 0.7, ['adapts-quickly-to-change']),
  q('resistant-to-change', 'Is visibly resistant to changes in routine.', 'change-handling', 0.5, [], { conflictTags: ['adapts-quickly-to-change'] }),

  // --- gift-giving ---------------------------------------------------------------------------
  q('thoughtful-gift-giver', 'Puts unusual thought into even small gifts.', 'gift-giving', 0.5, ['endearing', 'thoughtful-gift-giver']),
  q('awkward-with-gifts', 'Is visibly awkward giving or receiving gifts.', 'gift-giving', 0.5, [], { conflictTags: ['thoughtful-gift-giver'] }),

  // --- apology-style -------------------------------------------------------------------------
  q('apologizes-with-actions-not-words', 'Rarely says sorry, but makes up for it through actions.', 'apology-style', 0.5, ['apologizes-with-actions-not-words']),
  q('over-apologizes-verbally', 'Apologizes verbally, sometimes excessively, for small things.', 'apology-style', 0.5, [], { conflictTags: ['apologizes-with-actions-not-words'] }),

  // --- promise-keeping -----------------------------------------------------------------------
  q('never-breaks-a-promise', 'Treats every promise, however small, as absolutely binding.', 'promise-keeping', 0.7, ['endearing', 'never-breaks-a-promise']),
  q('makes-promises-too-easily', 'Makes promises easily, does not always keep them.', 'promise-keeping', 0.5, [], { conflictTags: ['never-breaks-a-promise'] }),

  // --- language-quirk ------------------------------------------------------------------------
  q('mixes-two-languages-fluidly', 'Fluidly mixes two languages mid-sentence without noticing.', 'language-quirk', 0.5, ['cultural']),
  q('overly-precise-with-word-choice', 'Is unusually precise and deliberate with word choice.', 'language-quirk', 0.5, []),
  q('uses-a-lot-of-idiom-from-childhood', 'Uses idioms specific to where they grew up.', 'language-quirk', 0.5, ['frontier']),

  // --- attention-span ------------------------------------------------------------------------
  q('can-focus-for-hours', 'Can focus on a single task for hours without a break.', 'attention-span', 0.5, ['can-focus-for-hours']),
  q('short-attention-span', 'Has a noticeably short attention span for routine tasks.', 'attention-span', 0.5, [], { conflictTags: ['can-focus-for-hours'] }),

  // --- shopping ------------------------------------------------------------------------------
  q('window-shops-for-fun', 'Enjoys browsing shops with no intention of buying anything.', 'shopping', 0.5, ['window-shops-for-fun']),
  q('buys-only-what-is-needed', 'Buys strictly what is needed, nothing more.', 'shopping', 0.5, [], { conflictTags: ['window-shops-for-fun'] }),
  q('impulse-buys-small-trinkets', 'Occasionally impulse-buys small, unnecessary trinkets.', 'shopping', 0.5, []),

  // --- pets --------------------------------------------------------------------------------
  q('has-a-loyal-companion-animal', 'Has a loyal companion animal that goes almost everywhere with them.', 'pets', 0.5, ['endearing']),
  q('feeds-strays-out-of-habit', 'Feeds stray animals out of quiet, unspoken habit.', 'pets', 0.5, ['endearing']),
  q('mildly-allergic-to-common-animals', 'Is mildly allergic to a common local animal, and copes anyway.', 'pets', 0.3, []),

  // --- comfort-object ------------------------------------------------------------------------
  q('carries-a-comfort-item', 'Carries a small, worn object purely for comfort.', 'comfort-object', 0.5, ['sentimental']),
  q('has-a-specific-stress-relief-habit', 'Has a specific, small ritual for relieving stress.', 'comfort-object', 0.5, []),

  // --- music-taste ---------------------------------------------------------------------------
  q('strong-opinions-about-music', 'Has surprisingly strong, specific opinions about music.', 'music-taste', 0.5, []),
  q('hums-constantly-when-relaxed', 'Hums almost constantly when relaxed and unobserved.', 'music-taste', 0.5, []),
  q('tone-deaf-and-unaware', 'Is completely tone-deaf and blissfully unaware of it.', 'music-taste', 0.5, ['endearing']),

  // --- fashion-sense -------------------------------------------------------------------------
  q('unusual-but-confident-fashion-sense', 'Dresses unusually, but with total confidence.', 'fashion-sense', 0.5, ['unusual-but-confident-fashion-sense']),
  q('deliberately-plain-fashion-choices', 'Deliberately dresses as plainly as possible.', 'fashion-sense', 0.5, [], { conflictTags: ['unusual-but-confident-fashion-sense'] }),
  q('follows-trends-closely', 'Keeps close track of current fashion trends.', 'fashion-sense', 0.5, [], { contextTags: ['wealthy'] }),

  // --- storytelling --------------------------------------------------------------------------
  q('exaggerates-stories-for-effect', 'Tends to exaggerate personal stories for effect.', 'storytelling', 0.5, ['exaggerates-stories-for-effect']),
  q('tells-stories-with-precise-accuracy', 'Insists on precise, unembellished accuracy when telling a story.', 'storytelling', 0.5, [], { conflictTags: ['exaggerates-stories-for-effect'] }),
  q('has-one-story-they-tell-often', 'Has one particular story they tell often, with slight variations each time.', 'storytelling', 0.5, ['endearing']),

  // --- listening ------------------------------------------------------------------------------
  q('asks-clarifying-questions-often', 'Asks clarifying questions frequently to make sure they understand.', 'listening', 0.5, []),
  q('nods-along-without-fully-listening', 'Sometimes nods along without fully following the conversation.', 'listening', 0.5, ['annoying']),
  q('remembers-what-people-say-word-for-word', 'Remembers what people say with unusual accuracy.', 'listening', 0.5, []),

  // --- group-dynamics ------------------------------------------------------------------------
  q('natural-mediator', 'Naturally falls into the role of mediator in group disputes.', 'group-dynamics', 0.5, ['endearing']),
  q('prefers-small-groups', 'Is noticeably more comfortable in small groups than large ones.', 'group-dynamics', 0.5, ['prefers-small-groups']),
  q('thrives-in-large-gatherings', 'Genuinely thrives in large, busy gatherings.', 'group-dynamics', 0.5, [], { conflictTags: ['prefers-small-groups'] }),

  // --- sarcasm --------------------------------------------------------------------------------
  q('reflexively-sarcastic', 'Falls into sarcasm almost reflexively.', 'sarcasm', 0.7, ['reflexively-sarcastic']),
  q('takes-everything-literally', 'Tends to take statements very literally, misses sarcasm.', 'sarcasm', 0.5, [], { conflictTags: ['reflexively-sarcastic'] }),

  // --- empathy --------------------------------------------------------------------------------
  q('picks-up-on-others-moods-easily', 'Picks up on the moods of people around them almost instantly.', 'empathy', 0.7, ['endearing', 'picks-up-on-others-moods-easily']),
  q('oblivious-to-social-cues', 'Is genuinely oblivious to subtle social cues.', 'empathy', 0.5, [], { conflictTags: ['picks-up-on-others-moods-easily'] }),

  // --- self-confidence -----------------------------------------------------------------------
  q('quietly-self-assured', 'Carries a quiet, unshowy self-assurance.', 'self-confidence', 0.5, ['quietly-self-assured']),
  q('visibly-insecure-despite-skill', 'Is visibly insecure despite clear skill at their work.', 'self-confidence', 0.5, [], { conflictTags: ['quietly-self-assured'] }),
  q('overconfident-past-their-ability', 'Is noticeably overconfident, sometimes past their actual ability.', 'self-confidence', 0.5, []),

  // --- body-modification -----------------------------------------------------------------------
  q('meaningful-tattoo-never-explained', 'Has a meaningful tattoo they never fully explain.', 'body-modification', 0.5, ['sentimental']),
  q('piercing-from-a-past-life', 'Wears a piercing tied to a life stage they rarely discuss.', 'body-modification', 0.3, ['subtle']),

  // --- negotiation -----------------------------------------------------------------------------
  q('skilled-natural-negotiator', 'Has a natural, easy skill at negotiation.', 'negotiation', 0.5, ['skilled-natural-negotiator'], { roleTags: ['merchant', 'business'] }),
  q('uncomfortable-negotiating-prices', 'Is visibly uncomfortable negotiating over price.', 'negotiation', 0.5, [], { conflictTags: ['skilled-natural-negotiator'] }),

  // --- first-impressions ----------------------------------------------------------------------
  q('makes-a-strong-first-impression', 'Makes an unusually strong first impression, for better or worse.', 'first-impressions', 0.5, ['makes-a-strong-first-impression']),
  q('grows-on-people-slowly', 'Tends to grow on people slowly rather than making a strong first impression.', 'first-impressions', 0.5, [], { conflictTags: ['makes-a-strong-first-impression'] }),

  // --- assertiveness ---------------------------------------------------------------------------
  q('direct-and-assertive', 'Is direct and assertive about what they want.', 'assertiveness', 0.7, ['direct-and-assertive']),
  q('passive-and-accommodating', 'Tends to be passive, accommodating even to their own detriment.', 'assertiveness', 0.5, [], { conflictTags: ['direct-and-assertive'] }),

  // --- boundary-setting -----------------------------------------------------------------------
  q('sets-clear-boundaries', 'Sets clear, firm boundaries and holds to them.', 'boundary-setting', 0.5, ['sets-clear-boundaries']),
  q('struggles-to-say-no', 'Genuinely struggles to say no to a request.', 'boundary-setting', 0.5, [], { conflictTags: ['sets-clear-boundaries'] }),

  // --- adventure-seeking ----------------------------------------------------------------------
  q('drawn-to-the-unfamiliar', 'Is drawn instinctively toward unfamiliar places and situations.', 'adventure-seeking', 0.5, ['frontier', 'drawn-to-the-unfamiliar']),
  q('prefers-the-familiar', 'Strongly prefers familiar, predictable surroundings.', 'adventure-seeking', 0.5, [], { conflictTags: ['drawn-to-the-unfamiliar'] }),

  // --- belonging -------------------------------------------------------------------------------
  q('deeply-loyal-to-their-group', 'Is deeply, visibly loyal to whatever group they belong to.', 'belonging', 0.7, ['endearing', 'deeply-loyal-to-their-group']),
  q('keeps-one-foot-out-the-door', 'Seems to keep one foot out the door of any group they join.', 'belonging', 0.5, [], { conflictTags: ['deeply-loyal-to-their-group'] }),

  // --- mentorship-seeking ---------------------------------------------------------------------
  q('actively-seeks-out-mentors', 'Actively seeks out people to learn from.', 'mentorship-seeking', 0.5, ['actively-seeks-out-mentors']),
  q('prefers-to-learn-alone', 'Prefers to figure things out alone rather than seek guidance.', 'mentorship-seeking', 0.5, [], { conflictTags: ['actively-seeks-out-mentors'] }),

  // --- sensory (batch 4) ------------------------------------------------------------------------
  q('unusually-firm-handshake', 'Has an unusually firm, memorable handshake.', 'sensory', 0.5, [], { requiresTags: ['organic-hands'] }),
  q('surprisingly-gentle-handshake', 'Has a surprisingly gentle handshake for their apparent strength.', 'sensory', 0.5, [], { requiresTags: ['organic-hands'] }),
  q('distinctive-scent-of-workplace', "Carries the distinctive scent of wherever they work.", 'sensory', 0.5, ['odor']),
  q('unusually-quiet-breathing', 'Breathes unusually quietly, easy to forget they are in the room.', 'sensory', 0.5, []),
  q('audible-when-breathing-hard', 'Breathes audibly when exerting themselves even slightly.', 'sensory', 0.5, []),

  // --- speech (batch 3) -------------------------------------------------------------------------
  q('speaks-with-careful-diplomatic-hedging', 'Hedges statements carefully, diplomatically, almost by reflex.', 'speech', 0.5, ['government-bureaucracy']),
  q('narrates-obvious-things-unprompted', 'Occasionally narrates obvious things out loud, unprompted.', 'speech', 0.5, ['odd']),
  q('speaks-with-unusual-warmth-to-children', 'Softens their speech noticeably around children.', 'speech', 0.5, ['endearing']),
  q('unusually-formal-with-elders', 'Becomes noticeably more formal when speaking to elders.', 'speech', 0.5, ['community']),

  // --- mannerism (batch 3) ----------------------------------------------------------------------
  q('always-offers-a-seat', 'Always offers their seat to someone who looks tired.', 'mannerism', 0.5, ['endearing']),
  q('checks-on-others-before-themselves', 'Checks that everyone else is okay before considering themselves.', 'mannerism', 0.7, ['endearing']),
  q('keeps-a-tally-of-small-debts', 'Keeps a private mental tally of small favors owed and given.', 'mannerism', 0.5, []),
  q('always-tastes-food-before-serving', 'Tastes food before serving it to anyone else, out of habit.', 'mannerism', 0.3, []),

  // --- cooking-specialty ------------------------------------------------------------------------
  q('makes-one-dish-exceptionally-well', 'Makes one particular dish exceptionally well, and knows it.', 'cooking-specialty', 0.5, ['endearing']),
  q('experiments-with-unusual-recipes', 'Enjoys experimenting with unusual ingredient combinations.', 'cooking-specialty', 0.5, []),
  q('cannot-cook-at-all', 'Is genuinely, cheerfully hopeless at cooking.', 'cooking-specialty', 0.5, ['endearing']),

  // --- drink-preference -------------------------------------------------------------------------
  q('never-drinks-alcohol', 'Never drinks alcohol, for reasons rarely explained.', 'drink-preference', 0.5, []),
  q('enjoys-a-drink-after-work', 'Enjoys a single drink at the end of a long shift.', 'drink-preference', 0.5, []),
  q('strong-caffeine-dependency', 'Is visibly, functionally dependent on caffeine.', 'drink-preference', 0.7, ['endearing']),
  q('prefers-plain-water-to-anything-else', 'Prefers plain water over anything more elaborate.', 'drink-preference', 0.5, []),

  // --- taste-preference -------------------------------------------------------------------------
  q('loves-extremely-spicy-food', 'Genuinely loves food most people find too spicy.', 'taste-preference', 0.5, []),
  q('has-a-noted-sweet-tooth', 'Has a well-known weakness for sweet food.', 'taste-preference', 0.5, ['endearing']),
  q('picky-about-food-temperature', 'Is oddly particular about food being served at the right temperature.', 'taste-preference', 0.3, ['odd']),

  // --- brand-loyalty ----------------------------------------------------------------------------
  q('fiercely-loyal-to-one-brand-of-tool', 'Refuses to use any brand of tool but their preferred one.', 'brand-loyalty', 0.5, ['trade']),
  q('always-tries-the-cheapest-option-first', 'Always tries the cheapest available option first, regardless of quality.', 'brand-loyalty', 0.5, []),
  q('splurges-on-one-specific-thing', 'Is frugal in general, but splurges on one specific category of purchase.', 'brand-loyalty', 0.5, []),

  // --- vehicle-attachment -----------------------------------------------------------------------
  q('deeply-attached-to-their-vehicle', 'Is deeply, sentimentally attached to a particular vehicle.', 'vehicle-attachment', 0.5, ['sentimental', 'deeply-attached-to-their-vehicle']),
  q('treats-vehicles-as-purely-functional', 'Treats vehicles as purely functional, feels no attachment.', 'vehicle-attachment', 0.5, [], { conflictTags: ['deeply-attached-to-their-vehicle'] }),

  // --- handedness -------------------------------------------------------------------------------
  q('noticeably-left-handed', 'Is noticeably, sometimes inconveniently left-handed in a right-handed world.', 'handedness', 0.3, [], { requiresTags: ['organic-hands'] }),
  q('genuinely-ambidextrous', 'Is genuinely ambidextrous, switches hands without thinking.', 'handedness', 0.3, [], { requiresTags: ['organic-hands'] }),

  // --- writing-style ----------------------------------------------------------------------------
  q('elegant-handwriting', 'Has unusually elegant, careful handwriting.', 'writing-style', 0.3, ['elegant-handwriting'], { requiresTags: ['organic-hands'] }),
  q('nearly-illegible-handwriting', 'Has famously, almost illegibly bad handwriting.', 'writing-style', 0.5, ['endearing'], { requiresTags: ['organic-hands'], conflictTags: ['elegant-handwriting'] }),

  // --- daydreaming -----------------------------------------------------------------------------
  q('prone-to-daydreaming', 'Is prone to daydreaming during slow moments.', 'daydreaming', 0.5, ['prone-to-daydreaming']),
  q('always-present-and-attentive', 'Is always fully present, never seems to drift off.', 'daydreaming', 0.5, [], { conflictTags: ['prone-to-daydreaming'] }),

  // --- civic-engagement -------------------------------------------------------------------------
  q('closely-follows-local-news', 'Closely follows local news and events.', 'civic-engagement', 0.5, ['community', 'closely-follows-local-news']),
  q('tunes-out-local-politics', 'Tunes out local politics almost entirely.', 'civic-engagement', 0.5, [], { conflictTags: ['closely-follows-local-news'] }),
  q('active-in-community-affairs', 'Is actively involved in local community affairs.', 'civic-engagement', 0.5, ['community', 'endearing']),

  // --- resourcefulness --------------------------------------------------------------------------
  q('fixes-things-with-whatever-is-on-hand', 'Can fix nearly anything with whatever happens to be on hand.', 'resourcefulness', 0.7, ['trade', 'fixes-things-with-whatever-is-on-hand']),
  q('insists-on-proper-tools-only', 'Insists on the proper tool for the job, refuses shortcuts.', 'resourcefulness', 0.5, ['trade'], { conflictTags: ['fixes-things-with-whatever-is-on-hand'] }),
  q('never-throws-anything-away', 'Never throws anything away, convinced it will be useful later.', 'resourcefulness', 0.5, ['frontier']),

  // --- borrowing-lending -------------------------------------------------------------------------
  q('generous-lender-of-tools', 'Lends out tools and equipment generously.', 'borrowing-lending', 0.5, ['endearing', 'generous-lender-of-tools']),
  q('reluctant-to-lend-anything', 'Is visibly reluctant to lend out their own belongings.', 'borrowing-lending', 0.5, [], { conflictTags: ['generous-lender-of-tools'] }),
  q('always-forgets-to-return-borrowed-items', 'Consistently forgets to return borrowed items.', 'borrowing-lending', 0.5, ['annoying']),

  // --- teasing-style -----------------------------------------------------------------------------
  q('gentle-teasing-with-close-friends', 'Teases close friends gently, never unkindly.', 'teasing-style', 0.5, ['endearing']),
  q('does-not-understand-teasing', 'Genuinely does not understand playful teasing, takes it literally.', 'teasing-style', 0.5, []),
  q('enjoys-harmless-pranks', 'Enjoys the occasional harmless prank.', 'teasing-style', 0.5, []),

  // --- nickname-giving ---------------------------------------------------------------------------
  q('gives-everyone-a-nickname', 'Gives nearly everyone they meet a nickname within minutes.', 'nickname-giving', 0.5, ['endearing', 'gives-everyone-a-nickname']),
  q('always-uses-full-formal-names', 'Always uses full, formal names, even with close friends.', 'nickname-giving', 0.5, [], { conflictTags: ['gives-everyone-a-nickname'] }),

  // --- memory-triggers ---------------------------------------------------------------------------
  q('certain-smells-trigger-old-memories', 'Visibly reacts to certain smells that trigger old memories.', 'memory-triggers', 0.5, ['subtle']),
  q('certain-songs-visibly-affect-them', 'Goes quiet whenever a particular song plays.', 'memory-triggers', 0.5, ['subtle']),

  // --- luck-belief -------------------------------------------------------------------------------
  q('believes-firmly-in-luck', 'Genuinely believes in luck, good and bad.', 'luck-belief', 0.5, ['believes-firmly-in-luck']),
  q('dismisses-luck-as-superstition', 'Dismisses talk of luck as pure superstition.', 'luck-belief', 0.5, [], { conflictTags: ['believes-firmly-in-luck'] }),

  // --- meditation-habit --------------------------------------------------------------------------
  q('practices-quiet-meditation', 'Practices a brief, quiet meditation daily.', 'meditation-habit', 0.5, ['religion']),
  q('cannot-sit-still-to-meditate', 'Has tried meditation and cannot sit still long enough for it.', 'meditation-habit', 0.3, ['endearing']),

  // --- hygiene-quirk -----------------------------------------------------------------------------
  q('washes-hands-before-any-task', 'Washes their hands before starting almost any task.', 'hygiene-quirk', 0.5, ['tidy', 'washes-hands-before-any-task']),
  q('unbothered-by-getting-dirty', 'Is completely unbothered by getting dirty on the job.', 'hygiene-quirk', 0.5, [], { conflictTags: ['washes-hands-before-any-task'] }),

  // --- sleep-quirk -------------------------------------------------------------------------------
  q('talks-in-their-sleep', 'Is known to talk in their sleep.', 'sleep-quirk', 0.3, ['odd']),
  q('sleeps-in-unusual-positions', 'Is known for sleeping in unusual, uncomfortable-looking positions.', 'sleep-quirk', 0.3, ['odd']),
  q('needs-complete-silence-to-sleep', 'Needs complete silence to fall asleep.', 'sleep-quirk', 0.3, ['needs-complete-silence-to-sleep']),
  q('can-sleep-through-anything', 'Can famously sleep through almost any noise or disturbance.', 'sleep-quirk', 0.5, ['endearing'], { conflictTags: ['needs-complete-silence-to-sleep'] }),

  // --- eyesight-hearing --------------------------------------------------------------------------
  q('wears-corrective-lenses', 'Wears corrective lenses, and is a little self-conscious about it.', 'eyesight-hearing', 0.5, []),
  q('slight-hearing-loss-in-one-ear', 'Has a slight, longstanding hearing loss in one ear.', 'eyesight-hearing', 0.3, []),
  q('unusually-sharp-eyesight', 'Has unusually sharp, far-reaching eyesight.', 'eyesight-hearing', 0.5, []),
  q('unusually-sharp-hearing', 'Has unusually sharp hearing, notices sounds others miss.', 'eyesight-hearing', 0.5, []),

  // --- institutional-loyalty ----------------------------------------------------------------------
  q('loyal-to-the-institution-not-the-individual', 'Is loyal to the institution itself, regardless of who currently leads it.', 'institutional-loyalty', 0.5, ['government-bureaucracy', 'loyal-to-the-institution-not-the-individual']),
  q('loyal-to-the-person-not-the-title', 'Follows specific people they trust rather than titles or institutions.', 'institutional-loyalty', 0.5, [], { conflictTags: ['loyal-to-the-institution-not-the-individual'] }),

  // --- whistleblowing-tendency --------------------------------------------------------------------
  q('reports-wrongdoing-through-proper-channels', 'Reports wrongdoing through proper channels, however slow.', 'whistleblowing-tendency', 0.5, ['government-bureaucracy', 'reports-wrongdoing-through-proper-channels']),
  q('looks-the-other-way-to-keep-the-peace', 'Tends to look the other way to avoid conflict.', 'whistleblowing-tendency', 0.5, [], { conflictTags: ['reports-wrongdoing-through-proper-channels'] }),

  // --- sensory (batch 5) --------------------------------------------------------------------------
  q('distinctive-way-of-clearing-throat', 'Has a distinctive way of clearing their throat before speaking.', 'sensory', 0.5, []),
  q('slightly-uneven-gait', 'Walks with a slightly uneven, easily recognizable gait.', 'sensory', 0.5, []),
  q('unusually-broad-vocabulary-for-casual-speech', 'Uses an unusually broad vocabulary even in casual talk.', 'sensory', 0.5, ['education', 'unusually-broad-vocabulary-for-casual-speech']),
  q('unusually-simple-vocabulary-by-choice', 'Deliberately keeps their vocabulary simple, however educated they are.', 'sensory', 0.3, [], { conflictTags: ['unusually-broad-vocabulary-for-casual-speech'] }),

  // --- possessions (batch 3) -----------------------------------------------------------------------
  q('carries-a-worn-deck-of-cards', 'Carries a worn deck of cards for idle moments.', 'possessions', 0.5, []),
  q('keeps-a-spare-set-of-everything', 'Keeps a spare of nearly everything they rely on.', 'possessions', 0.5, ['frontier']),
  q('carries-a-small-instrument', 'Carries a small musical instrument wherever they go.', 'possessions', 0.5, ['hobby']),
  q('keeps-old-tickets-and-stubs', 'Keeps old event tickets and travel stubs for sentimental reasons.', 'possessions', 0.5, ['sentimental']),

  // --- professional (batch 3) -----------------------------------------------------------------------
  q('proud-of-a-specific-technique', 'Is quietly proud of a specific technique they perfected.', 'professional', 0.5, ['trade']),
  q('self-taught-and-proud-of-it', 'Is self-taught, and mentions it whenever relevant.', 'professional', 0.5, ['self-taught-and-proud-of-it']),
  q('formally-trained-and-mentions-it', 'Had formal training, and it shows in how they explain things.', 'professional', 0.5, [], { conflictTags: ['self-taught-and-proud-of-it'] }),
  q('keeps-a-professional-reputation-carefully', 'Guards their professional reputation carefully.', 'professional', 0.5, []),

  // --- etiquette ---------------------------------------------------------------------------------
  q('observes-formal-greeting-etiquette', 'Observes a precise, formal greeting ritual with new acquaintances.', 'etiquette', 0.5, ['noble', 'observes-formal-greeting-etiquette']),
  q('casual-about-formal-etiquette', 'Treats formal etiquette casually, even in situations that call for it.', 'etiquette', 0.5, [], { conflictTags: ['observes-formal-greeting-etiquette'] }),
  q('always-offers-hospitality-first', 'Always offers food, drink, or a seat before discussing anything else.', 'etiquette', 0.7, ['endearing', 'community']),
  q('unfamiliar-with-local-customs-and-says-so', 'Openly admits when they do not know the local customs.', 'etiquette', 0.5, ['unfamiliar-with-local-customs-and-says-so']),
  q('quick-to-adopt-local-customs', 'Picks up local customs quickly, out of genuine curiosity.', 'etiquette', 0.5, [], { conflictTags: ['unfamiliar-with-local-customs-and-says-so'] }),

  // --- honor-code ---------------------------------------------------------------------------------
  q('lives-by-a-personal-code', 'Lives by a small, personal code they rarely explain but never break.', 'honor-code', 0.7, ['lives-by-a-personal-code']),
  q('flexible-about-personal-principles', 'Is fairly flexible about their own principles when it matters.', 'honor-code', 0.5, [], { conflictTags: ['lives-by-a-personal-code'] }),
  q('considers-a-handshake-binding', 'Considers a handshake as binding as any written contract.', 'honor-code', 0.5, ['frontier']),
  q('will-not-fight-someone-unarmed', 'Refuses to raise a hand against someone who cannot defend themselves.', 'honor-code', 0.5, []),

  // --- rite-of-passage -------------------------------------------------------------------------------
  q('marks-a-personal-coming-of-age-story', 'Occasionally references a formative coming-of-age experience.', 'rite-of-passage', 0.5, ['community-tribe']),
  q('remembers-their-first-real-job-fondly', 'Talks fondly about their very first real job.', 'rite-of-passage', 0.5, []),
  q('still-embarrassed-by-an-old-mistake', 'Still visibly winces recalling an old, minor mistake.', 'rite-of-passage', 0.5, []),

  // --- unfulfilled-ambition --------------------------------------------------------------------------
  q('mentions-an-old-dream-wistfully', 'Occasionally mentions an old, unfulfilled dream wistfully.', 'unfulfilled-ambition', 0.5, ['subtle', 'mentions-an-old-dream-wistfully']),
  q('has-a-bucket-list-they-mention', 'Has a small, specific list of things they hope to do someday.', 'unfulfilled-ambition', 0.5, []),
  q('content-with-how-things-turned-out', 'Seems genuinely content with how their life turned out.', 'unfulfilled-ambition', 0.5, [], { conflictTags: ['mentions-an-old-dream-wistfully'] }),

  // --- sibling-dynamics -------------------------------------------------------------------------------
  q('close-with-a-sibling', 'Is visibly close with a sibling, mentions them often.', 'sibling-dynamics', 0.5, ['community']),
  q('friendly-rivalry-with-a-sibling', 'Has a good-natured, ongoing rivalry with a sibling.', 'sibling-dynamics', 0.5, []),
  q('only-child-independence', 'Grew up an only child and it shows in their independence.', 'sibling-dynamics', 0.3, []),

  // --- found-family -----------------------------------------------------------------------------------
  q('considers-coworkers-family', 'Genuinely considers close coworkers a kind of family.', 'found-family', 0.7, ['endearing', 'considers-coworkers-family']),
  q('keeps-work-and-personal-life-strictly-separate', 'Keeps work relationships and personal life strictly separate.', 'found-family', 0.5, [], { conflictTags: ['considers-coworkers-family'] }),

  // --- adaptation -------------------------------------------------------------------------------------
  q('adapted-well-to-a-new-world', 'Adapted unusually well after relocating to an unfamiliar world.', 'adaptation', 0.5, ['frontier', 'adapted-well-to-a-new-world']),
  q('still-adjusting-after-years', 'Still seems to be adjusting, even after years in the same place.', 'adaptation', 0.5, [], { conflictTags: ['adapted-well-to-a-new-world'] }),
  q('relies-on-a-translator-device', 'Relies on a translator device for anything beyond basic conversation.', 'adaptation', 0.5, ['relies-on-a-translator-device']),
  q('picked-up-the-local-language-quickly', 'Picked up the local language remarkably quickly.', 'adaptation', 0.5, [], { conflictTags: ['relies-on-a-translator-device'] }),

  // --- gravity-environment -----------------------------------------------------------------------------
  q('unbothered-by-zero-g', 'Handles zero-gravity environments with total ease.', 'gravity-environment', 0.5, ['spacefaring', 'unbothered-by-zero-g']),
  q('never-quite-adjusts-to-zero-g', 'Never quite gets fully comfortable in zero gravity.', 'gravity-environment', 0.5, ['spacefaring'], { conflictTags: ['unbothered-by-zero-g'] }),
  q('misses-open-sky', 'Misses open sky after long stretches underground or aboard ship.', 'gravity-environment', 0.5, ['mining', 'spacefaring', 'misses-open-sky']),
  q('prefers-enclosed-station-living', 'Genuinely prefers the enclosed rhythm of station or ship living.', 'gravity-environment', 0.5, ['spacefaring'], { conflictTags: ['misses-open-sky'] }),

  // --- settlement-background ---------------------------------------------------------------------------
  q('misses-their-homeworld-climate', 'Occasionally mentions missing the climate of their homeworld.', 'settlement-background', 0.5, []),
  q('never-mentions-where-they-are-from', 'Never mentions, and seems to actively avoid, where they are originally from.', 'settlement-background', 0.5, ['mysterious', 'subtle']),
  q('proud-of-adapting-to-harsh-terrain', 'Is quietly proud of having adapted to genuinely harsh terrain.', 'settlement-background', 0.5, ['frontier']),

  // --- riddles-games -----------------------------------------------------------------------------------
  q('enjoys-riddles-and-wordplay', 'Genuinely enjoys riddles and wordplay.', 'riddles-games', 0.5, []),
  q('bad-at-games-of-chance-plays-anyway', 'Is consistently unlucky at games of chance, and plays anyway.', 'riddles-games', 0.5, ['endearing']),
  q('suspiciously-good-at-cards', 'Is suspiciously, almost unfairly good at cards.', 'riddles-games', 0.5, []),
  q('enjoys-strategy-games', 'Genuinely enjoys slow, strategic games.', 'riddles-games', 0.5, []),

  // --- fasting-feast -----------------------------------------------------------------------------------
  q('observes-a-periodic-fast', 'Observes a periodic fast tied to personal or cultural belief.', 'fasting-feast', 0.3, ['religion', 'cultural']),
  q('goes-all-out-for-feast-days', 'Goes all-out preparing for particular feast days.', 'fasting-feast', 0.5, ['cultural', 'community']),

  // --- mourning-customs --------------------------------------------------------------------------------
  q('observes-a-quiet-private-remembrance', 'Observes a quiet, private remembrance on a specific date each year.', 'mourning-customs', 0.5, ['subtle']),
  q('speaks-warmly-of-someone-they-lost', 'Speaks warmly, unprompted, of someone they have lost.', 'mourning-customs', 0.5, []),

  // --- droid-etiquette ---------------------------------------------------------------------------------
  q('always-thanks-droids-for-help', 'Always thanks a droid for its help, without fail.', 'droid-etiquette', 0.5, ['droids', 'endearing']),
  q('gives-droids-simple-direct-commands', 'Gives droids simple, direct commands and nothing more.', 'droid-etiquette', 0.5, ['droids']),
  q('chats-casually-with-droids', 'Chats casually with droids the way others chat with coworkers.', 'droid-etiquette', 0.5, ['droids', 'endearing']),

  // --- force-adjacent-belief ----------------------------------------------------------------------------
  q('privately-fascinated-by-the-force', 'Is privately, quietly fascinated by stories of the Force.', 'force-adjacent-belief', 0.3, ['force', 'privately-fascinated-by-the-force']),
  q('dismissive-of-force-stories', 'Is openly dismissive of stories about the Force.', 'force-adjacent-belief', 0.3, [], { conflictTags: ['privately-fascinated-by-the-force'] }),
  q('respectfully-cautious-around-force-users', 'Is respectfully cautious around anyone rumored to be Force-sensitive.', 'force-adjacent-belief', 0.3, ['force']),

  // --- mining-industrial-flavor -------------------------------------------------------------------------
  q('can-identify-ore-by-sound', 'Can identify ore quality by the sound it makes when struck.', 'mining-industrial-flavor', 0.5, ['mining']),
  q('permanently-half-deaf-from-machinery', 'Speaks a little too loudly, a lifetime of loud machinery to blame.', 'mining-industrial-flavor', 0.3, ['mining', 'industrial']),
  q('knows-every-safety-regulation-by-heart', 'Knows every safety regulation for their site by heart.', 'mining-industrial-flavor', 0.5, ['industrial']),

  // --- frontier-flavor ----------------------------------------------------------------------------------
  q('always-tracks-nearest-water-source', 'Instinctively keeps track of the nearest water source.', 'frontier-flavor', 0.5, ['frontier']),
  q('comfortable-with-long-silences-outdoors', 'Is completely comfortable with long silences while working outdoors.', 'frontier-flavor', 0.5, ['frontier']),
  q('distrusts-city-conveniences', 'Is quietly distrustful of conveniences city dwellers take for granted.', 'frontier-flavor', 0.5, ['frontier']),

  // --- urban-flavor -------------------------------------------------------------------------------------
  q('knows-every-shortcut-through-the-district', 'Knows every shortcut through their home district.', 'urban-flavor', 0.5, []),
  q('overwhelmed-by-open-frontier-quiet', 'Finds the quiet of open frontier country genuinely unsettling.', 'urban-flavor', 0.3, ['unsettling']),
  q('thrives-on-city-noise', 'Genuinely finds comfort in the constant noise of a busy city.', 'urban-flavor', 0.5, []),

  // --- weather-folk-methods --------------------------------------------------------------------------
  q('predicts-weather-by-feel', 'Claims to predict weather by feel, and is right more often than not.', 'weather-folk-methods', 0.5, ['frontier']),
  q('reads-animal-behavior-for-warnings', 'Reads local animal behavior as a warning system, out of habit.', 'weather-folk-methods', 0.5, ['frontier']),
  q('old-injury-aches-before-storms', 'Claims an old injury aches whenever a storm is coming.', 'weather-folk-methods', 0.3, []),

  // --- kitchen-habit -----------------------------------------------------------------------------------
  q('cooks-entirely-by-eye', 'Cooks entirely by eye, never measures anything precisely.', 'kitchen-habit', 0.5, ['cooks-entirely-by-eye']),
  q('measures-every-ingredient-precisely', 'Measures every ingredient with careful precision.', 'kitchen-habit', 0.5, [], { conflictTags: ['cooks-entirely-by-eye'] }),
  q('guards-a-family-recipe-jealously', 'Guards one particular family recipe jealously.', 'kitchen-habit', 0.5, ['sentimental']),

  // --- gear-maintenance-ritual -------------------------------------------------------------------------
  q('sharpens-tools-on-a-fixed-schedule', 'Sharpens and maintains their tools on a strict schedule.', 'gear-maintenance-ritual', 0.5, ['trade', 'tidy', 'sharpens-tools-on-a-fixed-schedule']),
  q('maintains-gear-only-when-it-fails', 'Only maintains gear once it visibly starts to fail.', 'gear-maintenance-ritual', 0.5, [], { conflictTags: ['sharpens-tools-on-a-fixed-schedule'] }),

  // --- accent-attitude ------------------------------------------------------------------------------------
  q('proud-of-a-thick-regional-accent', 'Wears a thick regional accent with visible pride.', 'accent-attitude', 0.5, ['frontier', 'proud-of-a-thick-regional-accent']),
  q('tries-to-soften-their-accent', 'Makes a visible effort to soften a strong regional accent.', 'accent-attitude', 0.5, [], { conflictTags: ['proud-of-a-thick-regional-accent'] }),
  q('picks-up-accents-of-people-nearby', 'Unconsciously picks up the accent of whoever they spend time with.', 'accent-attitude', 0.5, ['odd']),

  // --- clean-language --------------------------------------------------------------------------------------
  q('uses-colorful-language-freely', 'Uses colorful language freely, without much thought.', 'clean-language', 0.5, ['uses-colorful-language-freely']),
  q('deliberately-avoids-crude-language', 'Deliberately avoids crude language, even under stress.', 'clean-language', 0.5, [], { conflictTags: ['uses-colorful-language-freely'] }),
  q('has-an-inventive-set-of-substitute-curses', 'Has a set of inventive, harmless substitute curses.', 'clean-language', 0.5, ['endearing']),

  // --- fact-checking ------------------------------------------------------------------------------------------
  q('fact-checks-claims-reflexively', 'Cannot resist quietly fact-checking a dubious claim.', 'fact-checking', 0.5, ['fact-checks-claims-reflexively']),
  q('repeats-rumors-without-checking', 'Repeats interesting rumors without checking if they are true.', 'fact-checking', 0.5, [], { conflictTags: ['fact-checks-claims-reflexively'] }),

  // --- confidant-reputation -----------------------------------------------------------------------------------
  q('known-as-a-good-secret-keeper', 'Has a reputation as someone who genuinely keeps a secret.', 'confidant-reputation', 0.5, ['endearing', 'known-as-a-good-secret-keeper']),
  q('cannot-keep-a-secret', 'Is famously, endearingly bad at keeping a secret.', 'confidant-reputation', 0.5, ['endearing'], { conflictTags: ['known-as-a-good-secret-keeper'] }),
  q('people-open-up-to-them-easily', 'People seem to open up to them easily, without quite knowing why.', 'confidant-reputation', 0.7, ['endearing']),

  // --- eavesdropping-habit ------------------------------------------------------------------------------------
  q('cannot-help-overhearing-conversations', 'Cannot help catching fragments of nearby conversations.', 'eavesdropping-habit', 0.5, ['cannot-help-overhearing-conversations']),
  q('deliberately-tunes-out-nearby-talk', 'Deliberately tunes out conversations that are not their business.', 'eavesdropping-habit', 0.5, [], { conflictTags: ['cannot-help-overhearing-conversations'] }),
  q('enjoys-people-watching', 'Genuinely enjoys quietly watching people go about their day.', 'eavesdropping-habit', 0.5, []),

  // --- vigilance ----------------------------------------------------------------------------------------------
  q('notices-strangers-immediately', 'Notices a new face in a familiar space almost instantly.', 'vigilance', 0.5, []),
  q('protective-instinct-toward-strangers-in-need', 'Feels an immediate protective instinct toward anyone who seems in trouble.', 'vigilance', 0.7, ['endearing']),
  q('wary-of-unfamiliar-faces', 'Is visibly wary around unfamiliar faces at first.', 'vigilance', 0.5, []),

  // --- species-curiosity --------------------------------------------------------------------------------------
  q('genuinely-curious-about-other-species', 'Is genuinely, respectfully curious about unfamiliar species.', 'species-curiosity', 0.5, ['endearing']),
  q('has-close-friends-across-species-lines', 'Counts close friends across several different species.', 'species-curiosity', 0.5, ['endearing']),

  // --- superstition (batch 2) ---------------------------------------------------------------------------------
  q('avoids-a-specific-unlucky-word', 'Avoids saying one specific word they consider unlucky.', 'superstition-batch-2', 0.3, ['strange']),
  q('touches-wood-or-metal-for-luck', 'Touches a nearby surface for luck before anything risky.', 'superstition-batch-2', 0.5, ['strange']),
  q('will-not-whistle-indoors', 'Refuses to whistle indoors, for reasons rarely explained.', 'superstition-batch-2', 0.3, ['strange']),

  // --- pre-shift-ritual ----------------------------------------------------------------------------------------
  q('has-a-small-ritual-before-a-shift', 'Has a small, unvarying ritual before starting any shift.', 'pre-shift-ritual', 0.5, []),
  q('decompresses-with-a-fixed-routine-after-work', 'Decompresses with the exact same routine at the end of every shift.', 'pre-shift-ritual', 0.5, []),

  // --- celebration-style -----------------------------------------------------------------------------------------
  q('celebrates-milestones-loudly', 'Celebrates even small milestones with enthusiasm.', 'celebration-style', 0.5, ['endearing', 'celebrates-milestones-loudly']),
  q('marks-milestones-quietly', 'Marks personal milestones quietly, without much fuss.', 'celebration-style', 0.5, [], { conflictTags: ['celebrates-milestones-loudly'] }),
  q('dislikes-attention-on-their-birthday', 'Actively dislikes attention drawn to their own birthday.', 'celebration-style', 0.5, []),
  q('makes-a-big-deal-of-others-birthdays', 'Makes a genuine effort to celebrate other people birthdays.', 'celebration-style', 0.5, ['endearing']),

  // --- barter-preference -----------------------------------------------------------------------------------------
  q('prefers-barter-to-credits', 'Genuinely prefers barter and trade over straight credits.', 'barter-preference', 0.5, ['frontier', 'trade']),
  q('checks-their-credit-balance-obsessively', 'Checks their credit balance far more often than necessary.', 'barter-preference', 0.5, []),

  // --- calendar-habit ---------------------------------------------------------------------------------------------
  q('marks-every-appointment-in-a-physical-planner', 'Keeps a physical planner and marks every appointment by hand.', 'calendar-habit', 0.5, ['tidy', 'marks-every-appointment-in-a-physical-planner']),
  q('relies-entirely-on-memory-for-schedule', 'Relies entirely on memory to track their schedule.', 'calendar-habit', 0.5, [], { conflictTags: ['marks-every-appointment-in-a-physical-planner'] }),
  q('sets-multiple-reminders-for-everything', 'Sets multiple redundant reminders for anything important.', 'calendar-habit', 0.5, []),

  // --- love-language ---------------------------------------------------------------------------------------------
  q('shows-affection-through-acts-of-service', 'Shows affection by quietly doing things for people rather than saying so.', 'love-language', 0.7, ['endearing', 'shows-affection-through-acts-of-service']),
  q('shows-affection-through-words', 'Shows affection openly and directly through words.', 'love-language', 0.5, ['endearing'], { conflictTags: ['shows-affection-through-acts-of-service'] }),
  q('cooks-for-people-as-a-sign-of-care', 'Cooks for people as their primary way of showing they care.', 'love-language', 0.5, ['endearing']),

  // --- physical-affection ------------------------------------------------------------------------------------------
  q('comfortable-with-physical-affection', 'Is comfortable with physical affection like a hand on the shoulder.', 'physical-affection', 0.5, ['comfortable-with-physical-affection']),
  q('uncomfortable-with-physical-affection', 'Is visibly uncomfortable with unexpected physical affection.', 'physical-affection', 0.5, [], { conflictTags: ['comfortable-with-physical-affection'] }),
  q('greets-close-friends-with-a-hug', 'Greets close friends with an easy, natural hug.', 'physical-affection', 0.5, ['endearing', 'greets-close-friends-with-a-hug']),
  q('greets-everyone-with-a-formal-nod', 'Greets nearly everyone with a formal nod rather than touch.', 'physical-affection', 0.5, [], { conflictTags: ['greets-close-friends-with-a-hug'] }),

  // --- reflection ---------------------------------------------------------------------------------------------------
  q('reflects-out-loud-when-alone', 'Talks quietly to themselves when working alone.', 'reflection', 0.5, ['odd', 'reflects-out-loud-when-alone']),
  q('processes-decisions-silently', 'Processes big decisions silently, rarely thinking out loud.', 'reflection', 0.5, [], { conflictTags: ['reflects-out-loud-when-alone'] }),
  q('journals-about-their-day', 'Writes a short journal entry most nights.', 'reflection', 0.5, []),

  // --- generosity-of-time -------------------------------------------------------------------------------------------
  q('always-makes-time-for-people', 'Always seems to make time, however busy, for someone who needs it.', 'generosity-of-time', 0.7, ['endearing', 'always-makes-time-for-people']),
  q('guards-their-free-time-fiercely', 'Guards their limited free time fiercely.', 'generosity-of-time', 0.5, [], { conflictTags: ['always-makes-time-for-people'] }),

  // --- career-outlook -------------------------------------------------------------------------------------------------
  q('genuinely-proud-of-their-career-path', 'Is genuinely, visibly proud of the career path they chose.', 'career-outlook', 0.7, ['endearing']),
  q('mildly-wistful-about-a-different-path', 'Occasionally seems mildly wistful about a career path not taken.', 'career-outlook', 0.5, ['subtle']),
  q('nervous-around-new-hires-remembering-their-own-start', 'Gets visibly nostalgic watching new hires struggle, remembering their own first days.', 'career-outlook', 0.5, ['endearing']),
  q('still-gets-nervous-before-reviews', 'Still gets nervous before performance reviews, however senior they are.', 'career-outlook', 0.5, []),

  // --- diy-tinkering ---------------------------------------------------------------------------------------------------
  q('tinkers-with-inventions-in-spare-time', 'Tinkers with small personal inventions in their spare time.', 'diy-tinkering', 0.5, ['technology']),
  q('fixes-things-around-home-personally', 'Insists on fixing things around their own home personally.', 'diy-tinkering', 0.5, ['fixes-things-around-home-personally']),
  q('calls-in-help-for-anything-technical', 'Calls in help for anything even mildly technical.', 'diy-tinkering', 0.5, [], { conflictTags: ['fixes-things-around-home-personally'] }),

  // --- home-style --------------------------------------------------------------------------------------------------------
  q('keeps-a-minimalist-personal-space', 'Keeps a strikingly minimalist personal living space.', 'home-style', 0.5, ['tidy', 'keeps-a-minimalist-personal-space']),
  q('keeps-a-cluttered-but-organized-space', 'Keeps a cluttered personal space that somehow makes sense only to them.', 'home-style', 0.5, [], { conflictTags: ['keeps-a-minimalist-personal-space'] }),
  q('decorates-with-travel-mementos', 'Decorates their space with mementos from every place they have lived or visited.', 'home-style', 0.5, ['sentimental']),

  // --- oral-history --------------------------------------------------------------------------------------------------------
  q('keeper-of-family-stories', 'Is the one who remembers and retells the family stories.', 'oral-history', 0.5, ['sentimental', 'community']),
  q('writes-long-letters-to-distant-family', 'Writes long, detailed letters to family far away.', 'oral-history', 0.5, ['community', 'writes-long-letters-to-distant-family']),
  q('sends-only-brief-check-in-messages', 'Sends only brief, functional check-in messages to family.', 'oral-history', 0.5, [], { conflictTags: ['writes-long-letters-to-distant-family'] }),

  // --- gift-reactions ---------------------------------------------------------------------------------------------------
  q('loves-being-surprised', 'Genuinely loves being surprised.', 'gift-reactions', 0.5, ['endearing', 'loves-being-surprised']),
  q('hates-surprises-prefers-to-know', 'Strongly prefers to know things in advance, dislikes surprises.', 'gift-reactions', 0.5, [], { conflictTags: ['loves-being-surprised'] }),
  q('enjoys-planning-surprises-for-others', 'Genuinely enjoys planning surprises for people they care about.', 'gift-reactions', 0.5, ['endearing']),
  q('carefully-wraps-even-small-gifts', 'Takes real care wrapping even the smallest gift.', 'gift-reactions', 0.3, ['endearing']),

  // --- performance-comfort ---------------------------------------------------------------------------------------------------
  q('enjoys-dressing-up-for-occasions', 'Genuinely enjoys dressing up for special occasions.', 'performance-comfort', 0.5, ['enjoys-dressing-up-for-occasions']),
  q('avoids-costumes-and-dress-up', 'Avoids costumes or dressing up whenever possible.', 'performance-comfort', 0.5, [], { conflictTags: ['enjoys-dressing-up-for-occasions'] }),
  q('enthusiastic-but-terrible-dancer', 'Dances with real enthusiasm and very little skill.', 'performance-comfort', 0.5, ['endearing', 'enthusiastic-but-terrible-dancer']),
  q('refuses-to-dance-under-any-circumstances', 'Absolutely refuses to dance, no matter the occasion.', 'performance-comfort', 0.5, [], { conflictTags: ['enthusiastic-but-terrible-dancer'] }),

  // --- contracts-and-fine-print ---------------------------------------------------------------------------------------------
  q('reads-every-contract-line-by-line', 'Reads every contract line by line before signing anything.', 'contracts-and-fine-print', 0.5, ['business-professional', 'reads-every-contract-line-by-line']),
  q('skims-contracts-and-trusts-the-summary', 'Tends to skim contracts and trust a quick summary.', 'contracts-and-fine-print', 0.5, [], { conflictTags: ['reads-every-contract-line-by-line'] }),
  q('always-asks-about-hidden-fees', 'Always asks specifically about hidden fees before agreeing to anything.', 'contracts-and-fine-print', 0.5, []),

  // --- disaster-preparedness ---------------------------------------------------------------------------------------------------
  q('runs-through-emergency-plans-mentally', 'Mentally rehearses emergency plans, even in calm situations.', 'disaster-preparedness', 0.5, []),
  q('stays-calm-during-evacuations', 'Stays calm and methodical during an evacuation.', 'disaster-preparedness', 0.5, []),
  q('keeps-a-go-bag-ready', 'Keeps a small emergency bag packed and ready at all times.', 'disaster-preparedness', 0.5, ['frontier']),

  // --- heights-and-speed ---------------------------------------------------------------------------------------------------
  q('unbothered-by-heights', 'Is completely unbothered by heights that unsettle most people.', 'heights-and-speed', 0.5, ['unbothered-by-heights']),
  q('visibly-uneasy-with-heights', 'Gets visibly uneasy near significant heights.', 'heights-and-speed', 0.5, [], { conflictTags: ['unbothered-by-heights'] }),
  q('loves-high-speed-travel', 'Genuinely loves the thrill of high-speed travel.', 'heights-and-speed', 0.5, ['loves-high-speed-travel']),
  q('prefers-slow-careful-travel', 'Strongly prefers slow, careful travel over speed.', 'heights-and-speed', 0.5, [], { conflictTags: ['loves-high-speed-travel'] }),

  // --- estimation-skill ---------------------------------------------------------------------------------------------------
  q('excellent-at-quick-mental-math', 'Does quick mental math faster than most people expect.', 'estimation-skill', 0.5, ['scientist', 'business', 'excellent-at-quick-mental-math']),
  q('struggles-with-basic-arithmetic', 'Genuinely struggles with basic arithmetic, and is open about it.', 'estimation-skill', 0.5, [], { conflictTags: ['excellent-at-quick-mental-math'] }),
  q('can-eyeball-weight-and-distance-accurately', 'Can eyeball weight or distance with unusual accuracy.', 'estimation-skill', 0.5, ['trade']),
  q('always-underestimates-how-long-things-take', 'Consistently, almost comically underestimates how long a task will take.', 'estimation-skill', 0.5, ['endearing']),

  // --- trivia-knowledge ---------------------------------------------------------------------------------------------------
  q('encyclopedic-knowledge-of-a-niche-topic', 'Has an encyclopedic, unprompted knowledge of one oddly specific topic.', 'trivia-knowledge', 0.5, ['strange']),
  q('broad-but-shallow-general-knowledge', 'Knows a little about a great many things, and says so.', 'trivia-knowledge', 0.5, ['broad-but-shallow-general-knowledge']),
  q('deep-narrow-specialist-knowledge', 'Knows their own specialty deeply but little else.', 'trivia-knowledge', 0.5, [], { conflictTags: ['broad-but-shallow-general-knowledge'] }),

  // --- children-and-elders ---------------------------------------------------------------------------------------------------
  q('naturally-good-with-children', 'Is naturally, easily good with children.', 'children-and-elders', 0.5, ['endearing', 'naturally-good-with-children']),
  q('awkward-around-children', 'Is visibly awkward and unsure around children.', 'children-and-elders', 0.5, [], { conflictTags: ['naturally-good-with-children'] }),
  q('deeply-respectful-toward-elders', 'Shows unusual, deliberate respect toward elders.', 'children-and-elders', 0.5, ['community']),
  q('treats-elders-and-youth-exactly-the-same', 'Treats everyone, regardless of age, exactly the same.', 'children-and-elders', 0.5, []),

  // --- droid-vs-organic-preference ---------------------------------------------------------------------------------------------------
  q('more-at-ease-with-droids-than-people', 'Seems more at ease around droids than around most people.', 'droid-vs-organic-preference', 0.5, ['droids', 'more-at-ease-with-droids-than-people']),
  q('prefers-organic-company-strongly', 'Strongly prefers organic company, finds droids a bit unsettling.', 'droid-vs-organic-preference', 0.3, [], { conflictTags: ['more-at-ease-with-droids-than-people'] }),

  // --- signature-quirk -----------------------------------------------------------------------------------------------------
  q('has-a-distinctive-personal-motto', 'Has a distinctive personal motto they repeat often.', 'signature-quirk', 0.5, []),
  q('ends-every-conversation-the-same-way', 'Ends nearly every conversation with the exact same phrase.', 'signature-quirk', 0.5, ['odd']),
  q('has-a-signature-way-of-saying-goodbye', 'Has a distinctive, easily recognizable way of saying goodbye.', 'signature-quirk', 0.5, []),

  // --- workplace-friendship ---------------------------------------------------------------------------------------------------
  q('has-one-especially-close-coworker', 'Has one particular coworker they are unusually close with.', 'workplace-friendship', 0.5, ['has-one-especially-close-coworker']),
  q('keeps-coworkers-at-a-professional-distance', 'Keeps coworkers at a friendly but professional distance.', 'workplace-friendship', 0.5, [], { conflictTags: ['has-one-especially-close-coworker'] }),
  q('organizes-informal-team-gatherings', 'Is usually the one who organizes informal team gatherings.', 'workplace-friendship', 0.5, ['endearing']),

  // --- keepsakes-and-tools --------------------------------------------------------------------------------------------------
  q('carries-tools-inherited-from-a-mentor', 'Carries tools handed down from a mentor, kept in careful working order.', 'keepsakes-and-tools', 0.5, ['sentimental', 'trade', 'carries-tools-inherited-from-a-mentor']),
  q('replaces-tools-the-moment-they-wear-out', 'Replaces worn tools immediately, sees no sentiment in keeping old ones.', 'keepsakes-and-tools', 0.5, [], { conflictTags: ['carries-tools-inherited-from-a-mentor'] }),
  q('keeps-a-broken-item-they-cannot-repair', 'Keeps a broken, sentimental item they have never managed to repair.', 'keepsakes-and-tools', 0.3, ['sentimental']),

  // --- comparison-and-envy ----------------------------------------------------------------------------------------------------
  q('measures-success-against-a-specific-rival', 'Quietly measures their own success against one specific rival.', 'comparison-and-envy', 0.5, ['measures-success-against-a-specific-rival']),
  q('genuinely-does-not-compare-themselves-to-others', 'Genuinely seems not to compare themselves to others.', 'comparison-and-envy', 0.5, ['endearing'], { conflictTags: ['measures-success-against-a-specific-rival'] }),
  q('quick-to-celebrate-others-success', 'Is quick to genuinely celebrate the success of someone else.', 'comparison-and-envy', 0.5, ['endearing']),

  // --- work-ethic-visible ------------------------------------------------------------------------------------------------------
  q('visibly-tireless-worker', 'Seems to work tirelessly, rarely if ever slowing down.', 'work-ethic-visible', 0.7, ['visibly-tireless-worker']),
  q('works-in-short-intense-bursts', 'Works in short, intense bursts rather than steady effort.', 'work-ethic-visible', 0.5, [], { conflictTags: ['visibly-tireless-worker'] }),
  q('sets-a-steady-unhurried-pace', 'Sets a steady, unhurried pace and never deviates from it.', 'work-ethic-visible', 0.5, []),

  // --- promises-to-self --------------------------------------------------------------------------------------------------------
  q('made-a-quiet-promise-to-themselves', 'Made a quiet, private promise to themselves years ago and still keeps it.', 'promises-to-self', 0.5, ['subtle']),
  q('sets-small-personal-goals-constantly', 'Constantly sets small, achievable personal goals.', 'promises-to-self', 0.5, []),

  // --- risk-with-money --------------------------------------------------------------------------------------------------------
  q('invests-cautiously-and-slowly', 'Invests what little they can spare, cautiously and slowly.', 'risk-with-money', 0.5, ['financial-services']),
  q('spends-on-experiences-not-things', 'Prefers to spend on experiences rather than possessions.', 'risk-with-money', 0.5, []),
  q('saves-obsessively-for-an-unclear-goal', 'Saves obsessively toward a goal they rarely explain.', 'risk-with-money', 0.5, ['mysterious', 'subtle']),

  // --- appearance-of-confidence ------------------------------------------------------------------------------------------------
  q('projects-confidence-they-do-not-fully-feel', 'Projects far more confidence than they privately feel.', 'appearance-of-confidence', 0.5, ['subtle']),
  q('genuinely-unbothered-by-others-opinions', 'Seems genuinely, refreshingly unbothered by what others think.', 'appearance-of-confidence', 0.5, ['endearing']),

  // --- small-talk-topics -------------------------------------------------------------------------------------------------------
  q('always-asks-about-the-weather-first', 'Always opens small talk with a comment about the weather.', 'small-talk-topics', 0.5, ['always-asks-about-the-weather-first']),
  q('skips-small-talk-entirely', 'Skips small talk entirely, goes straight to the point.', 'small-talk-topics', 0.5, [], { conflictTags: ['always-asks-about-the-weather-first'] }),
  q('always-asks-how-someones-family-is', "Always makes a point of asking how someone's family is doing.", 'small-talk-topics', 0.5, ['endearing']),

  // --- reaction-to-authority-mistakes ------------------------------------------------------------------------------------------
  q('quietly-notes-when-superiors-are-wrong', 'Quietly notes it, without comment, when a superior makes a mistake.', 'reaction-to-authority-mistakes', 0.5, []),
  q('will-politely-correct-a-superior', 'Will politely but firmly correct a mistake made by a superior when it matters.', 'reaction-to-authority-mistakes', 0.5, []),

  // --- seasonal-mood -----------------------------------------------------------------------------------------------------------
  q('noticeably-brighter-mood-in-certain-seasons', 'Has a noticeably brighter mood during a particular season.', 'seasonal-mood', 0.3, []),
  q('gets-a-little-melancholy-at-certain-times-of-year', 'Gets quietly, briefly melancholy around a certain time of year.', 'seasonal-mood', 0.3, ['subtle']),

  // --- crowd-navigation ------------------------------------------------------------------------------------------------------
  q('navigates-crowds-effortlessly', 'Moves through a crowded space with unusual, practiced ease.', 'crowd-navigation', 0.5, ['navigates-crowds-effortlessly']),
  q('gets-visibly-flustered-in-crowds', 'Gets visibly flustered trying to move through a crowded space.', 'crowd-navigation', 0.5, [], { conflictTags: ['navigates-crowds-effortlessly'] }),

  // --- observational-habit ----------------------------------------------------------------------------------------------------
  q('notices-when-something-is-slightly-out-of-place', 'Notices immediately when something in a familiar space is slightly out of place.', 'observational-habit', 0.5, ['notices-when-something-is-slightly-out-of-place']),
  q('genuinely-does-not-notice-small-changes', 'Genuinely does not notice small changes to a familiar space.', 'observational-habit', 0.5, [], { conflictTags: ['notices-when-something-is-slightly-out-of-place'] }),

  // --- apprentice-memory -------------------------------------------------------------------------------------------------------
  q('still-uses-a-trick-a-mentor-taught-them', 'Still uses a specific technique a mentor taught them years ago.', 'apprentice-memory', 0.5, ['sentimental']),
  q('remembers-being-nervous-as-an-apprentice', 'Openly remembers, and sympathizes with, being a nervous apprentice.', 'apprentice-memory', 0.5, ['endearing']),

  // --- borrowed-wisdom ----------------------------------------------------------------------------------------------------------
  q('quotes-a-parent-or-elder-often', 'Quotes a parent or elder often, sometimes without realizing it.', 'borrowed-wisdom', 0.5, ['community']),
  q('has-their-own-hard-won-sayings', 'Has developed their own set of hard-won personal sayings.', 'borrowed-wisdom', 0.5, []),

  // --- reaction-to-praise-from-strangers -------------------------------------------------------------------------------------------
  q('embarrassed-by-public-recognition', 'Gets visibly embarrassed by public recognition.', 'reaction-to-praise-from-strangers', 0.5, []),
  q('quietly-pleased-by-a-strangers-compliment', 'Is quietly, visibly pleased by an unexpected compliment from a stranger.', 'reaction-to-praise-from-strangers', 0.5, ['endearing']),

  // --- personal-symbols --------------------------------------------------------------------------------------------------------
  q('has-a-personal-symbol-they-use', 'Has a small personal symbol they mark on their own belongings.', 'personal-symbols', 0.3, []),
  q('keeps-a-specific-color-as-a-personal-signature', 'Consistently wears or uses one particular color as a kind of signature.', 'personal-symbols', 0.3, []),

  // --- reaction-to-loud-noises -----------------------------------------------------------------------------------------------------
  q('unbothered-by-sudden-loud-noises', 'Is remarkably unbothered by sudden loud noises.', 'reaction-to-loud-noises', 0.5, ['unbothered-by-sudden-loud-noises']),
  q('startled-badly-by-sudden-loud-noises', 'Is startled unusually badly by sudden loud noises.', 'reaction-to-loud-noises', 0.5, [], { conflictTags: ['unbothered-by-sudden-loud-noises'] }),

  // --- self-description-style -----------------------------------------------------------------------------------------------------
  q('describes-themselves-through-their-work', 'Describes themselves almost entirely in terms of their work.', 'self-description-style', 0.5, ['describes-themselves-through-their-work']),
  q('describes-themselves-through-relationships', 'Describes themselves in terms of the people they care about.', 'self-description-style', 0.5, [], { conflictTags: ['describes-themselves-through-their-work'] }),

  // --- reaction-to-being-thanked ---------------------------------------------------------------------------------------------------
  q('brushes-off-thanks-quickly', 'Brushes off being thanked, changes the subject quickly.', 'reaction-to-being-thanked', 0.5, ['brushes-off-thanks-quickly']),
  q('graciously-accepts-thanks', 'Accepts thanks graciously, without deflecting.', 'reaction-to-being-thanked', 0.5, [], { conflictTags: ['brushes-off-thanks-quickly'] }),

  // --- competence-signaling ---------------------------------------------------------------------------------------------------------
  q('undersells-their-own-skill', 'Consistently undersells their own genuine skill.', 'competence-signaling', 0.5, ['undersells-their-own-skill']),
  q('confidently-states-their-own-strengths', 'States their own strengths plainly and without false modesty.', 'competence-signaling', 0.5, [], { conflictTags: ['undersells-their-own-skill'] }),

  // --- waiting-behavior ------------------------------------------------------------------------------------------------------------
  q('reads-while-waiting', 'Always has something to read for unexpected waiting periods.', 'waiting-behavior', 0.5, ['reads-while-waiting']),
  q('paces-restlessly-while-waiting', 'Paces restlessly during any long wait.', 'waiting-behavior', 0.5, [], { conflictTags: ['reads-while-waiting'] }),
  q('strikes-up-conversation-with-strangers-while-waiting', 'Strikes up conversation with whoever else is waiting nearby.', 'waiting-behavior', 0.5, ['endearing']),

  // --- reaction-to-change-of-plans -------------------------------------------------------------------------------------------------
  q('rolls-with-sudden-plan-changes', 'Rolls with sudden changes of plan without much visible strain.', 'reaction-to-change-of-plans', 0.5, ['rolls-with-sudden-plan-changes']),
  q('visibly-thrown-by-last-minute-changes', 'Is visibly thrown by last-minute changes to a plan.', 'reaction-to-change-of-plans', 0.5, [], { conflictTags: ['rolls-with-sudden-plan-changes'] }),

  // --- appreciation-of-craftsmanship ---------------------------------------------------------------------------------------------------
  q('admires-quality-craftsmanship-openly', 'Openly admires well-made equipment or fine craftsmanship.', 'appreciation-of-craftsmanship', 0.5, ['trade', 'admires-quality-craftsmanship-openly']),
  q('indifferent-to-quality-as-long-as-it-works', 'Cares only that something works, not how well it is made.', 'appreciation-of-craftsmanship', 0.5, [], { conflictTags: ['admires-quality-craftsmanship-openly'] }),

  // --- reaction-to-being-wrong ------------------------------------------------------------------------------------------------------------
  q('laughs-easily-at-their-own-errors', 'Laughs easily at their own small errors.', 'reaction-to-being-wrong', 0.5, ['endearing', 'laughs-easily-at-their-own-errors']),
  q('quietly-stung-by-small-errors', 'Is quietly, privately stung by even small errors.', 'reaction-to-being-wrong', 0.5, [], { conflictTags: ['laughs-easily-at-their-own-errors'] }),

  // --- morning-greeting-style -------------------------------------------------------------------------------------------------------------
  q('greets-everyone-warmly-each-morning', 'Makes a point of warmly greeting everyone at the start of the day.', 'morning-greeting-style', 0.5, ['endearing', 'greets-everyone-warmly-each-morning']),
  q('needs-time-before-being-sociable', 'Genuinely needs some quiet time before becoming sociable.', 'morning-greeting-style', 0.5, [], { conflictTags: ['greets-everyone-warmly-each-morning'] }),

  // --- attachment-to-routine-objects --------------------------------------------------------------------------------------------------------
  q('has-a-favorite-chair-or-spot', 'Has a clearly favorite chair or spot, and gently defends it.', 'attachment-to-routine-objects', 0.3, ['endearing', 'has-a-favorite-chair-or-spot']),
  q('indifferent-to-where-they-sit-or-stand', 'Is genuinely indifferent to where they sit or stand.', 'attachment-to-routine-objects', 0.3, [], { conflictTags: ['has-a-favorite-chair-or-spot'] }),

  // --- reaction-to-unfamiliar-technology ---------------------------------------------------------------------------------------------------
  q('excited-to-try-unfamiliar-tech', 'Gets genuinely excited trying out unfamiliar technology.', 'reaction-to-unfamiliar-technology', 0.5, ['technology', 'excited-to-try-unfamiliar-tech']),
  q('cautious-approaching-unfamiliar-tech', 'Approaches unfamiliar technology cautiously, reads everything first.', 'reaction-to-unfamiliar-technology', 0.5, [], { conflictTags: ['excited-to-try-unfamiliar-tech'] }),

  // --- silence-comfort-in-groups -----------------------------------------------------------------------------------------------------------
  q('comfortable-being-the-quiet-one-in-a-group', 'Is entirely comfortable being the quiet one in a group.', 'silence-comfort-in-groups', 0.5, ['comfortable-being-the-quiet-one-in-a-group']),
  q('feels-responsible-for-filling-group-silence', 'Feels a reflexive need to fill silence in a group setting.', 'silence-comfort-in-groups', 0.5, [], { conflictTags: ['comfortable-being-the-quiet-one-in-a-group'] }),

  // --- reaction-to-compliments-about-appearance ------------------------------------------------------------------------------------------------
  q('deflects-compliments-about-appearance', 'Deflects compliments about their appearance almost automatically.', 'reaction-to-compliments-about-appearance', 0.5, ['deflects-compliments-about-appearance']),
  q('accepts-compliments-about-appearance-graciously', 'Accepts compliments about their appearance graciously and simply.', 'reaction-to-compliments-about-appearance', 0.5, [], { conflictTags: ['deflects-compliments-about-appearance'] }),

  // --- reaction-to-new-responsibility --------------------------------------------------------------------------------------------------------------
  q('eager-for-more-responsibility', 'Is visibly eager to take on more responsibility.', 'reaction-to-new-responsibility', 0.5, ['business-professional', 'eager-for-more-responsibility']),
  q('content-with-current-level-of-responsibility', 'Is genuinely content at their current level of responsibility.', 'reaction-to-new-responsibility', 0.5, [], { conflictTags: ['eager-for-more-responsibility'] }),

  // --- personal-scent-of-home ----------------------------------------------------------------------------------------------------------------------
  q('keeps-a-scent-that-reminds-them-of-home', 'Keeps a small item scented like something from home.', 'personal-scent-of-home', 0.3, ['sentimental', 'odor']),

  // --- reaction-to-formal-events ---------------------------------------------------------------------------------------------------------------------
  q('genuinely-enjoys-formal-events', 'Genuinely enjoys the ritual of a formal event.', 'reaction-to-formal-events', 0.5, ['noble', 'genuinely-enjoys-formal-events']),
  q('counts-down-the-minutes-at-formal-events', 'Quietly counts down the minutes until a formal event ends.', 'reaction-to-formal-events', 0.5, [], { conflictTags: ['genuinely-enjoys-formal-events'] }),

  // --- reaction-to-repetitive-work ----------------------------------------------------------------------------------------------------------------------
  q('finds-repetitive-work-meditative', 'Finds repetitive, routine work genuinely calming.', 'reaction-to-repetitive-work', 0.5, ['finds-repetitive-work-meditative']),
  q('gets-restless-with-repetitive-work', 'Gets visibly restless doing the same task repeatedly.', 'reaction-to-repetitive-work', 0.5, [], { conflictTags: ['finds-repetitive-work-meditative'] }),

  // --- reaction-to-being-watched-while-working -----------------------------------------------------------------------------------------------------------
  q('unbothered-being-watched-while-working', 'Is completely unbothered being watched while they work.', 'reaction-to-being-watched-while-working', 0.5, ['unbothered-being-watched-while-working']),
  q('self-conscious-being-watched-while-working', 'Gets visibly self-conscious if watched closely while working.', 'reaction-to-being-watched-while-working', 0.5, [], { conflictTags: ['unbothered-being-watched-while-working'] }),

  // --- reaction-to-unexpected-visitors --------------------------------------------------------------------------------------------------------------------
  q('welcomes-unexpected-visitors-warmly', 'Welcomes an unexpected visitor as warmly as an invited one.', 'reaction-to-unexpected-visitors', 0.5, ['endearing', 'welcomes-unexpected-visitors-warmly']),
  q('flustered-by-unannounced-visitors', 'Gets visibly flustered by anyone arriving unannounced.', 'reaction-to-unexpected-visitors', 0.5, [], { conflictTags: ['welcomes-unexpected-visitors-warmly'] }),

  // --- pace-of-speech-when-explaining -----------------------------------------------------------------------------------------------------------------------
  q('slows-down-instinctively-when-explaining', 'Instinctively slows their speech when explaining something important.', 'pace-of-speech-when-explaining', 0.5, ['education', 'slows-down-instinctively-when-explaining']),
  q('speeds-up-when-excited-to-explain', 'Speeds up noticeably when excited to explain something they know well.', 'pace-of-speech-when-explaining', 0.5, [], { conflictTags: ['slows-down-instinctively-when-explaining'] }),

  // --- reaction-to-silence-in-negotiation -----------------------------------------------------------------------------------------------------------------------
  q('comfortable-with-long-negotiation-silences', 'Is genuinely comfortable letting a negotiation sit in silence.', 'reaction-to-silence-in-negotiation', 0.5, ['business', 'comfortable-with-long-negotiation-silences']),
  q('fills-negotiation-silences-nervously', 'Fills silence during negotiations nervously, sometimes to their own disadvantage.', 'reaction-to-silence-in-negotiation', 0.5, [], { conflictTags: ['comfortable-with-long-negotiation-silences'] }),

  // --- reaction-to-losing-an-argument-they-were-right-about -----------------------------------------------------------------------------------------------------------
  q('lets-a-lost-argument-go-easily-even-when-right', 'Lets an argument go easily, even when later proven right.', 'reaction-to-being-right', 0.5, ['endearing', 'lets-a-lost-argument-go-easily-even-when-right']),
  q('brings-up-being-right-later', 'Occasionally brings up, gently, that they were right about something.', 'reaction-to-being-right', 0.5, [], { conflictTags: ['lets-a-lost-argument-go-easily-even-when-right'] }),

  // --- reaction-to-quiet-praise-versus-public-praise -----------------------------------------------------------------------------------------------------------
  q('prefers-quiet-private-praise', 'Clearly prefers a quiet word of praise over public recognition.', 'praise-preference', 0.5, ['prefers-quiet-private-praise']),
  q('lights-up-at-public-recognition', 'Visibly lights up at recognition given in front of others.', 'praise-preference', 0.5, [], { conflictTags: ['prefers-quiet-private-praise'] }),

  // --- reaction-to-unfinished-business -----------------------------------------------------------------------------------------------------------
  q('cannot-leave-a-task-unfinished-overnight', 'Cannot bring themselves to leave an unfinished task overnight.', 'unfinished-business', 0.5, ['cannot-leave-a-task-unfinished-overnight']),
  q('comfortable-leaving-tasks-for-tomorrow', 'Is genuinely comfortable leaving a task for the next day.', 'unfinished-business', 0.5, [], { conflictTags: ['cannot-leave-a-task-unfinished-overnight'] }),

  // --- reaction-to-strangers-asking-for-directions -----------------------------------------------------------------------------------------------------------
  q('happily-gives-detailed-directions-to-strangers', 'Happily gives strangers far more detailed directions than needed.', 'strangers-asking-directions', 0.5, ['endearing', 'happily-gives-detailed-directions-to-strangers']),
  q('gives-directions-reluctantly-and-briefly', 'Gives directions to strangers reluctantly and as briefly as possible.', 'strangers-asking-directions', 0.3, [], { conflictTags: ['happily-gives-detailed-directions-to-strangers'] }),

  // --- reaction-to-being-asked-for-help-outside-expertise -----------------------------------------------------------------------------------------------------------
  q('tries-to-help-even-outside-their-expertise', 'Tries to help even with problems outside their expertise, however imperfectly.', 'help-outside-expertise', 0.5, ['endearing', 'tries-to-help-even-outside-their-expertise']),
  q('refers-people-to-the-right-expert', 'Quickly refers people to whoever is actually the right expert.', 'help-outside-expertise', 0.5, [], { conflictTags: ['tries-to-help-even-outside-their-expertise'] }),

  // --- reaction-to-repeating-themselves -----------------------------------------------------------------------------------------------------------
  q('rephrases-patiently-when-not-understood', 'Rephrases patiently, without frustration, when not understood the first time.', 'repeating-themselves', 0.5, ['endearing', 'rephrases-patiently-when-not-understood']),
  q('visibly-annoyed-repeating-themselves', 'Gets visibly annoyed having to repeat themselves.', 'repeating-themselves', 0.5, [], { conflictTags: ['rephrases-patiently-when-not-understood'] }),

  // --- reaction-to-quiet-workplaces-versus-loud-ones -----------------------------------------------------------------------------------------------------------
  q('prefers-a-quiet-orderly-workplace', 'Clearly prefers, and works best in, a quiet, orderly workplace.', 'workplace-atmosphere-preference', 0.5, ['tidy', 'prefers-a-quiet-orderly-workplace']),
  q('thrives-in-loud-busy-workplaces', 'Genuinely thrives in a loud, busy, chaotic workplace.', 'workplace-atmosphere-preference', 0.5, [], { conflictTags: ['prefers-a-quiet-orderly-workplace'] }),

  // --- reaction-to-a-job-well-done -----------------------------------------------------------------------------------------------------------
  q('takes-a-moment-to-appreciate-finished-work', 'Takes a small, quiet moment to appreciate a job well done.', 'job-well-done', 0.5, ['endearing', 'takes-a-moment-to-appreciate-finished-work']),
  q('immediately-moves-to-the-next-task', 'Moves immediately to the next task, rarely pauses to appreciate the last one.', 'job-well-done', 0.5, [], { conflictTags: ['takes-a-moment-to-appreciate-finished-work'] }),

  // --- reaction-to-unexpected-free-time -----------------------------------------------------------------------------------------------------------
  q('fills-unexpected-free-time-with-a-project', 'Fills any unexpected free time with a small personal project.', 'unexpected-free-time', 0.5, ['fills-unexpected-free-time-with-a-project']),
  q('genuinely-relaxes-during-unexpected-free-time', 'Genuinely relaxes, no agenda, during unexpected free time.', 'unexpected-free-time', 0.5, [], { conflictTags: ['fills-unexpected-free-time-with-a-project'] }),

  // --- reaction-to-a-compliment-about-their-work -----------------------------------------------------------------------------------------------------------
  q('shares-credit-immediately', 'Shares credit for good work immediately and without prompting.', 'compliment-about-work', 0.5, ['endearing', 'shares-credit-immediately']),
  q('quietly-proud-but-says-little', 'Is quietly, visibly proud of praised work but says very little about it.', 'compliment-about-work', 0.5, [], { conflictTags: ['shares-credit-immediately'] }),

  // --- reaction-to-being-asked-personal-questions -----------------------------------------------------------------------------------------------------------
  q('answers-personal-questions-openly', 'Answers even fairly personal questions with surprising openness.', 'personal-questions', 0.5, ['answers-personal-questions-openly']),
  q('deflects-personal-questions-smoothly', 'Deflects personal questions smoothly, without seeming rude about it.', 'personal-questions', 0.5, ['subtle'], { conflictTags: ['answers-personal-questions-openly'] }),

  // --- reaction-to-a-quiet-compliment-from-a-superior -----------------------------------------------------------------------------------------------------------
  q('remembers-a-single-piece-of-praise-for-years', 'Still remembers, word for word, one piece of praise from years ago.', 'praise-memory', 0.5, ['sentimental', 'remembers-a-single-piece-of-praise-for-years']),
  q('forgets-praise-almost-immediately', 'Forgets praise almost as soon as it is given, moves right along.', 'praise-memory', 0.5, [], { conflictTags: ['remembers-a-single-piece-of-praise-for-years'] }),

  // --- reaction-to-idle-hands -----------------------------------------------------------------------------------------------------------
  q('cannot-stand-having-idle-hands', 'Cannot stand having idle hands, always finds something to do with them.', 'idle-hands', 0.5, ['cannot-stand-having-idle-hands'], { requiresTags: ['organic-hands'] }),
  q('perfectly-content-with-idle-hands', 'Is perfectly content just sitting with idle hands.', 'idle-hands', 0.5, [], { conflictTags: ['cannot-stand-having-idle-hands'] }),

  // --- reaction-to-a-job-that-does-not-go-as-planned -----------------------------------------------------------------------------------------------------------
  q('adjusts-plans-mid-task-without-complaint', 'Adjusts a plan mid-task without complaint when things go sideways.', 'plans-going-sideways', 0.5, ['adjusts-plans-mid-task-without-complaint']),
  q('visibly-frustrated-when-plans-change-mid-task', 'Gets visibly, if briefly, frustrated when a plan changes mid-task.', 'plans-going-sideways', 0.5, [], { conflictTags: ['adjusts-plans-mid-task-without-complaint'] }),
  q('finds-the-silver-lining-in-a-botched-plan', 'Has a knack for finding something salvageable in a plan gone wrong.', 'plans-going-sideways', 0.5, ['endearing'])
]);
