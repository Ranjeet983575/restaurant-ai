"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRestaurant = createRestaurant;
exports.updateRestaurant = updateRestaurant;
exports.deleteRestaurant = deleteRestaurant;
exports.addMenuItem = addMenuItem;
exports.updateMenuItem = updateMenuItem;
exports.deleteMenuItem = deleteMenuItem;
exports.getRestaurantById = getRestaurantById;
exports.getMenuItemsByRestaurant = getMenuItemsByRestaurant;
exports.getAllMenuItems = getAllMenuItems;
exports.getAllRestaurants = getAllRestaurants;
exports.bulkCreateRestaurants = bulkCreateRestaurants;
exports.semanticSearchRestaurants = semanticSearchRestaurants;
exports.semanticSearchMenus = semanticSearchMenus;
exports.filterRestaurants = filterRestaurants;
const restaurant_model_1 = require("../models/restaurant.model");
const menu_model_1 = require("../models/menu.model");
const embedding_service_1 = require("./embedding.service");
async function ensureRestaurantEmbedding(restaurant) {
    if (!restaurant.vector_embedding || restaurant.vector_embedding.length === 0) {
        try {
            restaurant.vector_embedding = await (0, embedding_service_1.generateRestaurantEmbedding)({
                name: restaurant.name,
                cuisine: restaurant.cuisine,
                description: restaurant.description,
                location: restaurant.location,
                tags: restaurant.tags,
                menus: [],
            });
            await restaurant.save();
        }
        catch (error) {
            console.warn(`Skipping restaurant embedding for ${restaurant.name}:`, error);
            restaurant.vector_embedding = [];
            await restaurant.save();
        }
    }
}
async function ensureMenuEmbedding(menu) {
    if (!menu.vector_embedding || menu.vector_embedding.length === 0) {
        try {
            menu.vector_embedding = await (0, embedding_service_1.generateMenuEmbedding)({
                name: menu.name,
                description: menu.description,
                section: menu.section,
                category: menu.category,
                vegetarian: menu.vegetarian,
                spicy_level: menu.spicy_level,
                tags: menu.tags,
            });
            await menu.save();
        }
        catch (error) {
            console.warn(`Skipping menu embedding for ${menu.name}:`, error);
            menu.vector_embedding = [];
            await menu.save();
        }
    }
}
/**
 * Create a new restaurant with generated embedding
 */
