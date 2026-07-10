import { queryLLM } from './llm.service';
import { getAllMenuItems, getAllRestaurants } from './restaurant.service';

export interface ChatMessage {
    role?: 'user' | 'assistant';
    text: string;
}

export interface ChatRequest {
    messages: ChatMessage[];
}

export async function handleChat(request: ChatRequest) {
    const { messages } = request || {};

    if (!Array.isArray(messages) || messages.length === 0) {
        throw new Error('messages array is required');
    }

    const lastMessage = messages[messages.length - 1]?.text || '';
    const restaurants = await getAllRestaurants();
    const menus = await getAllMenuItems();

    const context = [
        `Restaurant count: ${restaurants.length}`,
        `Menu item count: ${menus.length}`,
        `Restaurant names: ${restaurants.map(item => item.name).join(', ')}`,
        `Sample menu items: ${menus.slice(0, 12).map(item => `${item.name} (${item.category})`).join(', ')}`,
    ].join('\n');

    const systemPrompt = `You are Kaveri restaurant assistant. Use the provided restaurant and menu context to answer questions accurately. If the user asks about menu items, dishes, pricing, recommendations, vegetarian options, specials, or booking, answer from the provided data. If a booking request is detected, ask for the date, time, party size, and customer contact details.\n\nContext:\n${context}`;

    const response = await queryLLM({
        message: lastMessage,
        systemPrompt,
    });

    return {
        reply: response.content,
        model: response.model,
    };
}
