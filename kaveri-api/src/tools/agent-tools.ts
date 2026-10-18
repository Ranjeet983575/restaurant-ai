import type { ChatCompletionTool } from 'groq-sdk/resources/chat/completions';

export const conciergeTools: ChatCompletionTool[] = [
    {
        type: 'function',
        function: {
            name: 'menu_search',
            description: 'Search the restaurant menu for real dishes matching the customer request.',
            parameters: {
                type: 'object',
                properties: {
                    query: {
                        type: 'string',
                        description: 'The dish, ingredient, dietary preference, price, or menu request to search for.',
                    },
                },
                required: ['query'],
                additionalProperties: false,
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'restaurant_info',
            description: 'Fetch the restaurant name, address, contact details, cuisine, hours, and reservation policies.',
            parameters: {
                type: 'object',
                properties: {},
                additionalProperties: false,
            },
        },
    },
];

export type ConciergeToolName = 'menu_search' | 'restaurant_info';

export function parseConciergeToolArguments(value: string): Record<string, unknown> {
    const parsed: unknown = JSON.parse(value);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error('Tool arguments must be a JSON object.');
    }
    return parsed as Record<string, unknown>;
}