async function createRestaurant(input) {
    try {
        const restaurant = new restaurant_model_1.Restaurant({
            ...input,
            menus: [],
            vector_embedding: [],
        });
        await restaurant.save();
        await ensureRestaurantEmbedding(restaurant);
        if (input.menus && input.menus.length > 0) {
            for (const menuInput of input.menus) {
                const menu = new menu_model_1.Menu({
                    restaurantId: restaurant._id,
                    restaurantName: restaurant.name,
                    ...menuInput,
                    vector_embedding: [],
                });
                await menu.save();
                await ensureMenuEmbedding(menu);
                console.log(`Inserted menu item: ${menu.name} for ${restaurant.name}`);
            }
        }
        return restaurant;
    }
    catch (error) {
        throw new Error(`Failed to create restaurant: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}
/**
 * Update an existing restaurant and regenerate embedding
 */
async function updateRestaurant(id, input) {
    try {
        const restaurant = await restaurant_model_1.Restaurant.findById(id);
        if (!restaurant) {
            return null;
        }
        // Update fields
        Object.assign(restaurant, input);
        // Regenerate embedding if relevant fields changed
        if (input.name || input.cuisine || input.description || input.location || input.tags) {
            await ensureRestaurantEmbedding(restaurant);
        }
        await restaurant.save();
        return restaurant;
    }
    catch (error) {
        throw new Error(`Failed to update restaurant: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}
/**
 * Delete a restaurant
 */
async function deleteRestaurant(id) {
    try {
        const result = await restaurant_model_1.Restaurant.findByIdAndDelete(id);
        return result !== null;
    }
    catch (error) {
        throw new Error(`Failed to delete restaurant: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}
async function addMenuItem(restaurantId, input) {
    try {
        const restaurant = await restaurant_model_1.Restaurant.findById(restaurantId);
        if (!restaurant)
            return null;
        const menu = new menu_model_1.Menu({
            restaurantId: restaurant._id,
            restaurantName: restaurant.name,
            ...input,
            vector_embedding: [],
        });
        await menu.save();
        await ensureMenuEmbedding(menu);
        return menu;
    }
    catch (error) {
        throw new Error(`Failed to add menu item: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}
async function updateMenuItem(restaurantId, menuId, input) {
    try {
        const menuItem = await menu_model_1.Menu.findOne({ _id: menuId, restaurantId });
        if (!menuItem)
            return null;
        Object.assign(menuItem, input);
        menuItem.vector_embedding = [];
        await menuItem.save();
        await ensureMenuEmbedding(menuItem);
        return menuItem;
    }
    catch (error) {
        throw new Error(`Failed to update menu item: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}
async function deleteMenuItem(restaurantId, menuId) {
    try {
        const result = await menu_model_1.Menu.findOneAndDelete({ _id: menuId, restaurantId });
        return result !== null;
    }
    catch (error) {
        throw new Error(`Failed to delete menu item: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}
/**
 * Get restaurant by ID
 */
async function getRestaurantById(id) {
    try {
        return await restaurant_model_1.Restaurant.findById(id);
    }
    catch (error) {
        throw new Error(`Failed to fetch restaurant: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}
async function getMenuItemsByRestaurant(restaurantId) {
    try {
        return await menu_model_1.Menu.find({ restaurantId }).sort({ createdAt: -1 });
    }
    catch (error) {
        throw new Error(`Failed to fetch menu items: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}
async function getAllMenuItems() {
    try {
        return await menu_model_1.Menu.find().sort({ createdAt: -1 });
    }
    catch (error) {
        throw new Error(`Failed to fetch all menu items: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}
/**
 * Get all restaurants
 */
async function getAllRestaurants() {
    try {
        return await restaurant_model_1.Restaurant.find().sort({ createdAt: -1 });
    }
    catch (error) {
        throw new Error(`Failed to fetch restaurants: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}
async function bulkCreateRestaurants(inputs) {
    try {
        const createdRestaurants = [];
        for (const input of inputs) {
            const restaurant = await createRestaurant(input);
            createdRestaurants.push(restaurant);
        }
        return createdRestaurants;
    }
    catch (error) {
        throw new Error(`Failed to bulk create restaurants: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}
/**
 * Semantic search - find restaurants similar to query
 */
async function semanticSearchRestaurants(query, limit = 10) {
    try {
        const queryEmbedding = await (0, embedding_service_1.generateEmbedding)(query);
        const allRestaurants = await restaurant_model_1.Restaurant.find();
        const results = await Promise.all(allRestaurants.map(async (restaurant) => {
            if (!restaurant.vector_embedding || restaurant.vector_embedding.length === 0) {
                await ensureRestaurantEmbedding(restaurant);
            }
            return {
                restaurant,
                similarity_score: (0, embedding_service_1.cosineSimilarity)(queryEmbedding, restaurant.vector_embedding),
            };
        }));
        return results
            .sort((a, b) => b.similarity_score - a.similarity_score)
            .slice(0, limit)
            .filter((result) => result.similarity_score > 0.2);
    }
    catch (error) {
        throw new Error(`Restaurant search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}
async function semanticSearchMenus(query, limit = 10) {
    try {
        const queryEmbedding = await (0, embedding_service_1.generateEmbedding)(query);
        const allMenus = await menu_model_1.Menu.find();
        const results = await Promise.all(allMenus.map(async (menu) => {
            if (!menu.vector_embedding || menu.vector_embedding.length === 0) {
                await ensureMenuEmbedding(menu);
            }
            const restaurant = await restaurant_model_1.Restaurant.findById(menu.restaurantId);
            if (!restaurant)
                return null;
            return {
                menu: menu,
                restaurant: restaurant,
                similarity_score: (0, embedding_service_1.cosineSimilarity)(queryEmbedding, menu.vector_embedding),
            };
        }));
        const validResults = results.filter((result) => result !== null);
        return validResults
            .sort((a, b) => b.similarity_score - a.similarity_score)
            .slice(0, limit)
            .filter((result) => result.similarity_score > 0.2);
    }
    catch (error) {
        throw new Error(`Menu search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}
/**
 * Search by multiple filters
 */
async function filterRestaurants(filters) {
    try {
        const query = {};
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
        return await restaurant_model_1.Restaurant.find(query);
    }
    catch (error) {
        throw new Error(`Filter failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}
