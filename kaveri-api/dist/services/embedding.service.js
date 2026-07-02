"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateEmbedding = generateEmbedding;
exports.generateMenuEmbedding = generateMenuEmbedding;
exports.generateRestaurantEmbedding = generateRestaurantEmbedding;
exports.cosineSimilarity = cosineSimilarity;
const transformers_1 = require("@xenova/transformers");
// Set environment for local model usage
transformers_1.env.allowLocalModels = true;
transformers_1.env.allowRemoteModels = true;
// Global pipeline instance
let embeddingPipeline = null;
/**
 * Initialize the sentence transformer pipeline
 */
async function getEmbeddingPipeline() {
    if (!embeddingPipeline) {
        console.log('Loading Sentence Transformer model...');
        embeddingPipeline = await (0, transformers_1.pipeline)('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
            quantized: true,
        });
        console.log('✓ Sentence Transformer model loaded');
    }
    return embeddingPipeline;
}
/**
 * Normalize vector to unit length (L2 normalization)
 */
function normalizeVector(vec) {
    const norm = Math.sqrt(vec.reduce((sum, val) => sum + val * val, 0));
    if (norm === 0)
        return vec;
    return vec.map(val => val / norm);
}
/**
 * Generate embedding vector for text using Sentence Transformer
 * Returns a 384-dimensional vector
 */
async function generateEmbedding(text) {
    try {
        const extractor = await getEmbeddingPipeline();
        // Generate embeddings
        const result = await extractor(text, {
            pooling: 'mean',
            normalize: true,
        });
        // Convert to array and ensure it's numbers
        const embedding = Array.from(result.data);
        // Additional normalization for consistency
        return normalizeVector(embedding);
    }
    catch (error) {
        throw new Error(`Failed to generate embedding: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}
/**
 * Generate embedding for a menu item using its textual content
 */
async function generateMenuEmbedding(menuItem) {
    try {
        const text = `
            menu item: ${menuItem.name}
            description: ${menuItem.description}
            section: ${menuItem.section || 'general'}
            category: ${menuItem.category || 'general'}
            vegetarian: ${menuItem.vegetarian ? 'vegetarian' : 'non vegetarian'}
            spicy level: ${menuItem.spicy_level || 'mild'}
            tags: ${(menuItem.tags || []).join(', ')}
        `.trim();
        return generateEmbedding(text);
    }
    catch (error) {
        throw new Error(`Failed to generate menu embedding: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}
/**
 * Generate combined embedding from restaurant data
 * Combines name, cuisine, description, location, tags with weights
 */
async function generateRestaurantEmbedding(restaurantData) {
    try {
        // Combine all text fields with emphasis on important ones
        const menuText = (restaurantData.menus || [])
            .map(item => `menu item: ${item.name}; ${item.description}; section: ${item.section || 'general'}; category: ${item.category || 'general'}; tags: ${(item.tags || []).join(', ')}`)
            .join(' | ');
        const combinedText = `
            restaurant name: ${restaurantData.name}
            cuisine types: ${restaurantData.cuisine.join(', ')}
            description: ${restaurantData.description}
            location: ${restaurantData.location}
            tags: ${restaurantData.tags.join(', ')}
            menu details: ${menuText}
        `.trim();
        const embedding = await generateEmbedding(combinedText);
        return embedding;
    }
    catch (error) {
        throw new Error(`Failed to generate restaurant embedding: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}
/**
 * Calculate cosine similarity between two vectors
 * Returns score between -1 and 1 (higher = more similar)
 */
function cosineSimilarity(vecA, vecB) {
    if (vecA.length !== vecB.length) {
        throw new Error('Vectors must have same dimensions');
    }
    let dotProduct = 0;
    let magnitudeA = 0;
    let magnitudeB = 0;
    for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i];
        magnitudeA += vecA[i] * vecA[i];
        magnitudeB += vecB[i] * vecB[i];
    }
    const magnitude = Math.sqrt(magnitudeA) * Math.sqrt(magnitudeB);
    if (magnitude === 0)
        return 0;
    return dotProduct / magnitude;
}
