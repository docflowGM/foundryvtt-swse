/** GM house rules surface view-model. */

export class GMHouseRulesSurfaceService {
  static async buildViewModel(host) {
    const rules = {
      characterCreation: host._getRulesForCategory('characterCreation'),
      combat: host._getRulesForCategory('combat'),
      force: host._getRulesForCategory('force'),
      recovery: host._getRulesForCategory('recovery'),
      skills: host._getRulesForCategory('skills'),
      vehicles: host._getRulesForCategory('vehicles')
    };

    const activeRuleCount = Object.values(rules)
      .flat()
      .filter((rule) => rule.enabled)
      .length;

    return {
      pageTitle: 'House Rules',
      pageDescription: 'Game rule modifications',
      rules,
      activeRuleCount
    };
  }
}
