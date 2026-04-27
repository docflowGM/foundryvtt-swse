import { MentorChatDialog } from "/systems/foundryvtt-swse/scripts/mentor/mentor-chat-dialog.js";
import { MentorSuggestionVoice } from "/systems/foundryvtt-swse/scripts/mentor/mentor-suggestion-voice.js";
import { MENTORS } from "/systems/foundryvtt-swse/scripts/engine/mentor/mentor-dialogues.js";

export class MentorSurfaceService {
  static async buildViewModel(actor, options = {}) {
    const dialog = new MentorChatDialog(actor, {});
    const unlockedMentors = dialog._getUnlockedMentors?.() || [];
    const selectedMentorKey = options.selectedMentorKey || unlockedMentors[0]?.key || null;
    const selectedMentor = unlockedMentors.find((entry) => entry.key === selectedMentorKey) || null;

    let topics = [];
    let currentTopic = null;
    let currentResponse = null;

    if (selectedMentor) {
      dialog.selectedMentor = selectedMentor;
      topics = dialog._getAvailableTopics?.() || [];
      const topicKey = options.topicKey || null;
      currentTopic = topics.find((topic) => topic.key === topicKey) || null;

      if (currentTopic) {
        dialog.currentTopic = currentTopic;
        dialog.currentResponse = {};
        const response = await dialog._generateTopicResponse(currentTopic);
        currentResponse = {
          ...response,
          availablePaths: dialog.currentResponse?.availablePaths || response?.availablePaths || []
        };
      } else {
        currentResponse = {
          introduction: this._getMentorIntroduction(selectedMentor),
          advice: null,
          suggestions: [],
          reasonTexts: []
        };
      }
    }

    return {
      id: 'mentor',
      title: 'Chat with Mentor',
      actorName: actor?.name || '',
      hasMentors: unlockedMentors.length > 0,
      unlockedMentors,
      selectedMentorKey,
      selectedMentor,
      topics,
      currentTopic,
      currentResponse
    };
  }

  static _getMentorIntroduction(selectedMentor) {
    const mentorName = selectedMentor?.mentor?.name || selectedMentor?.mentor?.title || '';
    const voiceData = MentorSuggestionVoice.SUGGESTION_VOICES?.[mentorName];
    const lines = voiceData?.introduction || [];
    if (Array.isArray(lines) && lines.length) return lines[0];
    return `${selectedMentor?.mentor?.name || 'Mentor'} is ready to guide you.`;
  }
}
