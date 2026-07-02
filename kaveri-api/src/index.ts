import 'dotenv/config';
import express, { Request, Response } from 'express';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger';
import { connectDB } from './config/mongodb';
import restaurantRoutes from './routes/restaurant.routes';
import { seedKaveriData } from './scripts/seed';

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

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

app.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok' });
});

// Swagger Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));


// Restaurant Routes
app.use('/api/restaurants', restaurantRoutes);

// Connect to MongoDB and start server
connectDB().then(async () => {
    try {
        await seedKaveriData();
    } catch (error) {
        console.error('Seed process failed:', error);
    }

    app.listen(port, () => {
        console.log(`Server running at http://localhost:${port}`);
        console.log(`Swagger UI available at http://localhost:${port}/api-docs`);
    });
});
