import test from 'node:test';
import assert from 'node:assert/strict';

import { createBooking } from '../../src/services/booking.service';

test('requires a customer phone number or email address', async () => {
    await assert.rejects(
        () => createBooking({
            restaurantId: '64f9d4f4c41f4d6d3d3b2c1a',
            customerName: 'Asha',
            bookingDate: '2026-10-22',
        }),
        /phone number or email address is required/i,
    );
});

test('rejects malformed booking dates before accessing the database', async () => {
    await assert.rejects(
        () => createBooking({
            restaurantId: '64f9d4f4c41f4d6d3d3b2c1a',
            customerName: 'Asha',
            customerEmail: 'asha@example.com',
            bookingDate: '2026-02-31',
        }),
        /valid YYYY-MM-DD date/i,
    );
});
