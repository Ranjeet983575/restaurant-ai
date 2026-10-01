import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IBooking extends Document {
    _id: Types.ObjectId;
    restaurantId: Types.ObjectId;
    restaurantName: string;
    slotId: Types.ObjectId;
    tableId?: Types.ObjectId;
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    partySize: number;
    bookingDate: string;
    startTime?: string;
    endTime?: string;
    durationMinutes?: number;
    slotLabel: string;
    notes?: string;
    status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show';
    createdAt: Date;
    updatedAt: Date;
}

const bookingSchema = new Schema<IBooking>(
    {
        restaurantId: {
            type: Schema.Types.ObjectId,
            ref: 'Restaurant',
            required: true,
            index: true,
        },
        restaurantName: {
            type: String,
            required: true,
        },
        slotId: {
            type: Schema.Types.ObjectId,
            ref: 'BookingSlot',
            required: false,
            index: true,
        },
        tableId: {
            type: Schema.Types.ObjectId,
            ref: 'Table',
            required: false,
            index: true,
        },
        customerName: {
            type: String,
            required: true,
        },
        customerEmail: {
            type: String,
            required: true,
        },
        customerPhone: {
            type: String,
            required: true,
        },
        partySize: {
            type: Number,
            required: true,
            min: 1,
            default: 2,
        },
        bookingDate: {
            type: String,
            required: true,
        },
        startTime: { type: String },
        endTime: { type: String },
        durationMinutes: { type: Number, min: 1, default: 90 },
        slotLabel: {
            type: String,
            required: true,
        },
        notes: {
            type: String,
            default: '',
        },
        status: {
            type: String,
            enum: ['pending', 'confirmed', 'cancelled', 'completed', 'no_show'],
            default: 'confirmed',
        },
    },
    {
        timestamps: true,
    }
);

export const Booking = mongoose.model<IBooking>('Booking', bookingSchema);
