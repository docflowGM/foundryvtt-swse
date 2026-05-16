import { buildSurveyDefinition } from '../definition-builder.js';

const survey = buildSurveyDefinition({
  surveyId: 'PrC_Gladiator',
  surveyType: 'prestige',
  classId: 'gladiator',
  displayName: 'Gladiator',
  mentorKey: 'Gladiator',
});

export default survey;
