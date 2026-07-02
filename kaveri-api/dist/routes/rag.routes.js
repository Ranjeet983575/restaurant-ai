"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const rag_service_1 = require("../services/rag.service");
const retrieval_service_1 = require("../services/retrieval.service");
const router = (0, express_1.Router)();
/**
 * @swagger
 * /api/rag/query:
 *   post:
 *     summary: Query the LLM with RAG (Retrieval-Augmented Generation)
 *     description: Send a query and get an answer based on relevant documents from the knowledge base
 *     tags:
 *       - RAG
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - query
 *             properties:
 *               query:
 *                 type: string
 *                 description: The query question
 *                 example: "What is TypeScript?"
 *               systemPrompt:
 *                 type: string
 *                 description: Optional system prompt
 *               topK:
 *                 type: number
 *                 description: Number of documents to retrieve (default 3)
 *                 example: 3
 *     responses:
 *       200:
 *         description: Successful RAG query response
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     query:
 *                       type: string
 *                     answer:
 *                       type: string
 *                     context:
 *                       type: object
 *                       properties:
 *                         documentCount:
 *                           type: number
 *                         documents:
 *                           type: array
 *       400:
 *         description: Invalid request
 *       500:
 *         description: Internal server error
 */
router.post('/query', async (req, res) => {
    try {
        const { query, systemPrompt, topK } = req.body;
        if (!query || typeof query !== 'string') {
            res.status(400).json({
                error: 'Invalid request',
                message: 'Query field is required and must be a string',
            });
            return;
        }
        const ragRequest = {
            query,
            systemPrompt,
            topK,
        };
        const response = await (0, rag_service_1.queryWithRAG)(ragRequest);
        res.json({
            success: true,
            data: response,
        });
    }
    catch (error) {
        console.error('RAG Query Error:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Internal server error',
        });
    }
});
/**
 * @swagger
 * /api/rag/documents:
 *   get:
 *     summary: Get all documents in knowledge base
 *     tags:
 *       - RAG
 *     responses:
 *       200:
 *         description: List of all documents
 */
router.get('/documents', (_req, res) => {
    try {
        const documents = (0, retrieval_service_1.getAllDocuments)();
        res.json({
            success: true,
            data: {
                count: documents.length,
                documents,
            },
        });
    }
    catch (error) {
        console.error('Error fetching documents:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch documents',
        });
    }
});
/**
 * @swagger
 * /api/rag/documents/{id}:
 *   get:
 *     summary: Get a specific document by ID
 *     tags:
 *       - RAG
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Document found
 *       404:
 *         description: Document not found
 */
router.get('/documents/:id', (req, res) => {
    try {
        const { id } = req.params;
        const document = (0, retrieval_service_1.getDocumentById)(id);
        if (!document) {
            res.status(404).json({
                success: false,
                error: 'Document not found',
            });
            return;
        }
        res.json({
            success: true,
            data: document,
        });
    }
    catch (error) {
        console.error('Error fetching document:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch document',
        });
    }
});
/**
 * @swagger
 * /api/rag/documents:
 *   post:
 *     summary: Add a new document to knowledge base
 *     tags:
 *       - RAG
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - content
 *             properties:
 *               content:
 *                 type: string
 *                 description: Document content
 *                 example: "This is a sample document about AI"
 *               metadata:
 *                 type: object
 *                 description: Optional metadata
 *     responses:
 *       201:
 *         description: Document created successfully
 *       400:
 *         description: Invalid request
 */
router.post('/documents', (req, res) => {
    try {
        const { content, metadata } = req.body;
        if (!content || typeof content !== 'string') {
            res.status(400).json({
                error: 'Invalid request',
                message: 'Content field is required and must be a string',
            });
            return;
        }
        const document = (0, retrieval_service_1.addDocument)(content, metadata);
        res.status(201).json({
            success: true,
            data: document,
        });
    }
    catch (error) {
        console.error('Error adding document:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to add document',
        });
    }
});
/**
 * @swagger
 * /api/rag/documents/{id}:
 *   delete:
 *     summary: Delete a document from knowledge base
 *     tags:
 *       - RAG
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Document deleted successfully
 *       404:
 *         description: Document not found
 */
router.delete('/documents/:id', (req, res) => {
    try {
        const { id } = req.params;
        const deleted = (0, retrieval_service_1.deleteDocument)(id);
        ``;
        if (!deleted) {
            res.status(404).json({
                success: false,
                error: 'Document not found',
            });
            return;
        }
        res.json({
            success: true,
            message: 'Document deleted successfully',
        });
    }
    catch (error) {
        console.error('Error deleting document:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete document',
        });
    }
});
exports.default = router;
