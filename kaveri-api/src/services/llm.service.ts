import { getGroqClient, groqModel } from '../config/groq';

function buildFallbackResponse(message: string, systemPrompt?: string): string {
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

export interface LLMQueryRequest {
    message: string;
    systemPrompt?: string;
}

export interface LLMQueryResponse {
    content: string;
    model: string;
    tokens_used?: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
    };
}

export async function queryLLM(request: LLMQueryRequest): Promise<LLMQueryResponse> {
    const systemPrompt = request.systemPrompt || 'You are a helpful assistant.';

    try {
        if (!process.env.GROQ_API_KEY) {
            return {
                content: buildFallbackResponse(request.message, systemPrompt),
                model: groqModel,
                tokens_used: {
                    prompt_tokens: 0,
                    completion_tokens: 0,
                    total_tokens: 0,
                },
            };
        }

        const groqClient = getGroqClient();
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
            model: groqModel,
            temperature: 0.7,
            max_tokens: 1024,
        });

        const content = message.choices[0]?.message?.content || '';

        return {
            content,
            model: groqModel,
            tokens_used: {
                prompt_tokens: message.usage?.prompt_tokens || 0,
                completion_tokens: message.usage?.completion_tokens || 0,
                total_tokens: message.usage?.total_tokens || 0,
            },
        };
    } catch (error) {
        return {
            content: buildFallbackResponse(request.message, systemPrompt),
            model: groqModel,
            tokens_used: {
                prompt_tokens: 0,
                completion_tokens: 0,
                total_tokens: 0,
            },
        };
    }
}
