// Neutral, non-character-specific frame for the Mentor's Reflection (Q6) when no class-specific Prestige Mentor script has been
// imported. It is attributed to NO established Mentor and written in plain interface language. EDITORIAL DRAFT (owner direction
// 2026-11-16). The authored 32-class Prestige Q6 dialogue is a separate, not-yet-committed asset and is never reconstructed here;
// when it is imported it is added as `prestigeMentors[classId]` and takes precedence per class.
export const NEUTRAL = {
  milestone: 'You are at the threshold of the {class_name} path.',
  opening: 'Let me tell you how I read your path so far, and you tell me where I have it right.',
  closing: 'Does that sound like you?',
  reactions: {
    A: 'Good. Then we understand each other.',
    B: 'Then tell me which detail needs correcting.',
    C: 'Then tell me which part I have wrong.',
    D1: 'Then tell me which part of that reading does not fit.',
    D2: 'Then tell me who you are instead.',
    E1: 'Then tell me which part of that reading does not fit.',
    E2: 'Then tell me who you are instead.',
  },
  clauses: {
    unresolved: ['I cannot name one identity for you with certainty yet, so I will not guess.'],
    evidenceOne: ['Here is what I can see in your record: {evidence_text} One observation is not a complete picture.'],
    evidenceTwo: ['Here is what I can see in your record: {evidence_text}'],
    evidenceThree: ['Here is what I can see in your record: {evidence_text}'],
    goalDeclared: ['You have also told me what you want ahead: {quoted_goal} I keep that separate from what you have already done.'],
    goalUnrecorded: ['You have not told me a long-term goal yet, and I will not assume one.'],
    q1quote: ['You also told me what you want from this path: {quoted_q1} That is an intention, not proof of ability.'],
    relationUnknown: ['I do not claim to know how that goal relates to who you are now.'],
  },
};
