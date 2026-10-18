import { getGroqClient, groqModel } from '../config/groq';
import type {
    ChatCompletionMessageToolCall,
    ChatCompletionMessageParam,
    ChatCompletionTool,
    ChatCompletionToolChoiceOption,
} from 'groq-sdk/resources/chat/completions';
import { parseConciergeToolArguments } from '../tools/agent-tools';

const MAX_TOOL_ROUNDS = 3;
const MAX_TOOL_OUTPUT_LENGTH = 12000;

interface AgentCompletionResponse {
    choices: Array<{
        message: {
            content?: string | null;
            tool_calls?: ChatCompletionMessageToolCall[];
        };
    }>;
    usage?: {
        prompt_tokens?: number;
        completion_tokens?: number;
        total_tokens?: number;
    } | null;
}

export interface AgentToolLoopResult {
    content: string;
    toolCalls: NonNullable<LLMQueryResponse['toolCalls']>;
    tokens_used: NonNullable<LLMQueryResponse['tokens_used']>;
}

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
    history?: Array<{ role: 'user' | 'assistant'; text: string }>;
    tools?: ChatCompletionTool[];
    toolChoice?: ChatCompletionToolChoiceOption;
    executeTool?: (name: string, args: Record<string, unknown>) => Promise<unknown>;
}

export interface LLMQueryResponse {
    content: string;
    model: string;
    fallback?: boolean;
    tokens_used?: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
    };
    toolCalls?: Array<{
        tool: string;
        status: 'completed' | 'failed';
        summary: string;
    }>;
}

export function buildLLMMessages(
    systemPrompt: string,
    history: Array<{ role: 'user' | 'assistant'; text: string }> = [],
    message: string
): ChatCompletionMessageParam[] {
    const recentHistory = history
        .filter(turn => (turn.role === 'user' || turn.role === 'assistant') && turn.text.trim())
        .slice(-12);

    return [
        { role: 'system', content: systemPrompt },
        ...recentHistory.map(turn => ({ role: turn.role, content: turn.text })),
        { role: 'user', content: message },
    ];
}

export async function runAgentToolLoop(
    complete: (
        messages: ChatCompletionMessageParam[],
        toolChoice?: ChatCompletionToolChoiceOption
    ) => Promise<AgentCompletionResponse>,
    messages: ChatCompletionMessageParam[],
    tools: ChatCompletionTool[],
    initialToolChoice: ChatCompletionToolChoiceOption,
    executeTool: (name: string, args: Record<string, unknown>) => Promise<unknown>
): Promise<AgentToolLoopResult> {
    const executedTools: AgentToolLoopResult['toolCalls'] = [];
    let completion: AgentCompletionResponse | undefined;

    for (let round = 0; round <= MAX_TOOL_ROUNDS; round += 1) {
        completion = await complete(messages, round === 0 ? initialToolChoice : 'auto');
        const assistantMessage = completion.choices[0]?.message;
        const toolCalls = assistantMessage?.tool_calls || [];
        if (!toolCalls.length) break;
        if (round === MAX_TOOL_ROUNDS) {
            console.error('Agent stopped after reaching the maximum tool execution rounds.');
            break;
        }

        messages.push({
            role: 'assistant',
            content: assistantMessage.content || null,
            tool_calls: toolCalls,
        });

        for (const toolCall of toolCalls) {
            let result: unknown;
            let status: 'completed' | 'failed' = 'completed';
            try {
                if (!tools.some(tool => tool.function?.name === toolCall.function.name)) {
                    throw new Error(`Tool "${toolCall.function.name}" is not enabled for this request.`);
                }
                const args = parseConciergeToolArguments(toolCall.function.arguments);
                result = await executeTool(toolCall.function.name, args);
            } catch (error) {
                status = 'failed';
                const detail = error instanceof Error ? error.message : 'Unknown tool execution error';
                console.error(`Agent tool ${toolCall.function.name} failed.`, error);
                result = { error: detail };
            }

            const serializedResult = JSON.stringify(result ?? null);
            messages.push({
                role: 'tool',
                tool_call_id: toolCall.id,
                content: serializedResult.length > MAX_TOOL_OUTPUT_LENGTH
                    ? `${serializedResult.slice(0, MAX_TOOL_OUTPUT_LENGTH)} [truncated]`
                    : serializedResult,
            });
            executedTools.push({
                tool: toolCall.function.name,
                status,
                summary: status === 'completed' ? 'Tool executed successfully.' : 'Tool execution failed.',
            });
        }
    }

    return {
        content: completion?.choices[0]?.message.content || 'I could not complete that request. Please try again.',
        toolCalls: executedTools,
        tokens_used: {
            prompt_tokens: completion?.usage?.prompt_tokens || 0,
            completion_tokens: completion?.usage?.completion_tokens || 0,
            total_tokens: completion?.usage?.total_tokens || 0,
        },
    };
}

export async function queryLLM(request: LLMQueryRequest): Promise<LLMQueryResponse> {
    const systemPrompt = request.systemPrompt || 'You are a helpful assistant.';
    const groqApiKey = process.env.GROQ_API_KEY?.trim();

    try {
        if (!groqApiKey || groqApiKey === 'your_groq_api_key_here') {
            return {
                content: buildFallbackResponse(request.message, systemPrompt),
                model: groqModel,
                fallback: true,
                tokens_used: {
                    prompt_tokens: 0,
                    completion_tokens: 0,
                    total_tokens: 0,
                },
            };
        }

        const groqClient = getGroqClient();
        const messages = buildLLMMessages(systemPrompt, request.history, request.message);
        let result: AgentToolLoopResult;
        if (request.tools?.length && request.executeTool) {
            result = await runAgentToolLoop(
                async (conversation, toolChoice) => groqClient.chat.completions.create({
                    messages: conversation,
                    model: groqModel,
                    temperature: 0.2,
                    max_tokens: 1024,
                    tools: request.tools,
                    tool_choice: toolChoice,
                }),
                messages,
                request.tools,
                request.toolChoice || 'auto',
                request.executeTool,
            );
        } else {
            const completion = await groqClient.chat.completions.create({
                messages,
                model: groqModel,
                temperature: 0.2,
                max_tokens: 1024,
            });
            result = {
                content: completion.choices[0]?.message?.content || 'I could not complete that request. Please try again.',
                toolCalls: [],
                tokens_used: {
                    prompt_tokens: completion.usage?.prompt_tokens || 0,
                    completion_tokens: completion.usage?.completion_tokens || 0,
                    total_tokens: completion.usage?.total_tokens || 0,
                },
            };
        }

        return {
            content: result.content,
            model: groqModel,
            fallback: false,
            toolCalls: result.toolCalls,
            tokens_used: result.tokens_used,
        };
    } catch (error) {
        console.error('Groq chat completion failed; using fallback response.', error);
        return {
            content: buildFallbackResponse(request.message, systemPrompt),
            model: groqModel,
            fallback: true,
            tokens_used: {
                prompt_tokens: 0,
                completion_tokens: 0,
                total_tokens: 0,
            },
        };
    }
}
