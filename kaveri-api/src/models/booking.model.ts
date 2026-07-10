import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IBooking extends Document {
    _id: Types.ObjectId;
    restaurantId: Types.ObjectId;
    restaurantName: string;
    slotId: Types.ObjectId;
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    partySize: number;
    bookingDate: string;
    slotLabel: string;
    notes?: string;
    status: 'pending' | 'confirmed' | 'cancelled';
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
            required: true,
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
            enum: ['pending', 'confirmed', 'cancelled'],
            default: 'confirmed',
        },
    },
    {
        timestamps: true,
    }
);

export const Booking = mongoose.model<IBooking>('Booking', bookingSchema);
