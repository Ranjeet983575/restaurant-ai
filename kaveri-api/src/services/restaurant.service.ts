import { Restaurant, IRestaurant } from '../models/restaurant.model';
import { Menu, IMenu } from '../models/menu.model';
import { generateEmbedding, generateMenuEmbedding, generateRestaurantEmbedding, cosineSimilarity } from './embedding.service';

export interface CreateMenuInput {
    name: string;
    description: string;
    price: number;
    section: 'main_course' | 'freshment' | 'drink' | 'dessert' | 'starter' | 'appetizer';
    category: string;
    vegetarian?: boolean;
    spicy_level?: 'mild' | 'medium' | 'spicy' | 'very_spicy';
    is_available?: boolean;
    preparation_time?: number;
    tags?: string[];
}

export interface CreateRestaurantInput {
    name: string;
    cuisine: string[];
    description: string;
    location: string;
    address: string;
    phone: string;
    price_range: 'budget' | 'moderate' | 'expensive' | 'luxury';
    rating?: number;
    working_hours?: {
        monday_to_friday?: string;
        saturday?: string;
        sunday?: string;
    };
    tags?: string[];
    menus?: CreateMenuInput[];
}

export interface UpdateRestaurantInput extends Partial<CreateRestaurantInput> { }
export interface UpdateMenuInput extends Partial<CreateMenuInput> { }

export interface RestaurantSearchResult {
    restaurant: IRestaurant;
    similarity_score: number;
}

export interface MenuSearchResult {
    menu: IMenu;
    restaurant: IRestaurant;
    similarity_score: number;
}

export interface MenuSearchItem {
    menu: {
        _id: string;
        restaurantId: string;
        restaurantName: string;
        name: string;
        description: string;
        price: number;
        section: string;
        category: string;
        vegetarian?: boolean;
        spicy_level?: 'mild' | 'medium' | 'spicy' | 'very_spicy';
        is_available?: boolean;
        preparation_time?: number;
        tags?: string[];
    };
    restaurant: {
        _id: string;
        name: string;
        cuisine: string[];
        description: string;
        location: string;
        address: string;
        phone: string;
        price_range: string;
        rating?: number;
        tags?: string[];
        working_hours?: {
            monday_to_friday?: string;
            saturday?: string;
            sunday?: string;
        };
    };
    similarity_score: number;
}

function sanitizeMenuSearchResult(result: MenuSearchResult): MenuSearchItem {
    return {
        similarity_score: result.similarity_score,
        menu: {
            _id: result.menu._id.toString(),
            restaurantId: result.menu.restaurantId.toString(),
            restaurantName: result.menu.restaurantName,
            name: result.menu.name,
            description: result.menu.description,
            price: result.menu.price,
            section: result.menu.section,
            category: result.menu.category,
            vegetarian: result.menu.vegetarian,
            spicy_level: result.menu.spicy_level,
            is_available: result.menu.is_available,
            preparation_time: result.menu.preparation_time,
            tags: result.menu.tags,
        },
        restaurant: {
            _id: result.restaurant._id.toString(),
            name: result.restaurant.name,
            cuisine: result.restaurant.cuisine,
            description: result.restaurant.description,
            location: result.restaurant.location,
            address: result.restaurant.address,
            phone: result.restaurant.phone,
            price_range: result.restaurant.price_range,
            rating: result.restaurant.rating,
            tags: result.restaurant.tags,
            working_hours: result.restaurant.working_hours,
        },
    };
}

async function ensureRestaurantEmbedding(restaurant: IRestaurant): Promise<void> {
    if (!restaurant.vector_embedding || restaurant.vector_embedding.length === 0) {
        try {
            restaurant.vector_embedding = await generateRestaurantEmbedding({
                name: restaurant.name,
                cuisine: restaurant.cuisine,
                description: restaurant.description,
                location: restaurant.location,
                tags: restaurant.tags,
                menus: [],
            });
            await restaurant.save();
        } catch (error) {
            console.warn(`Skipping restaurant embedding for ${restaurant.name}:`, error);
            restaurant.vector_embedding = [];
            await restaurant.save();
        }
    }
}

