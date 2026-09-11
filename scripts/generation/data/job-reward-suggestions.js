/**
 * PHASE 8D-3C hydration — narrative reward-suggestion pool for
 * `jobs/job-reward-suggestion.js`.
 *
 * Hydrated from the correction-round-2 20-entry representative catalog
 * to production scale (156 entries, within the phase spec's documented
 * 150-250 target). Wiring unchanged.
 *
 * The phase requirement was broader than credits + material assets
 * (`rewardEstimate`/`rewardPackage`, computed by `reward-estimator.js`/
 * `reward-package.js` and untouched here): favor, Faction standing,
 * access, information, transport, safe passage, legal clearance, debt
 * forgiveness, salvage rights, future service, medical treatment,
 * repairs, training, introduction/contact. These are SEMANTIC-ONLY
 * suggestions for a GM to narrate and, if they choose, separately and
 * explicitly commit through whatever future authority governs that
 * reward type (Faction standing, an actual granted Item, etc.) -- this
 * module never applies one on its own.
 *
 * `type` values map to `JOB_REWARD_SUGGESTION_TYPE` in `job-draft.js`.
 * Commodity-type suggestions are NOT listed here -- they are built at
 * generation time from a REAL `data/galactic-commodities.js` entry (see
 * `jobs/job-reward-suggestion.js`), never a fabricated id.
 */

