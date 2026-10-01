import { queryLLM } from './llm.service';
import { getAllMenuItems, getAllRestaurants, semanticSearchMenus } from './restaurant.service';
import { createBooking, getBookingSlots } from './booking.service';
import { Conversation } from '../models/conversation.model';
import { ToolCall } from '../tools/tool.types';
import { availabilityTool } from '../tools/availability.tool';

export interface ChatMessage {
    role?: 'user' | 'assistant';
    text: string;
}

export interface ChatRequest {
    conversationId?: string;
    messages?: ChatMessage[];
    query?: string;
    limit?: number;
    conversationState?: Record<string, any>;
}

export type ChatIntent = 'menu' | 'price' | 'diet' | 'restaurant' | 'booking' | 'general';

function extractPartySize(query: string): number | undefined {
    const match = query.match(/\b(?:for|party of|table for)\s*(\d{1,2})\b/i);
    if (match) return Number(match[1]);
    return /^\d{1,2}$/.test(query.trim()) ? Number(query.trim()) : undefined;
}

function extractBookingDate(query: string): string | undefined {
    if (/\btoday\b|\btonight\b/i.test(query)) {
        return new Date().toISOString().slice(0, 10);
    }

    if (/\btomorrow\b/i.test(query)) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        return tomorrow.toISOString().slice(0, 10);
    }

    const isoDate = query.match(/\b(20\d{2}-\d{2}-\d{2})\b/);
    if (isoDate) return isoDate[1];

    const namedDate = query.match(/\b(\d{1,2})\s*(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\b/i);
    if (!namedDate) return undefined;

    const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
    const month = monthNames.findIndex(name => namedDate[2].toLowerCase().startsWith(name));
    if (month < 0) return undefined;
    return `${new Date().getFullYear()}-${String(month + 1).padStart(2, '0')}-${String(Number(namedDate[1])).padStart(2, '0')}`;
}

function extractStartTime(query: string): string | undefined {
    const match = query.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i);
    if (!match) return undefined;
    let hour = Number(match[1]);
    const minutes = match[2] || '00';
    const meridiem = match[3].toLowerCase();
    if (meridiem === 'pm' && hour < 12) hour += 12;
    if (meridiem === 'am' && hour === 12) hour = 0;
    return `${hour.toString().padStart(2, '0')}:${minutes}`;
}

