"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const llm_service_1 = require("../services/llm.service");
const router = (0, express_1.Router)();
/**
 * @swagger
 * /api/llm/query:
 *   post:
 *     summary: Query the LLM with a message
 *     description: Send a message to Groq LLM and get a response
 *     tags:
 *       - LLM
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LLMQueryRequest'
 *           example:
 *             message: "What is TypeScript?"
 *             systemPrompt: "You are a helpful coding assistant."
 *     responses:
 *       200:
 *         description: Successful response from LLM
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LLMQueryResponse'
 *       400:
 *         description: Invalid request - missing or invalid message field
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/query', async (req, res) => {
    try {
        const { message, systemPrompt } = req.body;
        // Validation
        if (!message || typeof message !== 'string') {
            res.status(400).json({
                error: 'Invalid request',
                message: 'Message field is required and must be a string',
            });
            return;
        }
        // Call LLM service
        const request = {
            message,
            systemPrompt,
        };
        const response = await (0, llm_service_1.queryLLM)(request);
        res.json({
            success: true,
            data: response,
        });
    }
    catch (error) {
        console.error('LLM Query Error:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Internal server error',
        });
    }
});
exports.default = router;
