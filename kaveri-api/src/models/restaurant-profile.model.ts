import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IRestaurantProfile extends Document {
    _id: Types.ObjectId;
    restaurantId?: Types.ObjectId;
    name: string;
    description: string;
    details?: string;
    address: string;
    location: string;
    phone: string;
    restaurantType: string;
    cuisineTypes: string[];
    seatingCapacity: number;
    timings: {
        monday_to_friday: string;
        saturday: string;
        sunday: string;
        lunch?: string;
        dinner?: string;
    };
    tags: string[];
    createdAt: Date;
    updatedAt: Date;
}

const restaurantProfileSchema = new Schema<IRestaurantProfile>(
    {
        restaurantId: {
            type: Schema.Types.ObjectId,
            ref: 'Restaurant',
            required: false,
            index: true,
        },
        name: {
            type: String,
            required: true,
            index: true,
        },
        description: {
            type: String,
            required: true,
        },
        details: {
            type: String,
            default: '',
        },
        address: {
            type: String,
            required: true,
        },
        location: {
            type: String,
            required: true,
        },
        phone: {
            type: String,
            required: true,
        },
        restaurantType: {
            type: String,
            required: true,
            default: 'casual_dining',
        },
        cuisineTypes: {
            type: [String],
            default: [],
        },
        seatingCapacity: {
            type: Number,
            required: true,
            min: 1,
            default: 50,
        },
        timings: {
            monday_to_friday: {
                type: String,
                default: '10:00 AM - 10:00 PM',
            },
            saturday: {
                type: String,
                default: '10:00 AM - 11:00 PM',
            },
            sunday: {
                type: String,
                default: '12:00 PM - 10:00 PM',
            },
            lunch: {
                type: String,
                default: '12:00 PM - 3:00 PM',
            },
            dinner: {
                type: String,
                default: '6:00 PM - 11:00 PM',
            },
        },
        tags: {
            type: [String],
            default: [],
        },
    },
    {
        timestamps: true,
    }
);

export const RestaurantProfile = mongoose.model<IRestaurantProfile>('RestaurantProfile', restaurantProfileSchema);
