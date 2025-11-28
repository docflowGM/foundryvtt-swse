/**
 * Inventory management for SWSE Store
 * Handles loading items from world and compendiums, categorization
 */

import { categorizeEquipment, sortWeapons, sortArmor } from './store-shared.js';
import { addFinalCost, addActorFinalCost } from './store-pricing.js';

/**
 * Load and prepare all store inventory data
 * @param {Object} itemsById - Map to populate with items for quick lookup
 * @returns {Object} Categorized inventory with final costs
 */
export async function loadInventoryData(itemsById) {
    // Get all items from world items
    const worldItems = game.items.filter(i => {
        // Include all items - cost filtering can be added as a setting later
        return true;
    });

    // Load items from compendium packs
    const packItems = [];
    const packNames = ['swse.weapons', 'swse.armor', 'swse.equipment'];
    for (const packName of packNames) {
        const pack = game.packs.get(packName);
        if (pack) {
            const documents = await pack.getDocuments();
            // Include all items from compendium - many items have cost "0" that need to be displayed
            packItems.push(...documents);
        }
    }

    // Combine world items and pack items
    const allItems = [...worldItems, ...packItems];

    // Filter out items without valid IDs
    const validItems = allItems.filter(item => {
        const hasValidId = !!(item.id || item._id);
        if (!hasValidId) {
            console.warn(`SWSE Store | Excluding item without ID: ${item.name || 'Unknown'}`);
        }
        return hasValidId;
    });

    // Store items by ID for quick lookup
    itemsById.clear();
    validItems.forEach(item => {
        itemsById.set(item.id, item);
    });

    // Get all actors from world that could be droids or vehicles
    const worldActors = game.actors.filter(a => {
        return (a.type === "droid" || a.type === "vehicle" || a.system?.isDroid)
            && (a.system?.cost ?? 0) > 0;
    });

    // Load vehicles and droids from compendium packs
    const packActors = [];
    const actorPackNames = ['swse.vehicles', 'swse.droids'];
    for (const packName of actorPackNames) {
        const pack = game.packs.get(packName);
        if (pack) {
            try {
                const documents = await pack.getDocuments();
                // Include actors with cost > 0, filter out any with validation errors
                const validActors = documents.filter(a => {
                    try {
                        return (a.system?.cost ?? 0) > 0;
                    } catch (err) {
                        console.warn(`SWSE | Skipping invalid actor in ${packName}:`, err.message);
                        return false;
                    }
                });
                packActors.push(...validActors);
            } catch (err) {
                console.warn(`SWSE | Failed to load actors from ${packName}:`, err.message);
            }
        }
    }

    // Combine world actors and pack actors
    const allActors = [...worldActors, ...packActors];

    // Filter out actors without valid IDs
    const validActors = allActors.filter(actor => {
        const hasValidId = !!(actor.id || actor._id);
        if (!hasValidId) {
            console.warn(`SWSE Store | Excluding actor without ID: ${actor.name || 'Unknown'}`);
        }
        return hasValidId;
    });

    // Store actors by ID for quick lookup (for availability filtering)
    validActors.forEach(actor => {
        itemsById.set(actor.id, actor);
    });

    // Get equipment items and categorize them
    const equipmentItems = validItems.filter(i => i.type === "equipment" || i.type === "item");

    // Categorize items and add final costs
    const categories = {
        weapons: sortWeapons(validItems.filter(i => i.type === "weapon").map(addFinalCost)),
        armor: sortArmor(validItems.filter(i => i.type === "armor").map(addFinalCost)),
        grenades: equipmentItems.filter(i => categorizeEquipment(i) === "grenades").map(addFinalCost),
        medical: equipmentItems.filter(i => categorizeEquipment(i) === "medical").map(addFinalCost),
        tech: equipmentItems.filter(i => categorizeEquipment(i) === "tech").map(addFinalCost),
        security: equipmentItems.filter(i => categorizeEquipment(i) === "security").map(addFinalCost),
        survival: equipmentItems.filter(i => categorizeEquipment(i) === "survival").map(addFinalCost),
        tools: equipmentItems.filter(i => categorizeEquipment(i) === "tools").map(addFinalCost),
        equipment: equipmentItems.filter(i => categorizeEquipment(i) === "equipment").map(addFinalCost),
        vehicles: validActors.filter(a => a.type === "vehicle" || a.system?.isVehicle).map(a => addActorFinalCost(a, true)),
        droids: validActors.filter(a => a.type === "droid" || a.system?.isDroid).map(a => addActorFinalCost(a, false)),
        services: getServicesData()
    };

    return categories;
}

/**
 * Get services data (static)
 * @returns {Array} Array of service categories
 */
