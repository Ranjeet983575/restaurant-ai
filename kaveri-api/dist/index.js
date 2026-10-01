"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
const swagger_1 = require("./config/swagger");
const mongodb_1 = require("./config/mongodb");
const restaurant_routes_1 = __importDefault(require("./routes/restaurant.routes"));
const restaurant_profile_routes_1 = __importDefault(require("./routes/restaurant-profile.routes"));
const booking_routes_1 = __importDefault(require("./routes/booking.routes"));
const table_routes_1 = __importDefault(require("./routes/table.routes"));
const chat_routes_1 = __importDefault(require("./routes/chat.routes"));
const seed_1 = require("./scripts/seed");
const app = (0, express_1.default)();
const port = process.env.PORT || 3000;
/**
 * CORS Configuration
 */
const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:5173', // Vite
    'http://localhost:4173',
    'http://localhost:4200', // Angular
];
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        // Allow Postman, curl, mobile apps
        if (!origin) {
            return callback(null, true);
        }
        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        return callback(new Error(`Origin ${origin} not allowed by CORS`));
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
}));
// Handle preflight requests
app.options('*', (0, cors_1.default)());
app.use(express_1.default.json());
/**
 * Home
 */
app.get('/', (_req, res) => {
    res.json({
        message: 'Kaveri Restaurant API is running.',
        readyForKaveriRestaurantApi: true,
        endpoints: {
            restaurants: '/api/restaurants',
            docs: '/api-docs',
        },
    });
});
/**
 * Health
 */
app.get('/health', (_req, res) => {
    res.json({
        status: 'ok',
    });
});
/**
 * Swagger
 */
app.use('/api-docs', swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(swagger_1.swaggerSpec));
/**
 * Chat Route
 */
app.use('/chat', chat_routes_1.default);
/**
 * Restaurant APIs
 */
app.use('/api/restaurants', restaurant_routes_1.default);
app.use('/api/restaurant-profiles', restaurant_profile_routes_1.default);
app.use('/api/bookings', booking_routes_1.default);
app.use('/api/tables', table_routes_1.default);
/**
 * Global Error Handler
 */
app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({
        success: false,
        error: err.message || 'Internal Server Error',
    });
});
/**
 * Start Server
 */
async function startServer() {
    try {
        await (0, mongodb_1.connectDB)();
        await (0, seed_1.seedKaveriData)();
        app.listen(port, () => {
            console.log(`🚀 Server running on http://localhost:${port}`);
            console.log(`📚 Swagger: http://localhost:${port}/api-docs`);
        });
    }
    catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}
startServer();
