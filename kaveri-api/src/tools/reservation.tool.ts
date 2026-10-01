import { createBooking, CreateBookingInput } from '../services/booking.service';

export async function reservationTool(input: CreateBookingInput) {
    return createBooking(input);
}