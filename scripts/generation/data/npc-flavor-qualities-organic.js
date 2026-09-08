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
  q('barely-audible-voice', 'Speaks so quietly others must lean in.', 'sensory', 1, ['quiet'], { conflictTags: ['loud-voice'] }),
  q('booming-laugh', 'Has a booming, unmistakable laugh.', 'sensory', 1, ['loud']),
  q('unusual-eye-color', 'Has an unusually striking eye color.', 'sensory', 0.7, []),
  q('distinctive-scar', 'Carries a distinctive scar that draws the eye.', 'sensory', 1, ['appearance'], { roleTags: ['soldier', 'security'] }),
  q('constantly-sniffling', 'Constantly sniffling, as if perpetually fighting a cold.', 'sensory', 1, ['odd']),
  q('very-cold-hands', 'Has noticeably cold hands.', 'sensory', 0.7, [], { requiresTags: ['organic-hands'] }),
  q('sweats-easily', 'Sweats easily, even in comfortable temperatures.', 'sensory', 0.7, []),
  q('unusually-tall', 'Strikingly tall for their species.', 'sensory', 0.7, [], { conflictTags: ['unusually-short'] }),
  q('unusually-short', 'Strikingly short for their species.', 'sensory', 0.7, [], { conflictTags: ['unusually-tall'] }),

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
  q('perfect-posture', 'Maintains rigidly perfect posture at all times.', 'body-language', 1, [], { roleTags: ['soldier', 'security', 'noble'] }),
  q('slouches-badly', 'Slouches noticeably, regardless of the setting.', 'body-language', 1, [], { conflictTags: ['perfect-posture'] }),
  q('talks-with-hands', 'Talks constantly with their hands.', 'body-language', 1, [], { requiresTags: ['organic-hands'] }),

  // --- grooming ---------------------------------------------------------
  q('perfectly-polished-boots', 'Their boots are exceptionally, almost obsessively clean.', 'grooming', 1, ['tidy'], { roleTags: ['soldier', 'security'], contextTags: ['wealthy', 'advanced'] }),
  q('uneven-haircut', 'Has a slightly uneven haircut.', 'grooming', 1, [], { requiresTags: ['hair'] }),
  q('constantly-fixes-collar', 'Constantly adjusts and fixes their collar.', 'grooming', 1, ['nervous']),
  q('immaculate-grooming', 'Immaculately groomed, not a hair out of place.', 'grooming', 1, ['tidy'], { contextTags: ['wealthy', 'advanced'], conflictTags: ['uneven-haircut'] }),
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
  q('always-cold', 'Always seems to be cold, regardless of the room temperature.', 'environmental', 1, []),
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
  q('mundane-uneventful', 'By most accounts, entirely unremarkable in person.', 'oddity', 1.5, ['mundane'])
]);
