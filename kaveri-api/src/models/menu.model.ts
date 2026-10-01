import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IMenu extends Document {
    _id: Types.ObjectId;
    restaurantId: Types.ObjectId;
    restaurantName: string;
    name: string;
    description: string;
    price: number;
    section: string;
    category: string;
    vegetarian: boolean;
    vegan: boolean;
    currency: string;
    spicy_level: 'mild' | 'medium' | 'spicy' | 'very_spicy';
    ingredients: string[];
    allergens: string[];
    calories?: number;
    is_available: boolean;
    popularity: number;
    chef_recommendation: boolean;
    preparation_time?: number;
    image?: string;
    tags: string[];
    vector_embedding: number[];
    createdAt: Date;
    updatedAt: Date;
}

const menuSchema = new Schema<IMenu>(
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
        name: {
            type: String,
            required: true,
            index: true,
        },
        description: {
            type: String,
            required: true,
        },
        price: {
            type: Number,
            required: true,
            min: 0,
        },
        section: {
            type: String,
            required: true,
            index: true,
        },
        category: {
            type: String,
            required: true,
            index: true,
        },
        vegetarian: {
            type: Boolean,
            default: false,
        },
        vegan: { type: Boolean, default: false, index: true },
        currency: { type: String, default: 'INR' },
        spicy_level: {
            type: String,
            enum: ['mild', 'medium', 'spicy', 'very_spicy'],
            default: 'medium',
        },
        ingredients: { type: [String], default: [] },
        allergens: { type: [String], default: [] },
        calories: { type: Number, min: 0 },
        is_available: {
            type: Boolean,
            default: true,
        },
        popularity: { type: Number, min: 0, max: 5, default: 0, index: true },
        chef_recommendation: { type: Boolean, default: false, index: true },
        preparation_time: {
            type: Number,
            min: 0,
        },
        image: { type: String, default: '' },
        tags: {
            type: [String],
            default: [],
        },
        vector_embedding: {
            type: [Number],
            default: [],
        },
    },
    {
        timestamps: true,
    }
);

export const Menu = mongoose.model<IMenu>('Menu', menuSchema);
