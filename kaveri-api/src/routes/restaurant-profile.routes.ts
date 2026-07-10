import { Router, Request, Response } from 'express';
import {
    createRestaurantProfile,
    getRestaurantProfileByRestaurantId,
    CreateRestaurantProfileInput,
} from '../services/booking.service';

const router = Router();

interface RestaurantProfileParams {
    restaurantId: string;
}

/**
 * @openapi
 * /api/restaurant-profiles/{restaurantId}:
 *   get:
 *     summary: Get a restaurant profile by restaurant ID
 *     tags: [Restaurant Profiles]
 *     parameters:
 *       - in: path
 *         name: restaurantId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Restaurant profile retrieved successfully
 *       404:
 *         description: Restaurant profile not found
 */
router.get('/:restaurantId', async (req: Request<RestaurantProfileParams>, res: Response) => {
    try {
        const profile = await getRestaurantProfileByRestaurantId(req.params.restaurantId);
        if (!profile) {
            res.status(404).json({ success: false, error: 'Restaurant profile not found' });
            return;
        }

        res.json({ success: true, data: profile });
    } catch (error) {
        res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Server error' });
    }
});

/**
 * @openapi
 * /api/restaurant-profiles:
 *   post:
 *     summary: Create a restaurant profile
 *     tags: [Restaurant Profiles]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RestaurantProfileInput'
 *     responses:
 *       201:
 *         description: Restaurant profile created successfully
 *       400:
 *         description: Invalid request body
 */
router.post('/', async (req: Request<{}, {}, CreateRestaurantProfileInput>, res: Response) => {
    try {
        const profile = await createRestaurantProfile(req.body);
        res.status(201).json({ success: true, data: profile });
    } catch (error) {
        res.status(400).json({ success: false, error: error instanceof Error ? error.message : 'Invalid request' });
    }
});

export default router;