async function ensureMenuEmbedding(menu: IMenu): Promise<void> {
    if (!menu.vector_embedding || menu.vector_embedding.length === 0) {
        try {
            menu.vector_embedding = await generateMenuEmbedding({
                name: menu.name,
                description: menu.description,
                section: menu.section,
                category: menu.category,
                vegetarian: menu.vegetarian,
                spicy_level: menu.spicy_level,
                tags: menu.tags,
            });
            await menu.save();
        } catch (error) {
            console.warn(`Skipping menu embedding for ${menu.name}:`, error);
            menu.vector_embedding = [];
            await menu.save();
        }
    }
}

/**
 * Create a new restaurant with generated embedding
 */
export async function createRestaurant(input: CreateRestaurantInput): Promise<IRestaurant> {
    try {
        const restaurant = new Restaurant({
            ...input,
            menus: [],
            vector_embedding: [],
        });

        await restaurant.save();
        await ensureRestaurantEmbedding(restaurant as any);

        if (input.menus && input.menus.length > 0) {
            for (const menuInput of input.menus) {
                const menu = new Menu({
                    restaurantId: restaurant._id,
                    restaurantName: restaurant.name,
                    ...menuInput,
                    vector_embedding: [],
                });
                await menu.save();
                await ensureMenuEmbedding(menu as any);
            }
        }

        return restaurant;
    } catch (error) {
        throw new Error(`Failed to create restaurant: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

/**
 * Update an existing restaurant and regenerate embedding
 */
export async function updateRestaurant(
    id: string,
    input: UpdateRestaurantInput
): Promise<IRestaurant | null> {
    try {
        const restaurant = await Restaurant.findById(id);
        if (!restaurant) {
            return null;
        }

        // Update fields
        Object.assign(restaurant, input);

        // Regenerate embedding if relevant fields changed
        if (input.name || input.cuisine || input.description || input.location || input.tags) {
            await ensureRestaurantEmbedding(restaurant as any);
        }

        await restaurant.save();
        return restaurant;
    } catch (error) {
        throw new Error(`Failed to update restaurant: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

/**
 * Delete a restaurant
 */
export async function deleteRestaurant(id: string): Promise<boolean> {
    try {
        const result = await Restaurant.findByIdAndDelete(id);
        return result !== null;
    } catch (error) {
        throw new Error(`Failed to delete restaurant: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

export async function addMenuItem(restaurantId: string, input: CreateMenuInput): Promise<IMenu | null> {
    try {
        const restaurant = await Restaurant.findById(restaurantId);
        if (!restaurant) return null;

        const menu = new Menu({
            restaurantId: restaurant._id,
            restaurantName: restaurant.name,
            ...input,
            vector_embedding: [],
        });

        await menu.save();
        await ensureMenuEmbedding(menu as any);
        return menu;
    } catch (error) {
        throw new Error(`Failed to add menu item: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

export async function updateMenuItem(restaurantId: string, menuId: string, input: UpdateMenuInput): Promise<IMenu | null> {
    try {
        const menuItem = await Menu.findOne({ _id: menuId, restaurantId });
        if (!menuItem) return null;

        Object.assign(menuItem, input);
        menuItem.vector_embedding = [];

        await menuItem.save();
        await ensureMenuEmbedding(menuItem as any);
        return menuItem;
    } catch (error) {
        throw new Error(`Failed to update menu item: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

export async function deleteMenuItem(restaurantId: string, menuId: string): Promise<boolean> {
    try {
        const result = await Menu.findOneAndDelete({ _id: menuId, restaurantId });
        return result !== null;
    } catch (error) {
        throw new Error(`Failed to delete menu item: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

/**
 * Get restaurant by ID
 */
export async function getRestaurantById(id: string): Promise<IRestaurant | null> {
    try {
        return await Restaurant.findById(id);
    } catch (error) {
        throw new Error(`Failed to fetch restaurant: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

export async function getMenuItemsByRestaurant(restaurantId: string): Promise<IMenu[]> {
    try {
        return await Menu.find({ restaurantId }).sort({ createdAt: -1 });
    } catch (error) {
        throw new Error(`Failed to fetch menu items: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

export async function getAllMenuItems(): Promise<IMenu[]> {
    try {
        return await Menu.find().sort({ createdAt: -1 });
    } catch (error) {
        throw new Error(`Failed to fetch all menu items: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

/**
 * Get all restaurants
 */
export async function getAllRestaurants(): Promise<IRestaurant[]> {
    try {
        return await Restaurant.find().sort({ createdAt: -1 });
    } catch (error) {
        throw new Error(`Failed to fetch restaurants: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

export async function bulkCreateRestaurants(inputs: CreateRestaurantInput[]): Promise<IRestaurant[]> {
    try {
        const createdRestaurants: IRestaurant[] = [];

        for (const input of inputs) {
            const restaurant = await createRestaurant(input);
            createdRestaurants.push(restaurant);
        }

        return createdRestaurants;
    } catch (error) {
        throw new Error(`Failed to bulk create restaurants: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

/**
 * Semantic search - find restaurants similar to query
 */
export interface MenuSearchResponse {
    intent: 'hours' | 'overview' | 'menu' | 'diet' | 'other';
    query: string;
    text: string;
    items: MenuSearchItem[];
}

function isTimeQuery(query: string): boolean {
    const normalized = query.toLowerCase();
    return /\b(hour|hours|open|close|time|opening|closing)\b/.test(normalized);
}

function isOverviewQuery(query: string): boolean {
    const normalized = query.toLowerCase();
    return /\b(overview|about|tell me about|who are you|what is this|restaurant overview|describe)\b/.test(normalized);
}

function isMenuQuery(query: string): boolean {
    const normalized = query.toLowerCase();
    return /\b(menu|what do you serve|show me the menu|dish|dishes|food|vegan|vegetarian|non-veg|specials|recommend)\b/.test(normalized);
}

function isVegetarianQuery(query: string): boolean {
    const normalized = query.toLowerCase();
    return /\b(vegan|vegetarian|veg|vegetarian-friendly|plant[- ]based)\b/.test(normalized);
}

function isVeganQuery(query: string): boolean {
    const normalized = query.toLowerCase();
    return /\b(vegan|plant[- ]based)\b/.test(normalized);
}

function isNonVegetarianQuery(query: string): boolean {
    const normalized = query.toLowerCase();
    return /\b(non[- ]veg|nonveg|non vegetarian|non-vegetarian|meat|chicken|mutton|fish|seafood)\b/.test(normalized);
}

function isDietQuery(query: string): boolean {
    return isVegetarianQuery(query) || isVeganQuery(query) || isNonVegetarianQuery(query) || /\b(gluten[- ]free|halal|healthy|spicy|mild|medium)\b/.test(query.toLowerCase());
}

function formatWorkingHours(restaurant: IRestaurant | null): string {
    if (!restaurant) {
        return 'Restaurant hours are not available right now.';
    }
    return `Our hours are ${restaurant.working_hours.monday_to_friday} Monday through Friday, ${restaurant.working_hours.saturday} on Saturday, and ${restaurant.working_hours.sunday} on Sunday.`;
}

function summarizeMenuItems(items: MenuSearchItem[], limit = 5): string[] {
    return items.slice(0, limit).map(item => {
        const menuName = item.menu.name || 'Menu item';
        const restaurantName = item.restaurant.name || 'Restaurant';
        return `${menuName} at ${restaurantName}`;
    });
}

export async function semanticSearchMenusWithContext(
    query: string,
    limit: number = 10
): Promise<MenuSearchResponse> {
    const rawResults = await semanticSearchMenus(query, limit);
    const restaurant = await Restaurant.findOne();
    const results = rawResults.map(sanitizeMenuSearchResult);

    if (isTimeQuery(query)) {
        return {
            intent: 'hours',
            query,
            text: formatWorkingHours(restaurant),
            items: results,
        };
    }

    if (isOverviewQuery(query)) {
        const popularItems = summarizeMenuItems(results, 5);
        const description = restaurant?.description || 'This restaurant offers a selection of popular dishes and a warm atmosphere.';
        const summary = popularItems.length
            ? `${description} Popular menu items include ${popularItems.join(', ')}.`
            : description;
        return {
            intent: 'overview',
            query,
            text: summary,
            items: results,
        };
    }

    if (results.length === 0) {
        const fallbackText = isMenuQuery(query)
            ? 'I could not find matching menu items for your request. Try asking about another dish or menu type.'
            : 'I could not find any matching menu items for your request. Try a different search phrase or ask about our hours or specialties.';
        return {
            intent: isMenuQuery(query) ? 'menu' : 'other',
            query,
            text: fallbackText,
            items: [],
        };
    }

    const vegetarianResults = results.filter(item => item.menu.vegetarian === true);
    const veganResults = results.filter(item => item.menu.tags?.some(tag => /vegan/i.test(tag)) || item.menu.name.toLowerCase().includes('vegan'));
    const nonVegResults = results.filter(item => item.menu.vegetarian === false);

    let selectedResults = results;
    let filteredText = '';

    if (isVeganQuery(query)) {
        selectedResults = veganResults.length > 0 ? veganResults : vegetarianResults;
        filteredText = selectedResults.length > 0
            ? `Here are vegan-friendly items that match your request: ${summarizeMenuItems(selectedResults, 5).join(', ')}.`
            : 'I could not find clearly vegan items, but here are some vegetarian-friendly options.';
    } else if (isVegetarianQuery(query)) {
        selectedResults = vegetarianResults.length > 0 ? vegetarianResults : results;
        filteredText = selectedResults.length > 0
            ? `Here are vegetarian items that match your request: ${summarizeMenuItems(selectedResults, 5).join(', ')}.`
            : 'I could not find clearly vegetarian items for that request.';
    } else if (isNonVegetarianQuery(query)) {
        selectedResults = nonVegResults.length > 0 ? nonVegResults : results;
        filteredText = selectedResults.length > 0
            ? `Here are non-vegetarian items that match your request: ${summarizeMenuItems(selectedResults, 5).join(', ')}.`
            : 'I could not find clearly non-vegetarian items for that request.';
    } else {
        const items = summarizeMenuItems(results, 5);
        filteredText = isMenuQuery(query)
            ? `Here are some matching menu items: ${items.join(', ')}.`
            : `I found these relevant menu items: ${items.join(', ')}.`;
    }

    const intent = isVeganQuery(query)
        ? 'diet'
        : isVegetarianQuery(query)
            ? 'diet'
            : isNonVegetarianQuery(query)
                ? 'diet'
                : 'menu';

    return {
        intent,
        query,
        text: filteredText,
        items: selectedResults,
    };
}

export async function semanticSearchRestaurants(
    query: string,
    limit: number = 10
): Promise<RestaurantSearchResult[]> {
    try {
        const queryEmbedding = await generateEmbedding(query);
        const allRestaurants = await Restaurant.find();

        const results = await Promise.all(
            allRestaurants.map(async (restaurant: IRestaurant) => {
                if (!restaurant.vector_embedding || restaurant.vector_embedding.length === 0) {
                    await ensureRestaurantEmbedding(restaurant as any);
                }

                return {
                    restaurant,
                    similarity_score: cosineSimilarity(queryEmbedding, restaurant.vector_embedding),
                };
            })
        );

        return results
            .sort((a: any, b: any) => b.similarity_score - a.similarity_score)
            .slice(0, limit)
            .filter((result: any) => result.similarity_score > 0.2);
    } catch (error) {
        throw new Error(`Restaurant search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

export async function semanticSearchMenus(
    query: string,
    limit: number = 10
): Promise<MenuSearchResult[]> {
    try {
        const queryEmbedding = await generateEmbedding(query);
        const allMenus = await Menu.find();

        const results = await Promise.all(
            allMenus.map(async (menu: IMenu) => {
                if (!menu.vector_embedding || menu.vector_embedding.length === 0) {
                    await ensureMenuEmbedding(menu as any);
                }

                const restaurant = await Restaurant.findById(menu.restaurantId);
                if (!restaurant) return null;

                return {
                    menu: menu as IMenu,
                    restaurant: restaurant as IRestaurant,
                    similarity_score: cosineSimilarity(queryEmbedding, menu.vector_embedding),
                };
            })
        );

        const validResults = results.filter((result): result is MenuSearchResult => result !== null);

        return validResults
            .sort((a: any, b: any) => b.similarity_score - a.similarity_score)
            .slice(0, limit)
            .filter((result: any) => result.similarity_score > 0.2);
    } catch (error) {
        throw new Error(`Menu search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

/**
 * Search by multiple filters
 */
export async function filterRestaurants(filters: {
    cuisine?: string;
    location?: string;
    price_range?: string;
    min_rating?: number;
    tags?: string[];
}): Promise<IRestaurant[]> {
    try {
        const query: any = {};

        if (filters.cuisine) {
            query.cuisine = filters.cuisine;
        }
        if (filters.location) {
            query.location = new RegExp(filters.location, 'i');
        }
        if (filters.price_range) {
            query.price_range = filters.price_range;
        }
        if (filters.min_rating) {
            query.rating = { $gte: filters.min_rating };
        }
        if (filters.tags && filters.tags.length > 0) {
            query.tags = { $in: filters.tags };
        }

        return await Restaurant.find(query);
    } catch (error) {
        throw new Error(`Filter failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}
