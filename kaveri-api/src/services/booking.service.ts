import mongoose from 'mongoose';
import { Booking, IBooking } from '../models/booking.model';
import { BookingSlot, IBookingSlot } from '../models/booking-slot.model';
import { Restaurant } from '../models/restaurant.model';
import { RestaurantProfile, IRestaurantProfile } from '../models/restaurant-profile.model';

export interface CreateBookingInput {
    restaurantId: string;
    slotId?: string;
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    partySize?: number;
    bookingDate: string;
    slotLabel?: string;
    notes?: string;
}

export interface CreateBookingSlotInput {
    restaurantId: string;
    restaurantName?: string;
    day: string;
    startTime: string;
    endTime: string;
    capacity?: number;
    available?: boolean;
}

export interface CreateRestaurantProfileInput {
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

export function normalizePartySize(partySize?: number): number {
    const parsed = Number(partySize ?? 2);
    if (!Number.isFinite(parsed) || parsed < 1) {
        return 1;
    }
    return Math.floor(parsed);
}

export function buildSlotLabel(startTime: string, endTime: string): string {
    return `${startTime.trim()} - ${endTime.trim()}`;
}

export function normalizeProfileType(restaurantType?: string): string {
    const value = restaurantType?.trim();
    return value ? value : 'casual_dining';
}

export function normalizeCuisineTypes(cuisineTypes?: string[]): string[] {
    return (cuisineTypes || []).map(item => item.trim()).filter(Boolean);
}

function escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function resolveRestaurantId(restaurantIdentifier: string): Promise<string | null> {
    if (!restaurantIdentifier) {
        return null;
    }

    if (mongoose.isValidObjectId(restaurantIdentifier)) {
        return restaurantIdentifier;
    }

    const restaurant = await Restaurant.findOne({
        name: { $regex: `^${escapeRegExp(restaurantIdentifier)}$`, $options: 'i' },
    }).select('_id');

    return restaurant?._id?.toString() ?? null;
}

export async function createRestaurantProfile(input: CreateRestaurantProfileInput): Promise<IRestaurantProfile> {
    try {
        const profile = new RestaurantProfile({
            ...input,
            restaurantType: normalizeProfileType(input.restaurantType),
            cuisineTypes: normalizeCuisineTypes(input.cuisineTypes),
            tags: (input.tags || []).map(item => item.trim()).filter(Boolean),
            seatingCapacity: input.seatingCapacity && input.seatingCapacity > 0 ? input.seatingCapacity : 50,
        });

        await profile.save();
        return profile;
    } catch (error) {
        throw new Error(`Failed to create restaurant profile: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

export async function getRestaurantProfileByRestaurantId(restaurantIdentifier: string): Promise<IRestaurantProfile | null> {
    try {
        const restaurantId = await resolveRestaurantId(restaurantIdentifier);

        if (restaurantId) {
            return await RestaurantProfile.findOne({ restaurantId });
        }

        return await RestaurantProfile.findOne({
            name: { $regex: `^${escapeRegExp(restaurantIdentifier)}$`, $options: 'i' },
        });
    } catch (error) {
        throw new Error(`Failed to fetch restaurant profile: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

export async function createBookingSlot(input: CreateBookingSlotInput): Promise<IBookingSlot> {
    try {
        const restaurantName = input.restaurantName || 'Restaurant';
        const label = buildSlotLabel(input.startTime, input.endTime);
        const slot = new BookingSlot({
            ...input,
            label,
            capacity: input.capacity || 4,
            available: input.available ?? true,
            restaurantName,
        });

        await slot.save();
        return slot;
    } catch (error) {
        throw new Error(`Failed to create booking slot: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

export async function getBookingSlots(restaurantIdentifier: string, day?: string): Promise<IBookingSlot[]> {
    try {
        const restaurantId = await resolveRestaurantId(restaurantIdentifier);
        const query: Record<string, unknown> = {};

        if (restaurantId) {
            query.restaurantId = restaurantId;
        } else {
            query.restaurantName = { $regex: `^${escapeRegExp(restaurantIdentifier)}$`, $options: 'i' };
        }

        if (day) {
            query.day = day;
        }

        return await BookingSlot.find(query).sort({ startTime: 1 });
    } catch (error) {
        throw new Error(`Failed to fetch booking slots: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

function getDayName(dateString: string): string | null {
    const parsedDate = new Date(dateString);
    if (Number.isNaN(parsedDate.getTime())) {
        return null;
    }

    return parsedDate.toLocaleDateString('en-US', { weekday: 'long' });
}

export async function createBooking(input: CreateBookingInput): Promise<IBooking> {
    try {
        const partySize = normalizePartySize(input.partySize);
        const slotLabel = input.slotLabel || 'Selected slot';

        if (input.slotId) {
            const slot = await BookingSlot.findById(input.slotId);
            if (!slot) {
                throw new Error('Selected slot was not found.');
            }

            const selectedDay = getDayName(input.bookingDate);
            if (selectedDay && slot.day.toLowerCase() !== selectedDay.toLowerCase()) {
                throw new Error(`Selected slot does not match the selected booking date. Slot day is ${slot.day}, but booking date resolves to ${selectedDay}.`);
            }
        }

        const booking = new Booking({
            ...input,
            partySize,
            slotLabel,
            status: 'confirmed',
        });

        await booking.save();

        if (input.slotId) {
            await BookingSlot.findByIdAndUpdate(input.slotId, { $set: { available: false } }).catch(() => undefined);
        }

        return booking;
    } catch (error) {
        throw new Error(`Failed to create booking: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

export async function getBookingsByRestaurant(restaurantId: string): Promise<IBooking[]> {
    try {
        return await Booking.find({ restaurantId }).sort({ createdAt: -1 });
    } catch (error) {
        throw new Error(`Failed to fetch bookings: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}