export const JOB_REWARD_SUGGESTIONS = Object.freeze([
  { value: 'a personal favor from the client, redeemable later', weight: 2, tags: [], type: 'favor' },
  { value: 'improved standing with the employer\'s organization', weight: 2, tags: [], type: 'standing' },
  { value: 'access to a restricted facility or database', weight: 1, tags: ['investigation', 'infiltration'], type: 'access' },
  { value: 'privileged information about a rival operation', weight: 1, tags: ['investigation'], type: 'information' },
  { value: 'free passage through the employer\'s controlled territory', weight: 1, tags: ['delivery', 'smuggling'], type: 'transport' },
  { value: 'a letter of safe conduct signed by the employer', weight: 1, tags: ['illegal', 'smuggling'], type: 'safePassage' },
  { value: 'legal clearance for past unrelated activity', weight: 1, tags: ['illegal'], type: 'clearance' },
  { value: 'forgiveness of an outstanding debt owed to the employer', weight: 1, tags: [], type: 'debtForgiveness' },
  { value: 'salvage rights to whatever the crew recovers beyond the objective', weight: 1, tags: ['recovery', 'heist', 'salvage'], type: 'salvageRights' },
  { value: 'a future service the employer will perform on request', weight: 2, tags: [], type: 'service' },
  { value: 'medical treatment for the crew at the employer\'s expense', weight: 1, tags: [], type: 'medical' },
  { value: 'repairs to the crew\'s ship at the employer\'s expense', weight: 1, tags: [], type: 'repairs' },
  { value: 'training from one of the employer\'s specialists', weight: 1, tags: [], type: 'training' },
  { value: 'an introduction to a well-connected contact', weight: 1, tags: [], type: 'introduction' },
  { value: 'a standing invitation to the employer\'s private circle', weight: 1, tags: [], type: 'access' },
  { value: 'priority access to the employer\'s future job postings', weight: 1, tags: [], type: 'access' },
  { value: 'use of the employer\'s transport for an unrelated errand', weight: 1, tags: [], type: 'transport' },
  { value: 'a piece of gear the employer is willing to part with', weight: 1, tags: [], type: 'equipment', itemTags: ['reward-suggestion'] },
  { value: 'the employer will vouch for the crew with a third party', weight: 1, tags: [], type: 'introduction' },
  { value: 'nothing beyond the agreed payment -- no additional favor is offered', weight: 4, tags: [], type: 'none' },

  { value: 'a favor the employer will honor even if it puts them at personal risk', weight: 1, tags: [], type: 'favor' },
  { value: 'a small, discreet favor the employer can call in on anyone in their circle', weight: 1, tags: [], type: 'favor' },
  { value: 'a favor owed by someone the employer answers to, not the employer themselves', weight: 1, tags: [], type: 'favor' },
  { value: 'the employer\'s word that they will look the other way, once, on something unrelated', weight: 1, tags: ['gray-area'], type: 'favor' },
  { value: 'a favor redeemable only through the employer\'s official channels', weight: 1, tags: ['legal'], type: 'favor' },
  { value: 'a quiet favor from someone the employer trusts more than they trust the crew', weight: 1, tags: [], type: 'favor' },

  { value: 'formal recognition from the employer\'s organization, on the record', weight: 1, tags: ['legal'], type: 'standing' },
  { value: 'a seat at the table for the employer\'s next planning session', weight: 1, tags: [], type: 'standing' },
  { value: 'the employer\'s public endorsement, worth more than the payment itself', weight: 1, tags: [], type: 'standing' },
  { value: 'quiet respect from a rival organization watching this job unfold', weight: 1, tags: [], type: 'standing' },
  { value: 'a permanent improvement in how the employer\'s allies regard the crew', weight: 1, tags: [], type: 'standing' },
  { value: 'standing with a local militia grateful for the crew\'s discretion', weight: 1, tags: [], type: 'standing' },
  { value: 'a reputation boost among freelancers who work this employer\'s territory', weight: 1, tags: [], type: 'standing' },
  { value: 'standing with a criminal syndicate that few outsiders ever earn', weight: 1, tags: ['illegal'], type: 'standing' },

  { value: 'access to a private comm network the employer\'s organization maintains', weight: 1, tags: [], type: 'access' },
  { value: 'clearance to dock at a facility normally closed to outsiders', weight: 1, tags: [], type: 'access' },
  { value: 'access to the employer\'s private archive of records', weight: 1, tags: ['investigation'], type: 'access' },
  { value: 'a standing pass through territory the employer\'s organization controls', weight: 1, tags: [], type: 'access' },
  { value: 'access to specialized equipment the employer\'s organization maintains', weight: 1, tags: [], type: 'access' },
  { value: 'a backstage introduction to circles the crew could never otherwise reach', weight: 1, tags: [], type: 'access' },
  { value: 'access to a black-market supplier the employer personally vouches for', weight: 1, tags: ['illegal', 'black-market'], type: 'access' },

  { value: 'a detailed dossier on a rival the employer wants watched', weight: 1, tags: ['investigation'], type: 'information' },
  { value: 'early word of an opportunity before it goes public', weight: 1, tags: [], type: 'information' },
  { value: 'the location of something the crew has been quietly hunting', weight: 1, tags: ['investigation', 'recovery'], type: 'information' },
  { value: 'a warning about a threat the crew doesn\'t yet know exists', weight: 1, tags: [], type: 'information' },
  { value: 'proof of something the crew has long suspected but never confirmed', weight: 1, tags: ['investigation'], type: 'information' },
  { value: 'intelligence on a bounty the crew has been tracking on their own', weight: 1, tags: ['bounty', 'hunt'], type: 'information' },
  { value: 'a copy of records the employer\'s organization normally keeps sealed', weight: 1, tags: ['investigation'], type: 'information' },

  { value: 'an escort through a dangerous stretch of territory on the return trip', weight: 1, tags: ['escort'], type: 'transport' },
  { value: 'use of a faster ship for the crew\'s next job', weight: 1, tags: [], type: 'transport' },
  { value: 'priority docking rights at ports the employer\'s organization controls', weight: 1, tags: [], type: 'transport' },
  { value: 'fuel and supplies covered for the crew\'s next several jumps', weight: 1, tags: [], type: 'transport' },
  { value: 'a berth reserved for the crew at a facility that\'s normally full', weight: 1, tags: [], type: 'transport' },

  { value: 'safe conduct through territory the crew would otherwise avoid entirely', weight: 1, tags: ['illegal', 'smuggling'], type: 'safePassage' },
  { value: 'a guarantee the crew won\'t be searched at the employer\'s checkpoints', weight: 1, tags: ['gray-area', 'smuggling'], type: 'safePassage' },
  { value: 'safe passage for the crew\'s family or associates, not just the crew themselves', weight: 1, tags: [], type: 'safePassage' },
  { value: 'an escort of the employer\'s own people through hostile territory', weight: 1, tags: ['escort'], type: 'safePassage' },

  { value: 'clearance for a past job the crew never fully accounted for', weight: 1, tags: ['illegal', 'legal'], type: 'clearance' },
  { value: 'a clean record with a local authority the crew has crossed before', weight: 1, tags: ['legal'], type: 'clearance' },
  { value: 'legal cover for equipment the crew acquired through questionable means', weight: 1, tags: ['gray-area', 'legal'], type: 'clearance' },
  { value: 'clearance that lets the crew operate openly in territory they\'ve been avoiding', weight: 1, tags: ['legal'], type: 'clearance' },

  { value: 'forgiveness of a debt the crew forgot they still owed', weight: 1, tags: [], type: 'debtForgiveness' },
  { value: 'the employer quietly buying out a debt the crew owes someone else', weight: 1, tags: [], type: 'debtForgiveness' },
  { value: 'forgiveness of a debt owed by someone close to the crew, not the crew itself', weight: 1, tags: [], type: 'debtForgiveness' },

  { value: 'salvage rights to the opposition\'s equipment, should any survive', weight: 1, tags: ['assault', 'recovery'], type: 'salvageRights' },
  { value: 'salvage rights to an entire derelict the job happens to pass', weight: 1, tags: ['recovery', 'salvage'], type: 'salvageRights' },
  { value: 'first claim on anything unclaimed the crew finds along the way', weight: 1, tags: ['recovery', 'heist'], type: 'salvageRights' },
  { value: 'salvage rights the employer would normally reserve for their own people', weight: 1, tags: ['recovery'], type: 'salvageRights' },

  { value: 'a future service from the employer\'s specialists, no questions asked', weight: 1, tags: [], type: 'service' },
  { value: 'the employer personally intervening on the crew\'s behalf, once, later', weight: 1, tags: [], type: 'service' },
  { value: 'a standing offer of legal representation should the crew ever need it', weight: 1, tags: ['legal'], type: 'service' },
  { value: 'the employer\'s organization running interference on an unrelated problem', weight: 1, tags: [], type: 'service' },
  { value: 'a promise the employer will vouch for the crew to someone powerful', weight: 1, tags: [], type: 'service' },

  { value: 'a full medical workup for the whole crew, not just the injured', weight: 1, tags: [], type: 'medical' },
  { value: 'emergency medical coverage for the crew\'s next dangerous job', weight: 1, tags: [], type: 'medical' },
  { value: 'access to a specialist the crew could never otherwise afford', weight: 1, tags: [], type: 'medical' },
  { value: 'a cybernetic or prosthetic upgrade covered at the employer\'s expense', weight: 1, tags: [], type: 'medical' },

  { value: 'a full overhaul of the crew\'s ship, not just the immediate damage', weight: 1, tags: [], type: 'repairs' },
  { value: 'an upgrade to the crew\'s ship folded into the repair work', weight: 1, tags: [], type: 'repairs' },
  { value: 'priority repair slotting at a facility with a long waitlist', weight: 1, tags: [], type: 'repairs' },
  { value: 'repairs performed by a specialist most crews never get access to', weight: 1, tags: [], type: 'repairs' },

  { value: 'combat training from veterans of the employer\'s own organization', weight: 1, tags: [], type: 'training' },
  { value: 'technical training on equipment the crew doesn\'t yet know how to use', weight: 1, tags: [], type: 'training' },
  { value: 'negotiation training from someone who clearly knows what they\'re doing', weight: 1, tags: [], type: 'training' },
  { value: 'piloting instruction from someone with a reputation the crew respects', weight: 1, tags: [], type: 'training' },

  { value: 'an introduction to someone who could change the crew\'s fortunes entirely', weight: 1, tags: [], type: 'introduction' },
  { value: 'an introduction to a supplier who normally won\'t deal with outsiders', weight: 1, tags: [], type: 'introduction' },
  { value: 'a personal recommendation to a much larger, better-paying client', weight: 1, tags: [], type: 'introduction' },
  { value: 'an introduction that opens doors the crew has been knocking on for years', weight: 1, tags: [], type: 'introduction' },

  { value: 'a weapon the employer no longer has use for but the crew clearly could', weight: 1, tags: [], type: 'equipment', itemTags: ['reward-suggestion'] },
  { value: 'a piece of specialized gear left over from a job the employer never finished', weight: 1, tags: [], type: 'equipment', itemTags: ['reward-suggestion'] },
  { value: 'a set of tools the employer\'s organization no longer needs', weight: 1, tags: [], type: 'equipment', itemTags: ['reward-suggestion'] },
  { value: 'armor plating the employer had custom-fitted and never used', weight: 1, tags: [], type: 'equipment', itemTags: ['reward-suggestion'] },

  { value: 'only the agreed payment, exactly as promised, nothing more and nothing less', weight: 3, tags: [], type: 'none' },
  { value: 'the employer offers to sweeten the deal, but has nothing concrete to add', weight: 2, tags: [], type: 'none' },
  { value: 'the client\'s gratitude, sincerely offered, but with no material backing', weight: 2, tags: [], type: 'none' },

  { value: 'a favor from someone the employer describes only as "a friend"', weight: 1, tags: ['hidden'], type: 'favor' },
  { value: 'standing with an organization the employer refuses to name outright', weight: 1, tags: ['hidden'], type: 'standing' },
  { value: 'access granted quietly, off the books, with no paper trail', weight: 1, tags: ['gray-area', 'hidden'], type: 'access' },
  { value: 'information the employer clearly wasn\'t supposed to have in the first place', weight: 1, tags: ['illegal', 'investigation'], type: 'information' },
  { value: 'transport arranged through a network the employer won\'t explain', weight: 1, tags: ['gray-area'], type: 'transport' },
  { value: 'safe passage guaranteed by someone whose authority the crew can\'t verify', weight: 1, tags: ['gray-area'], type: 'safePassage' },
  { value: 'clearance that seems too easy to get, for reasons the employer avoids', weight: 1, tags: ['gray-area'], type: 'clearance' },
  { value: 'debt forgiveness from a creditor the crew didn\'t know the employer controlled', weight: 1, tags: [], type: 'debtForgiveness' },
  { value: 'salvage rights signed over by someone with no clear authority to grant them', weight: 1, tags: ['gray-area'], type: 'salvageRights' },
  { value: 'a service the employer insists will only ever be called in once, quietly', weight: 1, tags: [], type: 'service' },
  { value: 'medical care from a clinic that doesn\'t officially exist', weight: 1, tags: ['gray-area', 'hidden'], type: 'medical' },
  { value: 'repairs performed overnight by someone who asks no questions', weight: 1, tags: ['gray-area'], type: 'repairs' },
  { value: 'training from a specialist the employer clearly doesn\'t want named', weight: 1, tags: ['hidden'], type: 'training' },
  { value: 'an introduction the employer frames as a favor, and a warning', weight: 1, tags: [], type: 'introduction' },
  { value: 'equipment with the serial numbers already filed off', weight: 1, tags: ['illegal'], type: 'equipment', itemTags: ['reward-suggestion'] },

  { value: 'a favor tied to a specific future job the employer already has in mind', weight: 1, tags: [], type: 'favor' },
  { value: 'standing that only matters within one narrow, specific circle', weight: 1, tags: [], type: 'standing' },
  { value: 'access limited to a single use, at a time of the crew\'s choosing', weight: 1, tags: [], type: 'access' },
  { value: 'information that only becomes useful months from now', weight: 1, tags: [], type: 'information' },
  { value: 'transport good for exactly one trip, no more', weight: 1, tags: [], type: 'transport' },
  { value: 'safe passage that expires the moment this job\'s business concludes', weight: 1, tags: [], type: 'safePassage' },
  { value: 'clearance that covers only this specific job, nothing retroactive', weight: 1, tags: ['legal'], type: 'clearance' },
  { value: 'partial forgiveness of a debt, with the rest still outstanding', weight: 1, tags: [], type: 'debtForgiveness' },
  { value: 'salvage rights shared with the employer\'s own people, not exclusive', weight: 1, tags: [], type: 'salvageRights' },
  { value: 'a modest favor, smaller than the crew was clearly hoping for', weight: 1, tags: [], type: 'service' },
  { value: 'basic first aid and nothing more, despite the danger involved', weight: 1, tags: [], type: 'medical' },
  { value: 'a patch job that will hold, but only just', weight: 1, tags: [], type: 'repairs' },
  { value: 'a single lesson from a specialist too busy to offer more', weight: 1, tags: [], type: 'training' },
  { value: 'an introduction that turns out to be far less useful than promised', weight: 1, tags: [], type: 'introduction' },
  { value: 'a piece of gear that\'s seen better days but still has some use in it', weight: 1, tags: [], type: 'equipment', itemTags: ['reward-suggestion'] },

  { value: 'the employer\'s organization formally listing the crew as preferred contractors', weight: 1, tags: ['legal'], type: 'standing' },
  { value: 'a standing invitation to bid first on the employer\'s future work', weight: 1, tags: [], type: 'access' },
  { value: 'intelligence sharing going forward, not just this one exchange', weight: 1, tags: ['investigation'], type: 'information' },
  { value: 'a long-term transport arrangement instead of a one-time favor', weight: 1, tags: [], type: 'transport' },
  { value: 'standing safe-passage terms for as long as the arrangement holds', weight: 1, tags: [], type: 'safePassage' },
  { value: 'blanket clearance covering the crew\'s entire operating history with the employer', weight: 1, tags: ['legal'], type: 'clearance' },
  { value: 'total forgiveness of every debt the crew has ever owed the employer', weight: 1, tags: [], type: 'debtForgiveness' },
  { value: 'exclusive, ongoing salvage rights across the employer\'s territory', weight: 1, tags: [], type: 'salvageRights' },
  { value: 'a standing service arrangement the crew can call on more than once', weight: 1, tags: [], type: 'service' },
  { value: 'a permanent medical retainer with the employer\'s own physician', weight: 1, tags: [], type: 'medical' },
  { value: 'a standing repair contract at the employer\'s expense going forward', weight: 1, tags: [], type: 'repairs' },
  { value: 'ongoing training access, not just a single session', weight: 1, tags: [], type: 'training' },
  { value: 'a lasting introduction that opens a genuinely new line of work', weight: 1, tags: [], type: 'introduction' },
  { value: 'the pick of the employer\'s surplus equipment, not just a single piece', weight: 1, tags: [], type: 'equipment', itemTags: ['reward-suggestion'] },
  { value: 'the employer\'s explicit thanks, formally recorded, and nothing further', weight: 1, tags: [], type: 'none' },

  { value: 'a favor from the employer\'s spouse, offered without the employer\'s knowledge', weight: 1, tags: [], type: 'favor' },
  { value: 'standing with a local militia the crew may need to call on later', weight: 1, tags: [], type: 'standing' },
  { value: 'access to a private landing pad reserved for the employer\'s closest allies', weight: 1, tags: [], type: 'access' },
  { value: 'information about a threat building just outside the crew\'s usual territory', weight: 1, tags: ['investigation'], type: 'information' },
  { value: 'transport arranged for the crew\'s next three jobs, not just this one', weight: 1, tags: [], type: 'transport' },
  { value: 'safe passage the employer personally guarantees with their own reputation', weight: 1, tags: [], type: 'safePassage' },
  { value: 'clearance the employer had to call in several favors of their own to arrange', weight: 1, tags: ['legal'], type: 'clearance' },
  { value: 'forgiveness of a debt the crew genuinely forgot existed', weight: 1, tags: [], type: 'debtForgiveness' },
  { value: 'salvage rights the employer\'s own crew would normally fight to keep', weight: 1, tags: [], type: 'salvageRights' },
  { value: 'a favor the employer\'s organization will honor even after the employer is gone', weight: 1, tags: [], type: 'service' },
  { value: 'a thorough medical exam that catches something the crew didn\'t know was wrong', weight: 1, tags: [], type: 'medical' },
  { value: 'repairs that leave the ship running better than before the job started', weight: 1, tags: [], type: 'repairs' },
  { value: 'a training session that turns into an ongoing mentorship, unexpectedly', weight: 1, tags: [], type: 'training' },
  { value: 'an introduction the crew didn\'t ask for, but badly needed anyway', weight: 1, tags: [], type: 'introduction' },
  { value: 'a piece of equipment the employer clearly regrets giving away the moment it\'s gone', weight: 1, tags: [], type: 'equipment', itemTags: ['reward-suggestion'] }
]);
