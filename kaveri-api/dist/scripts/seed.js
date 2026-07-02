"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedKaveriData = seedKaveriData;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const restaurant_model_1 = require("../models/restaurant.model");
const menu_model_1 = require("../models/menu.model");
const restaurant_service_1 = require("../services/restaurant.service");
function resolveSeedFilePath() {
    const cwdPath = path_1.default.resolve(process.cwd(), 'sample-data-kaveri.json');
    if (fs_1.default.existsSync(cwdPath)) {
        return cwdPath;
    }
    return path_1.default.resolve(__dirname, '..', '..', 'sample-data-kaveri.json');
}
async function seedKaveriData() {
    const skipSeed = process.env.SKIP_SEED === 'true';
    if (skipSeed) {
        return { inserted: 0, skipped: true };
    }
    const existingCount = await restaurant_model_1.Restaurant.countDocuments();
    if (existingCount > 0) {
        console.log(`Resetting existing seed data before re-importing ${existingCount} restaurant document(s)...`);
        await menu_model_1.Menu.deleteMany({}).catch(() => undefined);
        await restaurant_model_1.Restaurant.deleteMany({}).catch(() => undefined);
    }
    const seedFilePath = resolveSeedFilePath();
    if (!fs_1.default.existsSync(seedFilePath)) {
        console.warn(`Seed file not found at ${seedFilePath}`);
        return { inserted: 0, skipped: true };
    }
    const rawData = fs_1.default.readFileSync(seedFilePath, 'utf8');
    const payload = JSON.parse(rawData);
    if (!payload.restaurants || payload.restaurants.length === 0) {
        console.warn('Seed payload did not contain any restaurants.');
        return { inserted: 0, skipped: true };
    }
    console.log(`Seeding ${payload.restaurants.length} restaurant(s) from ${path_1.default.basename(seedFilePath)}...`);
    const created = await (0, restaurant_service_1.bulkCreateRestaurants)(payload.restaurants);
    const menuCount = await menu_model_1.Menu.countDocuments();
    console.log(`Seed complete: inserted ${created.length} restaurant(s) and ${menuCount} menu item(s).`);
    return { inserted: created.length, skipped: false };
}
