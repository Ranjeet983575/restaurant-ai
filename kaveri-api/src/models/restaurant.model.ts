import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IRestaurant extends Document {
    _id: Types.ObjectId;
    name: string;
    cuisine: string[];
    description: string;
    location: string;
    address: string;
    phone: string;
    price_range: 'budget' | 'moderate' | 'expensive' | 'luxury';
    rating: number;
    working_hours: {
        monday_to_friday: string;
        saturday: string;
        sunday: string;
    };
    tags: string[];
    vector_embedding: number[];
    createdAt: Date;
    updatedAt: Date;
}

const restaurantSchema = new Schema<IRestaurant>(
    {
        name: {
            type: String,
            required: true,
            index: true,
        },
        cuisine: {
            type: [String],
            required: true,
            index: true,
        },
        description: {
            type: String,
            required: true,
        },
        location: {
            type: String,
            required: true,
            index: true,
        },
        address: {
            type: String,
            required: true,
        },
        phone: {
            type: String,
            required: true,
        },
        price_range: {
            type: String,
            enum: ['budget', 'moderate', 'expensive', 'luxury'],
            required: true,
        },
        rating: {
            type: Number,
            min: 0,
            max: 5,
            default: 3,
        },
        working_hours: {
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
        },
        tags: {
            type: [String],
            default: [],
            index: true,
        },
        vector_embedding: {
            type: [Number],
            required: true,
        },
    },
    {
        timestamps: true,
    }
);

export const Restaurant = mongoose.model<IRestaurant>('Restaurant', restaurantSchema);
