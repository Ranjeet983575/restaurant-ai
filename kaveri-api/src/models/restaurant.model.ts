import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IRestaurant extends Document {
    _id: Types.ObjectId;
    name: string;
    cuisine: string[];
    description: string;
    location: string;
    address: string;
    city?: string;
    country?: string;
    email?: string;
    website?: string;
    latitude?: number;
    longitude?: number;
    phone: string;
    price_range: 'budget' | 'moderate' | 'expensive' | 'luxury';
    rating: number;
    working_hours: {
        monday_to_friday: string;
        saturday: string;
        sunday: string;
    };
    weekly_schedule?: Record<string, string>;
    opening_hours?: string;
    closing_hours?: string;
    features: string[];
    parking_information?: string;
    accessibility_information?: string;
    dress_code?: string;
    reservation_policy?: string;
    cancellation_policy?: string;
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
        city: { type: String, default: '' },
        country: { type: String, default: 'India' },
        email: { type: String, default: '' },
        website: { type: String, default: '' },
        latitude: { type: Number, min: -90, max: 90 },
        longitude: { type: Number, min: -180, max: 180 },
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
        weekly_schedule: { type: Schema.Types.Mixed, default: {} },
        opening_hours: { type: String, default: '' },
        closing_hours: { type: String, default: '' },
        features: { type: [String], default: [] },
        parking_information: { type: String, default: '' },
        accessibility_information: { type: String, default: '' },
        dress_code: { type: String, default: '' },
        reservation_policy: { type: String, default: '' },
        cancellation_policy: { type: String, default: '' },
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
