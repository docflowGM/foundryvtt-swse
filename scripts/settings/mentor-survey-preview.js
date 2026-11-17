/**
 * GM-only, default-off "editorial preview" for the Mentor Surveys.
 *
 * Draft (not owner-approved) survey content is NEVER shown to players by default. When this world setting is on AND
 * the current user is a GM, withheld/draft survey content may be played so it can be reviewed in context. Events made
 * in preview carry provenance.preview = true and are excluded from every downstream reader.
 *
 * The permission check lives in canUseEditorialPreview(): a non-GM can never get preview, even if the world setting is
 * on (a client cannot enable it for itself).
 */
export const MENTOR_SURVEY_PREVIEW_SETTING = 'mentorSurveyEditorialPreview';

export function registerMentorSurveyPreviewSetting() {
  if (game.settings.settings.has(`foundryvtt-swse.${MENTOR_SURVEY_PREVIEW_SETTING}`)) return;
  game.settings.register('foundryvtt-swse', MENTOR_SURVEY_PREVIEW_SETTING, {
    name: 'Mentor Surveys: Editorial Preview (GM only)',
    hint: 'Lets a GM play Mentor survey content that has not been owner-approved, marked as a preview. Preview answers are never used by recommendations. Leave off for normal play.',
    scope: 'world',
    config: true,
    restricted: true, // only a GM can change a world setting marked restricted
    type: Boolean,
    default: false,
  });
}

/** @param {{ settingValue?: boolean, isGM?: boolean }} [injected] test seam; production reads the live game. */
export function canUseEditorialPreview(injected = null) {
  let setting; let isGM;
  if (injected) { setting = injected.settingValue; isGM = injected.isGM; } else {
    const g = typeof game === 'undefined' ? null : game; // no Foundry game object (tests, early init): no preview
    try { setting = g?.settings?.get?.('foundryvtt-swse', MENTOR_SURVEY_PREVIEW_SETTING); } catch (_e) { setting = false; }
    isGM = g?.user?.isGM === true;
  }
  return setting === true && isGM === true;
}
