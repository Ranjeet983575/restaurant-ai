import { Router, Request, Response } from 'express';
import { getConversation, handleChat } from '../services/chat.service';

const router = Router();

/**
 * @openapi
 * /chat/{conversationId}:
 *   get:
 *     summary: Restore a saved conversation and its workflow state
 *     tags: [Chat]
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Conversation history and state returned successfully
 *       500:
 *         description: Conversation history could not be loaded
 */
router.get('/:conversationId', async (req: Request, res: Response) => {
    try {
        const conversationId = req.params.conversationId;
        if (typeof conversationId !== 'string' || !conversationId) {
            res.status(400).json({ success: false, error: 'conversationId is required' });
            return;
        }
        const result = await getConversation(conversationId);
        res.json({ success: true, ...result });
    } catch (error) {
        res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Unable to load conversation' });
    }
});

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
 *             properties:
 *               query:
 *                 type: string
 *                 description: Main chat or search query. This is the preferred field.
 *               conversationId:
 *                 type: string
 *                 description: Optional stable ID used to persist conversation history and state in MongoDB.
 *               messages:
 *                 type: array
 *                 description: Optional legacy chat history payload. If provided without query, the last message text is used.
 *                 items:
 *                   type: object
 *                   properties:
 *                     role:
 *                       type: string
 *                       enum: [user, assistant]
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
