"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.groqModel = void 0;
exports.getGroqClient = getGroqClient;
const groq_sdk_1 = require("groq-sdk");
let groqClientInstance = null;
exports.groqModel = process.env.GROQ_MODEL || 'llama-3.1-8b-instant';
function getGroqClient() {
    if (!process.env.GROQ_API_KEY) {
        throw new Error('GROQ_API_KEY environment variable is missing or empty');
    }
    if (!groqClientInstance) {
        groqClientInstance = new groq_sdk_1.Groq({
            apiKey: process.env.GROQ_API_KEY,
        });
    }
    return groqClientInstance;
}
