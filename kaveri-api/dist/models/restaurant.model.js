"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.Restaurant = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const restaurantSchema = new mongoose_1.Schema({
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
    weekly_schedule: { type: mongoose_1.Schema.Types.Mixed, default: {} },
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
}, {
    timestamps: true,
});
exports.Restaurant = mongoose_1.default.model('Restaurant', restaurantSchema);
