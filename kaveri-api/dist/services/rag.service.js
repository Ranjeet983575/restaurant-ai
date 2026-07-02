"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.queryWithRAG = queryWithRAG;
const llm_service_1 = require("./llm.service");
const retrieval_service_1 = require("./retrieval.service");
/**
 * Query the LLM with RAG - retrieves relevant documents and includes them as context
 */
async function queryWithRAG(request) {
    try {
        const topK = request.topK || 3;
        // Retrieve relevant documents
        const relevantDocs = (0, retrieval_service_1.retrieveDocuments)(request.query, topK);
        // Build context from retrieved documents
        const contextText = relevantDocs
            .map((doc, index) => `Document ${index + 1}:\n${doc.content}`)
            .join('\n\n');
        // Create an enhanced system prompt with context
        const enhancedSystemPrompt = (request.systemPrompt || 'You are a helpful assistant.') +
            '\n\nHere is relevant context information:\n' +
            (contextText || 'No relevant documents found.');
        // Query the LLM with context
        const llmRequest = {
            message: request.query,
            systemPrompt: enhancedSystemPrompt,
        };
        const llmResponse = await (0, llm_service_1.queryLLM)(llmRequest);
        return {
            query: request.query,
            answer: llmResponse.content,
            context: {
                documentCount: relevantDocs.length,
                documents: relevantDocs.map(doc => ({
                    id: doc.id,
                    content: doc.content,
                    metadata: doc.metadata,
                })),
            },
            model: llmResponse.model,
            tokens_used: llmResponse.tokens_used,
        };
    }
    catch (error) {
        throw new Error(`RAG Query failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}
