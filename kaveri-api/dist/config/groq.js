"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.groqModel = exports.groqClient = void 0;
const groq_sdk_1 = require("groq-sdk");
exports.groqClient = new groq_sdk_1.Groq({
    apiKey: process.env.GROQ_API_KEY,
});
exports.groqModel = process.env.GROQ_MODEL || 'llama-3.1-8b-instant';
