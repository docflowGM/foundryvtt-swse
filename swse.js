import SWSEActorSheet from "./module/sheets/SWSEActorSheet.js";
import SWSEItemSheet from "./module/sheets/SWSEItemSheet.js";
import "./module/chargen/chargen-init.js";

Hooks.once('init', async function() {
    console.log('SWSE | Initializing Star Wars Saga Edition System');
    
    // Register sheet application classes
    Actors.unregisterSheet("core", ActorSheet);
    Actors.registerSheet("swse", SWSEActorSheet, { 
        makeDefault: true,
        label: "SWSE Character Sheet" 
    });
    
    Items.unregisterSheet("core", ItemSheet);
    Items.registerSheet("swse", SWSEItemSheet, { 
        makeDefault: true,
        label: "SWSE Item Sheet" 
    });
    
    // Register Handlebars helpers
    Handlebars.registerHelper('checked', function(value) {
        return value ? 'checked' : '';
    });
    
    console.log('SWSE | System initialized');
});

Hooks.once('ready', async function() {
    console.log('SWSE | System ready');
});