function getServicesData() {
    return [
        {
            name: "Dining",
            icon: "fas fa-utensils",
            items: [
                { id: "dining-budget", name: "Budget Meal", cost: 2, notes: "Simple rations or cheap cantina fare" },
                { id: "dining-average", name: "Average Meal", cost: 10, notes: "Standard restaurant or cantina meal" },
                { id: "dining-upscale", name: "Upscale Meal", cost: 50, notes: "Fine dining experience" },
                { id: "dining-luxurious", name: "Luxurious Meal", cost: 150, notes: "Premium culinary experience" }
            ]
        },
        {
            name: "Lodging",
            icon: "fas fa-bed",
            items: [
                { id: "lodging-budget", name: "Budget Lodging (per day)", cost: 20, notes: "Basic sleeping quarters" },
                { id: "lodging-average", name: "Average Lodging (per day)", cost: 50, notes: "Standard hotel room" },
                { id: "lodging-upscale", name: "Upscale Lodging (per day)", cost: 100, notes: "Comfortable accommodations" },
                { id: "lodging-luxurious", name: "Luxurious Lodging (per day)", cost: 200, notes: "Premium suite with amenities" }
            ]
        },
        {
            name: "Medical Care",
            icon: "fas fa-heartbeat",
            items: [
                { id: "medical-medpac", name: "Medpac Treatment", cost: 300, notes: "Professional medical attention" },
                { id: "medical-bacta", name: "Bacta Tank (per hour)", cost: 300, notes: "Advanced healing immersion" },
                { id: "medical-surgery", name: "Surgery (per hour)", cost: 500, notes: "Surgical procedures" },
                { id: "medical-longterm", name: "Long-term Care (per day)", cost: 300, notes: "Extended medical monitoring" },
                { id: "medical-disease", name: "Treat Disease (per day)", cost: 500, notes: "Disease treatment regimen" },
                { id: "medical-radiation", name: "Treat Radiation (per day)", cost: 1000, notes: "Radiation sickness treatment" },
                { id: "medical-poison", name: "Treat Poison (per hour)", cost: 100, notes: "Antitoxin and monitoring" }
            ]
        },
        {
            name: "Transportation",
            icon: "fas fa-shuttle-van",
            items: [
                { id: "transport-taxi", name: "Local Taxi", cost: 10, notes: "Short-distance local transport" },
                { id: "transport-steerage", name: "Passage: Steerage (up to 5 days)", cost: 500, notes: "Basic interplanetary travel" },
                { id: "transport-average", name: "Passage: Average (up to 5 days)", cost: 1000, notes: "Standard passenger transport" },
                { id: "transport-upscale", name: "Passage: Upscale (5 days)", cost: 2000, notes: "Comfortable travel accommodations" },
                { id: "transport-luxurious", name: "Passage: Luxurious (5 days)", cost: 5000, notes: "First-class travel experience" },
                { id: "transport-charter", name: "Chartered Space Transport (up to 5 days)", cost: 10000, notes: "Private vessel charter" }
            ]
        },
        {
            name: "Monthly Upkeep / Lifestyle",
            icon: "fas fa-home",
            items: [
                { id: "upkeep-selfsufficient", name: "Self-Sufficient", cost: 100, notes: "Minimal expenses, living off the land" },
                { id: "upkeep-impoverished", name: "Impoverished", cost: 200, notes: "Barely scraping by" },
                { id: "upkeep-struggling", name: "Struggling", cost: 500, notes: "Making ends meet with difficulty" },
                { id: "upkeep-average", name: "Average", cost: 1000, notes: "Standard middle-class lifestyle" },
                { id: "upkeep-comfortable", name: "Comfortable", cost: 2000, notes: "Above-average quality of life" },
                { id: "upkeep-wealthy", name: "Wealthy", cost: 5000, notes: "Affluent lifestyle" },
                { id: "upkeep-luxurious", name: "Luxurious", cost: 10000, notes: "Elite upper-class living" }
            ]
        },
        {
            name: "Vehicle Rental",
            icon: "fas fa-car",
            items: [
                { id: "rental-speederbike", name: "Speeder Bike (per day)", cost: 20, notes: "Fast personal transport" },
                { id: "rental-landspeeder", name: "Landspeeder: Average (per day)", cost: 50, notes: "Standard ground vehicle" },
                { id: "rental-landspeeder-luxury", name: "Landspeeder: Luxury (per day)", cost: 100, notes: "High-end ground vehicle" },
                { id: "rental-airspeeder", name: "Airspeeder (per day)", cost: 500, notes: "Flying vehicle rental" },
                { id: "rental-shuttle-interplanetary", name: "Shuttle: Interplanetary (per day)", cost: 1000, notes: "Short-range space transport" },
                { id: "rental-shuttle-interstellar", name: "Shuttle: Interstellar (per day)", cost: 2000, notes: "Long-range space transport" }
            ]
        }
    ];
}
