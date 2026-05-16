import { buildSurveyDefinition } from '../definition-builder.js';

const survey = buildSurveyDefinition({
  surveyId: 'PrC_Enforcer',
  surveyType: 'prestige',
  classId: 'enforcer',
  displayName: 'Enforcer',
  mentorKey: 'Enforcer',
});

export default survey;
