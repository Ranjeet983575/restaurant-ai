"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.queryLLM = queryLLM;
const groq_1 = require("../config/groq");
async function queryLLM(request) {
    try {
        const systemPrompt = request.systemPrompt || 'You are a helpful assistant.';
        const message = await groq_1.groqClient.chat.completions.create({
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
        throw new Error(`LLM Query failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}
