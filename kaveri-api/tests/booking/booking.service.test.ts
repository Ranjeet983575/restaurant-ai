import test, { before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { connectDB, disconnectDB } from '../../src/config/mongodb';
import { Restaurant } from '../../src/models/restaurant.model';
import { RestaurantProfile } from '../../src/models/restaurant-profile.model';
import { BookingSlot } from '../../src/models/booking-slot.model';
import {
    buildSlotLabel,
    normalizePartySize,
    getRestaurantProfileByRestaurantId,
    getBookingSlots,
    createBooking,
} from '../../src/services/booking.service';

before(async () => {
    await connectDB();
});

beforeEach(async () => {
    await RestaurantProfile.deleteMany({});
    await BookingSlot.deleteMany({});
    await Restaurant.deleteMany({});
});

after(async () => {
    await RestaurantProfile.deleteMany({});
    await BookingSlot.deleteMany({});
    await Restaurant.deleteMany({});
    await disconnectDB();
});

test('buildSlotLabel formats time range consistently', () => {
    assert.equal(buildSlotLabel('11:00', '12:00'), '11:00 - 12:00');
    assert.equal(buildSlotLabel('12:30', '13:30'), '12:30 - 13:30');
});

test('normalizePartySize keeps valid party sizes and clamps invalid values', () => {
    assert.equal(normalizePartySize(2), 2);
    assert.equal(normalizePartySize(0), 1);
    assert.equal(normalizePartySize(-4), 1);
});

test('getRestaurantProfileByRestaurantId and getBookingSlots resolve restaurant data by name', async () => {
    const restaurant = await Restaurant.create({
        name: 'Demo Bistro',
        cuisine: ['Indian'],
        description: 'A test restaurant',
        location: 'Hyderabad',
        address: '123 Demo Street',
        phone: '04012345678',
        price_range: 'moderate',
        working_hours: {
            monday_to_friday: '11:00 AM - 10:00 PM',
            saturday: '11:00 AM - 11:00 PM',
            sunday: '12:00 PM - 10:00 PM',
        },
        tags: ['test'],
    });

    await RestaurantProfile.create({
        restaurantId: restaurant._id,
        name: restaurant.name,
        description: 'A test profile',
        address: '123 Demo Street',
        location: 'Hyderabad',
        phone: '04012345678',
        restaurantType: 'fine_dining',
        cuisineTypes: ['Indian'],
        seatingCapacity: 50,
        timings: {
            monday_to_friday: '11:00 AM - 10:00 PM',
            saturday: '11:00 AM - 11:00 PM',
            sunday: '12:00 PM - 10:00 PM',
        },
        tags: ['test'],
    });

    await BookingSlot.create({
        restaurantId: restaurant._id,
        restaurantName: restaurant.name,
        day: 'Monday',
        startTime: '18:30',
        endTime: '19:30',
        label: '18:30 - 19:30',
        capacity: 4,
        available: true,
    });

    const profile = await getRestaurantProfileByRestaurantId('Demo Bistro');
    assert.ok(profile);
    assert.equal(profile?.name, 'Demo Bistro');

    const slots = await getBookingSlots('Demo Bistro', 'Monday');
    assert.equal(slots.length, 1);
    assert.equal(slots[0].restaurantName, 'Demo Bistro');
});

test('createBooking rejects a slot when it does not match the selected booking date', async () => {
    const restaurant = await Restaurant.create({
        name: 'Slot Test Restaurant',
        cuisine: ['Indian'],
        description: 'A test restaurant',
        location: 'Hyderabad',
        address: '123 Demo Street',
        phone: '04012345678',
        price_range: 'moderate',
        tags: ['test'],
    });

    const slot = await BookingSlot.create({
        restaurantId: restaurant._id,
        restaurantName: restaurant.name,
        day: 'Monday',
        startTime: '18:30',
        endTime: '19:30',
        label: '18:30 - 19:30',
        capacity: 4,
        available: true,
    });

    await assert.rejects(
        () => createBooking({
            restaurantId: restaurant._id.toString(),
            slotId: slot._id.toString(),
            customerName: 'Jane Doe',
            customerEmail: 'jane@example.com',
            customerPhone: '9999999999',
            partySize: 2,
            bookingDate: '2026-07-14',
        }),
        /does not match the selected booking date/i
    );
});
