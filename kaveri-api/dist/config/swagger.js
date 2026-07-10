"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.swaggerSpec = void 0;
const swagger_jsdoc_1 = __importDefault(require("swagger-jsdoc"));
const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Kaveri Restaurant API',
            version: '1.0.0',
            description: 'REST API for managing Kaveri restaurant data, menus, and semantic restaurant search.',
            contact: {
                name: 'Kaveri API Support',
            },
        },
        servers: [
            {
                url: 'http://localhost:3000',
                description: 'Development server',
            },
        ],
        components: {
            schemas: {
                MenuItemInput: {
                    type: 'object',
                    required: ['name', 'description', 'price', 'section', 'category'],
                    properties: {
                        name: { type: 'string' },
                        description: { type: 'string' },
                        price: { type: 'number' },
                        section: { type: 'string', example: 'main_course' },
                        category: { type: 'string', example: 'Biryanis' },
                        vegetarian: { type: 'boolean', example: false },
                        spicy_level: { type: 'string', example: 'medium' },
                        is_available: { type: 'boolean', example: true },
                        preparation_time: { type: 'number', example: 25 },
                        tags: { type: 'array', items: { type: 'string' } },
                    },
                },
                RestaurantCreateRequest: {
                    type: 'object',
                    required: ['name', 'cuisine', 'description', 'location', 'address', 'phone', 'price_range'],
                    properties: {
                        name: { type: 'string', example: 'Kaveri Restaurant' },
                        cuisine: { type: 'array', items: { type: 'string' } },
                        description: { type: 'string' },
                        location: { type: 'string', example: 'Hyderabad' },
                        address: { type: 'string' },
                        phone: { type: 'string' },
                        price_range: { type: 'string', enum: ['budget', 'moderate', 'expensive', 'luxury'] },
                        rating: { type: 'number', example: 4.8 },
                        tags: { type: 'array', items: { type: 'string' } },
                        menus: {
                            type: 'array',
                            items: { $ref: '#/components/schemas/MenuItemInput' },
                        },
                    },
                },
                RestaurantProfileInput: {
                    type: 'object',
                    required: ['name', 'description', 'address', 'location', 'phone'],
                    properties: {
                        restaurantId: { type: 'string', example: '64f9d4f4c41f4d6d3d3b2c1a' },
                        name: { type: 'string', example: 'Kaveri Restaurant' },
                        description: { type: 'string', example: 'Fine dining Indian restaurant' },
                        details: { type: 'string', example: 'Family-friendly venue with private dining' },
                        address: { type: 'string', example: '12-3-123, Banjara Hills' },
                        location: { type: 'string', example: 'Hyderabad' },
                        phone: { type: 'string', example: '+91-40-23456789' },
                        restaurantType: { type: 'string', example: 'casual_dining' },
                        cuisineTypes: { type: 'array', items: { type: 'string' } },
                        seatingCapacity: { type: 'number', example: 80 },
                        timings: {
                            type: 'object',
                            properties: {
                                monday_to_friday: { type: 'string', example: '11:00 AM - 10:00 PM' },
                                saturday: { type: 'string', example: '11:00 AM - 11:00 PM' },
                                sunday: { type: 'string', example: '12:00 PM - 10:00 PM' },
                                lunch: { type: 'string', example: '12:00 PM - 3:00 PM' },
                                dinner: { type: 'string', example: '6:00 PM - 10:00 PM' },
                            },
                        },
                        tags: { type: 'array', items: { type: 'string' } },
                    },
                },
                BookingSlotInput: {
                    type: 'object',
                    required: ['restaurantId', 'day', 'startTime', 'endTime'],
                    properties: {
                        restaurantId: { type: 'string', example: '64f9d4f4c41f4d6d3d3b2c1a' },
                        restaurantName: { type: 'string', example: 'Kaveri Restaurant' },
                        day: { type: 'string', example: 'Monday' },
                        startTime: { type: 'string', example: '12:30' },
                        endTime: { type: 'string', example: '13:30' },
                        capacity: { type: 'number', example: 4 },
                        available: { type: 'boolean', example: true },
                    },
                },
                BookingCreateRequest: {
                    type: 'object',
                    required: ['restaurantId', 'customerName', 'customerEmail', 'customerPhone', 'bookingDate'],
                    properties: {
                        restaurantId: { type: 'string', example: '64f9d4f4c41f4d6d3d3b2c1a' },
                        slotId: { type: 'string', example: '64f9d4f4c41f4d6d3d3b2c1a' },
                        customerName: { type: 'string', example: 'Asha' },
                        customerEmail: { type: 'string', example: 'asha@example.com' },
                        customerPhone: { type: 'string', example: '+91-9999999999' },
                        partySize: { type: 'number', example: 4 },
                        bookingDate: { type: 'string', example: '2026-07-12' },
                        slotLabel: { type: 'string', example: '12:30 - 13:30' },
                        notes: { type: 'string', example: 'Window seating' },
                    },
                },
                ErrorResponse: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean', example: false },
                        error: { type: 'string', description: 'Error message' },
                    },
                },
            },
        },
    },
    apis: ['./src/routes/*.ts'],
};
exports.swaggerSpec = (0, swagger_jsdoc_1.default)(options);
