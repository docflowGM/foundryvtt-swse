/**
 * PHASE 8D-3B production — NPC relationship-hook catalog.
 *
 * A relationship hook is a lightweight, structured story thread this
 * NPC carries toward some OTHER party ("owes several dockworkers a
 * substantial gambling debt"). Narrative only, and deliberately
 * UNRESOLVED by default: `subjectId`/`subjectDraftId` stay empty
 * unless a caller explicitly links a real canonical Actor/Faction id
 * or another draft's id -- matching `faction-relationship-draft.js`'s
 * exact "generated concept vs. canonical reference" discipline (never
 * a fake id invented here). `subject` is a free-text description of
 * who/what the hook concerns until/unless it's resolved.
 */

export const RELATIONSHIP_HOOK_TYPE = Object.freeze({
  FAMILY: 'family',
  FRIEND: 'friend',
  RIVAL: 'rival',
  ENEMY: 'enemy',
  MENTOR: 'mentor',
  STUDENT: 'student',
  EMPLOYER: 'employer',
  EMPLOYEE: 'employee',
  DEBTOR: 'debtor',
  CREDITOR: 'creditor',
  FORMER_PARTNER: 'former-partner',
  PROTECTOR: 'protector',
  DEPENDENT: 'dependent',
  CONTACT: 'contact',
  INFORMANT: 'informant'
});

const RELATIONSHIP_HOOK_TYPES = Object.freeze(Object.values(RELATIONSHIP_HOOK_TYPE));

export function isRelationshipHookType(value) {
  return RELATIONSHIP_HOOK_TYPES.includes(value);
}

/**
 * Templates: `{ type, text, weight, tags }`. `text` uses `{subject}` as
 * a placeholder a generator fills with a short subject description
 * (e.g. "several dockworkers", "a former commanding officer") --
 * see `npc/npc-characterization.js`'s `pickRelationshipHook()`.
 * Representative catalog (phase target: 200-300).
 */
export const NPC_RELATIONSHIP_HOOK_TEMPLATES = Object.freeze([
  { type: RELATIONSHIP_HOOK_TYPE.DEBTOR, text: 'Owes {subject} a substantial debt.', weight: 2, tags: ['criminal', 'business'] },
  { type: RELATIONSHIP_HOOK_TYPE.CREDITOR, text: 'Is owed a substantial debt by {subject}.', weight: 1, tags: ['business'] },
  { type: RELATIONSHIP_HOOK_TYPE.RIVAL, text: 'Has a long-running professional rivalry with {subject}.', weight: 2, tags: [] },
  { type: RELATIONSHIP_HOOK_TYPE.ENEMY, text: 'Has an unresolved grudge against {subject}.', weight: 1, tags: [] },
  { type: RELATIONSHIP_HOOK_TYPE.MENTOR, text: 'Still looks up to {subject} as a mentor.', weight: 1, tags: [] },
  { type: RELATIONSHIP_HOOK_TYPE.STUDENT, text: 'Is quietly training {subject} in their own skills.', weight: 0.5, tags: [] },
  { type: RELATIONSHIP_HOOK_TYPE.FORMER_PARTNER, text: 'Was once close with {subject}, on uncertain terms now.', weight: 1, tags: [] },
  { type: RELATIONSHIP_HOOK_TYPE.PROTECTOR, text: 'Quietly looks out for {subject}, without saying so.', weight: 1, tags: [] },
  { type: RELATIONSHIP_HOOK_TYPE.DEPENDENT, text: 'Is responsible for the wellbeing of {subject}.', weight: 1, tags: [] },
  { type: RELATIONSHIP_HOOK_TYPE.FRIEND, text: 'Considers {subject} a close, trusted friend.', weight: 2, tags: [] },
  { type: RELATIONSHIP_HOOK_TYPE.FAMILY, text: 'Sends part of their earnings to {subject}.', weight: 1, tags: [] },
  { type: RELATIONSHIP_HOOK_TYPE.EMPLOYER, text: 'Reports to {subject}, not always happily.', weight: 1, tags: ['business'] },
  { type: RELATIONSHIP_HOOK_TYPE.EMPLOYEE, text: 'Relies on {subject} to get things done.', weight: 1, tags: ['business'] },
  { type: RELATIONSHIP_HOOK_TYPE.CONTACT, text: 'Keeps {subject} as a useful, occasional contact.', weight: 2, tags: [] },
  { type: RELATIONSHIP_HOOK_TYPE.INFORMANT, text: 'Trades favors for information with {subject}.', weight: 1, tags: ['criminal'] },
  { type: RELATIONSHIP_HOOK_TYPE.ENEMY, text: 'Has been quietly undermined by {subject} for some time.', weight: 0.5, tags: [] },
  { type: RELATIONSHIP_HOOK_TYPE.FAMILY, text: 'Is estranged from {subject}, for reasons rarely discussed.', weight: 0.5, tags: [] },
  { type: RELATIONSHIP_HOOK_TYPE.FRIEND, text: 'Has lost touch with {subject} but still thinks of them fondly.', weight: 1, tags: [] },
  { type: RELATIONSHIP_HOOK_TYPE.RIVAL, text: 'Competes constantly, if amicably, with {subject}.', weight: 1, tags: [] },
  { type: RELATIONSHIP_HOOK_TYPE.PROTECTOR, text: 'Once saved {subject}\'s life and has never mentioned it since.', weight: 0.5, tags: [] }
]);

/**
 * Generic `{subject}` fillers -- deliberately UNRESOLVED descriptions
 * ("a former commanding officer", "several dockworkers"), never a
 * fabricated name or id. A caller who wants a specific, real subject
 * substitutes their own string instead of using this pool.
 */
export const NPC_RELATIONSHIP_HOOK_SUBJECTS = Object.freeze([
  { value: 'a former commanding officer', weight: 1, tags: ['military-paramilitary'] },
  { value: 'several dockworkers', weight: 1, tags: ['trade'] },
  { value: 'a local moneylender', weight: 1, tags: ['criminal'] },
  { value: 'an old business partner', weight: 1, tags: ['business'] },
  { value: 'a childhood friend', weight: 1, tags: [] },
  { value: 'a estranged sibling', weight: 0.5, tags: [] },
  { value: 'a former mentor', weight: 1, tags: [] },
  { value: 'a rival in the same trade', weight: 1, tags: [] },
  { value: 'a local crime boss', weight: 0.5, tags: ['criminal'] },
  { value: 'a Faction contact', weight: 1, tags: [] },
  { value: 'a younger relative', weight: 1, tags: [] },
  { value: 'an old crewmate', weight: 1, tags: ['spacefaring'] },
  { value: 'a former employer', weight: 1, tags: ['business'] },
  { value: 'a trusted informant', weight: 0.5, tags: ['criminal'] },
  { value: 'a neighbor', weight: 1, tags: [] }
]);
