/**
 * PHASE 8D-3B production — NPC fear catalog: what this NPC is afraid
 * WILL HAPPEN, distinct from `secret` (something already true they're
 * hiding). Deliberately a MIX of mundane and dramatic fears (phase
 * spec: "do not make every fear melodramatic; include mundane fears").
 * Representative catalog (phase target: 150-250).
 */
export const NPC_FEARS = Object.freeze([
  { value: 'losing their position', weight: 2, tags: ['business-professional'] },
  { value: 'their secret being discovered', weight: 1, tags: [] },
  { value: 'being stranded far from home', weight: 1, tags: ['frontier'] },
  { value: 'Faction retaliation', weight: 1, tags: ['crime-syndicate', 'military-paramilitary'] },
  { value: 'family being harmed', weight: 1, tags: [] },
  { value: 'financial ruin', weight: 2, tags: ['business-professional'] },
  { value: 'public humiliation', weight: 1, tags: [] },
  { value: 'being replaced by a droid', weight: 1, tags: ['droids', 'technology'] },
  { value: 'old conflicts flaring up again', weight: 1, tags: ['military-paramilitary'] },
  { value: 'being forgotten', weight: 1, tags: [] },
  { value: 'making a costly mistake in front of superiors', weight: 2, tags: ['business-professional'] },
  { value: 'a past mistake finally catching up with them', weight: 1, tags: [] },
  { value: 'losing the trust of someone they respect', weight: 1, tags: [] },
  { value: 'being trapped in this job forever', weight: 1, tags: [] },
  { value: 'disappointing their family', weight: 1, tags: [] },
  { value: 'that their best work is behind them', weight: 1, tags: [] },
  { value: 'being exposed as a fraud', weight: 1, tags: [] },
  { value: 'losing what little independence they have', weight: 1, tags: [] },
  { value: 'that no one would notice if they vanished', weight: 0.5, tags: [] },
  { value: 'an old debt being called in', weight: 1, tags: ['criminal'] },
  { value: 'being caught in the middle of a larger conflict', weight: 1, tags: [] },
  { value: 'that the people they trust are lying to them', weight: 1, tags: [] },
  { value: 'growing old with nothing to show for it', weight: 1, tags: [] },
  { value: 'a specific rival finally winning', weight: 1, tags: [] },
  { value: 'losing everything they\'ve built', weight: 1, tags: ['business-professional'] },
  { value: 'being sent somewhere dangerous', weight: 1, tags: ['military-paramilitary'] },
  { value: 'that they\'re not actually as competent as people think', weight: 1, tags: [] },
  { value: 'being unable to protect the people they care about', weight: 1, tags: [] },
  { value: 'small, mundane things going wrong at the worst time', weight: 1, tags: [] },
  { value: 'nothing in particular -- they seem remarkably unbothered', weight: 1, tags: [] }
]);
