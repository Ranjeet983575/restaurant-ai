import { Router, Request, Response } from 'express';
import { getAvailableTables, TableAvailabilityInput } from '../services/booking.service';

const router = Router();

router.get('/availability', async (req: Request<{}, {}, {}, TableAvailabilityInput>, res: Response) => {
    try {
        const { restaurantId, bookingDate, startTime, partySize, tablePreference } = req.query;
        if (!restaurantId || !bookingDate || !startTime || !partySize) {
            res.status(400).json({ success: false, error: 'restaurantId, bookingDate, startTime, and partySize are required' });
            return;
        }

        const tables = await getAvailableTables({
            restaurantId,
            bookingDate,
            startTime,
            partySize: Number(partySize),
            tablePreference,
        });
        res.json({ success: true, data: tables });
    } catch (error) {
        res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Availability lookup failed' });
    }
});

export default router;