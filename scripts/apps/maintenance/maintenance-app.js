// scripts/apps/maintenance/maintenance-app.js
import { swseLogger } from "../../utils/logger.js";
export class MaintenanceApp extends Application {
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      id: "swse-maintenance",
      classes: ["swse", "swse-maintenance"],
      template: "systems/swse/templates/apps/maintenance.hbs",
      width: 600,
      height: 400,
      title: "SWSE Maintenance"
    });
  }

  activateListeners(html) {
    super.activateListeners(html);
    html.find('.swse-rest-short').on('click', () => this._onShortRest());
    html.find('.swse-rest-long').on('click', () => this._onLongRest());
  }

  async _onShortRest() {
    // Placeholder: implement short rest behavior using ActorEngine
    swseLogger.info("Short rest clicked");
    ui.notifications?.info("Short rest executed (placeholder)");
  }

  async _onLongRest() {
    swseLogger.info("Long rest clicked");
    ui.notifications?.info("Long rest executed (placeholder)");
  }
}
