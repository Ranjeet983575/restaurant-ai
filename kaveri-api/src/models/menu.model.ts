import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IMenu extends Document {
    _id: Types.ObjectId;
    restaurantId: Types.ObjectId;
    restaurantName: string;
    name: string;
    description: string;
    price: number;
    section: 'main_course' | 'freshment' | 'drink' | 'dessert' | 'starter' | 'appetizer';
    category: string;
    vegetarian: boolean;
    spicy_level: 'mild' | 'medium' | 'spicy' | 'very_spicy';
    is_available: boolean;
    preparation_time?: number;
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
            enum: ['main_course', 'freshment', 'drink', 'dessert', 'starter', 'appetizer'],
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
        spicy_level: {
            type: String,
            enum: ['mild', 'medium', 'spicy', 'very_spicy'],
            default: 'medium',
        },
        is_available: {
            type: Boolean,
            default: true,
        },
        preparation_time: {
            type: Number,
            min: 0,
        },
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
