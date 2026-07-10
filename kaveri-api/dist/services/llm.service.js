"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.queryLLM = queryLLM;
const groq_1 = require("../config/groq");
function buildFallbackResponse(message, systemPrompt) {
    const normalized = message.toLowerCase();
    if (/reserve|booking|table|reservation|book/i.test(normalized)) {
        return 'I can help with reservations. Please share your preferred date, time, and party size.';
    }
    if (/price|cost|cheap|expensive|under\s*₹|₹|rupees|budget/i.test(normalized)) {
        return 'I can help compare menu prices. Please mention the dish you want to check.';
    }
    if (/where|location|address|hours|timing|open|close|restaurant|located/i.test(normalized)) {
        return 'I can share restaurant details such as location, timings, and contact info.';
    }
    return `I can help with menu suggestions and restaurant information. ${systemPrompt ? 'Use the provided context for best results.' : ''}`.trim();
}
async function queryLLM(request) {
    const systemPrompt = request.systemPrompt || 'You are a helpful assistant.';
    try {
        if (!process.env.GROQ_API_KEY) {
            return {
                content: buildFallbackResponse(request.message, systemPrompt),
                model: groq_1.groqModel,
                tokens_used: {
                    prompt_tokens: 0,
                    completion_tokens: 0,
                    total_tokens: 0,
                },
            };
        }
        const groqClient = (0, groq_1.getGroqClient)();
        const message = await groqClient.chat.completions.create({
            messages: [
                {
                    role: 'system',
                    content: systemPrompt,
                },
                {
                    role: 'user',
                    content: request.message,
                },
            ],
            model: groq_1.groqModel,
            temperature: 0.7,
            max_tokens: 1024,
        });
        const content = message.choices[0]?.message?.content || '';
        return {
            content,
            model: groq_1.groqModel,
            tokens_used: {
                prompt_tokens: message.usage?.prompt_tokens || 0,
                completion_tokens: message.usage?.completion_tokens || 0,
                total_tokens: message.usage?.total_tokens || 0,
            },
        };
    }
    catch (error) {
        return {
            content: buildFallbackResponse(request.message, systemPrompt),
            model: groq_1.groqModel,
            tokens_used: {
                prompt_tokens: 0,
                completion_tokens: 0,
                total_tokens: 0,
            },
        };
    }
}
