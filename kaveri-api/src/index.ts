import 'dotenv/config';
import express, { Request, Response } from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';

import { swaggerSpec } from './config/swagger';
import { connectDB } from './config/mongodb';
import restaurantRoutes from './routes/restaurant.routes';
import restaurantProfileRoutes from './routes/restaurant-profile.routes';
import bookingRoutes from './routes/booking.routes';
import tableRoutes from './routes/table.routes';
import chatRoutes from './routes/chat.routes';
import { seedKaveriData } from './scripts/seed';

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
 * Chat Route
 */
app.use('/chat', chatRoutes);

/**
 * Restaurant APIs
 */
app.use('/api/restaurants', restaurantRoutes);
app.use('/api/restaurant-profiles', restaurantProfileRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/tables', tableRoutes);

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