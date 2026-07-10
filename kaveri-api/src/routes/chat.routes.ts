import { Router, Request, Response } from 'express';
import { handleChat } from '../services/chat.service';

const router = Router();

/**
 * @openapi
 * /chat:
 *   post:
 *     summary: Chat with the restaurant assistant or run a semantic search query
 *     tags: [Chat]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [messages]
 *             properties:
 *               query:
 *                 type: string
 *                 description: Main chat or search query. This is the preferred field.
 *               messages:
 *                 type: array
 *                 description: Optional legacy chat history payload. If provided without query, the last message text is used.
 *                 items:
 *                   type: object
 *                   properties:
 *                     text:
 *                       type: string
 *               limit:
 *                 type: number
 *                 description: Optional limit for semantic search results
 *     responses:
 *       200:
 *         description: Chat response returned successfully
 */
router.post('/', async (req: Request, res: Response) => {
    try {
        const payload = req.body || {};
        const result = await handleChat(payload);
        res.json({ success: true, ...result, mode: 'chat' });
    } catch (error) {
        res.status(400).json({ success: false, error: error instanceof Error ? error.message : 'Invalid request' });
    }
});

export default router;
