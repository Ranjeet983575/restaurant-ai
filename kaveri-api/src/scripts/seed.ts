import fs from 'fs';
import path from 'path';
import { Restaurant } from '../models/restaurant.model';
import { Menu } from '../models/menu.model';
import { RestaurantProfile } from '../models/restaurant-profile.model';
import { BookingSlot } from '../models/booking-slot.model';
import { bulkCreateRestaurants, CreateRestaurantInput } from '../services/restaurant.service';

interface SeedProfileInput {
    restaurantId?: string;
    name: string;
    description: string;
    details?: string;
    address: string;
    location: string;
    phone: string;
    restaurantType?: string;
    cuisineTypes?: string[];
    seatingCapacity?: number;
    timings?: {
        monday_to_friday?: string;
        saturday?: string;
        sunday?: string;
        lunch?: string;
        dinner?: string;
    };
    tags?: string[];
}

interface SeedBookingSlotInput {
    restaurantId?: string;
    restaurantName?: string;
    day: string;
    startTime: string;
    endTime: string;
    capacity?: number;
    available?: boolean;
}

interface SeedPayload {
    restaurants: CreateRestaurantInput[];
    profiles?: SeedProfileInput[];
    bookingSlots?: SeedBookingSlotInput[];
}

function resolveSeedFilePath(): string {
    const cwdPath = path.resolve(process.cwd(), 'sample-data-kaveri.json');
    if (fs.existsSync(cwdPath)) {
        return cwdPath;
    }

    return path.resolve(__dirname, '..', '..', 'sample-data-kaveri.json');
}

export async function seedKaveriData(): Promise<{ inserted: number; skipped: boolean }> {
    const skipSeed = process.env.SKIP_SEED === 'true';
    if (skipSeed) {
        return { inserted: 0, skipped: true };
    }

    const existingCount = await Restaurant.countDocuments();
    if (existingCount > 0) {
        console.log(`Resetting existing seed data before re-importing ${existingCount} restaurant document(s)...`);
        await BookingSlot.deleteMany({}).catch(() => undefined);
        await RestaurantProfile.deleteMany({}).catch(() => undefined);
        await Menu.deleteMany({}).catch(() => undefined);
        await Restaurant.deleteMany({}).catch(() => undefined);
    }

    const seedFilePath = resolveSeedFilePath();
    if (!fs.existsSync(seedFilePath)) {
        console.warn(`Seed file not found at ${seedFilePath}`);
        return { inserted: 0, skipped: true };
    }

    const rawData = fs.readFileSync(seedFilePath, 'utf8');
    const payload = JSON.parse(rawData) as SeedPayload;

    if (!payload.restaurants || payload.restaurants.length === 0) {
        console.warn('Seed payload did not contain any restaurants.');
        return { inserted: 0, skipped: true };
    }

    console.log(`Seeding ${payload.restaurants.length} restaurant(s) from ${path.basename(seedFilePath)}...`);
    const created = await bulkCreateRestaurants(payload.restaurants);

    const seedProfiles = payload.profiles || [];
    const seedSlots = payload.bookingSlots || [];
    let seededProfileCount = 0;
    let seededSlotCount = 0;

    for (const restaurant of created) {
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

        await RestaurantProfile.findOneAndUpdate(
            { restaurantId: restaurant._id },
            { $set: profilePayload },
            { upsert: true, new: true }
        );
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

            await BookingSlot.deleteMany({ restaurantId: restaurant._id });
            await BookingSlot.insertMany(slotDocuments);
            seededSlotCount += slotDocuments.length;
        } else {
            const weekdaySlots = [
                { startTime: '11:00', endTime: '12:00' },
                { startTime: '12:30', endTime: '13:30' },
                { startTime: '18:30', endTime: '19:30' },
                { startTime: '20:00', endTime: '21:00' },
            ];

            const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
            const slotDocuments = days.flatMap(day =>
                weekdaySlots.map(slot => ({
                    restaurantId: restaurant._id,
                    restaurantName: restaurant.name,
                    day,
                    startTime: slot.startTime,
                    endTime: slot.endTime,
                    label: `${slot.startTime} - ${slot.endTime}`,
                    capacity: 4,
                    available: true,
                }))
            );

            await BookingSlot.deleteMany({ restaurantId: restaurant._id });
            await BookingSlot.insertMany(slotDocuments);
            seededSlotCount += slotDocuments.length;
        }
    }

    const menuCount = await Menu.countDocuments();
    console.log(`Seed complete: inserted ${created.length} restaurant(s), ${menuCount} menu item(s), ${seededProfileCount} profile(s), and ${seededSlotCount} booking slot(s).`);
    return { inserted: created.length, skipped: false };
}
