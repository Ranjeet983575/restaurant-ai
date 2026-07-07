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
const seed_1 = require("./scripts/seed");
const llm_service_1 = require("./services/llm.service");
const restaurant_service_1 = require("./services/restaurant.service");
const app = (0, express_1.default)();
const port = process.env.PORT || 3000;
// CORS configuration - allow all origins
app.use((0, cors_1.default)({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: false
}));
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
// Chat endpoint - LLM based responses
app.post('/chat', async (req, res) => {
    try {
        const { messages } = req.body;
        if (!messages || !Array.isArray(messages)) {
            res.status(400).json({ error: 'messages array is required' });
            return;
        }
        const lastMessage = messages[messages.length - 1]?.text || '';
        const reply = await (0, llm_service_1.queryLLM)(lastMessage);
        res.json({ reply, success: true });
    }
    catch (error) {
        console.error('Chat error:', error);
        res.status(500).json({ error: 'Failed to process chat', success: false });
    }
});
// Search endpoint - semantic search
app.post('/search', async (req, res) => {
    try {
        const { query, limit = 5 } = req.body;
        if (!query) {
            res.status(400).json({ error: 'query is required' });
            return;
        }
        const results = await (0, restaurant_service_1.semanticSearchMenus)(query, limit);
        res.json({ results, success: true });
    }
    catch (error) {
        console.error('Search error:', error);
        res.status(500).json({ error: 'Failed to perform search', success: false });
    }
});
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
