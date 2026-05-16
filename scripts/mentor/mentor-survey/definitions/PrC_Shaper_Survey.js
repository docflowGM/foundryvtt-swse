import { buildSurveyDefinition } from '../definition-builder.js';

const survey = buildSurveyDefinition({
  surveyId: 'PrC_Shaper',
  surveyType: 'prestige',
  classId: 'shaper',
  displayName: 'Shaper',
  mentorKey: 'Shaper',
});

export default survey;
