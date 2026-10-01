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
const restaurant_profile_model_1 = require("../models/restaurant-profile.model");
const booking_slot_model_1 = require("../models/booking-slot.model");
const table_model_1 = require("../models/table.model");
const booking_model_1 = require("../models/booking.model");
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
    const existingRelatedData = await Promise.all([
        booking_model_1.Booking.countDocuments(),
        booking_slot_model_1.BookingSlot.countDocuments(),
        table_model_1.Table.countDocuments(),
        restaurant_profile_model_1.RestaurantProfile.countDocuments(),
        menu_model_1.Menu.countDocuments(),
    ]);
    if (existingCount > 0 || existingRelatedData.some(count => count > 0)) {
        console.log(`Resetting existing seed data before re-importing ${existingCount} restaurant document(s)...`);
        await booking_model_1.Booking.deleteMany({}).catch(() => undefined);
        await booking_slot_model_1.BookingSlot.deleteMany({}).catch(() => undefined);
        await table_model_1.Table.deleteMany({}).catch(() => undefined);
        await restaurant_profile_model_1.RestaurantProfile.deleteMany({}).catch(() => undefined);
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
    const seedProfiles = payload.profiles || [];
    const seedSlots = payload.bookingSlots || [];
    let seededProfileCount = 0;
    let seededSlotCount = 0;
    let seededTableCount = 0;
    for (const restaurant of created) {
        restaurant.city = restaurant.city || restaurant.location;
        restaurant.country = restaurant.country || 'India';
        restaurant.features = restaurant.features?.length > 0
            ? restaurant.features
            : ['family-friendly', 'dine-in', 'takeaway', 'private dining'];
        restaurant.parking_information = restaurant.parking_information || 'Street parking and nearby paid parking available.';
        restaurant.accessibility_information = restaurant.accessibility_information || 'Step-free entrance and accessible seating available.';
        restaurant.dress_code = restaurant.dress_code || 'Smart casual';
        restaurant.reservation_policy = restaurant.reservation_policy || 'Reservations are recommended for dinner and groups of six or more.';
        restaurant.cancellation_policy = restaurant.cancellation_policy || 'Please cancel at least two hours before your reservation.';
        await restaurant.save();
        const menuItems = await menu_model_1.Menu.find({ restaurantId: restaurant._id });
        for (const menuItem of menuItems) {
            const tags = menuItem.tags || [];
            menuItem.currency = menuItem.currency || 'INR';
            menuItem.ingredients = menuItem.ingredients || [];
            menuItem.allergens = menuItem.allergens || [];
            menuItem.vegan = menuItem.vegan ?? false;
            menuItem.popularity = menuItem.popularity || (tags.some(tag => ['popular', 'favorite', 'signature'].includes(tag)) ? 4.5 : 3.5);
            menuItem.chef_recommendation = menuItem.chef_recommendation || tags.some(tag => ['signature', 'favorite'].includes(tag));
            await menuItem.save();
        }
        const matchedProfile = seedProfiles.find(profile => profile.name === restaurant.name);
        const profilePayload = {
            restaurantId: restaurant._id,
            name: restaurant.name,
            description: matchedProfile?.description || restaurant.description,
            details: matchedProfile?.details || restaurant.description,
            address: matchedProfile?.address || restaurant.address,
            location: matchedProfile?.location || restaurant.location,
            phone: matchedProfile?.phone || restaurant.phone,
            restaurantType: matchedProfile?.restaurantType || restaurant.cuisine?.[0] || 'casual_dining',
            cuisineTypes: matchedProfile?.cuisineTypes || restaurant.cuisine || [],
            seatingCapacity: matchedProfile?.seatingCapacity || 80,
            timings: matchedProfile?.timings || {
                monday_to_friday: restaurant.working_hours?.monday_to_friday || '11:00 AM - 10:00 PM',
                saturday: restaurant.working_hours?.saturday || '11:00 AM - 11:00 PM',
                sunday: restaurant.working_hours?.sunday || '12:00 PM - 10:00 PM',
                lunch: '12:00 PM - 3:00 PM',
                dinner: '6:00 PM - 10:00 PM',
            },
            tags: matchedProfile?.tags || restaurant.tags || [],
        };
        await restaurant_profile_model_1.RestaurantProfile.findOneAndUpdate({ restaurantId: restaurant._id }, { $set: profilePayload }, { upsert: true, new: true });
        seededProfileCount += 1;
        const matchedSlots = seedSlots.filter(slot => slot.restaurantName === restaurant.name || slot.restaurantId === restaurant._id.toString());
        if (matchedSlots.length > 0) {
            const slotDocuments = matchedSlots.map(slot => ({
                restaurantId: restaurant._id,
                restaurantName: restaurant.name,
                day: slot.day,
                startTime: slot.startTime,
                endTime: slot.endTime,
                label: `${slot.startTime} - ${slot.endTime}`,
                capacity: slot.capacity || 4,
                available: slot.available ?? true,
            }));
            await booking_slot_model_1.BookingSlot.deleteMany({ restaurantId: restaurant._id });
            await booking_slot_model_1.BookingSlot.insertMany(slotDocuments);
            seededSlotCount += slotDocuments.length;
        }
        else {
            const weekdaySlots = [
                { startTime: '11:00', endTime: '12:00' },
                { startTime: '12:30', endTime: '13:30' },
                { startTime: '18:30', endTime: '19:30' },
                { startTime: '20:00', endTime: '21:00' },
            ];
            const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
            const slotDocuments = days.flatMap(day => weekdaySlots.map(slot => ({
                restaurantId: restaurant._id,
                restaurantName: restaurant.name,
                day,
                startTime: slot.startTime,
                endTime: slot.endTime,
                label: `${slot.startTime} - ${slot.endTime}`,
                capacity: 4,
                available: true,
            })));
            await booking_slot_model_1.BookingSlot.deleteMany({ restaurantId: restaurant._id });
            await booking_slot_model_1.BookingSlot.insertMany(slotDocuments);
            seededSlotCount += slotDocuments.length;
        }
        const tableDocuments = [
            { tableNumber: '1', capacity: 2, area: 'window', tableType: '2-person table', features: ['window'] },
            { tableNumber: '2', capacity: 4, area: 'indoor', tableType: '4-person table', features: [] },
            { tableNumber: '3', capacity: 4, area: 'outdoor', tableType: '4-person table', features: ['outdoor'] },
            { tableNumber: '4', capacity: 6, area: 'indoor', tableType: '6-person table', features: ['high-chair available'] },
            { tableNumber: '5', capacity: 8, area: 'private_room', tableType: 'private dining table', features: ['private room'] },
        ];
        await table_model_1.Table.deleteMany({ restaurantId: restaurant._id });
        await table_model_1.Table.insertMany(tableDocuments.map(table => ({
            ...table,
            restaurantId: restaurant._id,
            restaurantName: restaurant.name,
            status: 'available',
        })));
        seededTableCount += tableDocuments.length;
    }
    const menuCount = await menu_model_1.Menu.countDocuments();
    console.log(`Seed complete: inserted ${created.length} restaurant(s), ${menuCount} menu item(s), ${seededProfileCount} profile(s), ${seededSlotCount} booking slot(s), and ${seededTableCount} table(s).`);
    return { inserted: created.length, skipped: false };
}
