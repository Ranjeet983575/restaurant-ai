import { queryLLM } from './llm.service';
import { getAllMenuItems, getAllRestaurants, semanticSearchMenus } from './restaurant.service';

export interface ChatMessage {
    role?: 'user' | 'assistant';
    text: string;
}

export interface ChatRequest {
    messages?: ChatMessage[];
    query?: string;
    limit?: number;
}

export type ChatIntent = 'menu' | 'price' | 'diet' | 'restaurant' | 'booking' | 'general';

function normalizeText(value: string): string {
    return value.toLowerCase().trim();
}

export function classifyUserIntent(message: string): ChatIntent {
    const normalized = normalizeText(message);

    if (/reserve|booking|table|reservation|book/i.test(normalized)) {
        return 'booking';
    }

    if (/price|cost|cheap|expensive|under\s*₹|₹|rupees|budget/i.test(normalized)) {
        return 'price';
    }

    if (/where|location|address|hours|timing|open|close|restaurant|located/i.test(normalized)) {
        return 'restaurant';
    }

    if (/vegetarian|vegan|non-veg|non veg|gluten|healthy|protein|diet/i.test(normalized)) {
        return 'diet';
    }

    if (/menu|dish|dishes|item|items|popular|special|recommend|show me|spicy|crispy|sweet|creamy/i.test(normalized)) {
        return 'menu';
    }

    return 'general';
}

