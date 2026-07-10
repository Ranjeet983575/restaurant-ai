import test from 'node:test';
import assert from 'node:assert/strict';

import { normalizeProfileType, normalizeCuisineTypes } from '../../src/services/booking.service';

test('normalizeProfileType falls back to a default when empty', () => {
    assert.equal(normalizeProfileType(''), 'casual_dining');
    assert.equal(normalizeProfileType('fine_dining'), 'fine_dining');
});

test('normalizeCuisineTypes trims and filters empty values', () => {
    assert.deepEqual(normalizeCuisineTypes([' Indian ', ' Chinese ', '']), ['Indian', 'Chinese']);
});
