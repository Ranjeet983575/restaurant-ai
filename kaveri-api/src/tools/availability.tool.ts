import { getAvailableTables } from '../services/booking.service';

export interface AvailabilityToolInput {
    restaurantId: string;
    bookingDate: string;
    startTime: string;
    partySize: number;
    tablePreference?: string;
}

export async function availabilityTool(input: AvailabilityToolInput) {
    return getAvailableTables(input);
}