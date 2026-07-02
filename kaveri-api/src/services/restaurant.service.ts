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
                console.log(`Inserted menu item: ${menu.name} for ${restaurant.name}`);
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
