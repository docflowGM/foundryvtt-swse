import { buildSurveyDefinition } from '../definition-builder.js';

const survey = buildSurveyDefinition({
  surveyId: 'PrC_Melee_Duelist',
  surveyType: 'prestige',
  classId: 'melee_duelist',
  displayName: 'Melee Duelist',
  mentorKey: 'Melee Duelist',
});

export default survey;
