import { buildSurveyDefinition } from '../definition-builder.js';

const survey = buildSurveyDefinition({
  surveyId: 'PrC_Corporate_Agent',
  surveyType: 'prestige',
  classId: 'corporate_agent',
  displayName: 'Corporate Agent',
  mentorKey: 'Corporate Agent',
});

export default survey;