function extractCustomerName(query: string): string | undefined {
    const value = query.trim();
    if (!/^[A-Za-z][A-Za-z .'-]{1,49}$/.test(value)) return undefined;
    if (/^(today|tomorrow|tonight|morning|afternoon|evening|please|book|reservation)$/i.test(value)) return undefined;
    return value;
}

function extractCustomerContact(query: string): { email?: string; phone?: string } {
    const email = query.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0];
    const phone = query.match(/(?:\+?\d[\d\s().-]{7,}\d)/)?.[0]?.trim();
    return { email, phone };
}

function extractTableSelection(query: string, availableTables: Array<Record<string, any>> = []): Record<string, any> | undefined {
    const match = query.trim().match(/^table\s*(\d{1,3})$|^(\d{1,3})$/i);
    const tableNumber = match?.[1] || match?.[2];
    if (!tableNumber || !Array.isArray(availableTables)) return undefined;
    return availableTables.find(table => String(table.tableNumber) === tableNumber);
}

function selectToolCalls(intent: ChatIntent, query: string, bookingDraft: Record<string, any> = {}): ToolCall[] {
    if (intent === 'restaurant') return [{ tool: 'restaurant_info', status: 'completed', summary: 'Restaurant information selected.' }];
    if (intent === 'menu' || intent === 'diet' || intent === 'price') return [{ tool: 'menu_search', status: 'completed', summary: 'Structured menu search selected.' }];
    if (intent === 'booking') {
        if (bookingDraft.tableId) {
            return [{ tool: 'reservation', status: 'needs_input', summary: 'Need customer details before creating the reservation.' }];
        }
        const missing = [
            !(extractPartySize(query) || bookingDraft.partySize) && 'party size',
            !(extractBookingDate(query) || bookingDraft.date) && 'date',
            !(extractStartTime(query) || bookingDraft.time) && 'time',
        ].filter(Boolean) as string[];
        return [{
            tool: 'availability',
            status: missing.length ? 'needs_input' : 'completed',
            summary: missing.length ? `Need ${missing.join(', ')} before checking availability.` : 'Availability lookup selected.',
        }];
    }
    return [];
}

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

function buildContext(menus: Array<Record<string, any>>, restaurants: Array<Record<string, any>>, intent: ChatIntent, query: string, conversationState: Record<string, any>) {
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

function buildGroundedFallback(
    query: string,
    intent: ChatIntent,
    menus: Array<Record<string, any>>,
    restaurants: Array<Record<string, any>>,
    bookingDraft: Record<string, any> = {}
): string {
    const restaurant = restaurants[0];
    if (intent === 'restaurant' && restaurant) {
        if (/hour|open|close|timing|time/i.test(query)) {
            const hours = restaurant.working_hours || {};
            return `${restaurant.name} is open Monday to Friday ${hours.monday_to_friday}, Saturday ${hours.saturday}, and Sunday ${hours.sunday}.`;
        }

        if (/where|location|address|located/i.test(query)) {
            return `${restaurant.name} is at ${restaurant.address}, ${restaurant.location}. You can call ${restaurant.phone}.`;
        }

        return `${restaurant.name}: ${restaurant.description} Cuisine: ${(restaurant.cuisine || []).join(', ')}. Rating: ${restaurant.rating}/5.`;
    }

    if (intent === 'menu' || intent === 'diet' || intent === 'price') {
        const availableMenus = menus
            .filter(menu => menu.is_available !== false)
            .filter(menu => !/vegan/i.test(query) || menu.vegan === true)
            .filter(menu => !/vegetarian|veg/i.test(query) || menu.vegetarian === true)
            .filter(menu => !/spicy|hot|fiery/i.test(query) || ['spicy', 'very_spicy'].includes(menu.spicy_level))
            .slice(0, 5);
        if (availableMenus.length > 0) {
            const items = availableMenus.map(menu => `${menu.name} (₹${menu.price})`).join(', ');
            return `Here are some options from Kaveri's current menu: ${items}. Ask me about dietary details, ingredients, or a specific dish.`;
        }

        return 'I could not find an available menu item matching those preferences. Try asking for vegetarian, vegan, spicy, or budget-friendly dishes.';
    }

    if (intent === 'booking') {
        if (bookingDraft.tableId) {
            if (!bookingDraft.customerName) return 'What name should I put on the reservation?';
            if (!bookingDraft.customerEmail && !bookingDraft.customerPhone) return 'Please share a phone number or email address for the reservation.';
        }
        if (!(extractPartySize(query) || bookingDraft.partySize)) return 'I can check Kaveri table availability. How many guests should I plan for?';
        if (!(extractBookingDate(query) || bookingDraft.date)) return 'What date would you like to visit? You can say tomorrow or provide a date.';
        if (!(extractStartTime(query) || bookingDraft.time)) return 'What time would you prefer? I will check the live tables for that time.';
        if (!bookingDraft.tableId) return 'Please choose one of the available tables by number, such as 1 or 2.';
        if (!bookingDraft.customerName) return 'What name should I put on the reservation?';
        if (!bookingDraft.customerEmail && !bookingDraft.customerPhone) return 'Please share a phone number or email address for the reservation.';
        return 'I have the booking details. Please share the customer name and contact details before I create a reservation.';
    }

    if (/thank|thanks/i.test(query)) {
        return 'You are welcome. I am here whenever you need a menu recommendation or reservation help.';
    }

    if (/hello|hi|hey/i.test(query)) {
        return 'Welcome to Kaveri. I can recommend dishes, share restaurant details, or check table availability.';
    }

    return 'Tell me what you are in the mood for, ask about a menu item, or share a preferred date and time for a table.';
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

function extractConversationState(request: ChatRequest): Record<string, any> {
    return request?.conversationState || {};
}

async function loadConversationState(conversationId?: string): Promise<Record<string, any>> {
    if (!conversationId) {
        return {};
    }

    const conversation = await Conversation.findOne({ conversationId }).select('state');
    return conversation?.state || {};
}

async function saveConversationTurn(
    conversationId: string,
    userMessage: string,
    assistantMessage: string,
    state: Record<string, any>
): Promise<void> {
    await Conversation.findOneAndUpdate(
        { conversationId },
        {
            $set: { state },
            $push: {
                messages: {
                    $each: [
                        { role: 'user', text: userMessage, createdAt: new Date() },
                        { role: 'assistant', text: assistantMessage, createdAt: new Date() },
                    ],
                },
            },
        },
        { upsert: true, setDefaultsOnInsert: true }
    );
}

export async function handleChat(request: ChatRequest) {
    const { conversationId, messages, query, limit } = request || {};
    const persistedState = await loadConversationState(conversationId);
    const conversationState = {
        ...persistedState,
        ...extractConversationState(request),
    };

    const lastMessage = resolveChatQuery({ messages, query });
    if (!lastMessage) {
        throw new Error('Either query or messages.text is required');
    }
    const restaurants = await getAllRestaurants();
    const allMenus = await getAllMenuItems();
    const startsNewBooking = /\b(i want to book|book a table|make a reservation|reserve a table)\b/i.test(lastMessage);
    const existingBookingDraft = startsNewBooking ? {} : conversationState.bookingDraft || {};
    if (startsNewBooking) {
        delete conversationState.availableTables;
    }
    const classifiedIntent = classifyUserIntent(lastMessage);
    const hasBookingContext = existingBookingDraft.active || (Array.isArray(conversationState.availableTables) && conversationState.availableTables.length > 0);
    const intent = classifiedIntent === 'general' && hasBookingContext ? 'booking' : classifiedIntent;
    const selectedTableForQuery = intent === 'booking'
        ? extractTableSelection(lastMessage, conversationState.availableTables)
        : undefined;
    const bookingDraft = intent === 'booking'
        ? {
            ...existingBookingDraft,
            active: true,
            partySize: selectedTableForQuery ? existingBookingDraft.partySize : extractPartySize(lastMessage) || existingBookingDraft.partySize,
            date: extractBookingDate(lastMessage) || existingBookingDraft.date,
            time: extractStartTime(lastMessage) || existingBookingDraft.time,
            customerName: existingBookingDraft.customerName || (existingBookingDraft.tableId ? extractCustomerName(lastMessage) : undefined),
            ...extractCustomerContact(lastMessage),
        }
        : existingBookingDraft;
    if (intent === 'booking') {
        if (selectedTableForQuery) {
            bookingDraft.tableId = selectedTableForQuery.tableId;
            bookingDraft.tableNumber = selectedTableForQuery.tableNumber;
        }
    }
    if (intent === 'booking') {
        conversationState.bookingDraft = bookingDraft;
    }
    const toolCalls = selectToolCalls(intent, lastMessage, bookingDraft);

    if (intent === 'booking' && toolCalls[0]?.status === 'completed') {
        const restaurant = restaurants[0];
        const partySize = bookingDraft.partySize;
        const bookingDate = bookingDraft.date;
        const startTime = bookingDraft.time;
        if (restaurant && partySize && bookingDate && startTime) {
            const tables = await availabilityTool({
                restaurantId: restaurant._id.toString(),
                bookingDate,
                startTime,
                partySize,
            });
            conversationState.availableTables = tables.map(table => ({
                tableId: table._id.toString(),
                tableNumber: table.tableNumber,
                capacity: table.capacity,
                area: table.area,
                tableType: table.tableType,
            }));
        }
    }

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

    const context = buildContext(retrievedMenus, restaurants, intent, lastMessage, conversationState);

    const systemPrompt = `You are Kaveri restaurant assistant. Use the provided restaurant and menu context to answer questions accurately. Prefer the retrieved menu items when the user asks about dishes, pricing, recommendations, vegetarian options, specials, or dietary preferences. For booking requests, ask for the date, time, party size, and customer contact details. Keep the answer concise, helpful, and grounded in the provided catalog.\n\nContext:\n${context}`;

    const groqApiKey = process.env.GROQ_API_KEY?.trim();
    const hasGroqApiKey = Boolean(groqApiKey && groqApiKey !== 'your_groq_api_key_here');
    const llmResponse = hasGroqApiKey
        ? await queryLLM({ message: lastMessage, systemPrompt })
        : null;
    const response = llmResponse && !llmResponse.fallback
        ? llmResponse
        : {
            content: buildGroundedFallback(lastMessage, intent, retrievedMenus, restaurants, bookingDraft),
            model: 'grounded-fallback',
        };

    if (conversationId) {
        await saveConversationTurn(conversationId, lastMessage, response.content, conversationState);
    }

    return {
        conversationId,
        reply: response.content,
        message: response.content,
        model: response.model,
        intent: intent.toUpperCase(),
        toolCalls,
        conversationState,
    };
}