function normalizeMenuName(value: string): string {
    return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function getKeywordScore(query: string, menu: Record<string, any>): number {
    const normalizedQuery = normalizeText(query);
    const searchableText = [menu.name, menu.description, menu.category, menu.section, menu.restaurantName, ...(menu.tags || [])].join(' ').toLowerCase();
    const queryTerms = normalizedQuery.split(/\s+/).filter(Boolean);

    if (!queryTerms.length) {
        return 0;
    }

    const exactName = normalizeMenuName(menu.name);
    const queryName = normalizeMenuName(query);
    if (exactName && queryName && (exactName.includes(queryName) || queryName.includes(exactName))) {
        return 0.95;
    }

    let score = 0;
    for (const term of queryTerms) {
        if (!term || term.length <= 2) {
            continue;
        }

        if (searchableText.includes(term)) {
            score += 0.2;
        }
    }

    if (/(spicy|hot|fiery)/.test(normalizedQuery) && /(spicy|hot|fiery)/.test(searchableText)) {
        score += 0.1;
    }

    if (/(crispy|crunchy)/.test(normalizedQuery) && /(crispy|crunchy)/.test(searchableText)) {
        score += 0.1;
    }

    if (/(sweet|dessert)/.test(normalizedQuery) && /(sweet|dessert)/.test(searchableText)) {
        score += 0.1;
    }

    if (/(creamy|rich)/.test(normalizedQuery) && /(creamy|rich)/.test(searchableText)) {
        score += 0.1;
    }

    if (/(vegetarian|veg)/.test(normalizedQuery) && menu.vegetarian === true) {
        score += 0.1;
    }

    if (/(non-veg|non veg|meat|chicken|mutton|fish)/.test(normalizedQuery) && menu.vegetarian === false) {
        score += 0.1;
    }

    return Math.min(score, 0.85);
}

export function rerankMenuResults(query: string, results: Array<{ similarity_score: number; menu: { name: string; description: string; vegetarian?: boolean; tags?: string[] } }>) {
    const normalized = normalizeText(query);
    const boosted = results.map(result => {
        let score = result.similarity_score;

        const text = `${result.menu.name} ${result.menu.description} ${(result.menu.tags || []).join(' ')}`.toLowerCase();

        if (/spicy|fiery|hot/.test(normalized) && /spicy|fiery|hot/.test(text)) {
            score += 0.08;
        }

        if (/crispy|crunchy/.test(normalized) && /crispy|crunchy/.test(text)) {
            score += 0.08;
        }

        if (/sweet|dessert/.test(normalized) && /sweet|dessert/.test(text)) {
            score += 0.08;
        }

        if (/creamy|rich/.test(normalized) && /creamy|rich/.test(text)) {
            score += 0.08;
        }

        if (/vegetarian|veg/.test(normalized) && result.menu.vegetarian === true) {
            score += 0.05;
        }

        if (/non-veg|non veg|meat|chicken|mutton|fish/.test(normalized) && result.menu.vegetarian === false) {
            score += 0.05;
        }

        return { ...result, similarity_score: score };
    });

    return boosted.sort((a, b) => b.similarity_score - a.similarity_score);
}

function buildContext(menus: Array<Record<string, any>>, restaurants: Array<Record<string, any>>, intent: ChatIntent, query: string) {
    const topMenus = menus.slice(0, 10).map(menu => `${menu.name} | ${menu.category} | ₹${menu.price} | ${menu.vegetarian ? 'vegetarian' : 'non-vegetarian'} | ${menu.spicy_level || 'mild'} | ${menu.tags?.join(', ') || 'general'}`).join('\n');
    const restaurantSummary = restaurants.map(item => `${item.name} | ${item.location} | ${item.working_hours?.monday_to_friday || 'hours available'}`).join('\n');

    return [
        `Intent: ${intent}`,
        `User query: ${query}`,
        `Restaurant count: ${restaurants.length}`,
        `Menu item count: ${menus.length}`,
        `Restaurant overview:\n${restaurantSummary}`,
        `Top menu catalog:\n${topMenus}`,
    ].join('\n');
}

export function resolveChatQuery(request: ChatRequest): string {
    const query = typeof request?.query === 'string' ? request.query.trim() : '';
    if (query) {
        return query;
    }

    const messages = Array.isArray(request?.messages) ? request.messages : [];
    const lastMessage = messages[messages.length - 1]?.text || '';
    return lastMessage.trim();
}

export async function handleChat(request: ChatRequest) {
    const { messages, query, limit } = request || {};

    const lastMessage = resolveChatQuery({ messages, query });
    if (!lastMessage) {
        throw new Error('Either query or messages.text is required');
    }
    const restaurants = await getAllRestaurants();
    const allMenus = await getAllMenuItems();
    const intent = classifyUserIntent(lastMessage);

    let retrievedMenus: Array<Record<string, any>> = allMenus as Array<Record<string, any>>;
    if (intent === 'menu' || intent === 'diet' || intent === 'price') {
        const semanticResults = await semanticSearchMenus(lastMessage, limit && limit > 0 ? limit : 8);
        const semanticCandidates = semanticResults.map(item => ({
            similarity_score: item.similarity_score,
            menu: {
                name: item.menu.name,
                description: item.menu.description,
                vegetarian: item.menu.vegetarian,
                tags: item.menu.tags,
            },
        }));

        const rankedSemantic = rerankMenuResults(lastMessage, semanticCandidates);
        const seenNames = new Set(rankedSemantic.map(item => item.menu.name));
        const keywordCandidates = allMenus
            .map(menu => ({
                similarity_score: getKeywordScore(lastMessage, menu),
                menu: {
                    name: menu.name,
                    description: menu.description,
                    vegetarian: menu.vegetarian,
                    tags: menu.tags,
                },
            }))
            .filter(item => item.similarity_score > 0.25 && !seenNames.has(item.menu.name));

        const combined = [...rankedSemantic, ...keywordCandidates];
        const merged = combined
            .sort((a, b) => b.similarity_score - a.similarity_score)
            .slice(0, 8)
            .map(item => {
                const sourceMenu = allMenus.find(menu => menu.name === item.menu.name);
                return {
                    name: item.menu.name,
                    description: item.menu.description,
                    price: sourceMenu?.price ?? 0,
                    category: sourceMenu?.category ?? 'General',
                    section: sourceMenu?.section ?? 'main_course',
                    vegetarian: item.menu.vegetarian,
                    spicy_level: sourceMenu?.spicy_level ?? 'mild',
                    tags: item.menu.tags,
                    restaurantName: sourceMenu?.restaurantName ?? 'Kaveri Restaurant',
                };
            });

        retrievedMenus = merged;
    }

    const context = buildContext(retrievedMenus, restaurants, intent, lastMessage);

    const systemPrompt = `You are Kaveri restaurant assistant. Use the provided restaurant and menu context to answer questions accurately. Prefer the retrieved menu items when the user asks about dishes, pricing, recommendations, vegetarian options, specials, or dietary preferences. For booking requests, ask for the date, time, party size, and customer contact details. Keep the answer concise, helpful, and grounded in the provided catalog.\n\nContext:\n${context}`;

    const response = await queryLLM({
        message: lastMessage,
        systemPrompt,
    });

    return {
        reply: response.content,
        model: response.model,
    };
}
