/**
 * Officer Share Talent level-up picker.
 * Selects an ALREADY OWNED canonical talent; does not acquire a new Talent Item.
 * Core Rulebook pp. 221–222. Never touch talent-tree membership data here.
 */
import { ProgressionStepPlugin } from './step-plugin-base.js';
import { buildOptionCardAction } from '../shell/option-card-action.js';
import { buildLevelUpEntitlementManifest } from '/systems/foundryvtt-swse/scripts/engine/progression/utils/levelup-entitlement-manifest.js';
import { TalentDB } from '/systems/foundryvtt-swse/scripts/data/talent-db.js';
import { TalentTreeDB } from '/systems/foundryvtt-swse/scripts/data/talent-tree-db.js';
import {
  eligibleOfficerShareTalents, persistedOfficerShareTalents, resolveOfficerShareTalentChoice,
} from '/systems/foundryvtt-swse/scripts/engine/progression/utils/officer-share-talent-authority.js';

export class ShareTalentStep extends ProgressionStepPlugin {
  constructor(descriptor) {
    super(descriptor);
    this._options = [];
    this._selected = null;
    this._officerLevel = null;
    this._focused = null;
    this._loadError = null;
  }

  async onStepEnter(shell) {
    this._loadError = null;
    const manifest = buildLevelUpEntitlementManifest(shell.actor, shell.progressionSession);
    this._officerLevel = manifest.classLevel;
    if (manifest.className !== 'Officer' || manifest.choices?.shareTalentChoices !== 1) {
      this._loadError = 'This step requires one Share Talent entitlement from an even Officer level';
      return;
    }
    if (!TalentTreeDB.isBuilt && !(await TalentTreeDB.build())) {
      this._loadError = 'Canonical talent trees are not available';
      return;
    }
    if (!TalentDB.isBuilt && !(await TalentDB.build(TalentTreeDB))) {
      this._loadError = 'Canonical talents are not available';
      return;
    }
    const used = new Set(persistedOfficerShareTalents(shell.actor).map(x => x.talentId));
    this._options = eligibleOfficerShareTalents(shell.actor, TalentDB, TalentTreeDB)
      .filter(option => !used.has(option.talentId));
    const draft = shell.progressionSession?.draftSelections?.shareTalentSelections || [];
    this._selected = draft.find(x => x.officerLevel === this._officerLevel) || null;
    if (this._selected) {
      const checked = resolveOfficerShareTalentChoice({
        actor: shell.actor, choice: this._selected, officerLevel: this._officerLevel,
        talentDB: TalentDB, treeDB: TalentTreeDB,
      });
      if (!checked.valid) {
        this._loadError = checked.errors.join('; ');
        this._selected = null;
      }
    }
  }

  async getStepData() {
    return {
      options: this._options.map(option => {
        const selected = option.talentId === this._selected?.talentId;
        return {
          id: option.talentId,
          name: option.talentName,
          treeName: option.treeName,
          selected,
          cardAction: buildOptionCardAction({
            canSelect: !this._selected,
            selected,
            name: option.talentName,
            title: 'Permanently choose this talent for Officer Share Talent',
          }),
        };
      }),
      selectedName: this._selected?.talentName || null,
      officerLevel: this._officerLevel,
      loadError: this._loadError,
    };
  }

  async onItemFocused(talentId, shell) {
    this._focused = this._options.find(x => x.talentId === talentId) || null;
    shell.focusedItem = this._focused ? { id: talentId, name: this._focused.talentName } : null;
    return { handled:true, changed:false, dirty:['details'], structural:false, recommendationRelevant:false };
  }

  async onItemCommitted(talentId, shell) {
    if (this._selected || this._loadError) return {
      handled:true,changed:false,reason:'Officer Share Talent has already been selected or lacks canonical authority',
    };
    const choice = { talentId };
    const result = resolveOfficerShareTalentChoice({
      actor:shell.actor,choice,officerLevel:this._officerLevel,talentDB:TalentDB,treeDB:TalentTreeDB,
    });
    if (!result.valid) {
      this._loadError = result.errors.join('; ');
      return {handled:true,changed:false,reason:this._loadError,dirty:['work-surface']};
    }
    const committed = await this._commitNormalized(shell, 'shareTalentSelections', [result.selection]);
    if (!committed) return {handled:true,changed:false,reason:'Share Talent commit failed'};
    this._selected = result.selection;
    return {handled:true,changed:true,dirty:[],structural:true,recommendationRelevant:false};
  }

  getSelection() {
    return {
      selected: this._selected ? [this._selected] : [],
      count: this._selected ? 1 : 0,
      isComplete: !!this._selected && !this._loadError,
    };
  }

  renderWorkSurface(data) {
    return {template:'systems/foundryvtt-swse/templates/apps/progression-framework/steps/share-talent-work-surface.hbs',data};
  }
  renderDetailsPanel(item) {
    return {template:'systems/foundryvtt-swse/templates/apps/progression-framework/details-panel/empty-state.hbs',
      data:{icon:'fa-users',message:item?.name
        ? `Already owned: ${item.name}. Share Talent imparts its benefits to allies; it is not a new talent.`
        : 'Select a talent you already possess from Influence, Inspiration, Commando or Military Tactics.'}};
  }
  renderDetailsPanelEmptyState(){return this.renderDetailsPanel(null);}

  validate(){
    return {isValid:!!this._selected&&!this._loadError,errors:this.getBlockingIssues(),warnings:[]};
  }
  getBlockingIssues(){
    if(this._loadError)return [this._loadError];
    if(this._selected)return [];
    if(!this._options.length)return ['No eligible already-owned Officer Share Talent is available'];
    return ['Choose one permanent Officer Share Talent'];
  }
  getRemainingPicks(){return [{label:this._selected?'Share Talent selected':'1 Share Talent selection required',isWarning:!this._selected}];}
  getUtilityBarConfig(){return {mode:'minimal'};}
  getUtilityBarMode(){return 'minimal';}
  getMentorMode(){return 'informational';}
  getMentorContext(){return 'Share one talent you already possess. The selection is permanent and does not grant a new talent.';}
}
export default ShareTalentStep;
