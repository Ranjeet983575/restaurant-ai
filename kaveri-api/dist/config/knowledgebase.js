"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.knowledgeBase = void 0;
// Simple global knowledge base
exports.knowledgeBase = {
    documents: [
        {
            id: '1',
            content: 'TypeScript is a typed superset of JavaScript that compiles to plain JavaScript. It helps catch errors at compile time and provides better IDE support.',
            metadata: { topic: 'TypeScript', category: 'Programming' },
            createdAt: new Date(),
        },
        {
            id: '2',
            content: 'Express.js is a fast, unopinionated, minimalist web framework for Node.js. It provides a robust set of features for web and mobile applications.',
            metadata: { topic: 'Express', category: 'Framework' },
            createdAt: new Date(),
        },
        {
            id: '3',
            content: 'Groq is an AI company that develops LPU (Language Processing Unit) technology for fast AI inference. Their API provides access to powerful open-source models.',
            metadata: { topic: 'Groq', category: 'AI/ML' },
            createdAt: new Date(),
        },
        {
            id: '4',
            content: 'RAG (Retrieval-Augmented Generation) is a technique that combines document retrieval with generative models to provide context-aware responses.',
            metadata: { topic: 'RAG', category: 'AI/ML' },
            createdAt: new Date(),
        },
    ],
};
