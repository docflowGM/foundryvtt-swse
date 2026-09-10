/**
 * PHASE 8D-3C correction round 2 — narrative reward-suggestion pool for
 * `jobs/job-reward-suggestion.js`.
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
 * Representative catalog (20 entries across the requested types) --
 * hydrate later, per the phase's own "representative pool now" doctrine
 * already used for twists/secrets/complications. Commodity-type
 * suggestions are NOT listed here -- they are built at generation time
 * from a REAL `data/galactic-commodities.js` entry (see
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
  { value: 'nothing beyond the agreed payment -- no additional favor is offered', weight: 4, tags: [], type: 'none' }
]);
