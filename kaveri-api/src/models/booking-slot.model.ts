import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IBookingSlot extends Document {
    _id: Types.ObjectId;
    restaurantId: Types.ObjectId;
    restaurantName: string;
    day: string;
    startTime: string;
    endTime: string;
    label: string;
    capacity: number;
    available: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const bookingSlotSchema = new Schema<IBookingSlot>(
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
            index: true,
        },
        day: {
            type: String,
            required: true,
            index: true,
        },
        startTime: {
            type: String,
            required: true,
        },
        endTime: {
            type: String,
            required: true,
        },
        label: {
            type: String,
            required: true,
        },
        capacity: {
            type: Number,
            required: true,
            min: 1,
            default: 4,
        },
        available: {
            type: Boolean,
            default: true,
        },
    },
    {
        timestamps: true,
    }
);

export const BookingSlot = mongoose.model<IBookingSlot>('BookingSlot', bookingSlotSchema);
