"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
const swagger_1 = require("./config/swagger");
const mongodb_1 = require("./config/mongodb");
const restaurant_routes_1 = __importDefault(require("./routes/restaurant.routes"));
const seed_1 = require("./scripts/seed");
const app = (0, express_1.default)();
const port = process.env.PORT || 3000;
app.use(express_1.default.json());
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
app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
});
// Swagger Documentation
app.use('/api-docs', swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(swagger_1.swaggerSpec));
// Restaurant Routes
app.use('/api/restaurants', restaurant_routes_1.default);
// Connect to MongoDB and start server
(0, mongodb_1.connectDB)().then(async () => {
    try {
        await (0, seed_1.seedKaveriData)();
    }
    catch (error) {
        console.error('Seed process failed:', error);
    }
    app.listen(port, () => {
        console.log(`Server running at http://localhost:${port}`);
        console.log(`Swagger UI available at http://localhost:${port}/api-docs`);
    });
});
