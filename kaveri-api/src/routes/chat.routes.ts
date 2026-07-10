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
 *               messages:
 *                 type: array
 *                 description: Chat history payload used for conversational requests
 *                 items:
 *                   type: object
 *                   properties:
 *                     text:
 *                       type: string
 *               query:
 *                 type: string
 *                 description: Optional search-only payload when you want semantic retrieval without chat context
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
