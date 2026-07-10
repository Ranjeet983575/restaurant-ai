import { Router, Request, Response } from 'express';
import {
    createBooking,
    createBookingSlot,
    getBookingSlots,
    getBookingsByRestaurant,
    CreateBookingInput,
    CreateBookingSlotInput,
} from '../services/booking.service';

const router = Router();

interface BookingRouteParams {
    restaurantId: string;
}

interface BookingSlotsQuery {
    day?: string;
}

/**
 * @openapi
 * /api/bookings/slots/{restaurantId}:
 *   get:
 *     summary: Get booking slots for a restaurant
 *     tags: [Bookings]
 *     parameters:
 *       - in: path
 *         name: restaurantId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: day
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Booking slots retrieved successfully
 */
router.get('/slots/:restaurantId', async (req: Request<BookingRouteParams, {}, {}, BookingSlotsQuery>, res: Response) => {
    try {
        const slots = await getBookingSlots(req.params.restaurantId, req.query.day);
        res.json({ success: true, data: slots });
    } catch (error) {
        res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Server error' });
    }
});

/**
 * @openapi
 * /api/bookings/slots:
 *   post:
 *     summary: Create a booking slot
 *     tags: [Bookings]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/BookingSlotInput'
 *     responses:
 *       201:
 *         description: Booking slot created successfully
 *       400:
 *         description: Invalid request body
 */
router.post('/slots', async (req: Request<{}, {}, CreateBookingSlotInput>, res: Response) => {
    try {
        const slot = await createBookingSlot(req.body);
        res.status(201).json({ success: true, data: slot });
    } catch (error) {
        res.status(400).json({ success: false, error: error instanceof Error ? error.message : 'Invalid request' });
    }
});

/**
 * @openapi
 * /api/bookings:
 *   post:
 *     summary: Create a reservation booking
 *     tags: [Bookings]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/BookingCreateRequest'
 *     responses:
 *       201:
 *         description: Booking created successfully
 *       400:
 *         description: Invalid request body
 */
router.post('/', async (req: Request<{}, {}, CreateBookingInput>, res: Response) => {
    try {
        const booking = await createBooking(req.body);
        res.status(201).json({ success: true, data: booking });
    } catch (error) {
        res.status(400).json({ success: false, error: error instanceof Error ? error.message : 'Invalid request' });
    }
});

/**
 * @openapi
 * /api/bookings/{restaurantId}:
 *   get:
 *     summary: Get bookings for a restaurant
 *     tags: [Bookings]
 *     parameters:
 *       - in: path
 *         name: restaurantId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Bookings retrieved successfully
 */
router.get('/:restaurantId', async (req: Request<BookingRouteParams>, res: Response) => {
    try {
        const bookings = await getBookingsByRestaurant(req.params.restaurantId);
        res.json({ success: true, data: bookings });
    } catch (error) {
        res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Server error' });
    }
});

export default router;
