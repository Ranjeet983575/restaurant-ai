"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.retrieveDocuments = retrieveDocuments;
exports.addDocument = addDocument;
exports.deleteDocument = deleteDocument;
exports.getAllDocuments = getAllDocuments;
exports.getDocumentById = getDocumentById;
const knowledgebase_1 = require("../config/knowledgebase");
/**
 * Calculate similarity between two strings using simple algorithm
 * Returns a score between 0 and 1
 */
function calculateSimilarity(str1, str2) {
    const s1 = str1.toLowerCase().split(/\s+/);
    const s2 = str2.toLowerCase().split(/\s+/);
    const intersection = s1.filter(word => s2.includes(word)).length;
    const union = new Set([...s1, ...s2]).size;
    return union === 0 ? 0 : intersection / union;
}
/**
 * Retrieve documents relevant to a query
 */
function retrieveDocuments(query, topK = 3) {
    const scores = knowledgebase_1.knowledgeBase.documents.map(doc => ({
        doc,
        score: calculateSimilarity(query, doc.content),
    }));
    // Sort by score descending and return top K
    return scores
        .sort((a, b) => b.score - a.score)
        .slice(0, topK)
        .filter(item => item.score > 0) // Only return if there's some relevance
        .map(item => item.doc);
}
/**
 * Add a document to the knowledge base
 */
function addDocument(content, metadata) {
    const id = String(knowledgebase_1.knowledgeBase.documents.length + 1);
    const doc = {
        id,
        content,
        metadata,
        createdAt: new Date(),
    };
    knowledgebase_1.knowledgeBase.documents.push(doc);
    return doc;
}
/**
 * Delete a document from the knowledge base
 */
function deleteDocument(documentId) {
    const index = knowledgebase_1.knowledgeBase.documents.findIndex(doc => doc.id === documentId);
    if (index !== -1) {
        knowledgebase_1.knowledgeBase.documents.splice(index, 1);
        return true;
    }
    return false;
}
/**
 * Get all documents
 */
function getAllDocuments() {
    return knowledgebase_1.knowledgeBase.documents;
}
/**
 * Get document by ID
 */
function getDocumentById(id) {
    return knowledgebase_1.knowledgeBase.documents.find(doc => doc.id === id);
}
