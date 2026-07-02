import { Groq } from 'groq-sdk';

export const groqClient = new Groq({
    apiKey: process.env.GROQ_API_KEY,
});

export const groqModel = process.env.GROQ_MODEL || 'llama-3.1-8b-instant';
