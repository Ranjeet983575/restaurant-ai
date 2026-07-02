import fs from 'fs';
import path from 'path';
import { Restaurant } from '../models/restaurant.model';
import { Menu } from '../models/menu.model';
import { bulkCreateRestaurants, CreateRestaurantInput } from '../services/restaurant.service';

interface SeedPayload {
    restaurants: CreateRestaurantInput[];
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

    const menuCount = await Menu.countDocuments();
    console.log(`Seed complete: inserted ${created.length} restaurant(s) and ${menuCount} menu item(s).`);
    return { inserted: created.length, skipped: false };
}
