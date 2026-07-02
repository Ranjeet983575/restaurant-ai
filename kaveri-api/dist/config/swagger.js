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
