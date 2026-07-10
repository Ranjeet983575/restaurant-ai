import { Groq } from 'groq-sdk';

let groqClientInstance: Groq | null = null;

export const groqModel = process.env.GROQ_MODEL || 'llama-3.1-8b-instant';

export function getGroqClient(): Groq {
    if (!process.env.GROQ_API_KEY) {
        throw new Error('GROQ_API_KEY environment variable is missing or empty');
    }

    if (!groqClientInstance) {
        groqClientInstance = new Groq({
            apiKey: process.env.GROQ_API_KEY,
        });
    }

    return groqClientInstance;
}
