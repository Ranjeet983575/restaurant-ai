import 'dotenv/config';
import express, { Request, Response } from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';

import { swaggerSpec } from './config/swagger';
import { connectDB } from './config/mongodb';
import restaurantRoutes from './routes/restaurant.routes';
import { seedKaveriData } from './scripts/seed';
import { queryLLM } from './services/llm.service';
import { semanticSearchMenusWithContext } from './services/restaurant.service';

const app = express();
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

app.use(
    cors({
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
    })
);

// Handle preflight requests
app.options('*', cors());

app.use(express.json());

/**
 * Home
 */
app.get('/', (_req: Request, res: Response) => {
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
app.get('/health', (_req: Request, res: Response) => {
    res.json({
        status: 'ok',
    });
});

/**
 * Swagger
 */
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

/**
 * Chat Endpoint
 */
app.post('/chat', async (req: Request, res: Response) => {
    try {
        const { messages } = req.body;

        if (!messages || !Array.isArray(messages)) {
            return res.status(400).json({
                success: false,
                error: 'messages array is required',
            });
        }

        const lastMessage = messages[messages.length - 1]?.text || '';

        const reply = await queryLLM(lastMessage);

        return res.json({
            success: true,
            reply,
        });
    } catch (error) {
        console.error('Chat Error:', error);

        return res.status(500).json({
            success: false,
            error: 'Failed to process chat',
        });
    }
});

/**
 * Semantic Search
 */
app.post('/search', async (req: Request, res: Response) => {
    try {
        const { query, limit = 5 } = req.body;

        if (!query) {
            return res.status(400).json({
                success: false,
                error: 'query is required',
            });
        }

        const results = await semanticSearchMenusWithContext(query, limit);

        return res.json({
            success: true,
            data: results,
        });
    } catch (error) {
        console.error('Search Error:', error);

        return res.status(500).json({
            success: false,
            error: 'Failed to perform search',
        });
    }
});

/**
 * Restaurant APIs
 */
app.use('/api/restaurants', restaurantRoutes);

/**
 * Global Error Handler
 */
app.use((err: any, req: Request, res: Response, next: any) => {
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
        await connectDB();

        await seedKaveriData();

        app.listen(port, () => {
            console.log(`🚀 Server running on http://localhost:${port}`);
            console.log(`📚 Swagger: http://localhost:${port}/api-docs`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

startServer();