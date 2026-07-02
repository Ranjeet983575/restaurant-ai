import { groqClient, groqModel } from '../config/groq';

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
    try {
        const systemPrompt = request.systemPrompt || 'You are a helpful assistant.';

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
        throw new Error(`LLM Query failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}
